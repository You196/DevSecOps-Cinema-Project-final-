const crypto = require("crypto");
const logger = require("../utils/logger");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

const trustedOrigins = new Set(
  (process.env.TRUSTED_ORIGINS || process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const getCsrfSecret = () => process.env.CSRF_SECRET || process.env.JWT_SECRET;

const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((cookies, cookiePart) => {
    const index = cookiePart.indexOf("=");
    if (index === -1) return cookies;

    const key = cookiePart.slice(0, index).trim();
    const rawValue = cookiePart.slice(index + 1).trim();
    let value = rawValue;

    try {
      value = decodeURIComponent(rawValue);
    } catch (error) {
      value = rawValue;
    }

    if (key) cookies[key] = value;
    return cookies;
  }, {});
};

const safeEqual = (a, b) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const signToken = (nonce, secret) => {
  return crypto.createHmac("sha256", secret).update(nonce).digest("hex");
};

const buildToken = () => {
  const nonce = crypto.randomBytes(32).toString("hex");
  const signature = signToken(nonce, getCsrfSecret());
  return `${nonce}.${signature}`;
};

const validateTokenFormatAndSignature = (token) => {
  if (typeof token !== "string") return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0) return false;

  const nonce = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!nonce || !signature) return false;

  const expectedSignature = signToken(nonce, getCsrfSecret());
  return safeEqual(signature, expectedSignature);
};

const setCsrfCookie = (res, token) => {
  const secureFlag = process.env.CSRF_COOKIE_SECURE === "true";
  const maxAgeSeconds = Number(process.env.CSRF_MAX_AGE_SECONDS || 7200);

  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Number.isFinite(maxAgeSeconds) ? maxAgeSeconds : 7200}`,
  ];

  if (secureFlag) {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
};

const issueCsrfToken = (req, res) => {
  const token = buildToken();
  setCsrfCookie(res, token);
  res.json({ csrfToken: token });
};

const isTrustedOrigin = (req) => {
  if (trustedOrigins.size === 0) return true;

  const origin = req.get("origin");
  if (origin) {
    return trustedOrigins.has(origin);
  }

  const referer = req.get("referer");
  if (!referer) return true;

  return Array.from(trustedOrigins).some((trustedOrigin) =>
    referer.startsWith(trustedOrigin),
  );
};

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (!isTrustedOrigin(req)) {
    logger.warn(
      `Blocked request due to untrusted origin. Method: ${req.method}, URL: ${req.originalUrl}, IP: ${req.ip}`,
    );
    return res.status(403).json({ error: "Untrusted request origin" });
  }

  const csrfHeaderToken = req.get(CSRF_HEADER_NAME);
  const cookies = parseCookies(req.headers.cookie);
  const csrfCookieToken = cookies[CSRF_COOKIE_NAME];

  if (!csrfHeaderToken || !csrfCookieToken) {
    logger.warn(
      `Blocked request due to missing CSRF token. Method: ${req.method}, URL: ${req.originalUrl}, IP: ${req.ip}`,
    );
    return res.status(403).json({ error: "Missing CSRF token" });
  }

  if (!safeEqual(csrfHeaderToken, csrfCookieToken)) {
    logger.warn(
      `Blocked request due to CSRF token mismatch. Method: ${req.method}, URL: ${req.originalUrl}, IP: ${req.ip}`,
    );
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  if (!validateTokenFormatAndSignature(csrfHeaderToken)) {
    logger.warn(
      `Blocked request due to invalid CSRF token signature. Method: ${req.method}, URL: ${req.originalUrl}, IP: ${req.ip}`,
    );
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  return next();
};

module.exports = {
  csrfProtection,
  issueCsrfToken,
};

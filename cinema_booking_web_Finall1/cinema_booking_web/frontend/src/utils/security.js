const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const TAG_DELIMITERS = /[<>]/g;
const SAFE_IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
const ROOT_RELATIVE_PATH = /^\/(?!\/)/;

export function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value
    .replace(CONTROL_CHARS, "")
    .replace(TAG_DELIMITERS, "")
    .trim();
}

export function sanitizeToken(value) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").trim();
}

export function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function safeParseJSON(value, fallback = null) {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function sanitizeImageUrl(value, fallback = "/assets/hero_bg.png") {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate) return fallback;
  if (ROOT_RELATIVE_PATH.test(candidate)) return candidate;

  try {
    const parsed = new URL(candidate);
    if (SAFE_IMAGE_PROTOCOLS.has(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function sanitizeMovie(rawMovie) {
  if (!rawMovie || typeof rawMovie !== "object") return null;

  return {
    ...rawMovie,
    _id: sanitizeText(String(rawMovie._id ?? "")),
    title: sanitizeText(rawMovie.title, "Untitled Movie"),
    genre: sanitizeText(rawMovie.genre, "Unknown"),
    description: sanitizeText(rawMovie.description, ""),
    posterUrl: sanitizeImageUrl(rawMovie.posterUrl),
    duration: sanitizeNumber(rawMovie.duration, 0),
  };
}

function sanitizeSeat(seat) {
  return sanitizeText(String(seat ?? ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function sanitizeBooking(rawBooking) {
  if (!rawBooking || typeof rawBooking !== "object") return null;

  return {
    ...rawBooking,
    _id: sanitizeText(String(rawBooking._id ?? "")),
    status: sanitizeText(rawBooking.status, "pending").toLowerCase(),
    seats: Array.isArray(rawBooking.seats)
      ? rawBooking.seats.map(sanitizeSeat).filter(Boolean)
      : [],
    totalPrice: sanitizeNumber(rawBooking.totalPrice, 0),
    film:
      rawBooking.film && typeof rawBooking.film === "object"
        ? sanitizeMovie(rawBooking.film)
        : null,
  };
}

export function sanitizeUser(rawUser) {
  if (!rawUser || typeof rawUser !== "object") return null;

  return {
    ...rawUser,
    name: sanitizeText(rawUser.name, ""),
    email: sanitizeText(rawUser.email, ""),
  };
}


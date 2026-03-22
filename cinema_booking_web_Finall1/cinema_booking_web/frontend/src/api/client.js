import axios from "axios";
import { API_BASE } from "../config/api";

const SAFE_METHODS = new Set(["get", "head", "options"]);
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_ENDPOINT = "/auth/csrf-token";

let csrfToken = null;
let csrfTokenPromise = null;

const readCsrfToken = (response) => response?.data?.csrfToken || null;

export const fetchCsrfToken = async (forceRefresh = false) => {
  if (csrfToken && !forceRefresh) return csrfToken;

  if (!csrfTokenPromise) {
    csrfTokenPromise = axios
      .get(`${API_BASE}${CSRF_ENDPOINT}`, {
        withCredentials: true,
      })
      .then((response) => {
        const token = readCsrfToken(response);
        if (!token || typeof token !== "string") {
          throw new Error("Failed to issue CSRF token");
        }
        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
};

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (SAFE_METHODS.has(method)) {
    return config;
  }

  const token = await fetchCsrfToken();
  config.headers = config.headers || {};
  config.headers[CSRF_HEADER_NAME] = token;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error?.config;
    const status = error?.response?.status;
    const method = (originalConfig?.method || "get").toLowerCase();

    if (
      status !== 403 ||
      SAFE_METHODS.has(method) ||
      !originalConfig ||
      originalConfig._csrfRetried
    ) {
      return Promise.reject(error);
    }

    originalConfig._csrfRetried = true;
    const refreshedToken = await fetchCsrfToken(true);
    originalConfig.headers = originalConfig.headers || {};
    originalConfig.headers[CSRF_HEADER_NAME] = refreshedToken;
    return apiClient.request(originalConfig);
  },
);


import axios, { AxiosError, AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { ApiError } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Token store - kept in module so api client can read it without circular deps.
let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token) localStorage.setItem("hd_token", token);
  else localStorage.removeItem("hd_token");
}

export function getAuthToken(): string | null {
  if (currentToken) return currentToken;
  currentToken = localStorage.getItem("hd_token");
  return currentToken;
}

// Request interceptor - attach bearer token.
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - normalise errors, notify user, redirect on 401.
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
      data?.detail || error.message || "An unexpected error occurred";

    // Dedupe toasts: same request (method+url) failing repeatedly (e.g. React
    // StrictMode double-invoking effects, or multiple panels hitting the same
    // broken resource at once) should show ONE toast, not one per request.
    const toastId = `api-error-${error.config?.method}-${error.config?.url}`;

    // 401 - clear session (auth store will react to storage event).
    if (status === 401) {
      setAuthToken(null);
      // Avoid double-toast on login page.
      if (!window.location.pathname.includes("/login")) {
        toast.error("Session expired. Please log in again.", { id: toastId });
        window.location.href = "/login";
      }
    } else if (status === 403) {
      toast.error(message || "You do not have permission to do this.", { id: toastId });
    } else if (status === 404) {
      toast.error(message || "Resource not found.", { id: toastId });
    } else if (status === 409) {
      toast.error(message || "Conflict: resource already exists.", { id: toastId });
    } else if (status === 422) {
      // Validation errors are surfaced by callers, not globally.
    } else if (status === 429) {
      toast.error("Too many requests. Please slow down.", { id: toastId });
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again later.", { id: toastId });
    } else if (!error.response) {
      toast.error("Network error. Please check your connection.", { id: toastId });
    }

    return Promise.reject(error);
  }
);
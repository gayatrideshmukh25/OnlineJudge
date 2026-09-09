import axios from "axios";
import toast from "react-hot-toast";

// Single Axios instance used across the app.
// withCredentials lets the browser send/receive the HTTP-only JWT cookie.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor: surface a friendly toast for every failed request
// and normalize the error shape so calling code can just read err.message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong. Please try again.";

    // Don't spam a toast for silent auth checks (GET /auth/me on app load).
    const isSilentAuthCheck =
      error.config?.url?.includes("/auth/me") && status === 401;

    if (!isSilentAuthCheck) {
      toast.error(message);
    }

    return Promise.reject({ ...error, message, status });
  },
);

export default api;

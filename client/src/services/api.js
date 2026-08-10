import axios from "axios";

// Defaults to a relative "/api" path, which works automatically when the
// backend serves the built frontend itself (the recommended, single-origin
// deployment — see server/README). Only set VITE_API_URL at build time if
// you're hosting the frontend on a separate domain from the API, e.g.:
//   VITE_API_URL=https://your-api.example.com npm run build
const API_BASE = import.meta.env.VITE_API_URL || "";
const API_ORIGIN = API_BASE ? new URL(API_BASE).origin : "";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("frl_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("frl_token");
      localStorage.removeItem("frl_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// /uploads (member photos/documents) requires an active login session.
// <img>/<a> tags can't send an Authorization header, so the token travels
// as a query param instead — the server checks either. Use this for every
// photoUrl/document url the app renders. Also resolves the path against the
// API's own origin when the frontend is hosted separately (VITE_API_URL
// set), since the server returns paths relative to itself.
export function withAuthToken(url) {
  if (!url) return url;
  const token = localStorage.getItem("frl_token");
  const absolute = API_ORIGIN ? `${API_ORIGIN}${url}` : url;
  if (!token) return absolute;
  return `${absolute}${absolute.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

export default api;

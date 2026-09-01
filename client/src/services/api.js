import axios from "axios";

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
    // Optimistic-concurrency conflict (see server/utils/crudFactory.js):
    // someone else saved a change to this exact record after the current
    // user loaded it. Rather than silently overwrite their edit, the server
    // rejects this save with 409 + conflict:true. Surfacing this centrally
    // means any edit form that sends _expectedVersion automatically gets a
    // clear message, without each form needing its own conflict handling.
    if (err.response?.status === 409 && err.response?.data?.conflict) {
      err.isVersionConflict = true;
    }
    return Promise.reject(err);
  }
);

export function withAuthToken(url) {
  if (!url) return url;
  const token = localStorage.getItem("frl_token");
  const absolute = API_ORIGIN ? `${API_ORIGIN}${url}` : url;
  if (!token) return absolute;
  return `${absolute}${absolute.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

export default api;

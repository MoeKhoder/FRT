import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);
const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 min client-side idle timeout

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("frl_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);
  const idleTimer = useRef(null);

  const logout = useCallback(async (silent = false) => {
    try {
      if (!silent) await api.post("/auth/logout");
    } catch (e) {
      /* ignore */
    }
    localStorage.removeItem("frl_token");
    localStorage.removeItem("frl_user");
    setUser(null);
    window.location.href = "/login";
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!localStorage.getItem("frl_token")) return;
    idleTimer.current = setTimeout(() => logout(true), IDLE_LIMIT_MS);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
  }, [resetIdleTimer]);

  useEffect(() => {
    const token = localStorage.getItem("frl_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("frl_user", JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem("frl_token");
        localStorage.removeItem("frl_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    localStorage.setItem("frl_token", res.data.token);
    localStorage.setItem("frl_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

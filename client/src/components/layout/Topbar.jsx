import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { FiMenu, FiSun, FiMoon, FiBell, FiLogOut, FiChevronLeft, FiUser } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { NAV_ITEMS, ROLE_LABELS } from "../../utils/navConfig";
import api from "../../services/api";

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const menuRef = useRef(null);

  const current = NAV_ITEMS.find(
    (i) => i.to === location.pathname || (i.to !== "/" && location.pathname.startsWith(i.to))
  );

  useEffect(() => {
    api
      .get("/announcements")
      .then((res) =>
        setAnnouncements(
          res.data
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-night-700 bg-night-900/90 backdrop-blur [body.light_&]:bg-white/90 [body.light_&]:border-mist-200">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="lg:hidden text-mist-300">
            <FiMenu size={22} />
          </button>
          <div className="flex items-center gap-1.5 text-sm text-mist-400 min-w-0">
            <Link to="/" className="hover:text-mist-100 whitespace-nowrap">
              الرئيسية
            </Link>
            {current && current.to !== "/" && (
              <>
                <FiChevronLeft size={14} />
                <span className="text-mist-100 font-medium truncate [body.light_&]:text-night-900">
                  {current.label}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-mist-300 hover:bg-night-700 [body.light_&]:hover:bg-mist-100"
            title="تبديل المظهر"
          >
            {theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-lg p-2 text-mist-300 hover:bg-night-700 [body.light_&]:hover:bg-mist-100"
              title="الإشعارات"
            >
              <FiBell size={18} />
              {announcements.length > 0 && (
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-rescue-500" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-xl border border-night-600 bg-night-800 shadow-2xl p-2 [body.light_&]:bg-white [body.light_&]:border-mist-200">
                <div className="px-2 py-1.5 text-xs font-bold text-mist-400">آخر الإعلانات</div>
                {announcements.length === 0 && (
                  <div className="px-2 py-3 text-sm text-mist-400">لا توجد إشعارات جديدة</div>
                )}
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="px-2 py-2 rounded-lg hover:bg-night-700/50 [body.light_&]:hover:bg-mist-100"
                  >
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs text-mist-400 truncate">{a.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-night-700 [body.light_&]:hover:bg-mist-100"
            >
              <div className="w-8 h-8 rounded-full bg-rescue-500/20 text-rescue-400 flex items-center justify-center font-bold text-sm">
                {user?.fullName?.[0] || "?"}
              </div>
              <div className="hidden sm:block text-start">
                <div className="text-sm font-semibold leading-tight">{user?.fullName}</div>
                <div className="text-xs text-mist-400 leading-tight">{ROLE_LABELS[user?.role]}</div>
              </div>
            </button>
            {menuOpen && (
              <div className="absolute left-0 mt-2 w-48 rounded-xl border border-night-600 bg-night-800 shadow-2xl p-1.5 [body.light_&]:bg-white [body.light_&]:border-mist-200">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-night-700/60 [body.light_&]:hover:bg-mist-100"
                >
                  <FiUser size={16} /> ملفي الشخصي
                </Link>
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rescue-400 hover:bg-rescue-500/10"
                >
                  <FiLogOut size={16} /> تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

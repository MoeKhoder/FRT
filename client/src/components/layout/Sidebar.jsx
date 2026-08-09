import { NavLink } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { NAV_ITEMS } from "../../utils/navConfig";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter(
    (i) => i.roles.includes(user?.role) && (!i.feature || can(user, i.feature, "view"))
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 border-l border-night-700 bg-night-900 flex flex-col transition-transform duration-200 [body.light_&]:bg-white [body.light_&]:border-mist-200 ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/frt-logo.jpeg"
              alt="فريق المستجيب الأول"
              className="w-11 h-11 rounded-lg object-cover shrink-0 ring-1 ring-night-600 [body.light_&]:ring-mist-200"
            />
            <div className="min-w-0">
              <div className="font-extrabold leading-tight truncate">فريق المستجيب الأول</div>
              <div className="text-xs text-mist-400">الجومة</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-mist-400">
            <FiX size={20} />
          </button>
        </div>
        <div className="pulse-line" />
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-rescue-500/15 text-rescue-400"
                    : "text-mist-300 hover:bg-night-700/60 [body.light_&]:text-night-600 [body.light_&]:hover:bg-mist-100"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-night-700 [body.light_&]:border-mist-200">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/joumeh-union-logo.jpeg"
              alt="اتحاد بلديات الجومة"
              className="w-7 h-7 rounded object-contain bg-white shrink-0"
            />
            <span className="text-xs text-mist-400 leading-snug">
              بالشراكة مع اتحاد بلديات الجومة
            </span>
          </div>
          <div className="text-xs text-mist-400">الإصدار 1.0 · تخزين محلي</div>
        </div>
      </aside>
    </>
  );
}

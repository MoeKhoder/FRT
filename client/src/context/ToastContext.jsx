import { createContext, useCallback, useContext, useState } from "react";
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiXCircle } from "react-icons/fi";

const ToastContext = createContext(null);

const ICONS = {
  success: <FiCheckCircle className="text-safe-500" size={18} />,
  error: <FiXCircle className="text-rescue-500" size={18} />,
  warning: <FiAlertTriangle className="text-amber-500" size={18} />,
  info: <FiInfo className="text-mist-300" size={18} />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 rounded-lg border border-night-600 bg-night-800 text-mist-100 px-4 py-3 shadow-xl animate-[fadein_0.2s_ease]"
          >
            {ICONS[t.type]}
            <span className="text-sm leading-5">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

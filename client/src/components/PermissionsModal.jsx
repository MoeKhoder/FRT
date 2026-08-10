import { useEffect, useState } from "react";
import { FiShield, FiAlertTriangle } from "react-icons/fi";
import api from "../services/api";
import { Modal } from "./ui/Modal";
import { Button, Spinner, Badge } from "./ui/Primitives";
import { useToast } from "../context/ToastContext";
import { ROLE_LABELS } from "../utils/navConfig";

const LEVELS = [
  { value: "none", label: "لا شيء", tone: "neutral" },
  { value: "view", label: "عرض", tone: "amber" },
  { value: "manage", label: "إدارة", tone: "safe" },
];

export default function PermissionsModal({ open, onClose, targetUser }) {
  const { push } = useToast();
  const [features, setFeatures] = useState([]);
  const [roleDefaults, setRoleDefaults] = useState({});
  const [levels, setLevels] = useState({}); // effective levels being edited
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open || !targetUser) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      api.get("/permissions"),
      api.get(`/users/${targetUser.id}/permissions`),
    ])
      .then(([meta, current]) => {
        if (cancelled) return;
        setFeatures(meta.data.features || []);
        setRoleDefaults(meta.data.roleDefaults || {});
        setLevels(current.data.effective || {});
      })
      .catch((err) => {
        if (cancelled) return;
        setFeatures([]);
        setLoadError(
          err.response?.data?.error ||
            err.message ||
            "تعذر تحميل بيانات الصلاحيات"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, targetUser, reloadKey]);

  const setLevel = (key, value) => setLevels((l) => ({ ...l, [key]: value }));

  const resetToRoleDefaults = () => {
    setLevels({ ...(roleDefaults[targetUser.role] || {}) });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${targetUser.id}/permissions`, { permissions: levels });
      push("تم تحديث الصلاحيات", "success");
      onClose();
    } catch (err) {
      push(err.response?.data?.error || "تعذر حفظ الصلاحيات", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!targetUser) return null;

  const isIT = targetUser.role === "IT";

  return (
    <Modal open={open} onClose={onClose} title={`صلاحيات ${targetUser.fullName}`} wide>
      {isIT ? (
        <p className="text-sm text-mist-400 py-6 text-center">
          مستخدمو تقنية المعلومات يملكون كل الصلاحيات دائماً ولا يمكن تقييدهم.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <FiAlertTriangle size={28} className="text-rescue-400" />
          <p className="text-sm text-rescue-400">{loadError}</p>
          <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            إعادة المحاولة
          </Button>
        </div>
      ) : features.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <FiAlertTriangle size={28} className="text-amber-400" />
          <p className="text-sm text-mist-400">
            لم يتم تحميل أي ميزات. قد يكون هذا بسبب نسخة قديمة محفوظة في المتصفح —
            جرّب تحديث الصفحة بالكامل (Ctrl+Shift+R) ثم إعادة المحاولة.
          </p>
          <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-mist-400">
              الدور الحالي: <Badge tone="neutral">{ROLE_LABELS[targetUser.role]}</Badge> — يمكنك تخصيص كل ميزة على حدة
            </p>
            <button onClick={resetToRoleDefaults} className="text-xs text-rescue-400 hover:underline">
              إعادة تعيين لإعدادات الدور الافتراضية
            </button>
          </div>

          <div className="rounded-xl border border-night-700 divide-y divide-night-700 [body.light_&]:border-mist-200 [body.light_&]:divide-mist-200">
            {features.map((f) => (
              <div key={f.key} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium">{f.label}</span>
                <div className="flex gap-1.5">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      onClick={() => setLevel(f.key, lvl.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        levels[f.key] === lvl.value
                          ? lvl.value === "manage"
                            ? "bg-safe-500/15 border-safe-500/40 text-safe-400"
                            : lvl.value === "view"
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                            : "bg-night-600/40 border-night-500 text-mist-300"
                          : "border-night-600 text-mist-400 hover:bg-night-700 [body.light_&]:border-mist-300 [body.light_&]:hover:bg-mist-100"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>
              <FiShield size={16} /> حفظ الصلاحيات
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

import { useState } from "react";
import { FiLock, FiSave } from "react-icons/fi";
import api from "../services/api";
import { Card, Input, Button } from "../components/ui/Primitives";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROLE_LABELS } from "../utils/navConfig";

export default function Profile() {
  const { user } = useAuth();
  const { push } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      push("كلمتا المرور غير متطابقتين", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      push("تم تغيير كلمة المرور بنجاح", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      push(err.response?.data?.error || "تعذر تغيير كلمة المرور", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-extrabold">ملفي الشخصي</h1>
        <p className="text-mist-400 mt-1">معلومات الحساب وإعدادات الأمان</p>
      </div>

      <Card className="p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-rescue-500/15 text-rescue-400 flex items-center justify-center text-2xl font-extrabold">
          {user.fullName?.[0]}
        </div>
        <div>
          <div className="font-bold">{user.fullName}</div>
          <div className="text-sm text-mist-400 num">{user.username}</div>
          <div className="text-xs text-mist-400 mt-0.5">{ROLE_LABELS[user.role]}</div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2"><FiLock size={16} /> تغيير كلمة المرور</h3>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="كلمة المرور الحالية" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input label="كلمة المرور الجديدة" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input label="تأكيد كلمة المرور الجديدة" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <FiSave size={16} /> حفظ
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

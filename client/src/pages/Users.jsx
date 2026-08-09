import { useEffect, useState } from "react";
import { FiPlus, FiKey, FiUserX, FiUserCheck as FiActivate, FiShield } from "react-icons/fi";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { Button, Input, Select, Badge, Card } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import PermissionsModal from "../components/PermissionsModal";
import { useToast } from "../context/ToastContext";
import { ROLE_LABELS } from "../utils/navConfig";
import { formatDateTime } from "../utils/dateFormat";

const EMPTY = { username: "", fullName: "", password: "", role: "Assistant" };

export default function Users() {
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [toggleTarget, setToggleTarget] = useState(null);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/users").then((res) => setUsers(res.data));
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/users", form);
      push("تم إنشاء المستخدم بنجاح", "success");
      setModalOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      push(err.response?.data?.error || "حدث خطأ", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) {
      push("كلمة المرور يجب أن تكون 8 أحرف على الأقل", "error");
      return;
    }
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, { newPassword });
      push("تم إعادة تعيين كلمة المرور", "success");
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      push(err.response?.data?.error || "تعذر إعادة التعيين", "error");
    }
  };

  const toggleActive = async () => {
    try {
      await api.put(`/users/${toggleTarget.id}`, { active: !toggleTarget.active });
      push(toggleTarget.active ? "تم إيقاف المستخدم" : "تم تفعيل المستخدم", "success");
      setToggleTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "حدث خطأ", "error");
    }
  };

  const columns = [
    { key: "fullName", label: "الاسم الكامل", render: (u) => <span className="font-medium">{u.fullName}</span> },
    { key: "username", label: "اسم المستخدم", render: (u) => <span className="num">{u.username}</span> },
    { key: "role", label: "الدور", render: (u) => <Badge tone={u.role === "IT" ? "rescue" : u.role === "Administrator" ? "amber" : "neutral"}>{ROLE_LABELS[u.role]}</Badge> },
    { key: "active", label: "الحالة", render: (u) => <Badge tone={u.active ? "safe" : "neutral"}>{u.active ? "مفعّل" : "موقوف"}</Badge> },
    { key: "lastLogin", label: "آخر دخول", render: (u) => <span className="num text-xs">{u.lastLogin ? formatDateTime(u.lastLogin) : "—"}</span> },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (u) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPermissionsTarget(u)}
            title="إدارة الصلاحيات"
            className="p-1.5 rounded-lg hover:bg-safe-500/10 text-safe-400"
          >
            <FiShield size={16} />
          </button>
          <button onClick={() => setResetTarget(u)} title="إعادة تعيين كلمة المرور" className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
            <FiKey size={16} />
          </button>
          <button
            onClick={() => setToggleTarget(u)}
            title={u.active ? "إيقاف" : "تفعيل"}
            className={`p-1.5 rounded-lg ${u.active ? "hover:bg-rescue-500/10 text-rescue-400" : "hover:bg-safe-500/10 text-safe-400"}`}
          >
            {u.active ? <FiUserX size={16} /> : <FiActivate size={16} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">إدارة المستخدمين</h1>
          <p className="text-mist-400 mt-1">إنشاء الحسابات وإدارة الصلاحيات (تقنية المعلومات فقط)</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <FiPlus size={16} /> مستخدم جديد
        </Button>
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={users} searchKeys={["username", "fullName"]} emptyLabel="لا يوجد مستخدمون" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إنشاء مستخدم جديد">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="الاسم الكامل" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="اسم المستخدم" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="كلمة المرور المبدئية" required type="text" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="الدور" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="IT">تقنية المعلومات</option>
            <option value="Administrator">مسؤول العمليات</option>
            <option value="Assistant">مساعد</option>
          </Select>
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>إنشاء</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`إعادة تعيين كلمة مرور ${resetTarget?.username || ""}`}>
        <div className="flex flex-col gap-4">
          <Input label="كلمة المرور الجديدة" type="text" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetTarget(null)}>إلغاء</Button>
            <Button onClick={resetPassword}>تأكيد</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={toggleActive}
        danger={!!toggleTarget?.active}
        title={toggleTarget?.active ? "إيقاف مستخدم" : "تفعيل مستخدم"}
        message={`هل تريد ${toggleTarget?.active ? "إيقاف" : "تفعيل"} حساب "${toggleTarget?.username}"؟`}
        confirmLabel={toggleTarget?.active ? "إيقاف" : "تفعيل"}
      />

      <PermissionsModal
        open={!!permissionsTarget}
        onClose={() => {
          setPermissionsTarget(null);
          load();
        }}
        targetUser={permissionsTarget}
      />
    </div>
  );
}

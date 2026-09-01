import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiDollarSign } from "react-icons/fi";
import api from "../../services/api";
import DataTable from "../../components/ui/DataTable";
import { Button, Input, Textarea, Card, Badge } from "../../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/dateFormat";

const EMPTY = { description: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" };

export default function Payments() {
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "finances", "manage");

  const [payments, setPayments] = useState([]);
  const [donations, setDonations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get("/payments").then((res) => setPayments(res.data));
    api.get("/donations").then((res) => setDonations(res.data)).catch(() => setDonations([]));
  };
  useEffect(() => {
    load();
  }, []);

  const totalDonations = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = totalDonations - totalPaid;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ description: p.description || "", amount: p.amount, date: p.date || "", notes: p.notes || "" });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !amount || amount <= 0) {
      push("يرجى إدخال بيان المبلغ وقيمة صحيحة أكبر من صفر", "error");
      return;
    }
    setLoading(true);
    try {
      const body = { ...form, amount };
      if (editing) {
        await api.put(`/payments/${editing.id}`, { ...body, _expectedVersion: editing._version });
        push("تم تحديث الدفعة", "success");
      } else {
        await api.post("/payments", body);
        push("تمت إضافة الدفعة", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      push(err.response?.data?.error || "حدث خطأ", "error");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/payments/${deleteTarget.id}`);
      push("تم حذف الدفعة", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const columns = [
    { key: "description", label: "البند", render: (p) => <span className="font-medium">{p.description}</span> },
    { key: "amount", label: "المبلغ", render: (p) => <span className="num font-bold text-rescue-400">${Number(p.amount).toLocaleString()}</span> },
    { key: "date", label: "التاريخ", render: (p) => <span className="num">{formatDate(p.date)}</span> },
    { key: "createdBy", label: "بواسطة" },
    ...(canWrite
      ? [
          {
            key: "actions",
            label: "",
            sortable: false,
            render: (p) => (
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
                  <FiEdit2 size={16} />
                </button>
                <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400">
                  <FiTrash2 size={16} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">المدفوعات</h1>
          <p className="text-mist-400 mt-1">سجل ما تم الدفع مقابله وما تبقى من التبرعات</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <FiPlus size={16} /> إضافة دفعة
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-mist-400 mb-1">إجمالي التبرعات</div>
          <div className="text-xl font-extrabold num text-safe-400">${totalDonations.toLocaleString()}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-mist-400 mb-1">إجمالي المدفوعات</div>
          <div className="text-xl font-extrabold num text-rescue-400">${totalPaid.toLocaleString()}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-mist-400 mb-1">المتبقي</div>
          <div className={`text-xl font-extrabold num ${remaining < 0 ? "text-rescue-400" : "text-amber-400"}`}>
            ${remaining.toLocaleString()}
          </div>
          {remaining < 0 && <Badge tone="rescue">تجاوز الميزانية</Badge>}
        </Card>
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={payments} searchKeys={["description", "notes"]} emptyLabel="لا توجد مدفوعات مسجلة بعد" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل دفعة" : "إضافة دفعة جديدة"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="ما تم الدفع مقابله" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="المبلغ" type="number" min={0} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="التاريخ" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Textarea label="ملاحظات" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="حذف دفعة"
        message={`هل تريد حذف "${deleteTarget?.description}"؟`}
      />
    </div>
  );
}

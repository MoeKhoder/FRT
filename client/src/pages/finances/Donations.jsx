import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import api from "../../services/api";
import DataTable from "../../components/ui/DataTable";
import { Button, Input, Textarea, Card } from "../../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/dateFormat";

const EMPTY = { donorName: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" };

export default function Donations() {
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "finances", "manage");

  const [donations, setDonations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/donations").then((res) => setDonations(res.data));
  useEffect(() => {
    load();
  }, []);

  const total = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ donorName: d.donorName || "", amount: d.amount, date: d.date || "", notes: d.notes || "" });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.donorName.trim() || !amount || amount <= 0) {
      push("يرجى إدخال اسم المتبرع ومبلغاً صحيحاً أكبر من صفر", "error");
      return;
    }
    setLoading(true);
    try {
      const body = { ...form, amount };
      if (editing) {
        await api.put(`/donations/${editing.id}`, { ...body, _expectedVersion: editing._version });
        push("تم تحديث بيانات التبرع", "success");
      } else {
        await api.post("/donations", body);
        push("تمت إضافة التبرع", "success");
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
      await api.delete(`/donations/${deleteTarget.id}`);
      push("تم حذف التبرع", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const columns = [
    { key: "donorName", label: "اسم المتبرع", render: (d) => <span className="font-medium">{d.donorName}</span> },
    { key: "amount", label: "المبلغ", render: (d) => <span className="num font-bold text-safe-400">${Number(d.amount).toLocaleString()}</span> },
    { key: "date", label: "التاريخ", render: (d) => <span className="num">{formatDate(d.date)}</span> },
    { key: "createdBy", label: "بواسطة" },
    ...(canWrite
      ? [
          {
            key: "actions",
            label: "",
            sortable: false,
            render: (d) => (
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
                  <FiEdit2 size={16} />
                </button>
                <button onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400">
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
          <h1 className="text-2xl font-extrabold">التبرعات</h1>
          <p className="text-mist-400 mt-1">سجل المتبرعين ومبالغهم</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <FiPlus size={16} /> إضافة تبرع
          </Button>
        )}
      </div>

      <Card className="p-4 text-center sm:w-64">
        <div className="text-xs text-mist-400 mb-1">إجمالي التبرعات</div>
        <div className="text-2xl font-extrabold num text-safe-400">${total.toLocaleString()}</div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={donations} searchKeys={["donorName", "notes"]} emptyLabel="لا يوجد متبرعون مسجلون بعد" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل تبرع" : "إضافة تبرع جديد"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="اسم المتبرع" required value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} placeholder="الاسم الأول والأخير" />
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
        title="حذف تبرع"
        message={`هل تريد حذف تبرع "${deleteTarget?.donorName}"؟`}
      />
    </div>
  );
}

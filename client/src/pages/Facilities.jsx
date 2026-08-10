import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiHome } from "react-icons/fi";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { Button, Input, Select, Textarea, Badge, Card } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import { useToast } from "../context/ToastContext";

const TYPES = [
  "مستشفى", "مركز إطفاء", "مركز شرطة", "ملجأ", "نقطة إخلاء",
  "مركز قيادة", "مصدر مياه", "منطقة هبوط", "حاجز طريق", "منطقة آمنة", "أخرى",
];

const EMPTY = { name: "", type: TYPES[0], lat: null, lng: null, notes: "" };

export default function Facilities() {
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "facilities", "manage");

  const [facilities, setFacilities] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/facilities").then((res) => setFacilities(res.data));
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };
  const openEdit = (f) => {
    setEditing(f);
    setForm({ ...EMPTY, ...f });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.lat == null || form.lng == null) {
      push("يرجى تحديد الموقع على الخريطة", "error");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/facilities/${editing.id}`, form);
        push("تم تحديث المرفق", "success");
      } else {
        await api.post("/facilities", form);
        push("تمت إضافة المرفق", "success");
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
      await api.delete(`/facilities/${deleteTarget.id}`);
      push("تم حذف المرفق", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const columns = [
    { key: "name", label: "الاسم", render: (f) => <span className="font-medium flex items-center gap-1.5"><FiHome size={14} className="text-safe-400" />{f.name}</span> },
    { key: "type", label: "النوع", render: (f) => <Badge tone="neutral">{f.type}</Badge> },
    { key: "notes", label: "ملاحظات" },
    ...(canWrite
      ? [{
          key: "actions", label: "", sortable: false,
          render: (f) => (
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100"><FiEdit2 size={16} /></button>
              <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400"><FiTrash2 size={16} /></button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">المرافق والنقاط الجغرافية</h1>
          <p className="text-mist-400 mt-1">مستشفيات، مراكز قيادة، مناطق آمنة، ونقاط تجمع</p>
        </div>
        {canWrite && <Button onClick={openCreate}><FiPlus size={16} /> إضافة مرفق</Button>}
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={facilities} searchKeys={["name", "type"]} emptyLabel="لا توجد مرافق مسجلة" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل المرفق" : "إضافة مرفق جديد"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="الاسم" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div>
            <span className="text-sm text-mist-400 font-medium">الموقع</span>
            <div className="flex items-center gap-2 mt-1.5">
              <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                <FiMapPin size={16} /> {form.lat ? "تعديل الموقع" : "تحديد على الخريطة"}
              </Button>
              {form.lat != null && (
                <span className="text-xs text-mist-400 num">{form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>
              )}
            </div>
          </div>
          <Textarea label="ملاحظات" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </div>
        </form>
      </Modal>

      <LocationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(lat, lng) => setForm({ ...form, lat, lng })}
        initialLat={form.lat}
        initialLng={form.lng}
        title="تحديد موقع المرفق"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="حذف مرفق"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟`}
      />
    </div>
  );
}

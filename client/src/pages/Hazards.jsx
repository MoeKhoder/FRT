import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiAlertTriangle } from "react-icons/fi";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { Button, Input, Select, Textarea, Badge, Card } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/dateFormat";

const TYPES = [
  "فيضان", "حريق", "انفجار", "انهيار مبنى", "حالة طبية طارئة", "تسرب كيميائي",
  "حادث سير", "أضرار زلزال", "أضرار عاصفة", "انزلاق تربة", "شخص مفقود", "حريق غابات", "أخرى",
];
const SEVERITIES = ["منخفضة", "متوسطة", "عالية", "حرجة"];
const STATUSES = ["نشط", "تحت المعالجة", "محلول"];
const SEVERITY_TONE = { منخفضة: "safe", متوسطة: "amber", عالية: "rescue", حرجة: "rescue" };
const STATUS_TONE = { نشط: "rescue", "تحت المعالجة": "amber", محلول: "safe" };

const EMPTY = {
  type: TYPES[0],
  severity: "متوسطة",
  status: "نشط",
  lat: null,
  lng: null,
  radiusMeters: 200,
  description: "",
  date: new Date().toISOString().slice(0, 10),
  riskScore: 3,
};

export default function Hazards() {
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "hazards", "manage");

  const [hazards, setHazards] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/hazards").then((res) => setHazards(res.data));
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };
  const openEdit = (h) => {
    setEditing(h);
    setForm({ ...EMPTY, ...h });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.lat == null || form.lng == null) {
      push("يرجى تحديد موقع الخطر على الخريطة", "error");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/hazards/${editing.id}`, form);
        push("تم تحديث الخطر", "success");
      } else {
        await api.post("/hazards", form);
        push("تمت إضافة الخطر", "success");
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
      await api.delete(`/hazards/${deleteTarget.id}`);
      push("تم حذف الخطر", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const columns = [
    { key: "type", label: "النوع", render: (h) => <span className="font-medium flex items-center gap-1.5"><FiAlertTriangle size={14} className="text-rescue-400" />{h.type}</span> },
    { key: "severity", label: "الخطورة", render: (h) => <Badge tone={SEVERITY_TONE[h.severity] || "neutral"}>{h.severity}</Badge> },
    { key: "status", label: "الحالة", render: (h) => <Badge tone={STATUS_TONE[h.status] || "neutral"}>{h.status}</Badge> },
    { key: "date", label: "التاريخ", render: (h) => <span className="num">{formatDate(h.date)}</span> },
    { key: "riskScore", label: "درجة الخطورة", render: (h) => <span className="num">{h.riskScore}/5</span> },
    { key: "createdBy", label: "المُبلّغ" },
    ...(canWrite
      ? [{
          key: "actions", label: "", sortable: false,
          render: (h) => (
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100"><FiEdit2 size={16} /></button>
              <button onClick={() => setDeleteTarget(h)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400"><FiTrash2 size={16} /></button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">المخاطر</h1>
          <p className="text-mist-400 mt-1">تسجيل ومتابعة المخاطر والحوادث جغرافياً</p>
        </div>
        {canWrite && <Button onClick={openCreate}><FiPlus size={16} /> تسجيل خطر</Button>}
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={hazards} searchKeys={["type", "description"]} emptyLabel="لا توجد مخاطر مسجلة" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل الخطر" : "تسجيل خطر جديد"} wide>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="مستوى الخطورة" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="التاريخ" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="نطاق التأثير (متر)" type="number" min={0} value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })} />
          <Input label="درجة الخطورة (1-5)" type="number" min={1} max={5} value={form.riskScore} onChange={(e) => setForm({ ...form, riskScore: Number(e.target.value) })} />

          <div className="sm:col-span-2">
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

          <Textarea label="الوصف" className="sm:col-span-2" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>{editing ? "حفظ التعديلات" : "تسجيل"}</Button>
          </div>
        </form>
      </Modal>

      <LocationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(lat, lng) => setForm({ ...form, lat, lng })}
        initialLat={form.lat}
        initialLng={form.lng}
        title="تحديد موقع الخطر"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="حذف خطر"
        message={`هل أنت متأكد من حذف "${deleteTarget?.type}"؟`}
      />
    </div>
  );
}

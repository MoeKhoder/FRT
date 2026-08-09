import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiStar, FiClipboard } from "react-icons/fi";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { Button, Input, Select, Textarea, Badge, Card } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import RatingModal from "../components/RatingModal";
import SurveyModal from "../components/SurveyModal";
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { can } from "../utils/permissions";
import { formatDate } from "../utils/dateFormat";

const STATUS_TONE = { "قيد الانتظار": "amber", "قيد التنفيذ": "rescue", مكتملة: "safe", ملغاة: "neutral" };
const TYPES = ["إنقاذ جبلي", "إنقاذ مائي", "إسعاف أولي", "إخلاء", "بحث وإنقاذ", "أخرى"];
const PRIORITIES = ["منخفضة", "متوسطة", "عالية", "طارئة"];

const EMPTY = {
  missionName: "",
  missionType: TYPES[0],
  priority: "متوسطة",
  status: "قيد الانتظار",
  location: "",
  lat: null,
  lng: null,
  startDate: "",
  endDate: "",
  description: "",
  leader: "",
  coLeader: "",
  members: [],
};

export default function Missions() {
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "missions", "manage");
  const canRate = can(user, "ratings", "manage");
  const canSurvey = can(user, "surveys", "manage");

  const [missions, setMissions] = useState([]);
  const [members, setMembers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [surveyTarget, setSurveyTarget] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.get("/missions").then((res) => setMissions(res.data));
    api.get("/members").then((res) => setMembers(res.data));
  };
  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setModalOpen(true);
  };
  const openEdit = (m) => {
    setEditing(m);
    setForm({ ...EMPTY, ...m, members: m.members || [] });
    setError("");
    setModalOpen(true);
  };

  const toggleMember = (id) => {
    setForm((f) => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter((x) => x !== id) : [...f.members, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.leader && form.leader === form.coLeader) {
      setError("لا يمكن أن يكون العضو قائداً ونائب قائد في نفس المهمة");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/missions/${editing.id}`, form);
        push("تم تحديث المهمة", "success");
      } else {
        await api.post("/missions", form);
        push("تمت إضافة المهمة", "success");
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
      await api.delete(`/missions/${deleteTarget.id}`);
      push("تم حذف المهمة", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const memberName = (id) => {
    const m = members.find((x) => x.id === id);
    return m ? `${m.firstName} ${m.lastName}` : "—";
  };

  const columns = [
    { key: "missionName", label: "اسم المهمة", render: (m) => <span className="font-medium">{m.missionName}</span> },
    { key: "missionType", label: "النوع" },
    { key: "priority", label: "الأولوية", render: (m) => <Badge tone={m.priority === "طارئة" ? "rescue" : "neutral"}>{m.priority}</Badge> },
    { key: "location", label: "الموقع", render: (m) => <span className="flex items-center gap-1"><FiMapPin size={13} className="text-mist-400" />{m.location || "—"}</span> },
    { key: "startDate", label: "تاريخ البدء", render: (m) => <span className="num">{formatDate(m.startDate)}</span> },
    { key: "status", label: "الحالة", render: (m) => <Badge tone={STATUS_TONE[m.status] || "neutral"}>{m.status}</Badge> },
    ...(canWrite || canRate || canSurvey
      ? [
          {
            key: "actions",
            label: "",
            sortable: false,
            render: (m) => (
              <div className="flex items-center gap-1">
                {canSurvey && (
                  <button onClick={() => setSurveyTarget(m)} title="استبيان المهمة" className="p-1.5 rounded-lg hover:bg-safe-500/10 text-safe-400">
                    <FiClipboard size={16} />
                  </button>
                )}
                {canRate && (
                  <button onClick={() => setRatingTarget(m)} title="تقييم الأعضاء" className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400">
                    <FiStar size={16} />
                  </button>
                )}
                {canWrite && (
                  <>
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
                      <FiEdit2 size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400">
                      <FiTrash2 size={16} />
                    </button>
                  </>
                )}
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
          <h1 className="text-2xl font-extrabold">المهام</h1>
          <p className="text-mist-400 mt-1">تخطيط ومتابعة مهام الإنقاذ</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <FiPlus size={16} /> إضافة مهمة
          </Button>
        )}
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={missions} searchKeys={["missionName", "location"]} emptyLabel="لا توجد مهام بعد" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل المهمة" : "إضافة مهمة جديدة"} wide>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Input label="اسم المهمة" required value={form.missionName} onChange={(e) => setForm({ ...form, missionName: e.target.value })} className="sm:col-span-2" />
          <Select label="نوع المهمة" value={form.missionType} onChange={(e) => setForm({ ...form, missionType: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="الأولوية" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="قيد الانتظار">قيد الانتظار</option>
            <option value="قيد التنفيذ">قيد التنفيذ</option>
            <option value="مكتملة">مكتملة</option>
            <option value="ملغاة">ملغاة</option>
          </Select>
          <div>
            <Input label="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs text-rescue-400 hover:underline flex items-center gap-1"
              >
                <FiMapPin size={12} /> {form.lat ? "تعديل الإحداثيات" : "تحديد الموقع على الخريطة"}
              </button>
              {form.lat != null && <span className="text-xs text-mist-400 num">{form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>}
            </div>
          </div>
          <Input label="تاريخ البدء" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="تاريخ الانتهاء" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Select label="قائد الفريق" value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })}>
            <option value="">— اختر —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </Select>
          <Select label="نائب القائد" value={form.coLeader} onChange={(e) => setForm({ ...form, coLeader: e.target.value })}>
            <option value="">— اختر —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </Select>
          <Textarea label="الوصف" className="sm:col-span-2" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="sm:col-span-2">
            <span className="text-sm text-mist-400 font-medium">الأعضاء المشاركون</span>
            <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
              {members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.members.includes(m.id)
                      ? "bg-rescue-500/15 border-rescue-500/40 text-rescue-400"
                      : "border-night-600 text-mist-400 hover:bg-night-700 [body.light_&]:border-mist-300 [body.light_&]:hover:bg-mist-100"
                  }`}
                >
                  {m.firstName} {m.lastName}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="sm:col-span-2 text-sm text-rescue-400">{error}</div>}

          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="حذف مهمة"
        message={`هل أنت متأكد من حذف مهمة "${deleteTarget?.missionName}"؟`}
      />

      <RatingModal
        open={!!ratingTarget}
        onClose={() => setRatingTarget(null)}
        mission={ratingTarget}
        members={members}
      />

      <SurveyModal
        open={!!surveyTarget}
        onClose={() => setSurveyTarget(null)}
        mission={surveyTarget}
        onTeamGenerated={load}
      />

      <LocationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
        initialLat={form.lat}
        initialLng={form.lng}
        title="تحديد موقع المهمة"
      />
    </div>
  );
}

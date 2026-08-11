import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiMapPin } from "react-icons/fi";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { Button, Input, Select, Badge, Card } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import { useToast } from "../context/ToastContext";

const STATUS_TONE = { نشط: "safe", "غير نشط": "neutral", موقوف: "rescue" };
const RANKS = ["متطوع", "منقذ", "منقذ أول", "قائد فريق", "مدرب"];

const EMPTY = {
  firstName: "",
  lastName: "",
  nationalId: "",
  phone: "",
  emergencyContact: "",
  bloodType: "",
  address: "",
  lat: null,
  lng: null,
  joiningDate: "",
  status: "نشط",
  rank: "متطوع",
  position: "",
  skills: "",
};

export default function Members() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const canWrite = can(user, "members", "manage");

  const [members, setMembers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

<<<<<<< HEAD
  const load = () => api.get("/members").then((res) => setMembers(res.data));
=======
  const load = () =>
    Promise.allSettled([api.get("/members"), api.get("/missions")]).then(([mRes, missionsRes]) => {
      const memberRows = mRes.status === "fulfilled" ? mRes.value.data : [];
      const missions = missionsRes.status === "fulfilled" ? missionsRes.value.data : [];
      const withCounts = memberRows.map((m) => ({
        ...m,
        missionCount: missions.filter(
          (mi) => (mi.members || []).includes(m.id) || mi.leader === m.id || mi.coLeader === m.id
        ).length,
      }));
      setMembers(withCounts);
    });
>>>>>>> 05a7b7476b977115b9ad0a6b1f2bb5b987b6c644
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };
  const openEdit = (m) => {
    setEditing(m);
    setForm({ ...EMPTY, ...m });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/members/${editing.id}`, form);
        push("تم تحديث بيانات العضو", "success");
      } else {
        await api.post("/members", form);
        push("تمت إضافة العضو بنجاح", "success");
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
      await api.delete(`/members/${deleteTarget.id}`);
      push("تم حذف العضو", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const columns = [
    {
      key: "firstName",
      label: "الاسم",
      render: (m) => (
        <button
          onClick={() => navigate(`/members/${m.id}`)}
          className="font-medium text-mist-100 hover:text-rescue-400 [body.light_&]:text-night-900"
        >
          {m.firstName} {m.lastName}
        </button>
      ),
    },
    { key: "rank", label: "الرتبة" },
    { key: "phone", label: "الهاتف", render: (m) => <span className="num">{m.phone}</span> },
    { key: "status", label: "الحالة", render: (m) => <Badge tone={STATUS_TONE[m.status] || "neutral"}>{m.status}</Badge> },
    { key: "missionCount", label: "عدد المهام", render: (m) => m.missionCount ?? 0, sortable: false },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (m) => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/members/${m.id}`)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
            <FiEye size={16} />
          </button>
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
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">الأعضاء</h1>
          <p className="text-mist-400 mt-1">إدارة أعضاء فريق الإنقاذ</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <FiPlus size={16} /> إضافة عضو
          </Button>
        )}
      </div>

      <Card className="p-4">
        <DataTable
          columns={columns}
          data={members}
          searchKeys={["firstName", "lastName", "phone", "nationalId"]}
          emptyLabel="لا يوجد أعضاء بعد"
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل بيانات العضو" : "إضافة عضو جديد"} wide>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Input label="الاسم الأول" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="اسم العائلة" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="الرقم الوطني" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
          <Input label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="جهة اتصال الطوارئ" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
          <Input label="فصيلة الدم" value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} placeholder="O+" />
          <div>
            <Input label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="flex items-center gap-2 mt-1.5">
              <button type="button" onClick={() => setPickerOpen(true)} className="text-xs text-rescue-400 hover:underline flex items-center gap-1">
                <FiMapPin size={12} /> {form.lat ? "تعديل الموقع" : "تحديد على الخريطة"}
              </button>
              {form.lat != null && <span className="text-xs text-mist-400 num">{form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>}
            </div>
          </div>
          <Input label="تاريخ الانضمام" type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
          <Select label="الرتبة" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })}>
            {RANKS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
          <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="نشط">نشط</option>
            <option value="غير نشط">غير نشط</option>
            <option value="موقوف">موقوف</option>
          </Select>
          <Input label="المنصب" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <Input label="المهارات (مفصولة بفاصلة)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
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
        title="حذف عضو"
        message={`هل أنت متأكد من حذف ${deleteTarget?.firstName} ${deleteTarget?.lastName}؟ لا يمكن التراجع عن هذا الإجراء.`}
      />

      <LocationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
        initialLat={form.lat}
        initialLng={form.lng}
        title="تحديد موقع سكن العضو"
      />
    </div>
  );
}

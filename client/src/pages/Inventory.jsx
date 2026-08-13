import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiUserPlus, FiUserX } from "react-icons/fi";
import api from "../services/api";
import { useOptionList } from "../hooks/useOptionList";
import DataTable from "../components/ui/DataTable";
import { Button, Input, Select, Textarea, Badge, Card } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/dateFormat";

const DEFAULT_CATEGORIES = ["حبال وتسلق", "إسعاف أولي", "غوص وإنقاذ مائي", "اتصالات", "إضاءة", "أدوات قطع", "حماية شخصية", "أخرى"];
const STATUS_TONE = { متاح: "safe", مخصص: "amber", صيانة: "amber", تالف: "rescue", مفقود: "rescue" };

const EMPTY = {
  name: "",
  category: DEFAULT_CATEGORIES[0],
  serialNumber: "",
  purchaseDate: "",
  condition: "جيد",
  availableQuantity: 1,
  assignedQuantity: 0,
  storageLocation: "",
  lat: null,
  lng: null,
  nextMaintenance: "",
  status: "متاح",
  notes: "",
};

export default function Inventory() {
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "inventory", "manage");
  const CATEGORIES = useOptionList("inventoryCategories", DEFAULT_CATEGORIES);

  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    api.get("/inventory").then((res) => setItems(res.data));
    api.get("/members").then((res) => setMembers(res.data)).catch(() => setMembers([]));
  };
  useEffect(() => {
    load();
  }, []);

  const memberName = (id) => {
    const m = members.find((x) => x.id === id);
    return m ? `${m.firstName} ${m.lastName}` : null;
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };
  const openEdit = (i) => {
    setEditing(i);
    setForm({ ...EMPTY, ...i });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/inventory/${editing.id}`, form);
        push("تم تحديث بيانات المعدة", "success");
      } else {
        await api.post("/inventory", form);
        push("تمت إضافة المعدة", "success");
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
      await api.delete(`/inventory/${deleteTarget.id}`);
      push("تم حذف المعدة", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const openAssign = (item) => {
    setAssignTarget(item);
    setAssignMemberId("");
  };

  const confirmAssign = async () => {
    if (!assignMemberId) {
      push("يرجى اختيار عضو", "error");
      return;
    }
    setAssigning(true);
    try {
      await api.put(`/inventory/${assignTarget.id}`, {
        assignedToMemberId: assignMemberId,
        assignedAt: new Date().toISOString(),
        status: "مخصص",
      });
      push("تم تخصيص المعدة", "success");
      setAssignTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر التخصيص", "error");
    } finally {
      setAssigning(false);
    }
  };

  const returnItem = async (item) => {
    try {
      await api.put(`/inventory/${item.id}`, {
        assignedToMemberId: null,
        assignedAt: null,
        status: "متاح",
      });
      push("تم إرجاع المعدة", "success");
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الإرجاع", "error");
    }
  };

  const columns = [
    { key: "name", label: "الاسم", render: (i) => <span className="font-medium">{i.name}</span> },
    { key: "category", label: "الفئة" },
    { key: "serialNumber", label: "الرقم التسلسلي", render: (i) => <span className="num">{i.serialNumber || "—"}</span> },
    { key: "availableQuantity", label: "الكمية المتاحة", render: (i) => <span className="num">{i.availableQuantity}</span> },
    { key: "storageLocation", label: "موقع التخزين" },
    { key: "status", label: "الحالة", render: (i) => <Badge tone={STATUS_TONE[i.status] || "neutral"}>{i.status}</Badge> },
    {
      key: "assignedToMemberId",
      label: "المستخدم الحالي",
      sortable: false,
      render: (i) => {
        if (!i.assignedToMemberId) return <span className="text-mist-400 text-sm">—</span>;
        const name = memberName(i.assignedToMemberId);
        if (name) {
          return (
            <div>
              <div className="font-medium text-sm">{name}</div>
              {i.assignedAt && <div className="text-xs text-mist-400 num">{formatDate(i.assignedAt)}</div>}
            </div>
          );
        }
        // members.length === 0 likely means this user lacks members:view, not that
        // the member was actually deleted — avoid a misleading label either way.
        return <span className="text-mist-400 text-sm">{members.length === 0 ? "مخصص" : "عضو محذوف"}</span>;
      },
    },
    { key: "nextMaintenance", label: "الصيانة القادمة", render: (i) => <span className="num">{formatDate(i.nextMaintenance)}</span> },
    ...(canWrite
      ? [
          {
            key: "actions",
            label: "",
            sortable: false,
            render: (i) => (
              <div className="flex items-center gap-1">
                {i.assignedToMemberId ? (
                  <button onClick={() => returnItem(i)} title="إرجاع" className="p-1.5 rounded-lg hover:bg-safe-500/10 text-safe-400">
                    <FiUserX size={16} />
                  </button>
                ) : (
                  <button onClick={() => openAssign(i)} title="تخصيص لعضو" className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400">
                    <FiUserPlus size={16} />
                  </button>
                )}
                <button onClick={() => openEdit(i)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
                  <FiEdit2 size={16} />
                </button>
                <button onClick={() => setDeleteTarget(i)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400">
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
          <h1 className="text-2xl font-extrabold">المخزون</h1>
          <p className="text-mist-400 mt-1">إدارة معدات وتجهيزات الفريق</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <FiPlus size={16} /> إضافة معدة
          </Button>
        )}
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={items} searchKeys={["name", "serialNumber", "storageLocation"]} emptyLabel="لا توجد معدات بعد" />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل المعدة" : "إضافة معدة جديدة"} wide>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Input label="اسم المعدة" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="الفئة" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="الرقم التسلسلي" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          <Input label="تاريخ الشراء" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          <Input label="الكمية المتاحة" type="number" min={0} value={form.availableQuantity} onChange={(e) => setForm({ ...form, availableQuantity: Number(e.target.value) })} />
          <Input label="الكمية المخصصة" type="number" min={0} value={form.assignedQuantity} onChange={(e) => setForm({ ...form, assignedQuantity: Number(e.target.value) })} />
          <div>
            <Input label="موقع التخزين" value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} />
            <div className="flex items-center gap-2 mt-1.5">
              <button type="button" onClick={() => setPickerOpen(true)} className="text-xs text-rescue-400 hover:underline flex items-center gap-1">
                <FiMapPin size={12} /> {form.lat ? "تعديل الموقع" : "تحديد على الخريطة"}
              </button>
              {form.lat != null && <span className="text-xs text-mist-400 num">{form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>}
            </div>
          </div>
          <Input label="الصيانة القادمة" type="date" value={form.nextMaintenance} onChange={(e) => setForm({ ...form, nextMaintenance: e.target.value })} />
          <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="متاح">متاح</option>
            <option value="مخصص">مخصص</option>
            <option value="صيانة">صيانة</option>
            <option value="تالف">تالف</option>
            <option value="مفقود">مفقود</option>
          </Select>
          <Select label="الحالة الفنية" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            <option value="ممتاز">ممتاز</option>
            <option value="جيد">جيد</option>
            <option value="مقبول">مقبول</option>
            <option value="ضعيف">ضعيف</option>
          </Select>
          <Textarea label="ملاحظات" className="sm:col-span-2" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title={`تخصيص "${assignTarget?.name}" لعضو`}>
        <div className="flex flex-col gap-4">
          <Select label="العضو" value={assignMemberId} onChange={(e) => setAssignMemberId(e.target.value)}>
            <option value="">— اختر —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>إلغاء</Button>
            <Button onClick={confirmAssign} disabled={assigning}>تخصيص</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="حذف معدة"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟`}
      />

      <LocationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
        initialLat={form.lat}
        initialLng={form.lng}
        title="تحديد موقع المعدة"
      />
    </div>
  );
}

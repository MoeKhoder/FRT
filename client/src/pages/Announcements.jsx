import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiTrash2, FiBell, FiDownload, FiEdit2 } from "react-icons/fi";
import api from "../services/api";
import { useOptionList } from "../hooks/useOptionList";
import { Button, Input, Select, Textarea, Badge, Card } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/dateFormat";

const DEFAULT_CATEGORIES = ["قرار إداري", "إعلان عام", "محضر إجتماع"];
const EMPTY = { title: "", body: "", priority: "عادية", category: DEFAULT_CATEGORIES[1] };

export default function Announcements() {
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "announcements", "manage");
  const CATEGORIES = useOptionList("announcementCategories", DEFAULT_CATEGORIES);

  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("الكل");

  const load = () =>
    api.get("/announcements").then((res) =>
      setItems(res.data.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    );
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditingItem(a);
    setForm({
      title: a.title || "",
      body: a.body || "",
      priority: a.priority || "عادية",
      category: a.category || CATEGORIES[1],
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        await api.put(`/announcements/${editingItem.id}`, form);
        push("تم تحديث الإعلان", "success");
      } else {
        await api.post("/announcements", form);
        push("تم نشر الإعلان", "success");
      }
      setModalOpen(false);
      setEditingItem(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      push(err.response?.data?.error || "حدث خطأ", "error");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/announcements/${deleteTarget.id}`);
      push("تم حذف الإعلان", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const counts = useMemo(() => {
    const c = { "الكل": items.length };
    CATEGORIES.forEach((cat) => {
      c[cat] = items.filter((a) => (a.category || CATEGORIES[1]) === cat).length;
    });
    return c;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (activeCategory === "الكل") return items;
    return items.filter((a) => (a.category || CATEGORIES[1]) === activeCategory);
  }, [items, activeCategory]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">الإعلانات</h1>
          <p className="text-mist-400 mt-1">إعلانات ومستجدات الفريق</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <FiPlus size={16} /> إعلان جديد
          </Button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap border-b border-night-700 [body.light_&]:border-mist-200 pb-px">
        {["الكل", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeCategory === cat
                ? "border-rescue-500 text-rescue-400"
                : "border-transparent text-mist-400 hover:text-mist-100"
            }`}
          >
            {cat} <span className="text-xs num text-mist-400">({counts[cat] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visibleItems.length === 0 && <p className="text-mist-400 text-sm">لا توجد إعلانات في هذا القسم</p>}
        {visibleItems.map((a) => (
          <Card key={a.id} className="p-4 flex items-start gap-3">
            <div className="rounded-lg p-2 bg-rescue-500/10 text-rescue-400 shrink-0">
              <FiBell size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold">{a.title}</h3>
                <Badge tone="neutral">{a.category || CATEGORIES[1]}</Badge>
                <Badge tone={a.priority === "عاجل" ? "rescue" : a.priority === "مهم" ? "amber" : "neutral"}>{a.priority}</Badge>
              </div>
              <p className="text-sm text-mist-300 mt-1">{a.body}</p>
              <div className="text-xs text-mist-400 mt-2 num">{formatDateTime(a.createdAt)} · {a.createdBy}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => window.open(`/announcements/${a.id}/print`, "_blank")}
                title="تصدير PDF"
                className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100"
              >
                <FiDownload size={16} />
              </button>
              {canWrite && (
                <>
                  <button
                    onClick={() => openEdit(a)}
                    title="تعديل"
                    className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400">
                    <FiTrash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "تعديل إعلان" : "إعلان جديد"}
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Select label="القسم" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="العنوان" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="النص" required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Select label="الأولوية" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="عادية">عادية</option>
            <option value="مهم">مهم</option>
            <option value="عاجل">عاجل</option>
          </Select>
          <div className="flex justify-end gap-2 mt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingItem(null);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>{editingItem ? "حفظ التعديلات" : "نشر"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="حذف إعلان"
        message={`هل أنت متأكد من حذف "${deleteTarget?.title}"؟`}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowRight, FiPhone, FiDroplet, FiMapPin, FiCalendar, FiStar, FiCamera,
  FiFile, FiUpload, FiTrash2, FiAlertTriangle, FiPlus, FiDownload, FiFileText,
  FiEdit2, FiCreditCard,
} from "react-icons/fi";
import api, { withAuthToken } from "../services/api";
import { Card, Badge, Spinner, Button, Input, Select, Textarea } from "../components/ui/Primitives";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { can } from "../utils/permissions";
import { useOptionList } from "../hooks/useOptionList";
import { formatDate, formatDateTime } from "../utils/dateFormat";

const DEFAULT_DOC_TYPES = ["هوية", "شهادة ميلاد", "نموذج طبي", "رخصة قيادة", "شهادة تدريب", "شهادة إنقاذ", "تأمين", "أخرى"];
const DEFAULT_WARNING_SEVERITIES = ["ملاحظة شفهية", "تنبيه بسيط", "إنذار", "إنذار نهائي"];
const SEVERITY_TONE = { "ملاحظة شفهية": "neutral", "تنبيه بسيط": "amber", إنذار: "rescue", "إنذار نهائي": "rescue" };

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const canWrite = can(user, "members", "manage");
  const canDocs = can(user, "documents", "manage");
  const DOC_TYPES = useOptionList("documentTypes", DEFAULT_DOC_TYPES);
  const WARNING_SEVERITIES = useOptionList("warningSeverities", DEFAULT_WARNING_SEVERITIES);

  const [member, setMember] = useState(null);
  const [missions, setMissions] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const photoInput = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({ documentType: DOC_TYPES[0], expirationDate: "", notes: "" });
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);

  const [warnModalOpen, setWarnModalOpen] = useState(false);
  const [editingWarn, setEditingWarn] = useState(null);
  const EMPTY_WARN = { date: new Date().toISOString().slice(0, 10), severity: "تنبيه بسيط", reason: "", notes: "", endDate: "" };
  const [warnForm, setWarnForm] = useState(EMPTY_WARN);
  const [savingWarn, setSavingWarn] = useState(false);
  const [deleteWarnTarget, setDeleteWarnTarget] = useState(null);

  const load = () => {
    Promise.allSettled([
      api.get(`/members/${id}`), api.get("/missions"), api.get("/ratings"),
      api.get("/documents"), api.get("/warnings"),
    ])
      .then(([m, mi, r, docs, warn]) => {
        const val = (res) => (res.status === "fulfilled" ? res.value.data : null);
        const memberData = val(m);
        setMember(memberData);
        const missionsData = val(mi) || [];
        setMissions(missionsData.filter((x) => (x.members || []).includes(id) || x.leader === id || x.coLeader === id));
        setRatings((val(r) || []).filter((x) => x.memberId === id));
        setDocuments((val(docs) || []).filter((x) => x.memberId === id));
        setWarnings((val(warn) || []).filter((x) => x.memberId === id).sort((a, b) => new Date(b.date) - new Date(a.date)));
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onPhotoChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      push("حجم الصورة كبير جداً (الحد الأقصى 3 ميغابايت)", "error");
      if (photoInput.current) photoInput.current.value = "";
      return;
    }
    setUploadingPhoto(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.post(`/members/${id}/photo`, { photoDataUrl: dataUrl });
      setMember(res.data);
      push("تم تحديث الصورة", "success");
    } catch (err) {
      push(err.response?.data?.error || "تعذر رفع الصورة", "error");
    } finally {
      setUploadingPhoto(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  const submitDoc = async (e) => {
    e.preventDefault();
    if (!docFile) {
      push("يرجى اختيار ملف", "error");
      return;
    }
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", docFile);
      fd.append("memberId", id);
      fd.append("documentType", docForm.documentType);
      fd.append("expirationDate", docForm.expirationDate);
      fd.append("notes", docForm.notes);
      await api.post("/documents/upload", fd);
      push("تم رفع المستند", "success");
      setDocModalOpen(false);
      setDocFile(null);
      setDocForm({ documentType: DOC_TYPES[0], expirationDate: "", notes: "" });
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر رفع المستند", "error");
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDoc = async () => {
    try {
      await api.delete(`/documents/${deleteDocTarget.id}`);
      push("تم حذف المستند", "success");
      setDeleteDocTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const openCreateWarn = () => {
    setEditingWarn(null);
    setWarnForm(EMPTY_WARN);
    setWarnModalOpen(true);
  };

  const openEditWarn = (w) => {
    setEditingWarn(w);
    setWarnForm({
      date: w.date || "",
      severity: w.severity || "تنبيه بسيط",
      reason: w.reason || "",
      notes: w.notes || "",
      endDate: w.endDate || "",
    });
    setWarnModalOpen(true);
  };

  const submitWarning = async (e) => {
    e.preventDefault();
    setSavingWarn(true);
    try {
      if (editingWarn) {
        await api.put(`/warnings/${editingWarn.id}`, warnForm);
        push("تم تحديث الإنذار", "success");
      } else {
        await api.post("/warnings", { ...warnForm, memberId: id });
        push("تم تسجيل الإنذار", "success");
      }
      setWarnModalOpen(false);
      setEditingWarn(null);
      setWarnForm(EMPTY_WARN);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحفظ", "error");
    } finally {
      setSavingWarn(false);
    }
  };

  const removeWarning = async () => {
    try {
      await api.delete(`/warnings/${deleteWarnTarget.id}`);
      push("تم حذف الإنذار", "success");
      setDeleteWarnTarget(null);
      load();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (!member) return <p className="text-mist-400">العضو غير موجود</p>;

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + (Number(r.overall) || 0), 0) / ratings.length).toFixed(1)
      : "—";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-mist-400 hover:text-mist-100 w-fit">
          <FiArrowRight size={16} /> رجوع
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => window.open(`/members/${id}/id-card`, "_blank")}>
            <FiCreditCard size={16} /> طباعة البطاقة
          </Button>
          <Button variant="secondary" onClick={() => window.open(`/members/${id}/print`, "_blank")}>
            <FiDownload size={16} /> تصدير PDF
          </Button>
        </div>
      </div>

      <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative shrink-0">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.firstName} className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-rescue-500/15 text-rescue-400 flex items-center justify-center text-3xl font-extrabold">
              {member.firstName?.[0]}
            </div>
          )}
          {canWrite && (
            <button
              onClick={() => photoInput.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1.5 -left-1.5 rounded-full bg-rescue-500 text-white p-1.5 shadow-lg hover:bg-rescue-600"
              title="تغيير الصورة"
            >
              {uploadingPhoto ? <Spinner size={12} /> : <FiCamera size={12} />}
            </button>
          )}
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPhotoChosen} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-extrabold">{member.firstName} {member.lastName}</h1>
            <Badge tone={member.status === "نشط" ? "safe" : "neutral"}>{member.status}</Badge>
            {member.frtNumber && <Badge tone="neutral"><span className="num">{member.frtNumber}</span></Badge>}
          </div>
          <p className="text-mist-400 mt-1">{member.rank} · {member.position || "—"}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-mist-300">
            <span className="flex items-center gap-1.5 num"><FiPhone size={14} /> {member.phone || "—"}</span>
            <span className="flex items-center gap-1.5"><FiDroplet size={14} /> {member.bloodType || "—"}</span>
            <span className="flex items-center gap-1.5"><FiMapPin size={14} /> {member.address || "—"}</span>
            <span className="flex items-center gap-1.5 num"><FiCalendar size={14} /> {formatDate(member.joiningDate)}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 bg-night-700/40 rounded-xl px-5 py-3 [body.light_&]:bg-mist-100">
          <div className="flex items-center gap-1 text-amber-400"><FiStar size={16} /><span className="text-xl font-extrabold num">{avgRating}</span></div>
          <span className="text-xs text-mist-400">متوسط التقييم</span>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-extrabold num">{missions.length}</div>
          <div className="text-xs text-mist-400 mt-1">عدد المهام</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-extrabold num">{missions.filter((m) => m.status === "مكتملة").length}</div>
          <div className="text-xs text-mist-400 mt-1">مهام مكتملة</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-extrabold num">{member.trainingHours || 0}</div>
          <div className="text-xs text-mist-400 mt-1">ساعات التدريب</div>
        </Card>
      </div>

      {member.skills && (
        <Card className="p-5">
          <h3 className="font-bold mb-3">المهارات</h3>
          <div className="flex flex-wrap gap-2">
            {String(member.skills).split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
              <Badge key={s} tone="neutral">{s}</Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-bold mb-3">سجل المهام</h3>
        {missions.length === 0 && <p className="text-sm text-mist-400">لا توجد مهام مسجلة لهذا العضو</p>}
        <div className="flex flex-col divide-y divide-night-700 [body.light_&]:divide-mist-200">
          {missions.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{m.missionName}</div>
                <div className="text-xs text-mist-400">{m.location} · {formatDate(m.startDate)}</div>
              </div>
              <Badge tone={m.status === "مكتملة" ? "safe" : m.status === "قيد التنفيذ" ? "rescue" : "amber"}>{m.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {ratings.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold mb-3">سجل التقييمات</h3>
          <div className="flex flex-col divide-y divide-night-700 [body.light_&]:divide-mist-200">
            {ratings.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.missionName || "مهمة"}</span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold num text-sm">
                    <FiStar size={14} className="fill-amber-400" /> {r.overall}/5
                  </span>
                </div>
                {r.comments && <p className="text-xs text-mist-400 mt-1">{r.comments}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><FiAlertTriangle size={16} className="text-rescue-400" /> الإنذارات</h3>
          {canWrite && (
            <Button variant="secondary" onClick={openCreateWarn}>
              <FiPlus size={14} /> إضافة إنذار
            </Button>
          )}
        </div>
        {warnings.length === 0 && <p className="text-sm text-mist-400">لا توجد إنذارات مسجلة</p>}
        <div className="flex flex-col divide-y divide-night-700 [body.light_&]:divide-mist-200">
          {warnings.map((w) => {
            const isExpired = w.endDate && new Date(w.endDate) < new Date(new Date().toDateString());
            return (
              <div key={w.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={SEVERITY_TONE[w.severity] || "neutral"}>{w.severity}</Badge>
                    {w.endDate && (
                      <Badge tone={isExpired ? "safe" : "amber"}>
                        {isExpired ? `انتهى في ${formatDate(w.endDate)}` : `ساري حتى ${formatDate(w.endDate)}`}
                      </Badge>
                    )}
                    <span className="text-xs text-mist-400 num">{formatDate(w.date)}</span>
                  </div>
                  <p className="text-sm font-medium mt-1.5">{w.reason}</p>
                  {w.notes && <p className="text-xs text-mist-400 mt-0.5">{w.notes}</p>}
                  <p className="text-xs text-mist-400 mt-1">بواسطة {w.createdBy}</p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditWarn(w)} className="p-1.5 rounded-lg hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteWarnTarget(w)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><FiFile size={16} className="text-safe-400" /> المستندات</h3>
          {canDocs && (
            <Button variant="secondary" onClick={() => setDocModalOpen(true)}>
              <FiUpload size={14} /> إضافة مستند
            </Button>
          )}
        </div>
        {documents.length === 0 && <p className="text-sm text-mist-400">لا توجد مستندات مرفوعة</p>}
        <div className="flex flex-col divide-y divide-night-700 [body.light_&]:divide-mist-200">
          {documents.map((d) => (
            <div key={d.id} className="py-3 flex items-center justify-between gap-3">
              <a href={withAuthToken(d.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 hover:text-rescue-400">
                <FiFileText size={16} className="text-mist-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{d.originalName}</div>
                  <div className="text-xs text-mist-400">{d.documentType} · {formatDateTime(d.uploadDate)}</div>
                </div>
              </a>
              <div className="flex items-center gap-2 shrink-0">
                {d.expirationDate && <span className="text-xs text-mist-400 num">ينتهي {formatDate(d.expirationDate)}</span>}
                {canDocs && (
                  <button onClick={() => setDeleteDocTarget(d)} className="p-1.5 rounded-lg hover:bg-rescue-500/10 text-rescue-400">
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {member.medicalNotes && (
        <Card className="p-5">
          <h3 className="font-bold mb-2">ملاحظات طبية</h3>
          <p className="text-sm text-mist-300">{member.medicalNotes}</p>
        </Card>
      )}

      <Modal open={docModalOpen} onClose={() => setDocModalOpen(false)} title="إضافة مستند">
        <form onSubmit={submitDoc} className="flex flex-col gap-4">
          <div
            onClick={() => document.getElementById("doc-file-input").click()}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-night-600 py-6 cursor-pointer hover:border-rescue-500/50 [body.light_&]:border-mist-300"
          >
            <FiUpload size={22} className="text-mist-400" />
            <p className="text-sm text-mist-400">{docFile ? docFile.name : "اضغط لاختيار ملف (PDF أو صورة أو Word)"}</p>
            <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          </div>
          <Select label="نوع المستند" value={docForm.documentType} onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="تاريخ الانتهاء (اختياري)" type="date" value={docForm.expirationDate} onChange={(e) => setDocForm({ ...docForm, expirationDate: e.target.value })} />
          <Textarea label="ملاحظات" rows={2} value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDocModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={uploadingDoc}>{uploadingDoc ? "جارٍ الرفع..." : "رفع"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={warnModalOpen}
        onClose={() => {
          setWarnModalOpen(false);
          setEditingWarn(null);
        }}
        title={editingWarn ? "تعديل إنذار" : "إضافة إنذار"}
      >
        <form onSubmit={submitWarning} className="flex flex-col gap-4">
          <Select label="الدرجة" value={warnForm.severity} onChange={(e) => setWarnForm({ ...warnForm, severity: e.target.value })}>
            {WARNING_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="التاريخ" type="date" value={warnForm.date} onChange={(e) => setWarnForm({ ...warnForm, date: e.target.value })} />
          <Input label="السبب" required value={warnForm.reason} onChange={(e) => setWarnForm({ ...warnForm, reason: e.target.value })} />
          <Textarea label="ملاحظات إضافية" rows={2} value={warnForm.notes} onChange={(e) => setWarnForm({ ...warnForm, notes: e.target.value })} />
          <div>
            <Input
              label="ساري حتى (اختياري — لإجراء محدود المدة مثل التوقيف المؤقت)"
              type="date"
              value={warnForm.endDate}
              onChange={(e) => setWarnForm({ ...warnForm, endDate: e.target.value })}
            />
            {warnForm.endDate && (
              <button
                type="button"
                onClick={() => setWarnForm({ ...warnForm, endDate: "" })}
                className="text-xs text-rescue-400 hover:underline mt-1"
              >
                إزالة تاريخ الانتهاء (إجراء دائم)
              </button>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setWarnModalOpen(false);
                setEditingWarn(null);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={savingWarn}>حفظ</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteDocTarget}
        onClose={() => setDeleteDocTarget(null)}
        onConfirm={removeDoc}
        title="حذف مستند"
        message={`هل تريد حذف "${deleteDocTarget?.originalName}"؟`}
      />

      <ConfirmDialog
        open={!!deleteWarnTarget}
        onClose={() => setDeleteWarnTarget(null)}
        onConfirm={removeWarning}
        title="حذف إنذار"
        message="هل تريد حذف هذا الإنذار؟"
      />
    </div>
  );
}

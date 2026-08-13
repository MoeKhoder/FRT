import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FiUpload, FiCheckCircle, FiXCircle, FiUsers, FiTrash2, FiFileText, FiEye, FiShuffle } from "react-icons/fi";
import api from "../services/api";
import { Button, Select, Badge, Spinner, Card, Input } from "./ui/Primitives";
import { Modal, ConfirmDialog } from "./ui/Modal";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/dateFormat";

const NONE = "__none__";

export default function SurveyModal({ open, onClose, mission, onTeamGenerated }) {
  const { push } = useToast();
  const fileInput = useRef(null);

  const [tab, setTab] = useState("responses");
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [detailTarget, setDetailTarget] = useState(null);

  // upload/mapping state
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [nameCol, setNameCol] = useState(NONE);
  const [phoneCol, setPhoneCol] = useState(NONE);
  const [approvalCol, setApprovalCol] = useState(NONE);
  const [villageCol, setVillageCol] = useState(NONE);
  const [approvedValues, setApprovedValues] = useState([]);
  const [importing, setImporting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [randomCount, setRandomCount] = useState("");

  const loadResponses = () => {
    if (!mission) return;
    setLoadingResponses(true);
    api
      .get("/surveys", { params: { missionId: mission.id } })
      .then((res) => setResponses(res.data))
      .finally(() => setLoadingResponses(false));
  };

  useEffect(() => {
    if (!open || !mission) return;
    resetUploadState();
    setGenResult(null);
    setRandomCount("");
    loadResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mission]);

  const resetUploadState = () => {
    setFileName("");
    setRawRows([]);
    setHeaders([]);
    setNameCol(NONE);
    setPhoneCol(NONE);
    setApprovalCol(NONE);
    setVillageCol(NONE);
    setApprovedValues([]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const uniqueApprovalOptions = useMemo(() => {
    if (approvalCol === NONE) return [];
    const vals = new Set();
    rawRows.forEach((r) => {
      const v = String(r[approvalCol] ?? "").trim();
      if (v) vals.add(v);
    });
    return Array.from(vals);
  }, [approvalCol, rawRows]);

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (json.length === 0) {
        push("الملف فارغ أو غير مقروء", "error");
        return;
      }
      setRawRows(json);
      setHeaders(Object.keys(json[0]));
      setTab("import");
    } catch (err) {
      push("تعذر قراءة الملف — تأكد أنه بصيغة Excel (.xlsx)", "error");
    }
  };

  const toggleApprovedValue = (v) => {
    setApprovedValues((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  };

  // Every column from the uploaded sheet is preserved per-response in
  // rawAnswers — nothing from the original Google Form export is dropped,
  // even though only a few fields are used for matching/approval.
  const preview = useMemo(() => {
    if (nameCol === NONE || rawRows.length === 0) return [];
    return rawRows.map((row) => ({
      responderName: String(row[nameCol] ?? "").trim(),
      phone: phoneCol !== NONE ? String(row[phoneCol] ?? "").trim() : "",
      village: villageCol !== NONE ? String(row[villageCol] ?? "").trim() : "",
      approved: approvalCol !== NONE && approvedValues.includes(String(row[approvalCol] ?? "").trim()),
      rawAnswers: row,
    }));
  }, [rawRows, nameCol, phoneCol, villageCol, approvalCol, approvedValues]);

  const approvedCount = preview.filter((p) => p.approved).length;

  const submitImport = async () => {
    if (nameCol === NONE) {
      push("يرجى تحديد عمود الاسم على الأقل", "error");
      return;
    }
    setImporting(true);
    try {
      await api.post("/surveys/import", {
        missionId: mission.id,
        missionName: mission.missionName,
        responses: preview,
      });
      push(`تم استيراد ${preview.length} رد (${approvedCount} موافقة)`, "success");

      if (villageCol !== NONE) {
        const uniqueVillages = [...new Set(preview.map((p) => p.village).filter(Boolean))];
        if (uniqueVillages.length > 0) {
          setGeocoding(true);
          api
            .post("/geo/geocode-villages", { names: uniqueVillages })
            .then(() => push("تم تحديد مواقع القرى/المناطق على الخريطة", "success"))
            .catch(() => push("تعذر تحديد بعض مواقع القرى — تحقق من اتصال الخادم بالإنترنت", "warning"))
            .finally(() => setGeocoding(false));
        }
      }

      resetUploadState();
      setTab("responses");
      loadResponses();
    } catch (err) {
      push(err.response?.data?.error || "تعذر استيراد البيانات", "error");
    } finally {
      setImporting(false);
    }
  };

  const removeResponse = async () => {
    try {
      await api.delete(`/surveys/${deleteTarget.id}`);
      push("تم حذف الرد", "success");
      setDeleteTarget(null);
      loadResponses();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحذف", "error");
    }
  };

  const autoGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const body = { missionId: mission.id };
      const n = Number(randomCount);
      if (randomCount.trim() && Number.isFinite(n) && n > 0) body.randomCount = n;

      const res = await api.post("/surveys/auto-generate-team", body);
      setGenResult(res.data);
      push(
        body.randomCount
          ? `تم اختيار ${res.data.selectedCount} عضو عشوائياً من أصل ${res.data.poolSize}`
          : `تم تحديد ${res.data.matchedCount} عضو للمهمة`,
        "success"
      );
      onTeamGenerated?.();
    } catch (err) {
      push(err.response?.data?.error || "تعذر توليد الفريق", "error");
    } finally {
      setGenerating(false);
    }
  };

  if (!mission) return null;

  const approvedTotal = responses.filter((r) => r.approved).length;

  return (
    <Modal open={open} onClose={onClose} title={`استبيان المهمة: ${mission.missionName}`} wide>
      <div className="flex gap-1 mb-4 border-b border-night-700 [body.light_&]:border-mist-200">
        <button
          onClick={() => setTab("responses")}
          className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${
            tab === "responses" ? "border-rescue-500 text-rescue-400" : "border-transparent text-mist-400"
          }`}
        >
          الردود ({responses.length})
        </button>
        <button
          onClick={() => setTab("import")}
          className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${
            tab === "import" ? "border-rescue-500 text-rescue-400" : "border-transparent text-mist-400"
          }`}
        >
          استيراد ملف جديد
        </button>
      </div>

      {tab === "import" && (
        <div className="flex flex-col gap-4">
          {rawRows.length === 0 ? (
            <div
              onClick={() => fileInput.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-night-600 py-10 cursor-pointer hover:border-rescue-500/50 [body.light_&]:border-mist-300"
            >
              <FiUpload size={28} className="text-mist-400" />
              <p className="text-sm text-mist-400">اضغط لاختيار ملف Excel المُصدَّر من Google Forms (.xlsx)</p>
              <input ref={fileInput} type="file" accept=".xlsx,.xls" hidden onChange={onFileChosen} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-mist-300">
                  <FiFileText size={16} /> {fileName} · {rawRows.length} صف · {headers.length} حقل
                </span>
                <button onClick={resetUploadState} className="text-rescue-400 text-xs hover:underline">
                  اختيار ملف آخر
                </button>
              </div>

              <div className="rounded-lg bg-night-700/40 px-4 py-2.5 text-xs text-mist-400 [body.light_&]:bg-mist-100">
                سيتم حفظ <span className="font-bold">جميع حقول الاستمارة</span> لكل رد ({headers.length} حقلاً)، وليس فقط الحقول المحددة أدناه — يمكنكم مراجعة كل التفاصيل لاحقاً من تبويب "الردود".
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <Select label="عمود الاسم" required value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
                  <option value={NONE}>— اختر —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
                <Select label="عمود الهاتف (اختياري)" value={phoneCol} onChange={(e) => setPhoneCol(e.target.value)}>
                  <option value={NONE}>بدون</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
                <Select label="عمود القرية/المنطقة (اختياري)" value={villageCol} onChange={(e) => setVillageCol(e.target.value)}>
                  <option value={NONE}>بدون</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
                <Select
                  label="عمود الموافقة على المشاركة"
                  value={approvalCol}
                  onChange={(e) => {
                    setApprovalCol(e.target.value);
                    setApprovedValues([]);
                  }}
                >
                  <option value={NONE}>— اختر —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </div>

              {approvalCol !== NONE && (
                <div>
                  <span className="text-sm text-mist-400 font-medium">
                    حدد القيم التي تعني "موافق على المشاركة" في هذا العمود
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uniqueApprovalOptions.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => toggleApprovedValue(v)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          approvedValues.includes(v)
                            ? "bg-safe-500/15 border-safe-500/40 text-safe-400"
                            : "border-night-600 text-mist-400 hover:bg-night-700 [body.light_&]:border-mist-300 [body.light_&]:hover:bg-mist-100"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                    {uniqueApprovalOptions.length === 0 && (
                      <span className="text-xs text-mist-400">لا توجد قيم في هذا العمود</span>
                    )}
                  </div>
                </div>
              )}

              {nameCol !== NONE && (
                <div className="rounded-lg bg-night-700/40 px-4 py-2.5 text-sm [body.light_&]:bg-mist-100">
                  سيتم استيراد <span className="font-bold num">{preview.length}</span> رد،
                  منها <span className="font-bold num text-safe-400">{approvedCount}</span> موافقة على المشاركة
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={resetUploadState}>إلغاء</Button>
                <Button onClick={submitImport} disabled={importing || nameCol === NONE}>
                  {importing ? "جارٍ الاستيراد..." : "استيراد"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "responses" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-mist-400">
              {approvedTotal} من أصل {responses.length} وافقوا على المشاركة
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                placeholder="عدد الأعضاء (اختياري)"
                value={randomCount}
                onChange={(e) => setRandomCount(e.target.value)}
                className="w-40"
                title="اتركه فارغاً لإضافة كل الموافقين، أو أدخل رقماً لاختيار هذا العدد عشوائياً"
              />
              <Button onClick={autoGenerate} disabled={generating || approvedTotal === 0}>
                {randomCount.trim() ? <FiShuffle size={16} /> : <FiUsers size={16} />}
                {generating ? "جارٍ التوليد..." : randomCount.trim() ? "اختيار عشوائي" : "توليد الفريق تلقائياً"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-mist-400 -mt-2">
            اتركوا الحقل فارغاً لإضافة جميع الموافقين، أو أدخلوا عدداً (مثلاً 5) لاختيار هذا العدد عشوائياً وبشكل عادل من بين الموافقين المتطابقين مع أعضاء مسجّلين.
          </p>

          {genResult && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-safe-400 font-semibold text-sm mb-2">
                <FiCheckCircle size={16} />
                {genResult.selectedCount !== genResult.poolSize
                  ? `تم اختيار ${genResult.selectedCount} عشوائياً من أصل ${genResult.poolSize} عضو متطابق — الإجمالي الآن ${genResult.matchedCount}`
                  : `تم تحديث فريق المهمة — ${genResult.matchedCount} عضو`}
              </div>
              {genResult.notSelected?.length > 0 && (
                <div className="text-sm text-mist-400 mb-2">
                  <div className="font-medium mb-1">لم يقعوا ضمن الاختيار العشوائي هذه المرة:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {genResult.notSelected.map((n, i) => <Badge key={i} tone="neutral">{n}</Badge>)}
                  </div>
                </div>
              )}
              {genResult.unmatched.length > 0 && (
                <div className="text-sm text-amber-400">
                  <div className="flex items-center gap-1.5 font-medium mb-1">
                    <FiXCircle size={14} /> لم يتم العثور على تطابق لـ {genResult.unmatched.length} من المستجيبين (تحقق من أرقام الهاتف أو أضفهم كأعضاء جدد):
                  </div>
                  <ul className="text-xs text-mist-400 list-disc pr-5">
                    {genResult.unmatched.map((u, i) => (
                      <li key={i}>{u.responderName} {u.phone && <span className="num">— {u.phone}</span>}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {loadingResponses ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : responses.length === 0 ? (
            <p className="text-sm text-mist-400 text-center py-8">لا توجد ردود مستوردة لهذه المهمة بعد</p>
          ) : (
            <div className="flex flex-col divide-y divide-night-700 max-h-80 overflow-y-auto [body.light_&]:divide-mist-200">
              {responses.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div>
                    <div className="text-sm font-medium">{r.responderName || "—"}</div>
                    <div className="text-xs text-mist-400 num">{r.phone || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.approved ? (
                      <Badge tone="safe"><FiCheckCircle size={12} /> موافق</Badge>
                    ) : (
                      <Badge tone="neutral">غير موافق</Badge>
                    )}
                    <button onClick={() => setDetailTarget(r)} title="عرض كل تفاصيل الرد" className="p-1 rounded hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-100">
                      <FiEye size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(r)} className="p-1 rounded hover:bg-rescue-500/10 text-rescue-400">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {responses[0] && (
            <p className="text-xs text-mist-400">
              آخر استيراد: {formatDateTime(responses[0].importedAt)} بواسطة {responses[0].importedBy}
            </p>
          )}
        </div>
      )}

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={`كل بيانات رد: ${detailTarget?.responderName || ""}`}>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {detailTarget?.rawAnswers && Object.keys(detailTarget.rawAnswers).length > 0 ? (
            Object.entries(detailTarget.rawAnswers).map(([question, answer]) => (
              <div key={question} className="border-b border-night-700 pb-2 last:border-0 [body.light_&]:border-mist-200">
                <div className="text-xs text-mist-400">{question}</div>
                <div className="text-sm">{String(answer) || "—"}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-mist-400">لا توجد بيانات إضافية محفوظة لهذا الرد</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeResponse}
        title="حذف رد"
        message={`هل تريد حذف رد "${deleteTarget?.responderName}"؟`}
      />
    </Modal>
  );
}

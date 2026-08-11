import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiPrinter, FiStar, FiAlertTriangle } from "react-icons/fi";
import api from "../services/api";
import { Spinner, Button, Badge } from "../components/ui/Primitives";
import { formatDate, formatDateTime } from "../utils/dateFormat";

const SEVERITY_TONE = { "ملاحظة شفهية": "neutral", "تنبيه بسيط": "amber", إنذار: "rescue", "إنذار نهائي": "rescue" };

export default function MemberPrintView() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [missions, setMissions] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get(`/members/${id}`), api.get("/missions"), api.get("/ratings"),
      api.get("/documents"), api.get("/warnings"),
    ])
      .then(([m, mi, r, docs, warn]) => {
        const val = (res) => (res.status === "fulfilled" ? res.value.data : null);
        setMember(val(m));
        const missionsData = val(mi) || [];
        setMissions(missionsData.filter((x) => (x.members || []).includes(id) || x.leader === id || x.coLeader === id));
        setRatings((val(r) || []).filter((x) => x.memberId === id));
        setDocuments((val(docs) || []).filter((x) => x.memberId === id));
        setWarnings((val(warn) || []).filter((x) => x.memberId === id).sort((a, b) => new Date(b.date) - new Date(a.date)));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Spinner size={32} />
      </div>
    );
  }
  if (!member) {
    return <div className="p-10 text-center text-red-600">العضو غير موجود</div>;
  }

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + (Number(r.overall) || 0), 0) / ratings.length).toFixed(1)
      : "—";

  return (
    <div dir="rtl" className="min-h-screen bg-white text-black" style={{ colorScheme: "light" }}>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-night-900 text-white px-6 py-3">
        <span className="text-sm">معاينة قبل الطباعة — استخدم "حفظ كـ PDF" في نافذة الطباعة</span>
        <Button onClick={() => window.print()}>
          <FiPrinter size={16} /> طباعة / حفظ PDF
        </Button>
      </div>

      <div className="print-page max-w-3xl mx-auto p-8 print:p-0">
        <div className="flex items-center justify-between border-b-2 border-red-600 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img src="/frt-logo.jpeg" alt="" className="w-14 h-14 rounded-lg object-cover" />
            <div>
              <div className="font-extrabold text-lg">فريق المستجيب الأول - الجومة</div>
              <div className="text-xs text-gray-500">ملف العضو</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 num">{formatDateTime(new Date().toISOString())}</div>
        </div>

        <div className="flex items-start gap-5 mb-8">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt="" className="w-28 h-28 rounded-xl object-cover border" />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-gray-100 border flex items-center justify-center text-4xl font-extrabold text-gray-400">
              {member.firstName?.[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{member.firstName} {member.lastName}</h1>
            <p className="text-gray-600 mt-1">{member.rank} · {member.position || "—"}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm text-gray-700">
              <div>الهاتف: <span className="num">{member.phone || "—"}</span></div>
              <div>فصيلة الدم: {member.bloodType || "—"}</div>
              <div>الحالة: {member.status}</div>
              <div>تاريخ الانضمام: <span className="num">{formatDate(member.joiningDate)}</span></div>
              <div>الرقم الوطني: <span className="num">{member.nationalId || "—"}</span></div>
              <div>متوسط التقييم: <span className="num">{avgRating} / 5</span></div>
            </div>
          </div>
        </div>

        <Section title="سجل المهام">
          {missions.length === 0 ? (
            <Empty text="لا توجد مهام مسجلة" />
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className="text-start py-1.5">اسم المهمة</th>
                  <th className="text-start py-1.5">الموقع</th>
                  <th className="text-start py-1.5">التاريخ</th>
                  <th className="text-start py-1.5">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-1.5">{m.missionName}</td>
                    <td className="py-1.5">{m.location || "—"}</td>
                    <td className="py-1.5 num">{formatDate(m.startDate)}</td>
                    <td className="py-1.5">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="التقييمات">
          {ratings.length === 0 ? (
            <Empty text="لا توجد تقييمات" />
          ) : (
            <div className="flex flex-col gap-2">
              {ratings.map((r) => (
                <div key={r.id} className="text-sm border-b border-gray-100 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.missionName || "مهمة"}</span>
                    <span className="flex items-center gap-1 num font-bold">
                      <FiStar size={12} /> {r.overall}/5
                    </span>
                  </div>
                  {r.comments && <p className="text-gray-500 text-xs mt-0.5">{r.comments}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="الإنذارات">
          {warnings.length === 0 ? (
            <Empty text="لا توجد إنذارات" />
          ) : (
            <div className="flex flex-col gap-2">
              {warnings.map((w) => (
                <div key={w.id} className="text-sm border-b border-gray-100 pb-2 flex items-start gap-2">
                  <FiAlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={SEVERITY_TONE[w.severity] || "neutral"}>{w.severity}</Badge>
                      <span className="text-xs text-gray-500 num">{formatDate(w.date)}</span>
                      {w.endDate && (
                        <span className="text-xs text-gray-500 num">— ساري حتى {formatDate(w.endDate)}</span>
                      )}
                    </div>
                    <p className="mt-1">{w.reason}</p>
                    {w.notes && <p className="text-gray-500 text-xs mt-0.5">{w.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="المستندات المرفقة">
          {documents.length === 0 ? (
            <Empty text="لا توجد مستندات" />
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className="text-start py-1.5">الاسم</th>
                  <th className="text-start py-1.5">النوع</th>
                  <th className="text-start py-1.5">تاريخ الرفع</th>
                  <th className="text-start py-1.5">تاريخ الانتهاء</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="py-1.5">{d.originalName}</td>
                    <td className="py-1.5">{d.documentType}</td>
                    <td className="py-1.5 num">{formatDate(d.uploadDate)}</td>
                    <td className="py-1.5 num">{d.expirationDate ? formatDate(d.expirationDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {member.medicalNotes && (
          <Section title="ملاحظات طبية">
            <p className="text-sm text-gray-700">{member.medicalNotes}</p>
          </Section>
        )}

        <div className="mt-10 pt-4 border-t text-xs text-gray-400 flex justify-between">
          <span>مستند مُصدَر آلياً من نظام فريق المستجيب الأول - الجومة</span>
          <span className="num">{formatDateTime(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6 break-inside-avoid">
      <h2 className="text-sm font-extrabold text-red-600 border-b border-gray-200 pb-1.5 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-gray-400">{text}</p>;
}

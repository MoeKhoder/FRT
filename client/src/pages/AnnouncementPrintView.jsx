import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiPrinter } from "react-icons/fi";
import api from "../services/api";
import { Spinner, Button, Badge } from "../components/ui/Primitives";
import { formatDateTime } from "../utils/dateFormat";

const PRIORITY_TONE = { عاجل: "rescue", مهم: "amber", عادية: "neutral" };

export default function AnnouncementPrintView() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/announcements/${id}`)
      .then((res) => setItem(res.data))
      .catch(() => setError("تعذر تحميل الإعلان"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Spinner size={32} />
      </div>
    );
  }
  if (error || !item) {
    return <div className="p-10 text-center text-red-600">{error || "الإعلان غير موجود"}</div>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white text-black" style={{ colorScheme: "light" }}>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-night-900 text-white px-6 py-3">
        <span className="text-sm">معاينة قبل الطباعة — استخدم "حفظ كـ PDF" في نافذة الطباعة</span>
        <Button onClick={() => window.print()}>
          <FiPrinter size={16} /> طباعة / حفظ PDF
        </Button>
      </div>

      <div className="print-page max-w-2xl mx-auto p-8 print:p-0">
        <div className="flex items-center justify-between border-b-2 border-red-600 pb-4 mb-8">
          <div className="flex items-center gap-3">
            <img src="/frt-logo.jpeg" alt="" className="w-14 h-14 rounded-lg object-cover" />
            <div>
              <div className="font-extrabold text-lg">فريق المستجيب الأول - الجومة</div>
              <div className="text-xs text-gray-500">إعلان رسمي</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 num">{formatDateTime(new Date().toISOString())}</div>
        </div>

        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-2xl font-extrabold">{item.title}</h1>
          <Badge tone="neutral">{item.category || "إعلان عام"}</Badge>
          <Badge tone={PRIORITY_TONE[item.priority] || "neutral"}>{item.priority}</Badge>
        </div>
        <div className="text-sm text-gray-500 mb-6 num">
          {formatDateTime(item.createdAt)} {item.createdBy ? `· ${item.createdBy}` : ""}
        </div>

        <div className="text-base leading-relaxed whitespace-pre-wrap border-t border-gray-200 pt-6">
          {item.body}
        </div>

        <div className="mt-12 pt-4 border-t text-xs text-gray-400 flex justify-between">
          <span>مستند مُصدَر آلياً من نظام فريق المستجيب الأول - الجومة</span>
          <span className="num">{formatDateTime(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
}

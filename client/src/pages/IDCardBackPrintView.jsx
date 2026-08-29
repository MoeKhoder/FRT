import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiPrinter } from "react-icons/fi";
import api from "../services/api";
import { Spinner, Button } from "../components/ui/Primitives";

const DEFAULT_TERMS = [
  "هذه البطاقة ملك لفريق المستجيب الأول - الجومة، ويجب إعادتها فور انتهاء العضوية أو عند الطلب.",
  "لا يجوز استخدام هذه البطاقة أو نسخها من قبل أي شخص غير حاملها الأصلي.",
  "يُرجى إبلاغ إدارة الفريق فوراً في حال فقدان البطاقة.",
  "هذه البطاقة لا تُعتبر وثيقة هوية رسمية بديلة عن الهوية الشخصية.",
];

// Mirrors the visual design of IDCardPrintView (front side) — same colors
// sampled from the real logos (#0f70b5 blue, #11663c green, #f0b149 gold).
// Unlike the static template we designed earlier, emergency phone and terms
// are no longer hardcoded — they come from Settings -> "الوجه الخلفي لبطاقة
// الهوية", so IT can update them without ever touching code.
export default function IDCardBackPrintView() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [backSettings, setBackSettings] = useState({ emergencyPhone: "", terms: DEFAULT_TERMS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([api.get(`/members/${id}`), api.get("/system/settings")])
      .then(([mRes, sRes]) => {
        if (mRes.status === "fulfilled") {
          setMember(mRes.value.data);
        } else {
          setError("تعذر تحميل بيانات العضو");
        }
        if (sRes.status === "fulfilled") {
          const back = sRes.value.data?.idCardBack;
          if (back) {
            setBackSettings({
              emergencyPhone: back.emergencyPhone || "",
              terms: Array.isArray(back.terms) && back.terms.length > 0 ? back.terms : DEFAULT_TERMS,
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#eef2f5]">
        <Spinner size={32} />
      </div>
    );
  }
  if (error || !member) {
    return <div className="p-10 text-center text-red-600">{error || "العضو غير موجود"}</div>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#eef2f5]" style={{ colorScheme: "light" }}>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-night-900 text-white px-6 py-3">
        <span className="text-sm">معاينة الوجه الخلفي — استخدم "حفظ كـ PDF" واختر حجم الورق المناسب لطباعة البطاقات</span>
        <Button onClick={() => window.print()}>
          <FiPrinter size={16} /> طباعة / حفظ PDF
        </Button>
      </div>

      <div className="flex justify-center py-10 print:py-0">
        <div
          className="print-page relative"
          style={{
            width: "1000px",
            height: "620px",
            borderRadius: "24px",
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 10px 40px rgba(15,40,60,0.18)",
            fontFamily: "'Cairo', 'KacstOne', sans-serif",
            padding: "40px 50px",
          }}
        >
          <div
            style={{
              height: "8px",
              borderRadius: "6px",
              marginBottom: "30px",
              background: "linear-gradient(90deg, #0f70b5, #11663c, #f0b149)",
            }}
          />

          <div style={{ marginBottom: "26px" }}>
            <h2 style={{ color: "#2c3e46", fontSize: "22px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "5px", height: "20px", borderRadius: "3px", background: "#0f70b5", display: "inline-block" }} />
              معلومات الطوارئ
            </h2>
            <div style={{ background: "#fdf2f1", border: "1px solid #f3cfc9", borderRadius: "14px", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#c0392b", fontSize: "17px", fontWeight: "bold" }}>في حال الطوارئ يرجى الاتصال بـ:</span>
              <span style={{ color: "#2c3e46", fontSize: "21px", fontWeight: "bold", direction: "ltr" }}>
                {backSettings.emergencyPhone || "—"}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: "26px" }}>
            <h2 style={{ color: "#2c3e46", fontSize: "22px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "5px", height: "20px", borderRadius: "3px", background: "#11663c", display: "inline-block" }} />
              شروط الاستخدام
            </h2>
            <div style={{ color: "#6b7d87", fontSize: "14px", lineHeight: 1.7 }}>
              {backSettings.terms.map((t, i) => (
                <div key={i} style={{ marginBottom: "10px", paddingRight: "20px", position: "relative", textAlign: "right" }}>
                  <span style={{ position: "absolute", right: "3px", top: "7px", width: "5px", height: "5px", borderRadius: "50%", background: "#b9c5cb" }} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "absolute", bottom: "30px", left: "50px", right: "50px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderTop: "1px solid #eef1f3", paddingTop: "20px",
            }}
          >
            <div style={{ color: "#9aa8b2", fontSize: "13px", direction: "ltr" }}>
              CARD ID: {member.frtNumber || "—"}
            </div>
            <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "46px" }}>
              {[46, 32, 46, 18, 46, 46, 28, 46, 14, 46, 36, 46, 22, 46, 46, 18, 46, 32, 46, 14, 46, 40, 46, 28].map((h, i) => (
                <div key={i} style={{ width: "3px", height: `${h}px`, background: "#2c3e46" }} />
              ))}
            </div>
            <div style={{ color: "#9aa8b2", fontSize: "12px", textAlign: "left", direction: "ltr", lineHeight: 1.5 }}>
              فريق المستجيب الأول - الجومة<br />اتحاد بلديات الجومة
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

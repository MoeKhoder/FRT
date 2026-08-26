import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiPrinter } from "react-icons/fi";
import api from "../services/api";
import { Spinner, Button } from "../components/ui/Primitives";
import { formatDate } from "../utils/dateFormat";

// Renders the member's actual data into the same visual design as the
// FRT_ID_Card_Front/Back template PNGs — same colors (sampled from the real
// logos: #0f70b5 blue, #11663c green, #f0b149 gold), same layout, same
// KacstOne-style clean sans-serif hierarchy. Uses the browser's own
// print-to-PDF (same reasoning as the member profile PDF export elsewhere
// in the app: Arabic text renders correctly via the browser's own engine,
// which a JS PDF library can't reliably guarantee).
export default function IDCardPrintView() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/members/${id}`)
      .then((res) => setMember(res.data))
      .catch(() => setError("تعذر تحميل بيانات العضو"))
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

  const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();

  return (
    <div dir="rtl" className="min-h-screen bg-[#eef2f5]" style={{ colorScheme: "light" }}>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-night-900 text-white px-6 py-3">
        <span className="text-sm">معاينة قبل الطباعة — استخدم "حفظ كـ PDF" واختر حجم الورق المناسب لطباعة البطاقات</span>
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
          }}
        >
          {/* Accent gradient shape - top right, matches the template */}
          <div
            style={{
              position: "absolute",
              top: "-140px",
              right: "-120px",
              width: "640px",
              height: "420px",
              background: "linear-gradient(135deg, #0f70b5 0%, #11663c 65%, #f0b149 100%)",
              borderRadius: "54% 46% 60% 40% / 40% 44% 56% 60%",
              zIndex: 0,
            }}
          />
          {/* Union logo watermark, very subtle, bottom-left */}
          <div
            style={{
              position: "absolute",
              bottom: "-60px",
              left: "-60px",
              width: "300px",
              height: "300px",
              backgroundImage: "url('/joumeh-union-logo.jpeg')",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              opacity: 0.05,
              zIndex: 0,
            }}
          />

          <div className="relative z-10 flex items-center justify-between" style={{ padding: "34px 54px 0 44px" }}>
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "92px", height: "92px", borderRadius: "16px", background: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "5px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                }}
              >
                <img src="/frt-logo.jpeg" alt="FRT" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "10px" }} />
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: "36px", fontWeight: "bold", textShadow: "0 1px 6px rgba(0,0,0,0.15)" }}>
                  فريق المستجيب الأول
                </div>
                <div style={{ color: "#eaf6ff", fontSize: "19px", marginTop: "2px" }}>
                  First Responder Team — Al Joumeh
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.92)", color: "#0f70b5", fontSize: "17px", fontWeight: "bold", padding: "8px 20px", borderRadius: "20px" }}>
              بطاقة عضوية
            </div>
          </div>

          <div className="relative z-10 flex justify-center" style={{ marginTop: "20px" }}>
            <div
              style={{
                width: "132px", height: "132px", borderRadius: "50%", background: "#f3f6f8",
                border: "5px solid #fff", boxShadow: "0 6px 18px rgba(15,40,60,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}
            >
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#7a8a94" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              )}
            </div>
          </div>

          <div className="relative z-10 text-center" style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2c3e46" }}>{fullName || "—"}</div>
            <div style={{ fontSize: "19px", color: "#9db0bc", marginTop: "1px" }}>
              {member.rank || "—"}{member.position ? ` — ${member.position}` : ""}
            </div>
          </div>

          <div
            className="relative z-10"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 30px", padding: "10px 60px 0 60px" }}
          >
            <FieldRow iconColor="#0f70b5" label="رقم العضوية">
              <span style={{ background: "#f0b149", color: "#4a3200", fontWeight: "bold", fontSize: "18px", padding: "4px 16px", borderRadius: "16px" }}>
                {member.frtNumber || "—"}
              </span>
            </FieldRow>
            <FieldRow iconColor="#c0392b" label="فصيلة الدم">
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#2c3e46" }}>{member.bloodType || "—"}</span>
            </FieldRow>
            <FieldRow iconColor="#11663c" label="تاريخ الانضمام">
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#2c3e46" }}>{formatDate(member.joiningDate) || "—"}</span>
            </FieldRow>
            <FieldRow iconColor="#f0b149" label="رقم الهاتف">
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#2c3e46", direction: "ltr", display: "inline-block" }}>
                {member.phone || "—"}
              </span>
            </FieldRow>
          </div>

          <div
            className="relative z-10"
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "76px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 44px", borderTop: "1px solid #eef1f3", background: "#fff",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "170px", borderBottom: "1px solid #d8dfe3", height: "22px" }} />
              <div style={{ color: "#9aa8b2", fontSize: "11px" }}>توقيع مدير الفريق</div>
            </div>
            <div style={{ color: "#9aa8b2", fontSize: "12px", textAlign: "left", direction: "ltr", lineHeight: 1.5 }}>
              اتحاد بلديات الجومة<br />Al Joumeh Municipalities Union
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ iconColor, label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#eef5fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: iconColor }} />
      </div>
      <div>
        <div style={{ fontSize: "15px", color: "#9aa8b2" }}>{label}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

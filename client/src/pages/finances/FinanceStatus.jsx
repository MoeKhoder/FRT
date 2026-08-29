import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import api from "../../services/api";
import { Card, Spinner } from "../../components/ui/Primitives";
import { FiPieChart, FiBarChart2 } from "react-icons/fi";

const PIE_COLORS = ["#e4572e", "#2ec4b6"];
const BAR_COLOR = "#0f70b5";

function donorInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0];
  return `${parts[0][0]}.${parts[1][0]}`;
}

export default function FinanceStatus() {
  const [payments, setPayments] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("pie"); // "pie" | "bar" — which of the two is currently shown

  // Fetching fresh on every mount (not cached/hardcoded) is what makes the
  // bar chart reflect a newly-added donor automatically the next time this
  // page is opened — there's no stale snapshot to fall out of sync.
  const load = () => {
    setLoading(true);
    Promise.allSettled([api.get("/payments"), api.get("/donations")])
      .then(([pRes, dRes]) => {
        setPayments(pRes.status === "fulfilled" ? pRes.value.data : []);
        setDonations(dRes.status === "fulfilled" ? dRes.value.data : []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const totalDonations = useMemo(() => donations.reduce((s, d) => s + (Number(d.amount) || 0), 0), [donations]);
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [payments]);
  const remaining = totalDonations - totalPaid;

  const pieData = [
    { name: "المدفوع", value: totalPaid },
    { name: "المتبقي", value: Math.max(remaining, 0) },
  ];

  const barData = useMemo(
    () =>
      donations
        .slice()
        .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
        .map((d) => ({
          name: donorInitials(d.donorName),
          fullName: d.donorName,
          amount: Number(d.amount) || 0,
        })),
    [donations]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">حالة المالية</h1>
          <p className="text-mist-400 mt-1">نظرة عامة على التبرعات والمدفوعات</p>
        </div>
        <div className="flex gap-1 bg-night-800 rounded-xl p-1 [body.light_&]:bg-mist-100">
          <button
            onClick={() => setView("pie")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "pie" ? "bg-rescue-500 text-white" : "text-mist-400 hover:text-mist-100"
            }`}
          >
            <FiPieChart size={14} /> المدفوع مقابل المتبقي
          </button>
          <button
            onClick={() => setView("bar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "bar" ? "bg-rescue-500 text-white" : "text-mist-400 hover:text-mist-100"
            }`}
          >
            <FiBarChart2 size={14} /> تبرعات الأفراد
          </button>
        </div>
      </div>

      {view === "pie" && (
        <Card className="p-6">
          <h3 className="font-bold mb-1 text-center">المدفوع مقابل المتبقي</h3>
          <p className="text-center text-sm text-mist-400 mb-4">
            من إجمالي التبرعات: <span className="num font-bold text-mist-100">${totalDonations.toLocaleString()}</span>
          </p>
          {remaining < 0 && (
            <p className="text-center text-sm text-rescue-400 font-medium mb-3">
              تنبيه: المدفوعات تجاوزت إجمالي التبرعات بمقدار <span className="num">${Math.abs(remaining).toLocaleString()}</span>
            </p>
          )}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#131c30", border: "1px solid #26314a", borderRadius: 8 }}
                  formatter={(v) => `$${Number(v).toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-sm mt-2">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                {p.name}: <span className="num font-bold">${p.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "bar" && (
        <Card className="p-6">
          <h3 className="font-bold mb-1 text-center">تبرعات الأفراد</h3>
          <p className="text-center text-2xl font-extrabold num text-safe-400 mb-4">
            ${totalDonations.toLocaleString()}
            <span className="block text-xs font-normal text-mist-400 mt-0.5">إجمالي التبرعات</span>
          </p>
          {barData.length === 0 ? (
            <p className="text-center text-sm text-mist-400 py-10">لا يوجد متبرعون مسجلون بعد</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26314a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8b95a7", fontSize: 13 }} />
                  <YAxis tick={{ fill: "#8b95a7", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#131c30", border: "1px solid #26314a", borderRadius: 8 }}
                    formatter={(v) => `$${Number(v).toLocaleString()}`}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                  />
                  <Bar dataKey="amount" fill={BAR_COLOR} radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="amount" position="top" formatter={(v) => `$${Number(v).toLocaleString()}`} fill="#8b95a7" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

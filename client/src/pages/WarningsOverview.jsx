import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { Badge, Card, Select, Spinner } from "../components/ui/Primitives";
import { formatDate } from "../utils/dateFormat";

const SEVERITY_TONE = { "ملاحظة شفهية": "neutral", "تنبيه بسيط": "amber", إنذار: "rescue", "إنذار نهائي": "rescue" };
const STATUS_FILTERS = ["الكل", "سارية فقط", "منتهية فقط"];

export default function WarningsOverview() {
  const [warnings, setWarnings] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("سارية فقط");

  useEffect(() => {
    Promise.allSettled([api.get("/warnings"), api.get("/members")])
      .then(([wRes, mRes]) => {
        setWarnings(wRes.status === "fulfilled" ? wRes.value.data : []);
        setMembers(mRes.status === "fulfilled" ? mRes.value.data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  );

  const isExpired = (w) => w.endDate && new Date(w.endDate) < new Date(new Date().toDateString());

  const enriched = useMemo(() => {
    return warnings
      .map((w) => {
        const m = memberById[w.memberId];
        return {
          ...w,
          memberName: m ? `${m.firstName} ${m.lastName}` : "عضو محذوف",
          expired: isExpired(w),
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [warnings, memberById]);

  const filtered = useMemo(() => {
    if (statusFilter === "سارية فقط") return enriched.filter((w) => !w.expired);
    if (statusFilter === "منتهية فقط") return enriched.filter((w) => w.expired);
    return enriched;
  }, [enriched, statusFilter]);

  const endingSoon = useMemo(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return enriched.filter((w) => w.endDate && !w.expired && new Date(w.endDate) <= in7);
  }, [enriched]);

  const columns = [
    {
      key: "memberName",
      label: "العضو",
      render: (w) => (
        <Link to={`/members/${w.memberId}`} className="font-medium hover:text-rescue-400">
          {w.memberName}
        </Link>
      ),
    },
    { key: "severity", label: "الدرجة", render: (w) => <Badge tone={SEVERITY_TONE[w.severity] || "neutral"}>{w.severity}</Badge> },
    { key: "reason", label: "السبب" },
    { key: "date", label: "التاريخ", render: (w) => <span className="num">{formatDate(w.date)}</span> },
    {
      key: "endDate",
      label: "الحالة",
      render: (w) =>
        w.endDate ? (
          <Badge tone={w.expired ? "safe" : "amber"}>
            <span className="num">{w.expired ? "انتهى" : "ساري حتى"} {formatDate(w.endDate)}</span>
          </Badge>
        ) : (
          <Badge tone="rescue">دائم</Badge>
        ),
    },
    { key: "createdBy", label: "بواسطة" },
  ];

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
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <FiAlertTriangle className="text-rescue-400" /> الإنذارات — نظرة شاملة
          </h1>
          <p className="text-mist-400 mt-1">جميع الإنذارات عبر الفريق بأكمله</p>
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          {STATUS_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
      </div>

      {endingSoon.length > 0 && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-amber-400">
            <FiAlertTriangle size={14} /> ينتهي خلال 7 أيام
          </h3>
          <div className="flex flex-col gap-1.5">
            {endingSoon.map((w) => (
              <Link key={w.id} to={`/members/${w.memberId}`} className="text-sm hover:text-rescue-400">
                {w.memberName} — {w.severity} <span className="num text-mist-400">(حتى {formatDate(w.endDate)})</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <DataTable
          columns={columns}
          data={filtered}
          searchKeys={["memberName", "reason", "severity"]}
          emptyLabel="لا توجد إنذارات ضمن هذا الفلتر"
        />
      </Card>
    </div>
  );
}

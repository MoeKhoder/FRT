import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiUsers,
  FiFlag,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiTool,
  FiTrendingUp,
  FiStar,
  FiAlertTriangle,
  FiFileText,
} from "react-icons/fi";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import api from "../services/api";
import StatCard from "../components/ui/StatCard";
import { Card, Spinner, Badge } from "../components/ui/Primitives";
import { formatDistanceToNow, formatDate } from "../utils/dateFormat";

const COLORS = ["#e4572e", "#2ec4b6", "#f4a300"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/system/stats").then((res) => setStats(res.data));
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const missionPie = [
    { name: "نشطة", value: stats.activeMissions },
    { name: "مكتملة", value: stats.completedMissions },
    { name: "قيد الانتظار", value: stats.pendingMissions },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">لوحة التحكم</h1>
        <p className="text-mist-400 mt-1">نظرة عامة على عمليات فريق الإنقاذ</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="إجمالي الأعضاء" value={stats.totalMembers} tone="neutral" />
        <StatCard icon={FiFlag} label="مهام نشطة" value={stats.activeMissions} tone="rescue" />
        <StatCard icon={FiCheckCircle} label="مهام مكتملة" value={stats.completedMissions} tone="safe" />
        <StatCard icon={FiClock} label="مهام قيد الانتظار" value={stats.pendingMissions} tone="amber" />
        <StatCard icon={FiPackage} label="معدات متاحة" value={stats.availableEquipment} tone="safe" />
        <StatCard icon={FiTool} label="معدات تحت الصيانة" value={stats.maintenanceEquipment} tone="amber" />
        <StatCard icon={FiTrendingUp} label="نسبة نجاح المهام" value={stats.missionSuccessRate} suffix="%" tone="rescue" />
        <StatCard icon={FiStar} label="متوسط تقييم الأعضاء" value={stats.averageRating} suffix="/ 5" tone="neutral" />
        {stats.activeWarningsCount !== undefined && (
          <StatCard icon={FiAlertTriangle} label="إنذارات سارية" value={stats.activeWarningsCount} tone={stats.activeWarningsCount > 0 ? "rescue" : "neutral"} />
        )}
        {stats.expiringDocumentsCount !== undefined && (
          <StatCard icon={FiFileText} label="مستندات قاربت على الانتهاء" value={stats.expiringDocumentsCount} tone={stats.expiringDocumentsCount > 0 ? "amber" : "neutral"} />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <h3 className="font-bold mb-3">حالة المهام</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={missionPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {missionPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#131c30", border: "1px solid #26314a", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-1">
            {missionPie.map((m, i) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                {m.name}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h3 className="font-bold mb-3">آخر النشاطات</h3>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            {stats.recentActivities.length === 0 && (
              <p className="text-sm text-mist-400">لا توجد نشاطات مسجلة بعد</p>
            )}
            {stats.recentActivities.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-2 text-sm border-b border-night-700 pb-2 last:border-0 [body.light_&]:border-mist-200">
                <div>
                  <div className="font-medium">{a.action}</div>
                  <div className="text-xs text-mist-400">
                    {a.username} · {a.module}
                  </div>
                </div>
                <span className="text-xs text-mist-400 whitespace-nowrap num">
                  {formatDistanceToNow(a.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h3 className="font-bold mb-3">الإعلانات</h3>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            {stats.announcements.length === 0 && (
              <p className="text-sm text-mist-400">لا توجد إعلانات حالياً</p>
            )}
            {stats.announcements.map((a) => (
              <div key={a.id} className="text-sm border-b border-night-700 pb-2 last:border-0 [body.light_&]:border-mist-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.title}</span>
                  {a.priority && <Badge tone={a.priority === "عاجل" ? "rescue" : "neutral"}>{a.priority}</Badge>}
                </div>
                <p className="text-xs text-mist-400 mt-0.5">{a.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {stats.expiringDocuments && stats.expiringDocuments.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <FiFileText size={16} className="text-amber-400" /> مستندات قاربت على الانتهاء أو منتهية
          </h3>
          <div className="flex flex-col divide-y divide-night-700 [body.light_&]:divide-mist-200">
            {stats.expiringDocuments.map((d) => (
              <Link
                key={d.id}
                to={`/members/${d.memberId}`}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-night-700/30 -mx-2 px-2 rounded-lg [body.light_&]:hover:bg-mist-100"
              >
                <div>
                  <div className="text-sm font-medium">{d.originalName}</div>
                  <div className="text-xs text-mist-400">{d.documentType} · {d.memberName}</div>
                </div>
                <Badge tone={d.expired ? "rescue" : "amber"}>
                  <span className="num">{d.expired ? "منتهي" : "ينتهي"} {formatDate(d.expirationDate)}</span>
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

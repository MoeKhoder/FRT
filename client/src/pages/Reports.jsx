import { useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";
import api from "../services/api";
import { Card, Button } from "../components/ui/Primitives";
import StatCard from "../components/ui/StatCard";
import { FiUsers, FiFlag, FiPackage } from "react-icons/fi";

function toCSV(rows, headers) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map((h) => escape(h.label)).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h.key])).join(","));
  }
  return "\uFEFF" + lines.join("\n"); // BOM for Arabic Excel compatibility
}

function downloadCSV(filename, rows, headers) {
  const csv = toCSV(rows, headers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [members, setMembers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.get("/members").then((r) => setMembers(r.data));
    api.get("/missions").then((r) => setMissions(r.data));
    api.get("/inventory").then((r) => setInventory(r.data));
  }, []);

  const reports = [
    {
      title: "تقرير الأعضاء",
      icon: FiUsers,
      count: members.length,
      onExport: () =>
        downloadCSV("members-report.csv", members, [
          { key: "firstName", label: "الاسم الأول" },
          { key: "lastName", label: "اسم العائلة" },
          { key: "rank", label: "الرتبة" },
          { key: "status", label: "الحالة" },
          { key: "phone", label: "الهاتف" },
          { key: "joiningDate", label: "تاريخ الانضمام" },
        ]),
    },
    {
      title: "تقرير المهام",
      icon: FiFlag,
      count: missions.length,
      onExport: () =>
        downloadCSV("missions-report.csv", missions, [
          { key: "missionName", label: "اسم المهمة" },
          { key: "missionType", label: "النوع" },
          { key: "priority", label: "الأولوية" },
          { key: "status", label: "الحالة" },
          { key: "location", label: "الموقع" },
          { key: "startDate", label: "تاريخ البدء" },
          { key: "endDate", label: "تاريخ الانتهاء" },
        ]),
    },
    {
      title: "تقرير المخزون",
      icon: FiPackage,
      count: inventory.length,
      onExport: () =>
        downloadCSV("inventory-report.csv", inventory, [
          { key: "name", label: "الاسم" },
          { key: "category", label: "الفئة" },
          { key: "serialNumber", label: "الرقم التسلسلي" },
          { key: "status", label: "الحالة" },
          { key: "availableQuantity", label: "الكمية المتاحة" },
          { key: "storageLocation", label: "موقع التخزين" },
        ]),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">التقارير</h1>
        <p className="text-mist-400 mt-1">تصدير بيانات النظام إلى ملفات CSV (متوافقة مع Excel)</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.title} className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-rescue-500/10 text-rescue-400">
                <r.icon size={20} />
              </div>
              <div>
                <h3 className="font-bold">{r.title}</h3>
                <p className="text-xs text-mist-400 num">{r.count} سجل</p>
              </div>
            </div>
            <Button variant="secondary" onClick={r.onExport}>
              <FiDownload size={16} /> تصدير CSV
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

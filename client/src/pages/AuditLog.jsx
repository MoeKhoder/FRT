import { useEffect, useState } from "react";
import { FiShield } from "react-icons/fi";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { Badge, Card } from "../components/ui/Primitives";
import { formatDateTime } from "../utils/dateFormat";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/audit").then((res) => setLogs(res.data));
  }, []);

  const columns = [
    { key: "timestamp", label: "التوقيت", render: (l) => <span className="num text-xs">{formatDateTime(l.timestamp)}</span> },
    { key: "username", label: "المستخدم" },
    { key: "role", label: "الدور" },
    { key: "action", label: "الإجراء" },
    { key: "module", label: "الوحدة" },
    { key: "result", label: "النتيجة", render: (l) => <Badge tone={l.result === "نجاح" ? "safe" : "rescue"}>{l.result}</Badge> },
    { key: "ip", label: "IP", render: (l) => <span className="num text-xs">{l.ip || "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2.5 bg-rescue-500/10 text-rescue-400">
          <FiShield size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">سجل التدقيق والأمان</h1>
          <p className="text-mist-400 mt-1">جميع الإجراءات المسجلة في النظام — مقصور على تقنية المعلومات</p>
        </div>
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={logs} searchKeys={["username", "action", "module"]} emptyLabel="لا توجد سجلات بعد" />
      </Card>
    </div>
  );
}

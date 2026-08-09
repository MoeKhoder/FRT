import { useEffect, useRef, useState } from "react";
import { FiDownload, FiUpload, FiSave } from "react-icons/fi";
import api from "../services/api";
import { Button, Input, Select, Card } from "../components/ui/Primitives";
import { ConfirmDialog } from "../components/ui/Modal";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const { push } = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    api.get("/system/settings").then((res) => setSettings(res.data));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/system/settings", settings);
      push("تم حفظ الإعدادات", "success");
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const backup = async () => {
    try {
      const res = await api.get("/system/backup");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frl-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      push("تم إنشاء النسخة الاحتياطية", "success");
    } catch (err) {
      push("تعذر إنشاء النسخة الاحتياطية", "error");
    }
  };

  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setConfirmRestore(true);
    }
  };

  const restore = async () => {
    try {
      const text = await restoreFile.text();
      const parsed = JSON.parse(text);
      await api.post("/system/restore", parsed);
      push("تمت استعادة النسخة الاحتياطية بنجاح", "success");
    } catch (err) {
      push(err.response?.data?.error || "ملف النسخة الاحتياطية غير صالح", "error");
    } finally {
      setConfirmRestore(false);
      setRestoreFile(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold">الإعدادات</h1>
        <p className="text-mist-400 mt-1">إعدادات النظام والنسخ الاحتياطي (تقنية المعلومات فقط)</p>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <h3 className="font-bold">إعدادات عامة</h3>
        <Input
          label="اسم المؤسسة"
          value={settings.orgName || ""}
          onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
        />
        <Select
          label="مهلة الجلسة (بالدقائق)"
          value={settings.sessionTimeoutMinutes}
          onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
        >
          {[10, 15, 20, 30, 60].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </Select>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            <FiSave size={16} /> حفظ
          </Button>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <h3 className="font-bold">النسخ الاحتياطي والاستعادة</h3>
        <p className="text-sm text-mist-400">
          يقوم النظام بتخزين البيانات في ملفات JSON محلية. يمكنك تنزيل نسخة احتياطية كاملة أو استعادة نسخة سابقة.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={backup}>
            <FiDownload size={16} /> تنزيل نسخة احتياطية
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            <FiUpload size={16} /> استعادة من ملف
          </Button>
          <input ref={fileInput} type="file" accept="application/json" hidden onChange={onFileChosen} />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={restore}
        title="استعادة نسخة احتياطية"
        message="سيؤدي هذا إلى استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف المحدد. هل تريد المتابعة؟"
        confirmLabel="استعادة"
      />
    </div>
  );
}

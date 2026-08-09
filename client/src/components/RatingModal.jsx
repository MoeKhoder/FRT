import { useEffect, useState } from "react";
import { FiStar, FiCheckCircle, FiArrowRight } from "react-icons/fi";
import api from "../services/api";
import { Button, Textarea, Badge, Spinner } from "./ui/Primitives";
import { Modal } from "./ui/Modal";
import { useToast } from "../context/ToastContext";

const CATEGORIES = [
  { key: "leadership", label: "القيادة" },
  { key: "communication", label: "التواصل" },
  { key: "discipline", label: "الانضباط" },
  { key: "technicalSkills", label: "المهارات الفنية" },
  { key: "responseTime", label: "سرعة الاستجابة" },
  { key: "teamwork", label: "العمل الجماعي" },
  { key: "decisionMaking", label: "اتخاذ القرار" },
];

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <FiStar
            size={20}
            className={n <= value ? "fill-amber-400 text-amber-400" : "text-night-600 [body.light_&]:text-mist-300"}
          />
        </button>
      ))}
    </div>
  );
}

export default function RatingModal({ open, onClose, mission, members }) {
  const { push } = useToast();
  const [existingRatings, setExistingRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  const participantIds = mission
    ? [...new Set([mission.leader, mission.coLeader, ...(mission.members || [])].filter(Boolean))]
    : [];
  const participants = members.filter((m) => participantIds.includes(m.id));

  useEffect(() => {
    if (!open || !mission) return;
    setLoadingRatings(true);
    setSelectedMember(null);
    api
      .get("/ratings")
      .then((res) => setExistingRatings(res.data.filter((r) => r.missionId === mission.id)))
      .finally(() => setLoadingRatings(false));
  }, [open, mission]);

  const ratingFor = (memberId) => existingRatings.find((r) => r.memberId === memberId);

  const openMember = (member) => {
    setSelectedMember(member);
    const existing = ratingFor(member.id);
    if (existing) {
      const s = {};
      CATEGORIES.forEach((c) => (s[c.key] = existing[c.key] || 3));
      setScores(s);
      setComments(existing.comments || "");
    } else {
      const s = {};
      CATEGORIES.forEach((c) => (s[c.key] = 3));
      setScores(s);
      setComments("");
    }
  };

  const overall = CATEGORIES.length
    ? (Object.values(scores).reduce((a, b) => a + b, 0) / CATEGORIES.length).toFixed(1)
    : 0;

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        missionId: mission.id,
        missionName: mission.missionName,
        memberId: selectedMember.id,
        memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
        ...scores,
        overall: Number(overall),
        comments,
      };
      const existing = ratingFor(selectedMember.id);
      if (existing) {
        await api.put(`/ratings/${existing.id}`, payload);
      } else {
        await api.post("/ratings", payload);
      }
      push("تم حفظ التقييم", "success");
      const res = await api.get("/ratings");
      setExistingRatings(res.data.filter((r) => r.missionId === mission.id));
      setSelectedMember(null);
    } catch (err) {
      push(err.response?.data?.error || "تعذر حفظ التقييم", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!mission) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={selectedMember ? `تقييم ${selectedMember.firstName} ${selectedMember.lastName}` : `تقييم أعضاء مهمة: ${mission.missionName}`}
      wide
    >
      {!selectedMember ? (
        <div>
          {loadingRatings ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : participants.length === 0 ? (
            <p className="text-sm text-mist-400">لم يتم تعيين أعضاء لهذه المهمة بعد</p>
          ) : (
            <div className="flex flex-col divide-y divide-night-700 [body.light_&]:divide-mist-200">
              {participants.map((m) => {
                const r = ratingFor(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => openMember(m)}
                    className="flex items-center justify-between py-3 text-start hover:bg-night-700/30 -mx-2 px-2 rounded-lg [body.light_&]:hover:bg-mist-100"
                  >
                    <div>
                      <div className="font-medium">{m.firstName} {m.lastName}</div>
                      <div className="text-xs text-mist-400">
                        {m.id === mission.leader ? "قائد الفريق" : m.id === mission.coLeader ? "نائب القائد" : "عضو"}
                      </div>
                    </div>
                    {r ? (
                      <Badge tone="safe"><FiCheckCircle size={12} /> تم التقييم · {r.overall}/5</Badge>
                    ) : (
                      <Badge tone="amber">بانتظار التقييم</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setSelectedMember(null)}
            className="flex items-center gap-1.5 text-sm text-mist-400 hover:text-mist-100 w-fit"
          >
            <FiArrowRight size={14} /> رجوع إلى قائمة الأعضاء
          </button>

          <div className="grid sm:grid-cols-2 gap-4">
            {CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-center justify-between rounded-lg border border-night-700 px-3 py-2.5 [body.light_&]:border-mist-200">
                <span className="text-sm">{c.label}</span>
                <StarPicker value={scores[c.key] || 0} onChange={(v) => setScores({ ...scores, [c.key]: v })} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-night-700/40 px-4 py-3 [body.light_&]:bg-mist-100">
            <span className="text-sm font-semibold">التقييم العام (محسوب تلقائياً)</span>
            <span className="text-lg font-extrabold num text-amber-400">{overall} / 5</span>
          </div>

          <Textarea label="ملاحظات" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectedMember(null)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>حفظ التقييم</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

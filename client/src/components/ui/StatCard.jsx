import { Card } from "./Primitives";

const TONE_STYLES = {
  rescue: "text-rescue-400 bg-rescue-500/10",
  safe: "text-safe-400 bg-safe-500/10",
  amber: "text-amber-400 bg-amber-500/10",
  neutral: "text-mist-300 bg-night-600/30",
};

export default function StatCard({ icon: Icon, label, value, tone = "neutral", suffix = "" }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`rounded-lg p-2.5 ${TONE_STYLES[tone]}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs text-mist-400 font-medium [body.light_&]:text-night-500">{label}</div>
        <div className="text-2xl font-extrabold num">
          {value}
          {suffix && <span className="text-sm font-medium text-mist-400"> {suffix}</span>}
        </div>
      </div>
    </Card>
  );
}

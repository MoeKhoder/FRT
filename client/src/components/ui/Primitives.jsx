export function Button({ children, variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-rescue-500 hover:bg-rescue-600 text-white shadow-sm shadow-rescue-500/20",
    secondary:
      "bg-night-700 hover:bg-night-600 text-mist-100 border border-night-600 [body.light_&]:bg-mist-200 [body.light_&]:text-night-900 [body.light_&]:border-mist-300 [body.light_&]:hover:bg-mist-300",
    ghost: "bg-transparent hover:bg-night-700/60 text-mist-300 [body.light_&]:hover:bg-mist-200",
    danger: "bg-transparent border border-rescue-500/50 text-rescue-400 hover:bg-rescue-500/10",
    safe: "bg-safe-500 hover:bg-safe-600 text-night-950",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, error, className = "", required, ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="text-mist-400 font-medium [body.light_&]:text-night-600">
          {label} {required && <span className="text-rescue-500">*</span>}
        </span>
      )}
      <input
        className={`rounded-lg border bg-night-800 border-night-600 text-mist-100 px-3 py-2 outline-none focus:border-rescue-500 focus:ring-2 focus:ring-rescue-500/20 placeholder:text-mist-400/60 [body.light_&]:bg-white [body.light_&]:border-mist-300 [body.light_&]:text-night-900 ${
          error ? "border-rescue-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rescue-400">{error}</span>}
    </label>
  );
}

export function Select({ label, error, children, required, className = "", ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="text-mist-400 font-medium [body.light_&]:text-night-600">
          {label} {required && <span className="text-rescue-500">*</span>}
        </span>
      )}
      <select
        className={`rounded-lg border bg-night-800 border-night-600 text-mist-100 px-3 py-2 outline-none focus:border-rescue-500 focus:ring-2 focus:ring-rescue-500/20 [body.light_&]:bg-white [body.light_&]:border-mist-300 [body.light_&]:text-night-900 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-rescue-400">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && <span className="text-mist-400 font-medium [body.light_&]:text-night-600">{label}</span>}
      <textarea
        className={`rounded-lg border bg-night-800 border-night-600 text-mist-100 px-3 py-2 outline-none focus:border-rescue-500 focus:ring-2 focus:ring-rescue-500/20 [body.light_&]:bg-white [body.light_&]:border-mist-300 [body.light_&]:text-night-900 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rescue-400">{error}</span>}
    </label>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-xl border border-night-700 bg-night-800/60 backdrop-blur-sm [body.light_&]:bg-white [body.light_&]:border-mist-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

const BADGE_TONES = {
  safe: "bg-safe-500/15 text-safe-400 border-safe-500/30",
  rescue: "bg-rescue-500/15 text-rescue-400 border-rescue-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  neutral: "bg-night-600/40 text-mist-300 border-night-500 [body.light_&]:bg-mist-200 [body.light_&]:text-night-600 [body.light_&]:border-mist-300",
};

export function Badge({ children, tone = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-night-600 border-t-rescue-500"
      style={{ width: size, height: size }}
    />
  );
}

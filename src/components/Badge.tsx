import type { Severity } from "../types";

type Tone = "ok" | "warn" | "danger" | "neutral" | "cloud";

const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--accent)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  neutral: "var(--ink-3)",
  cloud: "var(--cloud)",
};

export function StatusBadge({
  tone,
  label,
  value,
  title,
}: {
  tone: Tone;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] leading-none"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: TONE_COLOR[tone], boxShadow: `0 0 0 3px color-mix(in srgb, ${TONE_COLOR[tone]} 18%, transparent)` }}
      />
      <span style={{ color: "var(--ink-3)" }}>{label}</span>
      <span className="font-semibold" style={{ color: TONE_COLOR[tone] }}>
        {value}
      </span>
    </span>
  );
}

const SEVERITY_STYLE: Record<Severity, { color: string; soft: string; label: string }> = {
  high: { color: "var(--danger)", soft: "var(--danger-soft)", label: "High" },
  medium: { color: "var(--warn)", soft: "var(--warn-soft)", label: "Medium" },
  low: { color: "var(--ink-2)", soft: "var(--surface-3)", label: "Low" },
};

export function SeverityPill({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: style.soft, color: style.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.color }} />
      {style.label}
    </span>
  );
}

export function SectionTitle({
  index,
  title,
  hint,
  right,
}: {
  index: string;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold"
            style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}
          >
            {index}
          </span>
          <h2 className="truncate text-[13px] font-semibold tracking-tight">{title}</h2>
        </div>
        {hint ? (
          <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--ink-3)" }}>
            {hint}
          </p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

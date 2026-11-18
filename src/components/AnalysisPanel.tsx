import type { AnalysisMeta, ContractAnalysis, Severity } from "../types";
import { SectionTitle, SeverityPill } from "./Badge";

const RISK_COPY: Record<Severity, { label: string; color: string; soft: string }> = {
  high: { label: "High risk", color: "var(--danger)", soft: "var(--danger-soft)" },
  medium: { label: "Medium risk", color: "var(--warn)", soft: "var(--warn-soft)" },
  low: { label: "Low risk", color: "var(--accent)", soft: "var(--accent-soft)" },
};

export function AnalysisPanel({
  analysis,
  meta,
  running,
}: {
  analysis: ContractAnalysis | null;
  meta: AnalysisMeta | null;
  running: boolean;
}) {
  const sourceLabel = meta
    ? meta.inferenceSource === "in_cloud"
      ? `cloud · ${meta.model}`
      : meta.inferenceSource === "on_device"
        ? "on-device"
        : "simulated"
    : "waiting";

  return (
    <section className="panel flex h-full min-h-0 flex-col">
      <SectionTitle
        index="03"
        title="Clause & risk analysis"
        hint="Runs on the masked text only."
        right={
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background:
                meta?.inferenceSource === "in_cloud"
                  ? "var(--cloud-soft)"
                  : meta?.inferenceSource === "simulated"
                    ? "var(--warn-soft)"
                    : "var(--surface-3)",
              color:
                meta?.inferenceSource === "in_cloud"
                  ? "var(--cloud)"
                  : meta?.inferenceSource === "simulated"
                    ? "var(--warn)"
                    : "var(--ink-3)",
            }}
          >
            {sourceLabel}
          </span>
        }
      />

      {!analysis ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.6">
              <path d="M12 3 4 6v6c0 4.4 3.4 8.1 8 9 4.6-.9 8-4.6 8-9V6l-8-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <p className="max-w-[30ch] text-[12px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            No analysis yet. The cloud model reports a summary, the riskiest clauses with severity, and a
            suggested redline for each one.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
            <div
              className="flex flex-col items-center justify-center rounded-lg px-3 py-1.5"
              style={{
                background: RISK_COPY[analysis.overallRisk].soft,
                color: RISK_COPY[analysis.overallRisk].color,
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider">overall</span>
              <span className="text-[13px] font-bold leading-tight">
                {RISK_COPY[analysis.overallRisk].label}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold">{analysis.contractType}</div>
              <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>
                {analysis.clauses.length} issues
                {meta ? ` · ${meta.latencyMs} ms` : ""}
                {meta && meta.inferenceSource === "simulated" ? " · offline rule set" : ""}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {analysis.summary}
            </p>

            <ul className="mt-3 space-y-2">
              {analysis.clauses.map((clause, index) => (
                <li
                  key={`${clause.title}-${index}`}
                  className="rounded-xl border p-2.5"
                  style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[12px] font-semibold leading-snug">{clause.title}</h3>
                    <SeverityPill severity={clause.severity} />
                  </div>
                  {clause.why && (
                    <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--ink-2)" }}>
                      {clause.why}
                    </p>
                  )}
                  {clause.quote && (
                    <blockquote
                      className="mt-1.5 rounded-md border-l-2 px-2 py-1 font-mono text-[10.5px] leading-snug"
                      style={{
                        borderColor: "var(--line-strong)",
                        background: "var(--surface-3)",
                        color: "var(--ink-2)",
                      }}
                    >
                      {clause.quote}
                    </blockquote>
                  )}
                  {clause.suggestion && (
                    <div className="mt-1.5 flex gap-1.5">
                      <span
                        className="mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        redline
                      </span>
                      <p className="text-[11px] leading-snug" style={{ color: "var(--ink)" }}>
                        {clause.suggestion}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[10px] leading-snug" style={{ color: "var(--ink-3)" }}>
              LocalShield flags issues; it is not a law firm. Have a lawyer review anything you sign.
            </p>
          </div>
        </div>
      )}

      {running && (
        <div className="border-t px-4 py-2 text-[10px]" style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}>
          analysing masked document…
        </div>
      )}
    </section>
  );
}

import type { SampleDoc } from "../data/samples";
import type { AnalysisMode } from "../lib/pipeline";
import type { OnDeviceAvailability } from "../types";
import { SectionTitle } from "./Badge";

const AVAILABILITY_LABEL: Record<OnDeviceAvailability, { text: string; tone: string }> = {
  checking: { text: "checking…", tone: "var(--ink-3)" },
  available: { text: "Gemini Nano ready", tone: "var(--accent)" },
  downloadable: { text: "model downloadable", tone: "var(--warn)" },
  downloading: { text: "model downloading", tone: "var(--warn)" },
  unavailable: { text: "Gemini Nano unavailable", tone: "var(--danger)" },
  "no-api": { text: "Chrome Prompt API absent", tone: "var(--danger)" },
};

export function DocumentPanel({
  doc,
  onDocChange,
  samples,
  activeSample,
  onLoadSample,
  mode,
  onModeChange,
  configured,
  running,
  onRun,
  availability,
  onPrepareModel,
  preparing,
  downloadProgress,
  error,
}: {
  doc: string;
  onDocChange: (value: string) => void;
  samples: SampleDoc[];
  activeSample: string | null;
  onLoadSample: (sample: SampleDoc) => void;
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  configured: boolean;
  running: boolean;
  onRun: () => void;
  availability: OnDeviceAvailability;
  onPrepareModel: () => void;
  preparing: boolean;
  downloadProgress: number | null;
  error: string | null;
}) {
  const avail = AVAILABILITY_LABEL[availability];

  return (
    <section className="panel flex h-full min-h-0 flex-col">
      <SectionTitle
        index="01"
        title="Document"
        hint="Paste a contract or load a sample. Nothing is uploaded until you press run."
        right={
          <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
            {doc.length.toLocaleString()} ch
          </span>
        }
      />

      <div className="flex flex-col gap-3 p-4">
        <div className="grid gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
            Sample documents
          </span>
          {samples.map((sample) => {
            const active = sample.id === activeSample;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => onLoadSample(sample)}
                className="group flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors"
                style={{
                  borderColor: active ? "color-mix(in srgb, var(--accent) 45%, var(--line))" : "var(--line)",
                  background: active ? "var(--accent-soft)" : "var(--surface-2)",
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-medium">{sample.title}</span>
                  <span className="block truncate text-[10px]" style={{ color: "var(--ink-3)" }}>
                    {sample.subtitle}
                  </span>
                </span>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}
                >
                  load
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={doc}
          onChange={(event) => onDocChange(event.target.value)}
          spellCheck={false}
          placeholder="Paste a service agreement, NDA or offer letter here…"
          className="doc-text h-64 w-full resize-none rounded-lg border p-3 outline-none transition-colors focus:border-[color:var(--accent)]"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
          }}
        />

        <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
              On-device model
            </span>
            <span className="text-[10px] font-semibold" style={{ color: avail.tone }}>
              {avail.text}
            </span>
          </div>
          {(availability === "downloadable" || availability === "downloading") && (
            <button
              type="button"
              onClick={onPrepareModel}
              disabled={preparing}
              className="mt-2 w-full rounded-md border px-2 py-1.5 text-[11px] font-medium disabled:opacity-60"
              style={{ borderColor: "var(--line-strong)", color: "var(--ink-2)" }}
            >
              {preparing
                ? `Downloading model… ${downloadProgress !== null ? Math.round(downloadProgress * 100) + "%" : ""}`
                : "Download Gemini Nano now (a few minutes)"}
            </button>
          )}
          {availability === "no-api" && (
            <p className="mt-1.5 text-[10px] leading-snug" style={{ color: "var(--ink-3)" }}>
              Needs desktop Chrome 139+ with
              <code className="mx-1 rounded px-1" style={{ background: "var(--surface-3)" }}>
                chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
              </code>
              set to Enabled. The regex guard still runs without it.
            </p>
          )}
        </div>

        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
            Analysis engine
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg p-1" style={{ background: "var(--surface-3)" }}>
            {(["live", "simulated"] as AnalysisMode[]).map((option) => {
              const active = mode === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onModeChange(option)}
                  className="rounded-md px-2 py-1.5 text-[11px] font-medium transition-all"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,.12)" : "none",
                  }}
                >
                  {option === "live" ? "Firebase AI Logic" : "Simulated"}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] leading-snug" style={{ color: "var(--ink-3)" }}>
            {!configured
              ? "No Firebase project configured, so only the offline simulation can run. Add .env.local to enable Gemini."
              : mode === "live"
                ? "Masked text goes to Gemini 3.5 Flash Lite through Firebase AI Logic (App Check enforced)."
                : "Simulation never contacts the network — useful for screenshots and offline demos."}
          </p>
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={running || !doc.trim()}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "#04120d",
          }}
        >
          {running ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Running hybrid pipeline…
            </>
          ) : (
            <>Redact locally → analyse in cloud</>
          )}
        </button>

        {error && (
          <div
            className="rounded-lg border px-2.5 py-2 text-[11px] leading-snug"
            style={{ borderColor: "color-mix(in srgb, var(--danger) 35%, var(--line))", background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

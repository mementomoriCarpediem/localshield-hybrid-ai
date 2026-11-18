import type { OnDeviceAvailability, PipelineStepId, StepState } from "../types";

const STEPS: { id: PipelineStepId; label: string; channel: "device" | "cloud" }[] = [
  { id: "regex", label: "Regex redaction", channel: "device" },
  { id: "on-device", label: "Gemini Nano NER", channel: "device" },
  { id: "guard", label: "Leak guard", channel: "device" },
  { id: "cloud", label: "Cloud analysis", channel: "cloud" },
];

const STATUS_COLOR: Record<StepState["status"], string> = {
  idle: "var(--ink-3)",
  running: "var(--accent)",
  done: "var(--accent)",
  skipped: "var(--warn)",
  error: "var(--danger)",
};

export function PipelineSteps({
  steps,
  availability,
}: {
  steps: Record<PipelineStepId, StepState>;
  availability: OnDeviceAvailability;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((step, i) => {
        const state = steps[step.id];
        const color = STATUS_COLOR[state.status];
        const isDevice = step.channel === "device";
        return (
          <div
            key={step.id}
            className="relative overflow-hidden rounded-xl border px-3 py-2.5"
            style={{
              borderColor: state.status === "idle" ? "var(--line)" : `color-mix(in srgb, ${color} 35%, var(--line))`,
              background: state.status === "idle" ? "var(--surface)" : `color-mix(in srgb, ${color} 7%, var(--surface))`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold" style={{ color: "var(--ink-3)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                style={{
                  background: isDevice ? "var(--accent-soft)" : "var(--cloud-soft)",
                  color: isDevice ? "var(--accent)" : "var(--cloud)",
                }}
              >
                {isDevice ? "local" : "cloud"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${state.status === "running" ? "pulse" : ""}`}
                style={{ background: color }}
              />
              <span className="truncate text-[11.5px] font-medium">{step.label}</span>
            </div>
            <div className="mt-0.5 truncate text-[10px]" style={{ color: "var(--ink-3)" }} title={state.note}>
              {state.note ?? (step.id === "on-device" && availability === "no-api" ? "Chrome Prompt API missing" : "idle")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

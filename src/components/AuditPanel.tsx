import { useMemo, useState } from "react";
import type { AuditEntry } from "../types";
import { byteLength } from "../lib/redact";
import { SectionTitle } from "./Badge";

type Tab = "timeline" | "payload";

const TONE_COLOR: Record<AuditEntry["tone"], string> = {
  info: "var(--ink-3)",
  ok: "var(--accent)",
  warn: "var(--warn)",
  block: "var(--danger)",
};

function timeOf(value: number): string {
  return new Date(value).toLocaleTimeString([], { hour12: false });
}

export function AuditPanel({
  entries,
  payload,
  cloudContacted,
}: {
  entries: AuditEntry[];
  payload: string | null;
  cloudContacted: boolean;
}) {
  const [tab, setTab] = useState<Tab>("timeline");

  const stats = useMemo(() => {
    const deviceOps = entries.filter((entry) => entry.channel === "device").length;
    const cloudCalls = entries.filter((entry) => entry.channel === "cloud" && entry.tone === "ok").length;
    const bytesSent = cloudContacted && payload ? byteLength(payload) : 0;
    return { deviceOps, cloudCalls, bytesSent };
  }, [entries, payload, cloudContacted]);

  return (
    <section className="panel flex min-h-0 flex-col">
      <SectionTitle
        index="04"
        title="Network & inference audit"
        hint="Proof of what was processed locally and what was transmitted."
        right={
          <div className="flex gap-1 rounded-md p-0.5" style={{ background: "var(--surface-3)" }}>
            {(["timeline", "payload"] as Tab[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTab(option)}
                className="rounded px-2 py-1 text-[10px] font-medium capitalize"
                style={{
                  background: tab === option ? "var(--surface)" : "transparent",
                  color: tab === option ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                {option === "payload" ? "Cloud payload" : "Timeline"}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-3 divide-x border-b" style={{ borderColor: "var(--line)" }}>
        {[
          { label: "Local operations", value: String(stats.deviceOps), color: "var(--accent)" },
          { label: "Cloud requests", value: String(stats.cloudCalls), color: "var(--cloud)" },
          {
            label: "Bytes transmitted",
            value: stats.bytesSent === 0 ? "0" : stats.bytesSent.toLocaleString(),
            color: stats.bytesSent === 0 ? "var(--accent)" : "var(--cloud)",
          },
        ].map((item) => (
          <div key={item.label} className="px-4 py-2" style={{ borderColor: "var(--line)" }}>
            <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>
              {item.label}
            </div>
            <div className="font-mono text-[15px] font-semibold" style={{ color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {tab === "timeline" ? (
        <div className="max-h-64 min-h-[9rem] overflow-auto px-4 py-2">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-[11px]" style={{ color: "var(--ink-3)" }}>
              No activity yet. Every step of the pipeline writes a line here.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {entries.map((entry) => (
                <li key={entry.id} className="flex gap-2.5 rounded-md py-1">
                  <span className="w-14 shrink-0 pt-0.5 font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                    {timeOf(entry.at)}
                  </span>
                  <span
                    className="mt-0.5 h-fit shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                    style={{
                      background: entry.channel === "device" ? "var(--accent-soft)" : "var(--cloud-soft)",
                      color: entry.channel === "device" ? "var(--accent)" : "var(--cloud)",
                    }}
                  >
                    {entry.channel}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[11.5px] font-medium" style={{ color: TONE_COLOR[entry.tone] }}>
                        {entry.stage}
                      </span>
                      {typeof entry.chars === "number" && (
                        <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                          {entry.chars.toLocaleString()} ch
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: "var(--ink-2)" }}>
                      {entry.message}
                    </span>
                    {entry.detail && (
                      <span className="mt-0.5 block font-mono text-[10px] leading-snug" style={{ color: "var(--ink-3)" }}>
                        {entry.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div className="px-4 py-3">
          {payload ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]" style={{ color: "var(--ink-3)" }}>
                <span className="font-mono">{byteLength(payload).toLocaleString()} bytes</span>
                <span>·</span>
                <span className="font-mono">{payload.length.toLocaleString()} chars</span>
                <span>·</span>
                <span>sent to Firebase AI Logic only when the Live engine is selected</span>
              </div>
              <pre
                className="doc-text max-h-56 overflow-auto rounded-lg border p-3"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--ink-2)" }}
              >
                {payload}
              </pre>
              <p className="mt-2 text-[10px] leading-snug" style={{ color: "var(--ink-3)" }}>
                Not included: the original values, the entity map, the file name, and any metadata about
                this browser.
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-[11px]" style={{ color: "var(--ink-3)" }}>
              Run the pipeline to inspect the exact bytes that would leave your device.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

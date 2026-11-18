import { useMemo, useState } from "react";
import type { RedactionResult } from "../types";
import { PII_LABEL } from "../types";
import { byteLength } from "../lib/redact";
import { SectionTitle } from "./Badge";

type View = "masked" | "diff";

export function RedactionPanel({
  redaction,
  running,
}: {
  redaction: RedactionResult | null;
  running: boolean;
}) {
  const [view, setView] = useState<View>("masked");
  const [reveal, setReveal] = useState(false);

  const valueByToken = useMemo(() => {
    const map = new Map<string, string>();
    redaction?.entities.forEach((entity) => map.set(entity.placeholder, entity.value));
    return map;
  }, [redaction]);

  const payloadBytes = redaction ? byteLength(redaction.maskedText) : 0;

  return (
    <section className="panel flex h-full min-h-0 flex-col">
      <SectionTitle
        index="02"
        title="Local redaction"
        hint="Everything on this panel was produced inside your browser tab."
        right={
          <div className="flex gap-1 rounded-md p-0.5" style={{ background: "var(--surface-3)" }}>
            {(["masked", "diff"] as View[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className="rounded px-2 py-1 text-[10px] font-medium capitalize"
                style={{
                  background: view === option ? "var(--surface)" : "transparent",
                  color: view === option ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                {option === "masked" ? "Masked" : "Original ↔ masked"}
              </button>
            ))}
          </div>
        }
      />

      {!redaction ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="max-w-[34ch] text-[12px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Run the pipeline to see placeholders such as{" "}
            <span className="token">[PERSON_1]</span> replace names, IDs and account numbers — with the
            original mapping kept in this tab's memory only.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
            {[
              { label: `${redaction.entities.length} tokens`, tone: "accent" },
              { label: `${redaction.spanCount} spans`, tone: "muted" },
              { label: `${redaction.charsRemoved.toLocaleString()} chars concealed`, tone: "muted" },
              { label: `${payloadBytes.toLocaleString()} B payload`, tone: "cloud" },
            ].map((chip) => (
              <span
                key={chip.label}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background:
                    chip.tone === "accent"
                      ? "var(--accent-soft)"
                      : chip.tone === "cloud"
                        ? "var(--cloud-soft)"
                        : "var(--surface-3)",
                  color:
                    chip.tone === "accent"
                      ? "var(--accent)"
                      : chip.tone === "cloud"
                        ? "var(--cloud)"
                        : "var(--ink-2)",
                }}
              >
                {chip.label}
              </span>
            ))}
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: redaction.leaks.length === 0 ? "var(--accent-soft)" : "var(--danger-soft)",
                color: redaction.leaks.length === 0 ? "var(--accent)" : "var(--danger)",
              }}
            >
              {redaction.leaks.length === 0 ? "leak guard: clear" : `${redaction.leaks.length} leaks blocked`}
            </span>
          </div>

          <div
            className="mx-4 mt-3 min-h-0 flex-1 overflow-auto rounded-lg border p-3"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
          >
            {view === "masked" ? (
              <p className="doc-text" style={{ color: "var(--ink)" }}>
                {redaction.segments.map((segment, index) =>
                  segment.token ? (
                    <span key={index} className="token" title={PII_LABEL[segment.category!]}>
                      {segment.text}
                    </span>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--danger)" }}>
                    Original · never leaves the tab
                  </div>
                  <p className="doc-text" style={{ color: "var(--ink)" }}>
                    {redaction.segments.map((segment, index) =>
                      segment.token ? (
                        <span key={index} className="pii-original" title={PII_LABEL[segment.category!]}>
                          {valueByToken.get(segment.token) ?? segment.text}
                        </span>
                      ) : (
                        <span key={index}>{segment.text}</span>
                      ),
                    )}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cloud)" }}>
                    Sent to Gemini
                  </div>
                  <p className="doc-text" style={{ color: "var(--ink)" }}>
                    {redaction.segments.map((segment, index) =>
                      segment.token ? (
                        <span key={index} className="token token-cloud">
                          {segment.text}
                        </span>
                      ) : (
                        <span key={index}>{segment.text}</span>
                      ),
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                Entity map · {redaction.entities.length}
              </span>
              <button
                type="button"
                onClick={() => setReveal((value) => !value)}
                className="rounded-md border px-2 py-0.5 text-[10px] font-medium"
                style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}
              >
                {reveal ? "Hide originals" : "Reveal originals"}
              </button>
            </div>
            <div className="max-h-40 overflow-auto px-4 pb-3">
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  {redaction.entities.map((entity) => (
                    <tr key={entity.token} className="border-t" style={{ borderColor: "var(--line)" }}>
                      <td className="py-1.5 pr-2 align-top">
                        <span className="token">{entity.placeholder}</span>
                      </td>
                      <td className="py-1.5 pr-2 align-top" style={{ color: "var(--ink-3)" }}>
                        {PII_LABEL[entity.category]}
                      </td>
                      <td className="py-1.5 pr-2 align-top" style={{ color: "var(--ink-2)" }}>
                        {entity.sources.map((source) => (
                          <span
                            key={source}
                            className="mr-1 rounded px-1 py-0.5 text-[9px] font-semibold uppercase"
                            style={{
                              background: source === "on-device" ? "var(--accent-soft)" : "var(--surface-3)",
                              color: source === "on-device" ? "var(--accent)" : "var(--ink-3)",
                            }}
                          >
                            {source === "on-device" ? "nano" : "regex"}
                          </span>
                        ))}
                        <span className="ml-1">×{entity.occurrences}</span>
                      </td>
                      <td className="max-w-[16rem] truncate py-1.5 align-top font-mono" title={reveal ? entity.value : undefined}>
                        <span className={reveal ? "" : "blurred"}>{reveal ? entity.value : "••••••••"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {running && (
                <p className="py-2 text-[10px]" style={{ color: "var(--ink-3)" }}>
                  working…
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

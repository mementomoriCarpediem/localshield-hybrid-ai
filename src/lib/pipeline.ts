/**
 * Pipeline orchestration.
 *
 *   1. deterministic regex guard   (local, always)
 *   2. on-device residual NER      (ONLY_ON_DEVICE, skipped when unavailable)
 *   3. outbound leak guard         (local, always)
 *   4. clause-risk analysis        (ONLY_IN_CLOUD, or the offline simulation)
 *
 * Every step reports into the audit log so the UI can show exactly which bytes
 * stayed in the tab and which ones were sent.
 */

import type {
  AnalysisMeta,
  AuditEntry,
  ContractAnalysis,
  PiiSpan,
  PipelineStepId,
  RedactionResult,
  StepState,
} from "../types";
import { PII_LABEL } from "../types";
import {
  analyzeContractInCloud,
  checkOnDeviceAvailability,
  detectResidualEntitiesOnDevice,
  type DeviceEntity,
} from "./ai";
import { isFirebaseConfigured } from "./config";
import { analyzeSimulated } from "./demo";
import { detectDeterministicPii } from "./pii";
import { applyRedaction, byteLength, findResidualPii } from "./redact";

export type AnalysisMode = "live" | "simulated";

export interface PipelineOptions {
  mode: AnalysisMode;
  onAudit: (entry: Omit<AuditEntry, "id" | "at">) => void;
  onStep: (id: PipelineStepId, state: StepState) => void;
  onDeviceProgress?: (fraction: number) => void;
}

export interface PipelineOutcome {
  redaction: RedactionResult;
  analysis: ContractAnalysis;
  meta: AnalysisMeta;
  deviceEntities: number;
  payloadBytes: number;
  payloadChars: number;
  /** True when the cloud was never contacted (simulation or blocked). */
  cloudContacted: boolean;
}

function locateInOriginal(
  original: string,
  entities: DeviceEntity[],
  occupied: PiiSpan[],
): PiiSpan[] {
  const taken = [...occupied];
  const added: PiiSpan[] = [];

  const overlaps = (start: number, end: number) =>
    taken.some((span) => start < span.end && end > span.start);

  for (const entity of entities) {
    const needle = entity.text.trim();
    if (needle.length < 2) continue;
    let from = 0;
    let placed = 0;
    // Cap the number of occurrences so a common word cannot flood the mapping.
    while (placed < 25) {
      const index = original.indexOf(needle, from);
      if (index === -1) break;
      const end = index + needle.length;
      from = end;
      if (overlaps(index, end)) continue;
      const span: PiiSpan = {
        start: index,
        end,
        category: entity.category,
        value: original.slice(index, end),
        source: "on-device",
        rule: "gemini-nano-ner",
      };
      added.push(span);
      taken.push(span);
      placed += 1;
    }
  }
  return added;
}

export async function runPipeline(text: string, options: PipelineOptions): Promise<PipelineOutcome> {
  const source = text;
  if (!source.trim()) throw new Error("Load a sample document or paste a contract first.");

  /* ---- Step 1: deterministic redaction ---------------------------------- */
  options.onStep("regex", { status: "running" });
  const regexSpans = detectDeterministicPii(source);
  const firstPass = applyRedaction(source, regexSpans);
  const categoryCounts = new Map<string, number>();
  for (const span of regexSpans) {
    categoryCounts.set(span.category, (categoryCounts.get(span.category) ?? 0) + 1);
  }
  options.onAudit({
    channel: "device",
    stage: "Regex guard · local",
    message: `${regexSpans.length} identifier${regexSpans.length === 1 ? "" : "s"} replaced with ${firstPass.entities.length} token${firstPass.entities.length === 1 ? "" : "s"} — 0 bytes left the tab`,
    detail: [...categoryCounts.entries()]
      .map(([category, count]) => `${PII_LABEL[category as keyof typeof PII_LABEL] ?? category} ×${count}`)
      .join(" · "),
    chars: source.length,
    tone: "ok",
  });
  options.onStep("regex", { status: "done", note: `${regexSpans.length} spans` });

  /* ---- Step 2: on-device residual entity detection ---------------------- */
  let deviceSpans: PiiSpan[] = [];
  let deviceNote = "skipped";
  if (options.mode === "simulated") {
    options.onStep("on-device", { status: "skipped", note: "simulation mode" });
    options.onAudit({
      channel: "device",
      stage: "Gemini Nano · ONLY_ON_DEVICE",
      message: "Skipped in simulation mode — the on-device model is not invoked.",
      tone: "info",
    });
  } else {
    const availability = await checkOnDeviceAvailability();
    const usable =
      availability === "available" ||
      availability === "downloadable" ||
      availability === "downloading";

    if (!usable) {
      const reason =
        availability === "no-api"
          ? "Chrome Prompt API not present (needs Chrome 139+ on desktop)"
          : "Gemini Nano is not available on this browser";
      options.onStep("on-device", { status: "skipped", note: reason });
      options.onAudit({
        channel: "device",
        stage: "Gemini Nano · ONLY_ON_DEVICE",
        message: `Skipped: ${reason}. Structured identifiers are still redacted by the regex guard.`,
        tone: "warn",
      });
    } else {
      options.onStep("on-device", {
        status: "running",
        note: availability === "available" ? "Gemini Nano ready" : "model download in progress",
      });
      try {
        const entities = await detectResidualEntitiesOnDevice(firstPass.maskedText, {
          onProgress: options.onDeviceProgress,
        });
        deviceSpans = locateInOriginal(source, entities, regexSpans);
        deviceNote = `${deviceSpans.length} entities`;
        options.onStep("on-device", { status: "done", note: deviceNote });
        options.onAudit({
          channel: "device",
          stage: "Gemini Nano · ONLY_ON_DEVICE",
          message: `${deviceSpans.length} free-text entit${deviceSpans.length === 1 ? "y" : "ies"} found by the on-device model — inference ran locally, no network call`,
          detail:
            deviceSpans.length > 0
              ? [...new Set(deviceSpans.map((span) => PII_LABEL[span.category]))].join(" · ")
              : "nothing beyond the regex guard",
          tone: "ok",
        });
      } catch (error) {
        deviceNote = "model error";
        options.onStep("on-device", { status: "skipped", note: "on-device model error" });
        options.onAudit({
          channel: "device",
          stage: "Gemini Nano · ONLY_ON_DEVICE",
          message: `On-device pass failed (${(error as Error).message}). Continuing with regex-only redaction.`,
          tone: "warn",
        });
      }
    }
  }

  /* ---- Merge and finalise the redaction --------------------------------- */
  const finalRedaction = applyRedaction(source, [...regexSpans, ...deviceSpans]);
  const maskedText = finalRedaction.maskedText;

  /* ---- Step 3: outbound leak guard -------------------------------------- */
  options.onStep("guard", { status: "running" });
  const leaks = findResidualPii(maskedText);
  if (leaks.length > 0) {
    options.onStep("guard", { status: "error", note: `${leaks.length} leaks` });
    options.onAudit({
      channel: "device",
      stage: "Outbound leak guard · local",
      message: `BLOCKED: ${leaks.length} identifier-shaped string(s) survived redaction, so nothing was sent to the cloud.`,
      detail: leaks
        .slice(0, 5)
        .map((leak) => `${PII_LABEL[leak.category]} (${leak.rule})`)
        .join(" · "),
      tone: "block",
    });
    throw new Error(
      `Redaction is incomplete: ${leaks.length} identifier(s) would have left the device. The cloud request was blocked.`,
    );
  }
  options.onStep("guard", { status: "done", note: "0 leaks" });
  options.onAudit({
    channel: "device",
    stage: "Outbound leak guard · local",
    message: "Re-scan of the masked text found 0 residual identifiers — cleared for transmission",
    tone: "ok",
  });

  /* ---- Step 4: clause & risk analysis ----------------------------------- */
  const payloadBytes = byteLength(maskedText);
  options.onStep("cloud", { status: "running" });

  let analysis: ContractAnalysis;
  let meta: AnalysisMeta;
  let cloudContacted = false;

  if (options.mode === "simulated" || !isFirebaseConfigured()) {
    const started = performance.now();
    analysis = analyzeSimulated(maskedText);
    meta = {
      inferenceSource: "simulated",
      model: "offline rule set (no network)",
      latencyMs: Math.round(performance.now() - started),
    };
    options.onStep("cloud", { status: "done", note: "simulated" });
    options.onAudit({
      channel: "cloud",
      stage: "Analysis · SIMULATED",
      message:
        "Offline simulation produced this analysis. No request was made to Firebase AI Logic and no text left the browser.",
      detail: `${payloadBytes} bytes of masked text stayed local`,
      chars: maskedText.length,
      tone: "warn",
    });
  } else {
    const result = await analyzeContractInCloud(maskedText);
    analysis = result.analysis;
    meta = {
      inferenceSource: result.inferenceSource === "on_device" ? "on_device" : "in_cloud",
      model: result.model,
      latencyMs: result.latencyMs,
    };
    cloudContacted = true;
    options.onStep("cloud", { status: "done", note: `${result.inferenceSource}` });
    options.onAudit({
      channel: "cloud",
      stage: `Gemini · ONLY_IN_CLOUD (${result.inferenceSource})`,
      message: `${payloadBytes} bytes sent to ${result.model} — masked text only, ${finalRedaction.entities.length} tokens preserved`,
      detail: `${maskedText.length} chars · ${analysis.clauses.length} clauses returned in ${result.latencyMs} ms`,
      chars: maskedText.length,
      tone: "ok",
    });
  }

  return {
    redaction: finalRedaction,
    analysis,
    meta,
    deviceEntities: deviceSpans.length,
    payloadBytes,
    payloadChars: maskedText.length,
    cloudContacted,
  };
}

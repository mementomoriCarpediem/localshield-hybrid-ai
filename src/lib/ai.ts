/**
 * Firebase AI Logic — hybrid inference.
 *
 * Two models, two inference modes, one contract review:
 *
 *   1. `ONLY_ON_DEVICE`  — Gemini Nano (Chrome Prompt API) reads the *already
 *      partially masked* document and finds the residual free-text entities a
 *      regex cannot see (person names, organizations, street addresses). The
 *      original text never leaves the tab here; there is no cloud fallback, so
 *      a missing model is an error, not a silent upload.
 *
 *   2. `ONLY_IN_CLOUD`   — Gemini (gemini-3.5-flash-lite by default) receives
 *      the fully masked text and returns a structured clause-risk analysis.
 *      On-device is never used for this step because the analysis needs the
 *      larger model, and because the text is already safe to send.
 *
 * The `PREFER_*` modes are intentionally not used on the redaction step: a
 * privacy filter must never "helpfully" fall back to the cloud.
 */

import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  Schema,
  type AI,
  type GenerativeModel,
} from "firebase/ai";
import type { ContractAnalysis, RiskClause, Severity } from "../types";
import { CLOUD_MODEL } from "./config";
import { initFirebase } from "./firebase";

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

/** Structured output schema for the on-device entity pass. */
export const entitySchema = Schema.object({
  properties: {
    entities: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string({
            description: "Exact substring copied from the input, no paraphrasing.",
          }),
          category: Schema.enumString({
            enum: ["PERSON", "COMPANY", "ADDRESS"],
            description: "What kind of entity the substring is.",
          }),
        },
      }),
      description: "Every remaining person, organization or street address.",
    }),
  },
});

/** Structured output schema for the cloud clause-risk analysis. */
export const analysisSchema = Schema.object({
  properties: {
    contractType: Schema.string({
      description: "Short label, e.g. 'Freelance Service Agreement' or 'Employment Offer Letter'.",
    }),
    overallRisk: Schema.enumString({
      enum: ["high", "medium", "low"],
      description: "Risk to the party who uploaded the document.",
    }),
    summary: Schema.string({
      description: "Three to five plain-language sentences for a non-lawyer.",
    }),
    clauses: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string({ description: "Short name of the clause or issue." }),
          severity: Schema.enumString({ enum: ["high", "medium", "low"] }),
          quote: Schema.string({
            description: "Verbatim excerpt from the document, keeping placeholders intact.",
          }),
          why: Schema.string({ description: "Why this matters, in one or two sentences." }),
          suggestion: Schema.string({
            description: "Concrete redline wording the reader can propose.",
          }),
        },
      }),
      description: "Between three and seven of the most material issues, worst first.",
    }),
  },
});

/* -------------------------------------------------------------------------- */
/* Model access                                                               */
/* -------------------------------------------------------------------------- */

let ai: AI | null = null;

function getAiClient(): AI {
  if (ai) return ai;
  const { app } = initFirebase();
  if (!app) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env.local and add your Firebase web app config.",
    );
  }
  ai = getAI(app, { backend: new GoogleAIBackend() });
  return ai;
}

let deviceModel: GenerativeModel | null = null;

function getDeviceModel(): GenerativeModel {
  if (deviceModel) return deviceModel;
  deviceModel = getGenerativeModel(getAiClient(), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [
          {
            role: "system",
            content: [
              {
                type: "text",
                value:
                  "You extract personally identifying entities from documents. Copy substrings exactly as they appear. Never explain, never invent.",
              },
            ],
          },
        ],
      },
      promptOptions: { responseConstraint: entitySchema },
    },
  });
  return deviceModel;
}

let cloudModelInstance: GenerativeModel | null = null;

function getCloudModel(): GenerativeModel {
  if (cloudModelInstance) return cloudModelInstance;
  cloudModelInstance = getGenerativeModel(getAiClient(), {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: CLOUD_MODEL,
      systemInstruction:
        "You are a contract risk analyst for small and mid-sized businesses. The document you " +
        "receive has been privacy-redacted: identifiers such as [PERSON_1], [COMPANY_2] and " +
        "[MONEY_1] are consistent pseudonyms, so you can reason about references between them. " +
        "Never guess what a token stands for, never ask for the real value, and never comment on " +
        "the redaction itself. Cite verbatim excerpts that keep the tokens intact. You are not " +
        "giving legal advice; flag issues so the reader can take them to a lawyer.",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
        maxOutputTokens: 3072,
      },
    },
  });
  return cloudModelInstance;
}

/* -------------------------------------------------------------------------- */
/* On-device availability                                                     */
/* -------------------------------------------------------------------------- */

interface ChromeLanguageModel {
  availability?: () => Promise<string>;
}

/** Ask Chrome's Prompt API whether Gemini Nano can run here. */
export async function checkOnDeviceAvailability(): Promise<
  "available" | "downloadable" | "downloading" | "unavailable" | "no-api"
> {
  const lm = (globalThis as { LanguageModel?: ChromeLanguageModel }).LanguageModel;
  if (!lm?.availability) return "no-api";
  try {
    const value = await lm.availability();
    if (
      value === "available" ||
      value === "downloadable" ||
      value === "downloading" ||
      value === "unavailable"
    ) {
      return value;
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/**
 * Start (and await) the on-device model download. Must be called from a user
 * gesture — Chrome requires transient activation to create a model session.
 */
export async function prepareOnDeviceModel(
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const model = getDeviceModel();
  const progress = (value: number) => onProgress?.(Math.round(value * 1000) / 1000);
  if (onProgress) {
    await model.initializeDeviceModel(progress);
  } else {
    await model.initializeDeviceModel();
  }
}

/* -------------------------------------------------------------------------- */
/* Step 1 — on-device residual entity detection                               */
/* -------------------------------------------------------------------------- */

export interface DeviceEntity {
  text: string;
  category: "PERSON" | "COMPANY" | "ADDRESS";
}

const NER_PROMPT_HEADER =
  "The text below is a business document that has already had structured identifiers replaced " +
  "with tokens such as [EMAIL_1], [PHONE_2], [MONEY_3]. List every remaining person name, " +
  "organization name and street address. Copy each exactly as written. If there are none, " +
  "return an empty list.";

function parseJsonLoose(raw: string): unknown {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const block of text.split(/\n{2,}/)) {
    if ((current + block).length > maxChars && current) {
      chunks.push(current);
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Run the on-device model over the partially masked text and return the
 * entities it found. Everything stays in the tab: no cloud fallback exists for
 * this mode, and the model is `ONLY_ON_DEVICE`.
 */
export async function detectResidualEntitiesOnDevice(
  maskedText: string,
  options: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<DeviceEntity[]> {
  const model = getDeviceModel();
  await prepareOnDeviceModel(options.onProgress);

  const found: DeviceEntity[] = [];
  for (const chunk of chunkText(maskedText, 4000)) {
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const result = await model.generateContent(`${NER_PROMPT_HEADER}\n\n---\n${chunk}\n---`);
    const parsed = parseJsonLoose(result.response.text());
    const entities = (parsed as { entities?: unknown } | null)?.entities;
    if (!Array.isArray(entities)) continue;
    for (const item of entities) {
      if (!item || typeof item !== "object") continue;
      const text = (item as { text?: unknown }).text;
      const category = (item as { category?: unknown }).category;
      if (typeof text !== "string" || text.trim().length < 2) continue;
      if (category !== "PERSON" && category !== "COMPANY" && category !== "ADDRESS") continue;
      found.push({ text: text.trim(), category });
    }
  }
  return found;
}

/* -------------------------------------------------------------------------- */
/* Step 2 — cloud clause & risk analysis                                      */
/* -------------------------------------------------------------------------- */

function normalizeSeverity(value: unknown): Severity {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

/** Defensive normalisation: never trust a model's JSON shape. */
export function normalizeAnalysis(raw: unknown): ContractAnalysis {
  const value = (raw ?? {}) as Record<string, unknown>;
  const clausesRaw = Array.isArray(value.clauses) ? value.clauses : [];
  const clauses: RiskClause[] = clausesRaw
    .filter((clause): clause is Record<string, unknown> => Boolean(clause) && typeof clause === "object")
    .map((clause) => ({
      title: String(clause.title ?? "Untitled issue"),
      severity: normalizeSeverity(clause.severity),
      quote: String(clause.quote ?? ""),
      why: String(clause.why ?? ""),
      suggestion: String(clause.suggestion ?? ""),
    }));

  return {
    contractType: String(value.contractType ?? "Contract"),
    overallRisk: normalizeSeverity(value.overallRisk),
    summary: String(value.summary ?? ""),
    clauses,
  };
}

export interface CloudAnalysisResult {
  analysis: ContractAnalysis;
  inferenceSource: string;
  model: string;
  latencyMs: number;
}

/**
 * Send the masked document to Gemini in the cloud and get structured risk
 * output back. `ONLY_IN_CLOUD`: there is no on-device fallback, so a failure
 * surfaces as an error instead of a silent downgrade.
 */
export async function analyzeContractInCloud(maskedText: string): Promise<CloudAnalysisResult> {
  const model = getCloudModel();
  const startedAt = performance.now();
  const result = await model.generateContent(
    `Review the following redacted contract and return the structured analysis.\n\n` +
      `Focus on: payment terms and cash-flow exposure, liability and indemnity, ` +
      `intellectual property ownership, restrictive covenants, termination and renewal, ` +
      `dispute resolution, and anything unusually one-sided.\n\n` +
      `DOCUMENT\n"""\n${maskedText}\n"""`,
  );
  const latencyMs = Math.round(performance.now() - startedAt);
  const parsed = parseJsonLoose(result.response.text());
  if (!parsed) throw new Error("The model did not return valid JSON.");
  return {
    analysis: normalizeAnalysis(parsed),
    inferenceSource: result.response.inferenceSource ?? "in_cloud",
    model: CLOUD_MODEL,
    latencyMs,
  };
}

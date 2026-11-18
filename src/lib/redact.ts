/**
 * Local redaction engine.
 *
 * Everything here runs in the browser tab. The mapping between a placeholder
 * (`[PERSON_1]`) and the original value lives in this module's memory only and
 * is never serialized, stored, or sent anywhere.
 */

import type {
  DiffSegment,
  PiiCategory,
  PiiSpan,
  RedactionEntity,
  RedactionResult,
} from "../types";
import { detectDeterministicPii, resolveOverlaps } from "./pii";

/** Placeholder syntax used throughout the UI and the cloud prompt. */
export const TOKEN_PATTERN = /\[([A-Z_]+)_(\d+)\]/g;

function dedupeKey(category: PiiCategory, value: string): string {
  return `${category}::${value.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/**
 * Replace every span with a stable placeholder. The same value always receives
 * the same token, so the downstream model can reason about co-reference
 * ("the same party" stays visibly the same) without ever seeing the value.
 */
export function applyRedaction(text: string, inputSpans: PiiSpan[]): RedactionResult {
  const spans = resolveOverlaps(inputSpans).sort((a, b) => a.start - b.start);

  const counters = new Map<PiiCategory, number>();
  const byKey = new Map<string, RedactionEntity>();
  const entities: RedactionEntity[] = [];

  let masked = "";
  let cursor = 0;
  let charsRemoved = 0;
  const segments: DiffSegment[] = [];

  for (const span of spans) {
    const key = dedupeKey(span.category, span.value);
    let entity = byKey.get(key);
    if (!entity) {
      const next = (counters.get(span.category) ?? 0) + 1;
      counters.set(span.category, next);
      entity = {
        token: `${span.category}_${next}`,
        placeholder: `[${span.category}_${next}]`,
        category: span.category,
        value: span.value,
        sources: [span.source],
        occurrences: 0,
      };
      byKey.set(key, entity);
      entities.push(entity);
    } else if (!entity.sources.includes(span.source)) {
      entity.sources.push(span.source);
    }

    entity.occurrences += 1;
    charsRemoved += span.end - span.start;
    if (span.start > cursor) {
      const plain = text.slice(cursor, span.start);
      masked += plain;
      segments.push({ text: plain });
    }
    masked += entity.placeholder;
    segments.push({ text: entity.placeholder, token: entity.placeholder, category: entity.category });
    cursor = span.end;
  }
  if (cursor < text.length) {
    const tail = text.slice(cursor);
    masked += tail;
    segments.push({ text: tail });
  }

  return {
    maskedText: masked,
    entities,
    segments,
    spanCount: spans.length,
    charsRemoved,
    leaks: detectDeterministicPii(masked),
  };
}

export interface MaskSegment {
  text: string;
  token?: string;
  category?: PiiCategory;
}

/**
 * Split masked text into plain runs and placeholder runs so the UI can render
 * the redaction inline.
 */
export function splitMaskedSegments(maskedText: string): MaskSegment[] {
  const segments: MaskSegment[] = [];
  let last = 0;
  for (const match of maskedText.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: maskedText.slice(last, index) });
    segments.push({
      text: match[0],
      token: match[0],
      category: match[1] as PiiCategory,
    });
    last = index + match[0].length;
  }
  if (last < maskedText.length) segments.push({ text: maskedText.slice(last) });
  return segments;
}

/**
 * Last line of defence: look for PII-shaped strings that survived redaction.
 * An empty result is what authorises sending the text to the cloud.
 */
export function findResidualPii(maskedText: string): PiiSpan[] {
  return detectDeterministicPii(maskedText);
}

/** Human-readable byte size, used in the audit log. */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

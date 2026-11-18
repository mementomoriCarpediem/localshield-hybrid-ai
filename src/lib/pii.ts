/**
 * Deterministic PII detectors.
 *
 * These rules are the *guarantee* layer of the pipeline: they run locally, they
 * are cheap, and they always catch structured identifiers (emails, SSNs, card
 * numbers, account numbers...) regardless of whether an on-device model is
 * available. The on-device model adds recall for free-text entities such as
 * person names and organization names that no regex can see.
 */

import type { PiiCategory, PiiSpan } from "../types";

interface Rule {
  name: string;
  category: PiiCategory;
  pattern: RegExp;
  /** Capture group holding the sensitive value (default: whole match). */
  group?: number;
  /** Optional sanity check on the captured value. */
  validate?: (value: string) => boolean;
}

const MONTHS =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)";

function luhnValid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

function plausibleSsn(value: string): boolean {
  const [area, group, serial] = value.split("-").map(Number);
  if (area === 0 || area === 666 || area >= 900) return false;
  return group !== 0 && serial !== 0;
}

const RULES: Rule[] = [
  {
    name: "email",
    category: "EMAIL",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
  },
  {
    name: "ssn",
    category: "SSN",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    validate: plausibleSsn,
  },
  {
    name: "korean-rrn",
    category: "GOV_ID",
    pattern: /\b\d{6}-\d{7}\b/g,
  },
  {
    name: "card-number",
    category: "CARD",
    pattern: /\b(?:\d[ -]?){12,18}\d\b/g,
    validate: luhnValid,
  },
  {
    name: "iban",
    category: "BANK",
    pattern: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b/g,
  },
  {
    name: "account-labeled",
    category: "BANK",
    pattern:
      /\b(?:Account|Acct)\.?(?:\s*(?:No\.?|Number|#))?\s*[:#]?\s*([0-9][0-9\s-]{5,24}[0-9])\b/gi,
    group: 1,
  },
  {
    name: "routing-labeled",
    category: "BANK",
    pattern: /\b(?:Routing|SWIFT|BIC)(?:\s*(?:No\.?|Number|Code))?\s*[:#]?\s*([A-Z0-9]{6,14})\b/gi,
    group: 1,
  },
  {
    name: "passport-labeled",
    category: "PASSPORT",
    pattern: /\bPassport(?:\s*(?:No\.?|Number))?\s*[:#]\s*([A-Z]{1,2}\d{6,8})\b/gi,
    group: 1,
  },
  {
    name: "passport-generic",
    category: "PASSPORT",
    pattern: /\b[A-Z]\d{8}\b/g,
    validate: (v) => !/^[A-Z]0/.test(v),
  },
  {
    name: "ein-standalone",
    category: "TAX_ID",
    pattern: /\b\d{2}-\d{7}\b/g,
  },
  {
    name: "tax-id",
    category: "TAX_ID",
    pattern: /\b(?:EIN|Tax\s*ID|TIN)\s*[:#]?\s*(\d{2}-\d{7})\b/gi,
    group: 1,
  },
  {
    name: "phone-us",
    category: "PHONE",
    pattern: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
  },
  {
    name: "phone-intl",
    category: "PHONE",
    pattern: /\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
  },
  {
    name: "address-us",
    category: "ADDRESS",
    pattern:
      /\b\d{1,6}\s+(?:[A-Z][A-Za-z0-9.'-]*\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter)\b\.?(?:\s*,?\s*(?:Suite|Apt|Unit|#)\s?[A-Za-z0-9-]+)?/g,
  },
  {
    name: "address-city-state-zip",
    category: "ADDRESS",
    pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g,
  },
  {
    name: "company-suffix",
    category: "COMPANY",
    pattern:
      /\b[A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,4}\s+(?:Inc\.?|LLC|L\.L\.C\.|Ltd\.?|Limited|Corp\.?|Corporation|Co\.|GmbH|AG|S\.A\.|Pty\s+Ltd)\b/g,
  },
  {
    name: "money-usd",
    category: "MONEY",
    pattern: /(?:\$|USD\s?)\s?\d[\d,]*(?:\.\d{2})?/g,
  },
  {
    name: "money-amount",
    category: "MONEY",
    pattern: /\b\d[\d,]*(?:\.\d{2})?\s?(?:USD|EUR|GBP)\b/g,
  },
  {
    name: "dob-labeled",
    category: "DOB",
    pattern:
      new RegExp(
        `\\b(?:DOB|Date of Birth|Born)\\s*[:#-]?\\s*(${MONTHS}\\s+\\d{1,2},?\\s*\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})`,
        "gi",
      ),
    group: 1,
  },
  {
    name: "name-title",
    category: "PERSON",
    pattern: /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z]\.)?(?:[ \t]+[A-Z][a-z]+){0,2})/g,
    group: 1,
  },
  {
    name: "name-greeting",
    category: "PERSON",
    pattern: /\bDear[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z]\.)?(?:[ \t]+[A-Z][a-z]+){0,2})/g,
    group: 1,
  },
  {
    name: "name-labeled",
    category: "PERSON",
    pattern:
      /\b(?:Name|Employee|Contractor|Client|Consultant|Recipient|Disclosing Party|Receiving Party|Signed by|Signature|Candidate|Attn)[ \t]*(?:\([^)\n]*\))?[ \t]*:[ \t]*([A-Z][a-z]+(?:[ \t]+[A-Z]\.)?(?:[ \t]+[A-Z][a-z]+){0,2})/g,
    group: 1,
  },
  {
    name: "name-party-individual",
    category: "PERSON",
    pattern:
      /\band[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z]\.)?[ \t]+[A-Z][a-z]+),[ \t]+an individual\b/g,
    group: 1,
  },
  {
    name: "name-signature-block",
    category: "PERSON",
    pattern: /(?<=^|\n)([A-Z][a-z]+(?:[ \t]+[A-Z]\.)?[ \t]+[A-Z][a-z]+),?\s*(?:COO|CEO|CTO|CFO|CPO|Chief [A-Z][a-z]+ Officer)\b/g,
    group: 1,
  },
];

interface IndexedMatch {
  start: number;
  end: number;
  value: string;
}

function runRule(rule: Rule, text: string): IndexedMatch[] {
  const flags = rule.pattern.flags.includes("g")
    ? rule.pattern.flags
    : `${rule.pattern.flags}g`;
  // `d` gives exact capture-group offsets, which keeps replacements faithful
  // even when the same value appears many times in the document.
  const re = new RegExp(rule.pattern.source, flags.includes("d") ? flags : `${flags}d`);
  const found: IndexedMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    const group = rule.group ?? 0;
    const indices = (match as RegExpExecArray & { indices?: Array<[number, number] | undefined> })
      .indices;
    const span = indices?.[group];
    if (!span) continue;
    const value = text.slice(span[0], span[1]);
    if (!value.trim()) continue;
    if (rule.validate && !rule.validate(value)) continue;
    found.push({ start: span[0], end: span[1], value });
  }
  return found;
}

/** Key under which overlapping spans are compared: earlier wins, then longer. */
export function compareSpans(a: PiiSpan, b: PiiSpan): number {
  if (a.start !== b.start) return a.start - b.start;
  return b.end - b.start - (a.end - a.start);
}

/**
 * Remove overlapping detections. Earlier and longer spans win; a later span that
 * only partly overlaps is dropped rather than splitting the kept one.
 */
export function resolveOverlaps(spans: PiiSpan[]): PiiSpan[] {
  const sorted = [...spans].sort(compareSpans);
  const kept: PiiSpan[] = [];
  for (const span of sorted) {
    const last = kept[kept.length - 1];
    if (last && span.start < last.end) {
      // Fully contained duplicates are dropped; partially overlapping ones too.
      continue;
    }
    kept.push(span);
  }
  return kept;
}

/** Run every deterministic rule over `text`. No network, no model. */
export function detectDeterministicPii(text: string): PiiSpan[] {
  const spans: PiiSpan[] = [];
  for (const rule of RULES) {
    for (const hit of runRule(rule, text)) {
      spans.push({
        start: hit.start,
        end: hit.end,
        category: rule.category,
        value: hit.value,
        source: "regex",
        rule: rule.name,
      });
    }
  }
  return resolveOverlaps(spans);
}

/** Number of deterministic rules, surfaced in the UI. */
export const RULE_COUNT = RULES.length;

/**
 * Shared domain types for LocalShield.
 */

export type PiiCategory =
  | "PERSON"
  | "COMPANY"
  | "ADDRESS"
  | "EMAIL"
  | "PHONE"
  | "SSN"
  | "GOV_ID"
  | "PASSPORT"
  | "BANK"
  | "CARD"
  | "MONEY"
  | "DOB"
  | "TAX_ID";

export const PII_LABEL: Record<PiiCategory, string> = {
  PERSON: "Person",
  COMPANY: "Organization",
  ADDRESS: "Address",
  EMAIL: "Email",
  PHONE: "Phone",
  SSN: "SSN",
  GOV_ID: "Gov. ID",
  PASSPORT: "Passport",
  BANK: "Bank account",
  CARD: "Card number",
  MONEY: "Amount",
  DOB: "Date of birth",
  TAX_ID: "Tax ID",
};

/** Where a detection came from: deterministic rules, or the on-device model. */
export type DetectionSource = "regex" | "on-device";

export interface PiiSpan {
  start: number;
  end: number;
  category: PiiCategory;
  value: string;
  source: DetectionSource;
  /** Rule name, useful in the audit log ("email", "phone-us", "title-name"). */
  rule: string;
}

export interface RedactionEntity {
  /** Token that replaces the value, e.g. `PERSON_1`. */
  token: string;
  /** Full token including brackets, e.g. `[PERSON_1]`. */
  placeholder: string;
  category: PiiCategory;
  value: string;
  sources: DetectionSource[];
  occurrences: number;
}

export interface DiffSegment {
  text: string;
  token?: string;
  category?: PiiCategory;
}

export interface RedactionResult {
  /** Text with every detected PII value replaced by a placeholder token. */
  maskedText: string;
  entities: RedactionEntity[];
  /** Same document, split at each replaced span, for the side-by-side diff. */
  segments: DiffSegment[];
  /** Number of individual spans replaced. */
  spanCount: number;
  /** Characters removed from the document by redaction. */
  charsRemoved: number;
  /** PII-looking strings still present after redaction (must be empty). */
  leaks: PiiSpan[];
}

export type Severity = "high" | "medium" | "low";

export interface RiskClause {
  title: string;
  severity: Severity;
  quote: string;
  why: string;
  suggestion: string;
}

export interface ContractAnalysis {
  contractType: string;
  overallRisk: Severity;
  summary: string;
  clauses: RiskClause[];
}

export interface AnalysisMeta {
  /** Which model actually produced the answer. */
  inferenceSource: "on_device" | "in_cloud" | "simulated";
  model: string;
  latencyMs: number;
}

export type AuditChannel = "device" | "cloud";
export type AuditTone = "info" | "ok" | "warn" | "block";

export interface AuditEntry {
  id: string;
  at: number;
  channel: AuditChannel;
  stage: string;
  message: string;
  detail?: string;
  chars?: number;
  tone: AuditTone;
}

export type PipelineStepId = "regex" | "on-device" | "guard" | "cloud";

export type StepStatus = "idle" | "running" | "done" | "skipped" | "error";

export interface StepState {
  status: StepStatus;
  note?: string;
}

export type OnDeviceAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"
  | "no-api"
  | "checking";

export interface AppCheckState {
  mode: "enforced" | "debug" | "disabled" | "error";
  detail: string;
}

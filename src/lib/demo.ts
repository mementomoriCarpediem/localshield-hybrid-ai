/**
 * Simulated analyst — used **only** when the app runs without a Firebase
 * project, or when the user explicitly flips the "Simulated" switch.
 *
 * This is a deterministic, rule-based reviewer. It never performs a network
 * request and it is deliberately kept in its own module so that nobody mistakes
 * it for the real Gemini call in `ai.ts`. Every surface in the UI labels its
 * output as SIMULATED.
 */

import type { ContractAnalysis, RiskClause, Severity } from "../types";

interface DemoRule {
  id: string;
  pattern: RegExp;
  severity: Severity;
  title: string;
  why: string;
  suggestion: string;
}

const RULES: DemoRule[] = [
  {
    id: "net-60",
    pattern: /net\s*(?:60|90|120)\b/i,
    severity: "high",
    title: "Long payment window (Net 60+)",
    why: "You deliver work for two to four months before you are paid. Combined with any right to suspend work, this is your largest cash-flow exposure.",
    suggestion:
      "Change to Net 30, or Net 15 with a 2% early-payment discount. Add: 'Client shall pay undisputed invoices within thirty (30) days of receipt.'",
  },
  {
    id: "unlimited-indemnity",
    pattern: /indemnif[\s\S]{0,160}(?:unlimited|without limitation as to amount)|(?:unlimited|without limitation as to amount)[\s\S]{0,160}indemnif/i,
    severity: "high",
    title: "Unlimited indemnity",
    why: "You carry unlimited financial exposure for claims arising from your work, with no cap tied to the fees actually paid.",
    suggestion:
      "Cap liability at the greater of fees paid in the preceding 12 months or a fixed sum (e.g. $18,500), and exclude indirect and consequential damages.",
  },
  {
    id: "non-compete",
    pattern: /non-compete|shall not,? (?:directly or indirectly,? )?(?:provide|engage|own)/i,
    severity: "high",
    title: "Broad non-compete",
    why: "A 12–18 month restriction across an entire industry or continent can block your next engagement, and enforceability varies sharply by jurisdiction.",
    suggestion:
      "Narrow it to direct solicitation of named clients for 6 months, or delete the clause and rely on confidentiality plus non-solicitation.",
  },
  {
    id: "residuals",
    pattern: /residuals/i,
    severity: "high",
    title: "Residuals clause",
    why: "It lets the other side reuse anything retained in 'unaided memory', which effectively hollows out the confidentiality obligation.",
    suggestion:
      "Delete Section 4, or limit residuals to general know-how expressly excluding trade secrets, source code and pricing.",
  },
  {
    id: "termination-convenience",
    pattern: /terminat[\s\S]{0,80}for convenience/i,
    severity: "medium",
    title: "One-sided termination for convenience",
    why: "The client can walk away on short notice while you can only exit for an uncured breach, and you are not paid for work in progress.",
    suggestion:
      "Make termination for convenience mutual with 30 days' notice, and require payment for all work performed plus non-cancellable commitments.",
  },
  {
    id: "class-action-waiver",
    pattern: /class action/i,
    severity: "medium",
    title: "Arbitration with class-action waiver",
    why: "Individual arbitration removes the leverage of collective claims, which matters most for smaller disputes.",
    suggestion:
      "Keep arbitration but add a small-claims carve-out and let each party recover fees if it prevails; consider making arbitration optional for claims under $25,000.",
  },
  {
    id: "clawback",
    pattern: /(?:repay|claw\s?back)[\s\S]{0,120}(?:signing bonus|bonus)|(?:signing bonus)[\s\S]{0,160}repay/i,
    severity: "medium",
    title: "Signing-bonus clawback",
    why: "You must repay the full gross bonus if you leave within 12 months, including in a termination without cause by the employer in some wordings.",
    suggestion:
      "Limit repayment to voluntary resignation without Good Reason, pro-rate it monthly, and exclude termination without Cause.",
  },
  {
    id: "ip-assignment",
    pattern: /outside (?:working|normal) hours|moral rights/i,
    severity: "medium",
    title: "Very broad IP assignment",
    why: "The assignment reaches work created outside working hours and waives moral rights, which can conflict with your other clients and portfolio use.",
    suggestion:
      "Limit the assignment to inventions relating to the company's actual business, and carve out pre-existing work and portfolio display rights.",
  },
  {
    id: "trade-secret-indefinite",
    pattern: /as long as they qualify as trade secrets/i,
    severity: "medium",
    title: "Trade secrets protected indefinitely",
    why: "The carve-out means the most commercially sensitive information never exits confidentiality, long after the agreement ends.",
    suggestion:
      "Cap the trade-secret obligation at 5 years unless the information still genuinely meets the statutory definition, and list what counts.",
  },
  {
    id: "exclusive-jurisdiction",
    pattern: /exclusive jurisdiction of the/i,
    severity: "low",
    title: "Exclusive jurisdiction and venue",
    why: "Disputes must be litigated in the other party's home courts, which changes the cost of ever enforcing your rights.",
    suggestion:
      "Make venue non-exclusive, or choose a neutral forum; arbitration in your own city is usually cheaper than remote litigation.",
  },
  {
    id: "destruction-certificate",
    pattern: /certify destruction in writing/i,
    severity: "low",
    title: "Certified destruction of materials",
    why: "You must return or destroy everything and certify it in writing within a short window — easy to breach operationally.",
    suggestion: "Extend the window to 30 days and allow a certified archival copy held by counsel.",
  },
  {
    id: "at-will",
    pattern: /at-will/i,
    severity: "low",
    title: "At-will employment",
    why: "Either side can end the relationship at any time; equity and bonus promises are not guaranteed.",
    suggestion:
      "Add severance of 3 months' base salary for termination without Cause, and confirm that accelerated vesting applies.",
  },
  {
    id: "injunctive-relief",
    pattern: /without posting bond/i,
    severity: "low",
    title: "Injunctive relief without bond",
    why: "The other side can seek an injunction quickly and cheaply; a bond would otherwise protect you against a wrongful restraint.",
    suggestion: "Require a bond and prior written notice before any ex parte application.",
  },
  {
    id: "repurchase",
    pattern: /repurchase/i,
    severity: "low",
    title: "Company repurchase right on equity",
    why: "Unvested shares can be bought back at cost on any termination, including without cause.",
    suggestion: "Limit repurchase to unvested RSUs and remove it for termination without Cause.",
  },
];

function detectContractType(text: string): string {
  if (/non-disclosure agreement|mutual nda|\bnda\b/i.test(text)) return "Mutual Non-Disclosure Agreement";
  if (/offer letter|at-will employment/i.test(text)) return "Employment Offer Letter";
  if (/service agreement|contractor/i.test(text)) return "Freelance Service Agreement";
  return "Commercial Agreement";
}

/** Pull the sentence around a match so the quote is readable and verbatim. */
function extractQuote(text: string, index: number, matchLength: number): string {
  const isBoundary = (ch: string) => ch === "." || ch === "!" || ch === "?" || ch === "\n";
  let start = index;
  while (start > 0 && !isBoundary(text[start - 1])) start -= 1;
  let end = index + matchLength;
  while (end < text.length && !isBoundary(text[end])) end += 1;
  const quote = text.slice(start, Math.min(end + 1, text.length)).replace(/\s+/g, " ").trim();
  return quote.length > 300 ? `${quote.slice(0, 297)}…` : quote;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/**
 * Deterministic stand-in for the cloud model. Same output contract, no network.
 */
export function analyzeSimulated(maskedText: string): ContractAnalysis {
  const clauses: RiskClause[] = [];
  for (const rule of RULES) {
    const match = rule.pattern.exec(maskedText);
    if (!match) continue;
    clauses.push({
      title: rule.title,
      severity: rule.severity,
      quote: extractQuote(maskedText, match.index, match[0].length),
      why: rule.why,
      suggestion: rule.suggestion,
    });
  }

  clauses.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const contractType = detectContractType(maskedText);
  const counts = {
    high: clauses.filter((c) => c.severity === "high").length,
    medium: clauses.filter((c) => c.severity === "medium").length,
  };
  const overallRisk: Severity = counts.high > 0 ? "high" : counts.medium > 0 ? "medium" : "low";

  const summary =
    clauses.length === 0
      ? `This ${contractType} shows no issues matched by the built-in simulated rule set. With a configured Firebase project, Gemini reviews the whole document instead of a fixed rule list.`
      : `This ${contractType} contains ${counts.high} high-severity and ${counts.medium} medium-severity issues. ` +
        `The most important is "${clauses[0].title.toLowerCase()}". Everything above was found by the offline ` +
        `simulation using only the redacted text — configure Firebase AI Logic to replace it with a full Gemini review.`;

  return { contractType, overallRisk, summary, clauses };
}

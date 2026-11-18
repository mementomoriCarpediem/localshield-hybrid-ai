# Devpost submission — copy/paste ready

> Everything below is written to be pasted straight into the Devpost form fields, in order.

---

## Project name

**LocalShield — privacy-first contract review with hybrid AI**

## Tagline

Redact on the device. Reason in the cloud. Contract review where identities never leave the
browser.

---

## Inspiration

Small businesses sign contracts every week and almost none of them can afford a lawyer to read
each one. The obvious fix — paste it into an AI — has an obvious problem: the document is
mostly other people's personal data. Salaries, SSNs, bank accounts, home addresses, the name of
the person you are about to hire. Uploading that to a third-party model is a data-protection
incident waiting for an audit.

The interesting question was not "can an AI read a contract" — it can. It was: **what is the
smallest amount of the document that still produces a useful review?** The answer turned out to
be: everything except the identifiers. The argument of a clause does not need the person's name
or their account number. So we built the pipeline that removes exactly that, on the device,
before anything is transmitted.

Firebase AI Logic's hybrid inference is what made this practical: one SDK, one auth story, and a
switch between a model that runs inside the browser and a model that runs in the cloud.

## What it does

LocalShield is a web app that reviews a contract in four steps, and shows you the receipt for
each one.

1. **Load** a contract — paste your own, or use one of three samples (freelance service
   agreement, mutual NDA, employment offer letter), each loaded with fictional PII.
2. **Redact locally.** A deterministic guard (24 rules, Luhn checksums for cards, SSN sanity
   checks) replaces emails, SSNs, EINs, passport and bank numbers, cards, phone numbers,
   addresses, company names and money amounts with stable tokens: `[PERSON_1]`, `[EMAIL_2]`,
   `[MONEY_3]`. Gemini Nano then runs through Firebase AI Logic with
   `InferenceMode.ONLY_ON_DEVICE` to find the free-text entities regexes cannot see — people,
   organisations, street addresses — in the *already partially masked* text.
3. **Guard the exit.** The masked document is re-scanned with the full rule set. One surviving
   identifier-shaped string blocks the cloud request entirely, and the audit log says why.
4. **Analyse in the cloud.** Only the tokenised text goes to Gemini (`ONLY_IN_CLOUD`,
   `gemini-3.5-flash-lite`) with a JSON response schema: a five-sentence summary in plain
   language, the 3–7 material clauses with High/Medium/Low severity, a verbatim quote for each,
   and a concrete redline to propose.

The last screen is the one we are proudest of: an audit panel that shows every local operation,
every cloud request, and the **exact bytes** that were transmitted — plus a side-by-side
original ↔ masked diff, because "trust me" is not a privacy feature.

## How we built it

**Stack:** Vite + React 19 + TypeScript (strict) + Tailwind CSS 4, Firebase JS SDK 13.4,
Firebase AI Logic hybrid inference, Firebase App Check (reCAPTCHA Enterprise).

**Two models, two explicit modes.**

The redaction step creates its model with

```ts
getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_ON_DEVICE,
  onDeviceParams: {
    createOptions: { expectedInputs: [{ type: "text", languages: ["en"] }], … },
    promptOptions: { responseConstraint: entitySchema }, // structured output on-device
  },
});
```

and the analysis step with

```ts
getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_IN_CLOUD,
  inCloudParams: {
    model: "gemini-3.5-flash-lite",
    generationConfig: { responseMimeType: "application/json", responseSchema: analysisSchema },
  },
});
```

We deliberately did **not** use `PREFER_ON_DEVICE` / `PREFER_IN_CLOUD`. Their silent fallback is
exactly wrong for this product: a privacy filter that quietly uploads the document when the
local model is missing is worse than no filter, and a clause review that quietly downgrades to a
4B on-device model gives a confident answer of much lower quality. `ONLY_*` turns both into
visible, handled states. The UI still reports `response.inferenceSource` on every response.

**Structured output on both sides.** The on-device pass returns `{ entities: [{ text, category }] }`
via `Schema.object` / `Schema.enumString`; the cloud pass returns the full analysis object. Every
model response is normalised defensively — severities are clamped, arrays are validated, missing
strings become empty — because a schema reduces malformed output, it does not eliminate it.

**The token map never leaves memory.** Placeholders are assigned by category counter
(`PERSON_1`, `PERSON_2`…) and deduplicated, so the same person keeps the same token across the
document and the cloud model can reason about co-reference. The map lives in React state: no
`localStorage`, no URL, no request body, gone when the tab closes.

**App Check from the first line.** `ReCaptchaEnterpriseProvider` is initialised at startup, with
the debug provider available only in a dev build behind `VITE_APPCHECK_DEBUG`. Neither the site
key nor any token is in the repository — `.env.example` documents the shape, `.env*` is
gitignored.

**Honest demo mode.** Judges (and anyone without a Firebase project) can run the whole thing
offline: the regex redaction, the leak guard and the audit log are real, and the analysis comes
from a 14-rule offline reviewer that is labelled `SIMULATED` in the header, the panel and the
audit log. The real Gemini call lives in `src/lib/ai.ts`; the simulation lives in
`src/lib/demo.ts`; they are never mixed.

## Challenges

**1. The model and the guard disagree, so the guard has to win.** The first version trusted the
on-device model to find names. It found most of them — and missed the party named in the opening
sentence of a contract ("…and Sarah J. Whitfield, an individual residing at…"). We fixed the
recall gap deterministically (party-introduction, greeting, `Attn:`, signature-block patterns)
and, more importantly, made the deterministic layer the authority: the leak guard re-scans the
final text and refuses to transmit if anything survives. The model improves recall; the rules
decide whether bytes leave.

**2. Regexes that eat the next line.** A name pattern using `\s+` swallowed the newline and the
following `Name:` label, so the second signature was never detected. `\s` includes `\n`; in a
name pattern it must be `[ \t]`. Verified against all three samples with a check that no known
secret string survives in the masked output.

**3. Structured output on a 4B on-device model.** Nano occasionally wraps JSON in prose or code
fences. A tolerant parser (strip fences, then extract the outermost `{…}`) plus a "no valid JSON"
branch that degrades to regex-only redaction keeps the pipeline moving instead of failing the
review.

**4. Where does the boundary actually sit?** It took a while to be honest about the trade-off:
the on-device pass needs the *partially masked* text (not the original), so the model sees
`[EMAIL_2]` where an email used to be. That is the design that makes the numbering stable, keeps
the model's context small, and means even the local model's input is already partly sanitised.

## Accomplishments that we're proud of

* A **complete privacy story with evidence**, not adjectives: four enforcement layers and an
  audit panel that shows the exact payload.
* **Structured output working on both sides of the hybrid boundary** — same token language in,
  typed JSON out, on-device and in-cloud.
* **A demo that cannot fail on stage.** No Firebase project? Simulation mode. No Gemini Nano?
  Regex-only redaction with a visible warning. Chrome on a MacBook that has never downloaded the
  model? A one-click download with progress. Every failure path is designed, labelled and
  testable.
* **A clean build**: `tsc --noEmit` and `vite build` pass with strict TypeScript, no `any` escape
  hatches in the SDK boundary, and 112 kB gzipped for the whole app.

## What we learned

* The interesting privacy work happens **before** the model call, in ordinary code: checksums,
  overlap resolution, and a re-scan. The generative part is the easy 20%.
* `InferenceMode` choice is a product decision, not a config detail. The `PREFER_*` modes are
  convenient and, for a privacy tool, the wrong default — the mode you pick is a promise you
  make to the user.
* Judges and users trust what they can see. The audit panel converted more scepticism into
  interest than any paragraph of documentation could.

## What's next

* **PDF and DOCX ingestion on-device** (pdf.js, mammoth) so nothing has to be copy-pasted.
* **Persisted, encrypted token maps** (IndexedDB + passphrase) so a review survives a reload
  without ever syncing.
* **"Compare to my standard paper"** — clause-level diffing with `PREFER_ON_DEVICE` for the
  cheap first pass.
* **Korean contracts** — 형태소-aware detectors plus a Korean analysis prompt.
* **Export a redacted PDF and a redline memo** for the counterparty.

## Built With

`firebase` · `firebase-ai-logic` · `gemini-3.5-flash-lite` · `gemini-nano` · `chrome-prompt-api` ·
`firebase-app-check` · `recaptcha-enterprise` · `react` · `typescript` · `vite` · `tailwindcss` ·
`github-pages`

## Try it out

* **Live demo:** https://mementomoricarpediem.github.io/localshield-hybrid-ai/
* **Source:** https://github.com/mementomoriCarpediem/localshield-hybrid-ai (Apache-2.0)

> The hosted demo runs in simulation mode unless a Firebase project is wired in through
> repository secrets — the redaction, the leak guard and the audit log are fully real in either
> case. The 3-minute video uses a live Gemini call.

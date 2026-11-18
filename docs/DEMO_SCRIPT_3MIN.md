# 3-minute demo script

**Goal:** a judge who watches only the first 30 seconds must understand *(a)* what the product
does, *(b)* why it needed hybrid inference, and *(c)* see the proof on screen.

**Recording setup**

- 1440×900 or larger, browser zoom 100 %, **dark theme**, no bookmark bar, no other tabs.
- Chrome with Gemini Nano already downloaded (`LanguageModel.availability()` → `"available"`),
  a Firebase project configured, and the Live engine selected. Refresh before recording so the
  badges read **Gemini Nano: ready** / **App Check: enforced** / **Engine: live**.
- Do not pre-run the pipeline: the redaction animation and the audit log filling up is the
  moment people understand the product.
- Cursor moves slowly and deliberately. One action per sentence — never click while talking
  about something else.

---

## 0:00 – 0:25 · The problem, with the product already on screen

**On screen:** the app, with the Freelance Service Agreement already loaded in the left panel.
The masked/analysis panels are empty.

> "This is a freelance contract. It contains a social security number, a bank account, a home
> address, and the name of the person signing it.
>
> Every AI contract reviewer asks you to upload all of that to their servers. **LocalShield
> doesn't.** It removes the identities *inside your browser*, and sends only what a review
> actually needs."

**Action:** drag-select a few lines of the document so the viewer sees the SSN and the bank
number on screen.

## 0:25 – 0:50 · One click, and the pipeline is visible

**Action:** click **Redact locally → analyse in cloud.** Four step cards at the top light up in
sequence: `01 Regex redaction` → `02 Gemini Nano NER` → `03 Leak guard` → `04 Cloud analysis`.

> "Four steps. Three of them run entirely on this device. The first is a deterministic guard —
> twenty-four rules with real checksums — so structured identifiers never reach a model at all."

**On screen:** the middle panel fills with the masked document; the token chips count up
(`16 tokens · 17 spans · 309 chars concealed`).

## 0:50 – 1:20 · The part that needs hybrid inference

**Action:** switch the middle panel to **Original ↔ masked**.

> "Left: the original, which never leaves this tab. Right: what Gemini receives. Same contract,
> same obligations — and you can still tell that `[PERSON_1]` is the same party throughout,
> because the tokens are stable."
>
> "The free-text entities — names, organisations, street addresses — are found by **Gemini Nano,
> running inside Chrome** through Firebase AI Logic with inference mode `ONLY_ON_DEVICE`. That
> is the only reason this works offline-ish: the privacy step does not need a server."

**Action:** hover the **Gemini Nano** badge in the header (tooltip: *ready*).

## 1:20 – 1:45 · The guarantee, in one panel

**Action:** scroll to the audit panel; point at the three numbers.

> "Local operations: four. Cloud requests: one. Bytes transmitted: three thousand three hundred.
>
> And three thousand three hundred is *all* that went out — no original values, no entity map,
> no file name. Before that request, the masked text is re-scanned with the full rule set; if a
> single identifier had survived, the request would have been blocked, not sent."

**Action:** click the **Cloud payload** tab for two seconds, then back.

## 1:45 – 2:30 · The result a user actually came for

**Action:** scroll up to the right-hand panel.

> "Here is the review. Overall risk: high. Four issues. Net 60 payment terms — that is two
> months of your own cash financing a client. Unlimited indemnity. A twelve-month non-compete
> across an entire industry. And for each one, a verbatim quote and a redline you can actually
> send back: *'Change to Net 30 … cap liability at fees paid in the last twelve months.'*"

**Action:** hover one clause so its quote and redline are readable on screen.

> "This came from Gemini 3.5 Flash Lite through Firebase AI Logic, in `ONLY_IN_CLOUD` mode,
> returning typed JSON against a response schema — which is why the UI can render it instead of
> dumping a paragraph of markdown at you."

## 2:30 – 2:50 · The failure paths are designed too

**Action:** click the NDA sample, then flip **Engine** to **Simulated** and run again.

> "Two safeguards worth naming. If Chrome has no Gemini Nano — a laptop that never downloaded
> the model, or Safari — the badge says so, the on-device step is skipped *visibly*, and the
> deterministic guard still redacts everything. And if you have no Firebase project at all,
> simulation mode runs the entire pipeline offline, clearly labelled, so nothing pretends to be
> a cloud call that did not happen."

## 2:50 – 3:00 · Close

**Action:** return to the header, whole app in frame.

> "LocalShield. Redact on the device, reason in the cloud — Apache-2.0, on GitHub, one click to
> try. The contract stays yours; only the argument goes out."

---

## Shot list (for editing)

| Time | Panel | Action | Must be legible |
|------|-------|--------|-----------------|
| 0:00 | document | loaded sample, selection over SSN/account | SSN `412-87-3391`, `Account No.` |
| 0:25 | step cards | run, all four light up | `ONLY_ON_DEVICE` / `ONLY_IN_CLOUD` labels if present |
| 0:50 | redaction | toggle Original ↔ masked | token chips, `[PERSON_1]` |
| 1:20 | audit | numbers + payload tab | `Bytes transmitted 3,3xx`, `Cloud requests 1` |
| 1:45 | analysis | hover a clause | severity pill, quote, redline |
| 2:30 | header | Engine → Simulated, rerun | `SIMULATED` label |
| 2:50 | header | full app | logo + three badges |

## Narration rules

- Say **"inside your browser"** before saying "AI". The claim is the product.
- Never say "we anonymise" — say **redact**, and name the token format once (`[PERSON_1]`).
- Numbers on screen beat adjectives: `1 cloud request`, `3,3xx bytes`, `0 bytes of PII`.
- If a live call fails on the day, do **not** improvise: cut to simulation mode and say plainly
  that the cloud engine is offline in this recording — the audit log still shows the real local
  work.

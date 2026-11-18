import { useCallback, useEffect, useMemo, useState } from "react";
import { SAMPLES, type SampleDoc } from "./data/samples";
import { checkOnDeviceAvailability, prepareOnDeviceModel } from "./lib/ai";
import { isFirebaseConfigured } from "./lib/config";
import { initFirebase } from "./lib/firebase";
import { runPipeline, type AnalysisMode } from "./lib/pipeline";
import type {
  AnalysisMeta,
  AppCheckState,
  AuditEntry,
  ContractAnalysis,
  OnDeviceAvailability,
  PipelineStepId,
  RedactionResult,
  StepState,
} from "./types";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { AuditPanel } from "./components/AuditPanel";
import { StatusBadge } from "./components/Badge";
import { DocumentPanel } from "./components/DocumentPanel";
import { PipelineSteps } from "./components/PipelineSteps";
import { RedactionPanel } from "./components/RedactionPanel";

const INITIAL_STEPS: Record<PipelineStepId, StepState> = {
  regex: { status: "idle" },
  "on-device": { status: "idle" },
  guard: { status: "idle" },
  cloud: { status: "idle" },
};

const AVAILABILITY_BADGE: Record<
  OnDeviceAvailability,
  { tone: "ok" | "warn" | "danger" | "neutral" | "cloud"; value: string; title: string }
> = {
  checking: { tone: "neutral", value: "checking", title: "Querying Chrome Prompt API" },
  available: { tone: "ok", value: "ready", title: "Gemini Nano is available in this browser" },
  downloadable: { tone: "warn", value: "downloadable", title: "Model can be downloaded (~4 GB, one time)" },
  downloading: { tone: "warn", value: "downloading", title: "Model download in progress" },
  unavailable: { tone: "danger", value: "unavailable", title: "Gemini Nano is disabled or unsupported here" },
  "no-api": { tone: "danger", value: "no Prompt API", title: "Requires desktop Chrome 139+" },
};

function newId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [doc, setDoc] = useState<string>(SAMPLES[0].text);
  const [activeSample, setActiveSample] = useState<string | null>(SAMPLES[0].id);
  const [mode, setMode] = useState<AnalysisMode>("live");
  const [configured, setConfigured] = useState(false);
  const [appCheck, setAppCheck] = useState<AppCheckState>({ mode: "disabled", detail: "initialising" });
  const [availability, setAvailability] = useState<OnDeviceAvailability>("checking");
  const [running, setRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [steps, setSteps] = useState<Record<PipelineStepId, StepState>>(INITIAL_STEPS);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [redaction, setRedaction] = useState<RedactionResult | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [meta, setMeta] = useState<AnalysisMeta | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [cloudContacted, setCloudContacted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const { state } = initFirebase();
    setAppCheck(state);
    const hasFirebase = isFirebaseConfigured();
    setConfigured(hasFirebase);
    if (!hasFirebase) setMode("simulated");
    void checkOnDeviceAvailability().then(setAvailability);
  }, []);

  const pushAudit = useCallback((entry: Omit<AuditEntry, "id" | "at">) => {
    setAudit((previous) => [
      ...previous,
      { ...entry, id: newId(), at: Date.now() },
    ]);
  }, []);

  const updateStep = useCallback((id: PipelineStepId, state: StepState) => {
    setSteps((previous) => ({ ...previous, [id]: state }));
  }, []);

  const resetResults = useCallback(() => {
    setRedaction(null);
    setAnalysis(null);
    setMeta(null);
    setPayload(null);
    setCloudContacted(false);
    setSteps(INITIAL_STEPS);
    setError(null);
  }, []);

  const handleLoadSample = useCallback(
    (sample: SampleDoc) => {
      setDoc(sample.text);
      setActiveSample(sample.id);
      setAudit([]);
      resetResults();
    },
    [resetResults],
  );

  const handleDocChange = useCallback(
    (value: string) => {
      setDoc(value);
      setActiveSample(null);
    },
    [],
  );

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    setAudit([]);
    setSteps(INITIAL_STEPS);
    setAnalysis(null);
    setMeta(null);
    setPayload(null);
    setCloudContacted(false);

    try {
      const outcome = await runPipeline(doc, {
        mode,
        onAudit: pushAudit,
        onStep: updateStep,
        onDeviceProgress: setDownloadProgress,
      });
      setRedaction(outcome.redaction);
      setAnalysis(outcome.analysis);
      setMeta(outcome.meta);
      setPayload(outcome.redaction.maskedText);
      setCloudContacted(outcome.cloudContacted);
    } catch (caught) {
      setError((caught as Error).message);
      setSteps((previous) => {
        const next = { ...previous };
        for (const key of Object.keys(next) as PipelineStepId[]) {
          if (next[key].status === "running") next[key] = { status: "error", note: "failed" };
        }
        return next;
      });
    } finally {
      setRunning(false);
      setDownloadProgress(null);
    }
  }, [doc, mode, pushAudit, updateStep]);

  const handlePrepareModel = useCallback(async () => {
    setPreparing(true);
    setError(null);
    try {
      await prepareOnDeviceModel(setDownloadProgress);
      setAvailability(await checkOnDeviceAvailability());
      pushAudit({
        channel: "device",
        stage: "Gemini Nano · model download",
        message: "On-device model is downloaded and ready. It is stored by Chrome, not by this app.",
        tone: "ok",
      });
    } catch (caught) {
      setError(`On-device model could not be prepared: ${(caught as Error).message}`);
    } finally {
      setPreparing(false);
      setDownloadProgress(null);
    }
  }, [pushAudit]);

  const availabilityBadge = AVAILABILITY_BADGE[availability];
  const appCheckBadge = useMemo(() => {
    switch (appCheck.mode) {
      case "enforced":
        return { tone: "ok" as const, value: "enforced" };
      case "debug":
        return { tone: "warn" as const, value: "debug token" };
      case "error":
        return { tone: "danger" as const, value: "error" };
      default:
        return { tone: "neutral" as const, value: "off" };
    }
  }, [appCheck.mode]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1680px] px-4 pb-10 pt-5 lg:px-6">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 40%, var(--line))",
                background: "linear-gradient(150deg, var(--accent-soft), transparent)",
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.4 7.5 9.9 4.3-1.5 7.5-5.3 7.5-9.9v-6L12 2.5Z" />
                <path d="M12 8.6v4.2M12 15.6v.1" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-[15px] font-semibold tracking-tight">LocalShield</h1>
                <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                  hybrid inference
                </span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                Contract review where the identities never leave your browser.
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <StatusBadge
              tone={availabilityBadge.tone}
              label="Gemini Nano"
              value={availabilityBadge.value}
              title={availabilityBadge.title}
            />
            <StatusBadge
              tone={appCheckBadge.tone}
              label="App Check"
              value={appCheckBadge.value}
              title={appCheck.detail}
            />
            <StatusBadge
              tone={mode === "live" && configured ? "cloud" : "warn"}
              label="Engine"
              value={mode === "live" && configured ? "live" : "simulated"}
              title={
                mode === "live" && configured
                  ? "Cloud analysis runs on Firebase AI Logic"
                  : "Offline simulation — no network requests"
              }
            />
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle colour theme"
              className="flex h-7 w-7 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink-2)" }}
            >
              {theme === "dark" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
              Redact on the device. Reason in the cloud.
            </h2>
            <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Gemini Nano finds names and addresses inside Chrome; a deterministic guard nails the IDs,
              cards and accounts. Only the tokenised document is sent to Gemini — and the audit panel below
              shows every byte.
            </p>
          </div>
          <a
            href="https://github.com/mementomoriCarpediem/localshield-hybrid-ai"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
            style={{ borderColor: "var(--line)", color: "var(--ink-2)", background: "var(--surface)" }}
          >
            Source · Apache-2.0
          </a>
        </div>

        <div className="mt-4">
          <PipelineSteps steps={steps} availability={availability} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-3">
            <DocumentPanel
              doc={doc}
              onDocChange={handleDocChange}
              samples={SAMPLES}
              activeSample={activeSample}
              onLoadSample={handleLoadSample}
              mode={mode}
              onModeChange={setMode}
              configured={configured}
              running={running}
              onRun={handleRun}
              availability={availability}
              onPrepareModel={handlePrepareModel}
              preparing={preparing}
              downloadProgress={downloadProgress}
              error={error}
            />
          </div>
          <div className="lg:col-span-4">
            <RedactionPanel redaction={redaction} running={running} />
          </div>
          <div className="lg:col-span-5">
            <AnalysisPanel analysis={analysis} meta={meta} running={running} />
          </div>
          <div className="lg:col-span-12">
            <AuditPanel entries={audit} payload={payload} cloudContacted={cloudContacted} />
          </div>
        </div>

        <footer
          className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[10px]"
          style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
        >
          <span>
            Built with Firebase AI Logic hybrid inference · Chrome Prompt API (Gemini Nano) · Gemini 3.5 Flash
            Lite
          </span>
          <span>Apache-2.0 · Firebase #BuildHybridAI 2026</span>
        </footer>
      </div>
    </div>
  );
}

export default App;

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  challengeCode,
  type Challenge,
  type JudgeResult,
  type Language,
  type PublicUser,
} from "@/lib/types";
import { starterTemplates } from "@/lib/templates";
import { toast } from "./toast";

const DEFAULT_TEMPLATES = starterTemplates();
const EMPTY_PATTERNS: string[] = [];

function templateFor(challenge: Challenge | null, language: Language): string {
  return challenge?.codeTemplates?.[language] ?? DEFAULT_TEMPLATES[language] ?? "";
}

interface ChallengesViewProps {
  user: PublicUser | null;
  initialChallenges: Challenge[];
  initialSolved: string[];
  initialPatterns?: string[];
  compact?: boolean;
  endsAt?: string | null;
}

type ConsoleKind = "info" | "ok" | "fail" | "warn" | "plain";
interface ConsoleLine {
  id: number;
  kind: ConsoleKind;
  text: string;
}

const CONSOLE_STYLES: Record<ConsoleKind, string> = {
  info: "text-cyan-400",
  ok: "text-emerald-400 font-bold",
  fail: "text-rose-400 font-bold",
  warn: "text-amber-400 font-bold",
  plain: "text-gray-300",
};

const DIFF_STYLES: Record<string, string> = {
  Easy: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  Medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  Hard: "bg-rose-500/10 border-rose-500/30 text-rose-400",
};

let lineSeq = 0;

export default function ChallengesView({
  user,
  initialChallenges,
  initialSolved,
  initialPatterns,
  compact = false,
  endsAt = null,
}: ChallengesViewProps) {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const [solved, setSolved] = useState<string[]>(initialSolved);
  const [patterns, setPatterns] = useState<string[]>(initialPatterns ?? EMPTY_PATTERNS);
  const [previousInitialData, setPreviousInitialData] = useState({
    challenges: initialChallenges,
    solved: initialSolved,
    patterns: initialPatterns,
  });
  const [filter, setFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [patternInput, setPatternInput] = useState("");
  const [checkingPattern, setCheckingPattern] = useState(false);
  const [language, setLanguage] = useState<Language>("java");
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [runtimes, setRuntimes] = useState<Record<Language, boolean> | null>(null);

  if (
    previousInitialData.challenges !== initialChallenges ||
    previousInitialData.solved !== initialSolved ||
    previousInitialData.patterns !== initialPatterns
  ) {
    setPreviousInitialData({
      challenges: initialChallenges,
      solved: initialSolved,
      patterns: initialPatterns,
    });
    setChallenges(initialChallenges);
    setSolved(initialSolved);
    setPatterns(initialPatterns ?? EMPTY_PATTERNS);
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => challenges.find((c) => c.id === activeId) ?? null, [challenges, activeId]);
  const categoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(challenges.map((c) => c.category)))],
    [challenges]
  );
  const effectiveFilter = filter === "all" || categoryOptions.includes(filter) ? filter : "all";
  const filtered = useMemo(
    () => (effectiveFilter === "all" ? challenges : challenges.filter((c) => c.category === effectiveFilter)),
    [challenges, effectiveFilter]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges", { cache: "no-store" });
      if (res.status === 403) {
        // Window closed for this player — re-render the server page to show the lock screen.
        router.refresh();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setChallenges(data.challenges ?? []);
      setSolved(data.solved ?? []);
      setPatterns(data.patterns ?? []);
      if (data.runtimes) setRuntimes(data.runtimes);
    } catch {
      // offline
    }
  }, [router]);

  useEffect(() => {
    const boot = setTimeout(() => {
      refresh();
    }, 0);
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "challenges") refresh();
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      clearTimeout(boot);
      source.close();
    };
  }, [refresh]);

  useEffect(() => {
    if (!activeId) return;
    document.body.classList.add("htp-overlay-open");
    window.dispatchEvent(new Event("htp-overlay-open"));
    return () => {
      document.body.classList.remove("htp-overlay-open");
      window.dispatchEvent(new Event("htp-overlay-close"));
    };
  }, [activeId]);

  const endMs = endsAt ? Date.parse(endsAt) : NaN;
  const hasWindow = !Number.isNaN(endMs);
  const [now, setNow] = useState(() => Date.now());
  const windowExpired = hasWindow && now >= endMs;
  const expiryRefreshedRef = useRef(false);

  useEffect(() => {
    if (!hasWindow) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasWindow]);

  useEffect(() => {
    if (windowExpired && !expiryRefreshedRef.current) {
      expiryRefreshedRef.current = true;
      router.refresh();
    }
  }, [windowExpired, router]);

  if (activeId && !active) setActiveId(null);

  const pushLine = useCallback((kind: ConsoleKind, text: string) => {
    setConsoleLines((prev) => [...prev, { id: ++lineSeq, kind, text }]);
  }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleLines]);

  const editorKey = active ? `${active.id}:${language}` : "";
  const code = codeMap[editorKey] ?? templateFor(active, language);

  function setCode(value: string) {
    if (!editorKey) return;
    setCodeMap((prev) => ({ ...prev, [editorKey]: value }));
  }

  function resetCode() {
    if (!active) return;
    setCodeMap((prev) => ({ ...prev, [editorKey]: templateFor(active, language) }));
    toast("Editor reset to starter template", "info");
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.slice(0, start) + "  " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  function syncScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function openChallenge(id: string) {
    document.body.classList.add("htp-overlay-open");
    window.dispatchEvent(new Event("htp-overlay-open"));
    setActiveId(id);
    setPatternInput("");
    const unlocked = solved.includes(id) || patterns.includes(id);
    setStep(unlocked ? 2 : 1);
    setConsoleLines([
      {
        id: ++lineSeq,
        kind: "info",
        text: unlocked
          ? '[System] Pattern already verified — write your solution code and click "Run & Verify".'
          : '[System] Stage 1: read the problem statement and type the pattern. Verify it to unlock the code editor.',
      },
    ]);
  }

  async function runCode() {
    if (!active || running) return;
    setRunning(true);
    setConsoleLines([{ id: ++lineSeq, kind: "info", text: "[TekQbe Engine] Running pattern matrix check..." }]);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: active.id, language, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        pushLine("fail", "[Auth] Session expired. Sign in again to submit.");
        toast("Session expired", "error");
        setRunning(false);
        return;
      }
      if (!res.ok) {
        const error = data.error ?? "Submission failed.";
        pushLine("fail", `[Engine] ${error}`);
        if (data.simpleCodeRejected) toast(error, "error", 6000);
        setRunning(false);
        return;
      }

      const result: JudgeResult = data.result;
      const runtimeLabel = result.runtime !== "none" ? result.runtime : "unavailable";

      if (result.status === "passed") {
        pushLine("ok", `[✓] TEST PASSED! ${result.message}`);
        pushLine("plain", `[engine] runtime=${runtimeLabel} · ${result.durationMs}ms`);
        pushLine("plain", result.output || "(empty output)");
        const teamName = data.team?.name;
        if (data.earned > 0) {
          if (teamName) {
            pushLine("ok", `[Score] +${data.earned} PTS awarded to Team ${teamName}`);
            toast(`Passed! +${data.earned} PTS · Team ${teamName}`);
          } else {
            pushLine("ok", `[Score] +${data.earned} PTS awarded to ${user?.username ?? "you"}`);
            toast(`Passed! +${data.earned} PTS added`);
          }
          setSolved(data.solved);
        } else {
          pushLine("info", teamName ? "[Score] Already solved — team already earned these points." : "[Score] Already solved — no additional points awarded.");
          toast(teamName ? `Already solved by Team ${teamName}` : "Pattern verified — already solved", "info");
          setSolved(data.solved);
        }
      } else if (result.status === "failed") {
        pushLine("fail", `[X] TEST FAILED! ${result.message}`);
        pushLine("plain", "--- your output ---");
        pushLine("plain", result.output || "(empty output)");
        pushLine("plain", "--- expected pattern ---");
        pushLine("plain", result.expected);
        toast("Output mismatch — try again", "error");
      } else if (result.status === "timeout") {
        pushLine("warn", `[Timeout] ${result.message}`);
        toast("Execution timed out", "error");
      } else if (result.status === "runtime-unavailable") {
        pushLine("warn", `[Runtime] ${result.message}`);
        toast("Server runtime unavailable for this language", "error");
      } else {
        pushLine("fail", `[Runtime Error] ${result.message}`);
        if (result.stderr) pushLine("plain", result.stderr.trim().slice(0, 2000));
        toast("Runtime error", "error");
      }
    } catch {
      pushLine("fail", "[Network] Could not reach the verification engine.");
      toast("Network error", "error");
    } finally {
      setRunning(false);
    }
  }

  async function verifyPattern() {
    if (!active || checkingPattern) return;
    if (!patternInput.trim()) {
      pushLine("fail", "[Stage 1] Type the pattern before verifying.");
      return;
    }
    setCheckingPattern(true);
    try {
      const res = await fetch(`/api/challenges/${active.id}/pattern`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: patternInput }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        pushLine("fail", "[Auth] Session expired. Sign in again to verify your pattern.");
        toast("Session expired", "error");
        return;
      }
      if (!res.ok) {
        pushLine("fail", `[Stage 1] ${data.error ?? "Pattern check failed."}`);
        toast(data.error ?? "Pattern check failed", "error");
        return;
      }
      if (data.verified) {
        setPatterns((prev) => (prev.includes(active.id) ? prev : [...prev, active.id]));
        setStep(2);
        pushLine("ok", "[✓] Stage 1 passed — your pattern matches the target matrix.");
        pushLine('info', '[System] Stage 2: write your code and click "Run & Verify" to solve the challenge.');
        toast("Pattern verified — code editor unlocked!");
      } else {
        pushLine("fail", `[Stage 1] ${data.error ?? "Pattern mismatch."}`);
        toast("Pattern does not match yet", "error");
      }
    } catch {
      pushLine("fail", "[Network] Could not reach the verification engine.");
      toast("Network error", "error");
    } finally {
      setCheckingPattern(false);
    }
  }

  const filterChips = (
    <div className="flex flex-wrap items-center gap-2 font-rajdhani font-semibold text-sm">
      {categoryOptions.map((cat) => (
        <button
          key={cat}
          onClick={() => setFilter(cat)}
          className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
            effectiveFilter === cat ? "bg-cyan-500 text-black" : "glass-panel text-gray-300 hover:text-cyan-300"
          }`}
        >
          {cat === "all" ? "All" : cat}
        </button>
      ))}
    </div>
  );

  const windowRemaining = hasWindow ? Math.max(0, endMs - now) : 0;
  const windowParts = {
    days: Math.floor(windowRemaining / 86400000),
    hours: Math.floor((windowRemaining % 86400000) / 3600000),
    mins: Math.floor((windowRemaining % 3600000) / 60000),
    secs: Math.floor((windowRemaining % 60000) / 1000),
  };

  return (
    <div className={compact ? "space-y-5" : "space-y-8 pb-8"}>
      {hasWindow && !compact && (
        <div
          className={`glass-panel rounded-2xl border px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            windowExpired ? "border-rose-500/40" : "border-cyan-500/40"
          }`}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-11 h-11 rounded-xl bg-brand-navy border border-cyan-500/40 flex items-center justify-center shrink-0">
              <i
                className={`fa-solid ${
                  windowExpired ? "fa-hourglass-end text-rose-400" : "fa-stopwatch text-brand-neon-cyan"
                } text-lg`}
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="font-orbitron text-[11px] sm:text-xs tracking-[0.25em] text-cyan-400 uppercase font-bold">
                {windowExpired ? "Time Up — Window Closed" : "Time Left To Solve"}
              </div>
              <div className="font-mono text-[11px] text-cyan-500/70 mt-0.5">
                {windowExpired ? "Submissions are no longer accepted." : `Closes ${new Date(endMs).toLocaleString()}`}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-1 sm:gap-1.5" aria-live="polite">
            <MiniBox value={windowParts.days} label="Days" expired={windowExpired} />
            <MiniColon />
            <MiniBox value={windowParts.hours} label="Hours" expired={windowExpired} />
            <MiniColon />
            <MiniBox value={windowParts.mins} label="Mins" expired={windowExpired} />
            <MiniColon />
            <MiniBox value={windowParts.secs} label="Secs" expired={windowExpired} />
          </div>
        </div>
      )}

      {compact ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-orbitron font-bold text-sm sm:text-base text-white uppercase tracking-wide">
              <i className="fa-solid fa-trophy text-cyan-400 mr-2" aria-hidden="true" />
              Arena Challenges
            </h3>
            <p className="font-mono text-[11px] text-cyan-500/60 mt-1">
              Active Quests · {solved.length}/{challenges.length} solved
            </p>
          </div>
          {filterChips}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-cyan-500/20 pb-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
              <i className="fa-solid fa-layer-group" /> Active Quests · {solved.length}/{challenges.length} solved
            </div>
            <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
              PATTERN <span className="text-brand-neon-cyan">CHALLENGES</span>
            </h1>
          </div>
          {filterChips}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-cyan-500/20 p-12 text-center font-mono text-sm text-gray-500">
          No challenges in this category yet.
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 ${compact ? "gap-4" : "gap-6"}`}>
          {filtered.map((challenge) => {
            const isSolved = solved.includes(challenge.id);
            return (
              <div
                key={challenge.id}
                role={isSolved ? undefined : "button"}
                tabIndex={isSolved ? undefined : 0}
                aria-disabled={isSolved}
                onClick={isSolved ? undefined : () => openChallenge(challenge.id)}
                onKeyDown={
                  isSolved
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openChallenge(challenge.id);
                        }
                      }
                }
                className={`rounded-2xl p-6 border relative flex flex-col justify-between group ${
                  isSolved
                    ? "bg-brand-navy/40 border-emerald-500/15 cursor-not-allowed"
                    : "glass-panel glass-panel-hover border-cyan-500/20 cursor-pointer"
                }`}
              >
                {isSolved && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-2xl bg-black/55 backdrop-blur-[2px] pointer-events-none"
                  />
                )}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs shrink-0">
                        #{challengeCode(challenge.number)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-mono text-xs truncate">
                        {challenge.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded border font-mono text-xs ${DIFF_STYLES[challenge.difficulty]}`}
                      >
                        {challenge.difficulty}
                      </span>
                      {isSolved && (
                        <span className="text-emerald-400 text-xs font-mono">
                          <i className="fa-solid fa-circle-check" /> Solved
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3
                      className={`font-orbitron font-bold text-xl text-white transition-colors ${
                        isSolved ? "" : "group-hover:text-brand-neon-cyan"
                      }`}
                    >
                      {challenge.title}
                    </h3>
                    <p className="font-sans text-xs text-gray-400 mt-2 line-clamp-2">{challenge.desc}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-cyan-500/10 space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-cyan-400 font-bold text-lg">
                      {challenge.points} <span className="text-xs font-normal text-gray-400">PTS</span>
                    </span>
                    <span className="text-gray-500">
                      {new Date(challenge.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {isSolved ? (
                    <button
                      type="button"
                      disabled
                      aria-label={`${challenge.title} is solved`}
                      className="relative z-10 w-full py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-rajdhani font-bold text-sm uppercase cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-circle-check" aria-hidden="true" />
                      Solved
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChallenge(challenge.id);
                      }}
                      className="relative z-10 w-full py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-rajdhani font-bold text-sm uppercase hover:bg-cyan-500 hover:text-black transition-all"
                    >
                      {patterns.includes(challenge.id) ? "Continue · Write Code" : "Start Challenge"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 bg-brand-deep/60 backdrop-blur-xl backdrop-saturate-75 flex items-center justify-center p-2 sm:p-4 animate-[fadeIn_0.25s_ease-out]">
          <div className="glass-panel w-full max-w-6xl h-[92vh] rounded-2xl border border-cyan-500/40 flex flex-col overflow-hidden relative tech-border animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="px-4 sm:px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-brand-navy/80 gap-3">
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 text-xs font-mono shrink-0">
                  #{challengeCode(active.number)}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono shrink-0">
                  {active.category}
                </span>
                <h3 className="font-orbitron font-extrabold text-lg sm:text-xl text-white truncate">{active.title}</h3>
                <span className="px-2.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono shrink-0">
                  {active.points} PTS
                </span>
                {solved.includes(active.id) && (
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono shrink-0">
                    Solved
                  </span>
                )}
                <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] uppercase shrink-0 ml-auto">
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      step === 1
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200"
                        : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    }`}
                  >
                    {step === 1 ? "1 · Pattern" : "✓ Pattern"}
                  </span>
                  <i className="fa-solid fa-chevron-right text-[8px] text-gray-500" aria-hidden="true" />
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      step === 2
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200"
                        : "bg-white/5 border-white/10 text-gray-500"
                    }`}
                  >
                    2 · Code
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="text-gray-400 hover:text-cyan-400 text-xl px-2 shrink-0"
                aria-label="Close editor"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              <div className="lg:col-span-5 p-5 sm:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-cyan-500/20 space-y-6 bg-brand-deep/50">
                <div>
                  <h4 className="font-orbitron font-bold text-sm text-cyan-400 uppercase tracking-wider mb-2">
                    {"// Problem Statement"}
                  </h4>
                  <p className="font-sans text-sm text-gray-300 leading-relaxed">{active.desc}</p>
                </div>

                {step === 1 ? (
                  <div>
                    <h4 className="font-orbitron font-bold text-sm text-cyan-400 uppercase tracking-wider mb-2">
                      {"// Stage 1 — Write the Pattern"}
                    </h4>
                    <p className="font-sans text-xs text-gray-400 mb-2">
                      Derive the exact pattern from the problem statement and type it below. Line breaks matter;
                      trailing spaces are ignored. The code editor unlocks once this matches.
                    </p>
                    <textarea
                      rows={7}
                      value={patternInput}
                      onChange={(e) => setPatternInput(e.target.value)}
                      spellCheck={false}
                      placeholder={"Type the pattern here...\n*\n**\n***"}
                      className="w-full bg-black/80 border border-cyan-500/30 rounded-lg p-3 font-mono text-xs text-cyan-200 resize-none focus:outline-none focus:border-cyan-400 leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={verifyPattern}
                      disabled={checkingPattern}
                      className="mt-2 w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase rounded-lg shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <i className={`fa-solid ${checkingPattern ? "fa-spinner fa-spin" : "fa-shield-halved"}`} aria-hidden="true" />
                      {checkingPattern ? "Verifying..." : "Verify Pattern · Unlock Code"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-orbitron font-bold text-sm text-cyan-400 uppercase tracking-wider mb-2">
                      {"// Stage 2 — Verified Target Pattern"}
                    </h4>
                    <pre className="bg-black/90 border border-cyan-500/30 p-4 rounded-lg font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {active.sampleOutput}
                    </pre>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <span
                      key={lang}
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                        runtimes?.[lang] === false
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}
                      title={runtimes?.[lang] === false ? "This language is unavailable on the configured code runner" : "This language is available on the configured code runner"}
                    >
                      {LANGUAGE_LABELS[lang]} · {runtimes === null ? "checking" : runtimes[lang] ? "available" : "unavailable"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col h-full bg-brand-navy/60 min-h-0">
                {step === 2 ? (
                  <div className="px-4 py-2 border-b border-cyan-500/20 flex items-center justify-between bg-black/40 gap-3">
                    <div className="flex items-center gap-3">
                      <label className="font-mono text-xs text-gray-400">Language:</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="bg-brand-navy border border-cyan-500/30 text-cyan-300 font-mono text-xs rounded px-2.5 py-1 focus:outline-none"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {LANGUAGE_LABELS[lang]}
                            {runtimes?.[lang] === false ? " (unavailable)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button onClick={resetCode} className="text-xs text-gray-400 hover:text-cyan-300 font-mono">
                      <i className="fa-solid fa-rotate-left mr-1" /> Reset Code
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-2 border-b border-cyan-500/20 bg-black/40">
                    <span className="font-mono text-xs text-gray-400 uppercase">
                      <i className="fa-solid fa-lock mr-2 text-amber-400" aria-hidden="true" />
                      Code editor locked — verify Stage 1 first
                    </span>
                  </div>
                )}

                {step === 1 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6 min-h-0">
                    <i className="fa-solid fa-lock text-4xl text-amber-400/50" aria-hidden="true" />
                    <p className="font-orbitron font-bold text-sm text-gray-200 uppercase">Stage 2 Locked</p>
                    <p className="font-sans text-xs text-gray-500 max-w-sm leading-relaxed">
                      The code editor unlocks once your pattern matches the target matrix. Solve Stage 1 on the
                      left panel.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 relative font-mono text-xs flex min-h-0">
                    <div
                      ref={gutterRef}
                      className="w-10 bg-black/40 py-3 text-right pr-2 select-none border-r border-cyan-500/10 text-gray-600 overflow-hidden font-mono text-xs leading-relaxed"
                    >
                      {code.split("\n").map((_, index) => (
                        <div key={index}>{index + 1}</div>
                      ))}
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      onScroll={syncScroll}
                      spellCheck={false}
                      className="w-full h-full bg-black/80 text-cyan-200 p-3 focus:outline-none font-mono text-xs leading-relaxed resize-none selection:bg-cyan-500 selection:text-black"
                    />
                  </div>
                )}

                <div className="border-t border-cyan-500/20 bg-black/90 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-cyan-400 uppercase">
                      {step === 1 ? "// Pattern Verification Console" : "// TekQbe Verification Engine"}
                    </span>
                    {step === 2 && (
                      <button
                        onClick={runCode}
                        disabled={running}
                        className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase rounded hover:shadow-neon-cyan transition-all flex items-center gap-2 disabled:opacity-60"
                      >
                        <i className={`fa-solid ${running ? "fa-spinner fa-spin" : "fa-play"}`} />
                        {running ? "Running..." : "Run & Verify"}
                      </button>
                    )}
                  </div>

                  <div
                    ref={consoleRef}
                    className="h-40 bg-brand-deep/90 border border-cyan-500/30 rounded p-3 font-mono text-xs overflow-y-auto space-y-1"
                  >
                    {consoleLines.map((line) => (
                      <div key={line.id} className={`${CONSOLE_STYLES[line.kind]} whitespace-pre-wrap break-all`}>
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MiniBox({ value, label, expired }: { value: number; label: string; expired: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center font-orbitron text-lg sm:text-xl font-black tabular-nums ${
          expired ? "bg-rose-950/50 border-rose-500/40 text-rose-300" : "bg-brand-deep border-cyan-400/40 text-white"
        }`}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="font-rajdhani text-[10px] font-semibold uppercase tracking-widest text-cyan-400/70">{label}</span>
    </div>
  );
}

function MiniColon() {
  return (
    <span className="self-start mt-2.5 sm:mt-3 font-orbitron text-lg sm:text-xl font-black text-cyan-400/50 select-none" aria-hidden="true">
      :
    </span>
  );
}

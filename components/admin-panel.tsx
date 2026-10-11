"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, LANGUAGES, LANGUAGE_LABELS, challengeCode, type Category, type Challenge, type Difficulty, type Language } from "@/lib/types";
import ChallengesView from "./challenges-view";
import LeaderboardPage from "./leaderboard/leaderboard-page";
import AdminTimerSettings from "./admin-timer-settings";
import { toast } from "./toast";

type Tab = "dashboard" | "challenges" | "monitor" | "timer" | "users" | "arena" | "leaderboard";

interface OverviewStats {
  users: number;
  challenges: number;
  totalSolves: number;
  submissions: number;
  passRate: number;
  pointsAwarded: number;
  activeSessions: number;
}

interface OverviewUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  score: number;
  solves: number;
  bot: boolean;
  banned: boolean;
  warnings: number;
  createdAt: string;
  lastSeenAt: string;
}

interface OverviewSubmission {
  id: string;
  username: string;
  challengeTitle: string;
  language: Language;
  status: string;
  points: number;
  durationMs: number;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  score: number;
  solves: number;
  solvedIds: string[];
  warnings: number;
  status: string;
  isSelf: boolean;
}

interface AlertItem {
  id: number;
  username: string;
  teamName: string | null;
  violations: number;
  banned: boolean;
  at: string;
}

interface ConfirmationRequest {
  userId?: string;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}

interface Overview {
  stats: OverviewStats;
  runtimes: Record<Language, boolean>;
  users: OverviewUser[];
  submissions: OverviewSubmission[];
  leaderboard: LeaderboardEntry[];
}

const EMPTY_OVERVIEW: Overview = {
  stats: {
    users: 0,
    challenges: 0,
    totalSolves: 0,
    submissions: 0,
    passRate: 0,
    pointsAwarded: 0,
    activeSessions: 0,
  },
  runtimes: { java: true, c: false },
  users: [],
  submissions: [],
  leaderboard: [],
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "fa-solid fa-gauge-high" },
  { id: "challenges", label: "Manage Challenges", icon: "fa-solid fa-layer-group" },
  { id: "monitor", label: "Live Monitor", icon: "fa-solid fa-tower-broadcast" },
  { id: "timer", label: "Event Timer", icon: "fa-solid fa-stopwatch" },
  { id: "users", label: "Users", icon: "fa-solid fa-users-gear" },
];

const SIDEBAR_LINKS: { id: Tab; label: string; icon: string }[] = [
  { id: "arena", label: "Challenges", icon: "fa-solid fa-trophy" },
  { id: "leaderboard", label: "Leaderboard", icon: "fa-solid fa-chart-column" },
];

const DIFF_STYLES: Record<string, string> = {
  Easy: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  Medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  Hard: "bg-rose-500/10 border-rose-500/30 text-rose-400",
};

const STATUS_BADGE: Record<string, string> = {
  passed: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  failed: "bg-rose-500/10 border-rose-500/30 text-rose-300",
  error: "bg-rose-500/10 border-rose-500/30 text-rose-300",
  timeout: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  "runtime-unavailable": "bg-amber-500/10 border-amber-500/30 text-amber-300",
};

const RANK_STYLES: Record<number, string> = {
  1: "text-yellow-300",
  2: "text-slate-200",
  3: "text-amber-500",
};

interface ChallengeForm {
  id: string | null;
  title: string;
  category: Category;
  difficulty: Difficulty;
  patternPoints: string;
  codePoints: string;
  desc: string;
  sampleOutput: string;
}

const EMPTY_FORM: ChallengeForm = {
  id: null,
  title: "",
  category: "",
  difficulty: "Easy",
  patternPoints: "50",
  codePoints: "100",
  desc: "",
  sampleOutput: "",
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {ok && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-500"}`} />
    </span>
  );
}

function LivePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/40 bg-cyan-500/10">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300" />
      </span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300">{label}</span>
    </span>
  );
}

function Panel({
  title,
  icon,
  caption,
  right,
  children,
}: {
  title: string;
  icon: string;
  caption?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-2xl border border-cyan-500/20 overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-cyan-500/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-orbitron font-bold text-sm sm:text-base text-white uppercase tracking-wide">
            <i className={`${icon} text-cyan-400 mr-2`} aria-hidden="true" />
            {title}
          </h3>
          {caption && <p className="font-mono text-[11px] text-cyan-500/60 mt-1">{caption}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500 text-xs" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-brand-navy/70 border border-cyan-500/25 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400/70 transition-colors"
      />
    </div>
  );
}

function IconAction({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "success" | "warn" | "admin";
}) {
  const tones: Record<string, string> = {
    default: "hover:bg-cyan-500/10 hover:text-cyan-300",
    danger: "hover:bg-rose-500/10 hover:text-rose-400",
    success: "hover:bg-emerald-500/10 hover:text-emerald-300",
    warn: "hover:bg-amber-500/10 hover:text-amber-300",
    admin: "hover:bg-purple-500/10 hover:text-purple-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 transition-colors ${tones[tone]}`}
    >
      <i className={icon} aria-hidden="true" />
    </button>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="py-12 text-center">
      <i className={`${icon} text-3xl text-cyan-500/30 mb-3`} aria-hidden="true" />
      <p className="font-mono text-sm text-gray-500">{message}</p>
    </div>
  );
}

function ConfirmationDialog({
  request,
  busy,
  inline = false,
  onCancel,
  onConfirm,
}: {
  request: ConfirmationRequest;
  busy: boolean;
  inline?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();
    return () => previousFocus?.focus();
  }, []);

  function keepFocusInside(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={inline ? "w-full" : "fixed inset-0 z-[100] flex items-start justify-center bg-transparent p-4 sm:justify-end sm:p-6"}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal={inline ? undefined : "true"}
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
        onKeyDown={keepFocusInside}
        className={`w-full rounded-xl border border-cyan-400/30 bg-[#081326] ${inline ? "flex max-w-none items-center gap-2 p-2" : "max-w-md p-4 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:p-5"}`}
      >
        <div className={`flex min-w-0 ${inline ? "items-center gap-2" : "items-start gap-3"}`}>
          <span className={`flex shrink-0 items-center justify-center rounded-xl border ${inline ? "h-7 w-7" : "mt-0.5 h-10 w-10"} ${request.destructive ? "border-rose-400/30 bg-rose-500/10 text-rose-300" : "border-amber-400/30 bg-amber-500/10 text-amber-300"}`}>
            <i className={`fa-solid ${request.destructive ? "fa-triangle-exclamation" : "fa-circle-question"}`} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="admin-confirm-title" className={`font-orbitron font-bold uppercase tracking-wide text-white ${inline ? "text-[10px] leading-4" : "text-base"}`}>
              {request.title}
            </h2>
            <p id="admin-confirm-description" className={`${inline ? "sr-only" : "mt-2 text-sm leading-6 text-slate-300"}`}>
              {request.description}
            </p>
          </div>
        </div>
        <div className={`flex shrink-0 gap-1.5 ${inline ? "ml-auto" : "mt-6 flex-col-reverse sm:flex-row sm:justify-end"}`}>
          <button
            type="button"
            data-dialog-cancel
            disabled={busy}
            onClick={onCancel}
            className={`rounded-lg border border-white/15 font-semibold text-slate-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50 ${inline ? "px-2 py-1 text-[10px]" : "px-4 py-2.5 text-sm"}`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-wait disabled:opacity-60 ${inline ? "px-2 py-1 text-[10px]" : "px-4 py-2.5 text-sm"} ${request.destructive ? "bg-rose-600 hover:bg-rose-500" : "bg-cyan-600 hover:bg-cyan-500"}`}
          >
            {busy ? "Please wait…" : request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [overview, setOverview] = useState<Overview>(EMPTY_OVERVIEW);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ChallengeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [challengeQuery, setChallengeQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setLoaded(true);
      }
      const challengeRes = await fetch("/api/challenges", { cache: "no-store" });
      if (challengeRes.ok) {
        const challengeData = await challengeRes.json();
        setChallenges(challengeData.challenges ?? []);
      }
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    const boot = setTimeout(() => {
      refresh();
    }, 0);
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "warning") {
          const where = payload.teamName ? `${payload.username} (team ${payload.teamName})` : payload.username;
          toast(
            payload.banned
              ? `BANNED: ${where} — ${payload.violations} anti-cheat violations`
              : `Anti-cheat warning ${payload.violations}: ${where} tried to leave the challenge tab`,
            "error",
            8000
          );
          setAlerts((prev) =>
            [
              {
                id: Date.now() + Math.random(),
                username: payload.username,
                teamName: payload.teamName ?? null,
                violations: Number(payload.violations) || 0,
                banned: Boolean(payload.banned),
                at: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 20)
          );
        }
        if (["users", "leaderboard", "submissions", "stats", "challenges", "warning"].includes(payload.type)) refresh();
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      clearTimeout(boot);
      source.close();
    };
  }, [refresh]);

  const primaryKpis = useMemo(
    () => [
      { label: "Users", value: overview.stats.users.toLocaleString(), sub: "registered accounts", icon: "fa-solid fa-users" },
      { label: "Challenges", value: overview.stats.challenges.toLocaleString(), sub: "patterns live", icon: "fa-solid fa-layer-group" },
      { label: "Total Solves", value: overview.stats.totalSolves.toLocaleString(), sub: "across all users", icon: "fa-solid fa-check-double" },
      { label: "Submissions", value: overview.stats.submissions.toLocaleString(), sub: "judge executions", icon: "fa-solid fa-paper-plane" },
    ],
    [overview]
  );

  const secondaryStats = useMemo(
    () => [
      { label: "Pass Rate", value: `${overview.stats.passRate}%` },
      { label: "Points Awarded", value: overview.stats.pointsAwarded.toLocaleString() },
      { label: "Active Sessions", value: overview.stats.activeSessions.toLocaleString() },
      { label: "Runtimes Ready", value: `${Object.values(overview.runtimes).filter(Boolean).length}/${LANGUAGES.length}` },
    ],
    [overview]
  );

  const filteredChallenges = useMemo(() => {
    const query = challengeQuery.trim().toLowerCase();
    if (!query) return challenges;
    return challenges.filter(
      (challenge) =>
        challenge.title.toLowerCase().includes(query) ||
        challenge.category.toLowerCase().includes(query) ||
        challenge.difficulty.toLowerCase().includes(query)
    );
  }, [challenges, challengeQuery]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return overview.users;
    return overview.users.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
    );
  }, [overview.users, userQuery]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(challenge: Challenge) {
    setForm({
      id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
      patternPoints: String(challenge.patternPoints ?? 0),
      codePoints: String(challenge.codePoints ?? challenge.points),
      desc: challenge.desc,
      sampleOutput: challenge.sampleOutput,
    });
    setFormOpen(true);
  }

  async function saveChallenge(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        category: form.category,
        difficulty: form.difficulty,
        patternPoints: Number(form.patternPoints),
        codePoints: Number(form.codePoints),
        desc: form.desc,
        sampleOutput: form.sampleOutput,
      };
      const endpoint = form.id ? `/api/challenges/${form.id}` : "/api/challenges";
      const res = await fetch(endpoint, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to save challenge", "error");
        return;
      }
      toast(form.id ? "Challenge updated" : "Challenge created");
      setFormOpen(false);
      refresh();
    } catch {
      toast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  function askForConfirmation(request: ConfirmationRequest) {
    setConfirmation(request);
  }

  async function confirmPendingAction() {
    if (!confirmation || confirmationBusy) return;
    setConfirmationBusy(true);
    try {
      await confirmation.onConfirm();
      setConfirmation(null);
    } finally {
      setConfirmationBusy(false);
    }
  }

  async function deleteChallenge(challenge: Challenge) {
    try {
      const res = await fetch(`/api/challenges/${challenge.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "Delete failed", "error");
        return;
      }
      toast("Challenge deleted");
      refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  async function userAction(user: OverviewUser, action: "reset" | "toggle-role" | "unban" | "clear-warnings") {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Action failed", "error");
        return;
      }
      toast(
        action === "reset"
          ? "Score and completed challenges reset"
          : action === "unban"
            ? "User unbanned"
            : action === "clear-warnings"
              ? "Warnings cleared"
              : "Role updated"
      );
      refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  async function deleteUser(user: OverviewUser) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Delete failed", "error");
        return;
      }
      toast("User removed");
      refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  return (
    <div className="pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" /> Full Administrator Console
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
            ADMIN <span className="text-brand-neon-cyan">CONTROL PANEL</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border font-mono text-[11px] uppercase tracking-wider ${
              loaded
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping ${
                  loaded ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${loaded ? "bg-emerald-400" : "bg-amber-400"}`}
              />
            </span>
            {loaded ? "Live sync" : "Connecting"}
          </span>
          <button
            onClick={refresh}
            className="h-9 px-4 rounded-lg glass-panel border border-cyan-500/40 text-cyan-300 font-rajdhani font-bold text-xs uppercase hover:bg-cyan-500/20 transition-colors active:scale-[0.98]"
          >
            <i className="fa-solid fa-rotate mr-1.5" aria-hidden="true" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-rajdhani font-extrabold text-xs uppercase shadow-neon-cyan hover:shadow-neon-blue transition-all active:scale-[0.98]"
          >
            <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" /> Add Challenge
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col lg:flex-row gap-6 items-start">
        <nav className="w-full lg:w-52 shrink-0 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-rajdhani font-bold whitespace-nowrap transition-all text-left border ${
                tab === item.id
                  ? "bg-cyan-500/15 border-cyan-400/40 text-brand-neon-cyan shadow-[0_0_18px_rgba(0,240,255,0.12)]"
                  : "border-transparent text-gray-400 hover:text-cyan-300 hover:bg-white/[0.03]"
              }`}
            >
              <i
                className={`${item.icon} w-4 text-center ${tab === item.id ? "text-brand-neon-cyan" : "text-cyan-500/70"}`}
                aria-hidden="true"
              />
              {item.label}
              {tab === item.id && <span className="ml-auto w-1 h-4 rounded-full bg-cyan-400 hidden lg:block" />}
            </button>
          ))}
          <div className="self-center h-6 w-px bg-cyan-500/20 shrink-0 lg:h-px lg:w-full lg:my-2" aria-hidden="true" />
          {SIDEBAR_LINKS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-rajdhani font-bold whitespace-nowrap transition-all text-left border ${
                tab === item.id
                  ? "bg-cyan-500/15 border-cyan-400/40 text-brand-neon-cyan shadow-[0_0_18px_rgba(0,240,255,0.12)]"
                  : "border-transparent text-gray-400 hover:text-cyan-300 hover:bg-white/[0.03]"
              }`}
            >
              <i
                className={`${item.icon} w-4 text-center ${tab === item.id ? "text-brand-neon-cyan" : "text-cyan-500/70"}`}
                aria-hidden="true"
              />
              {item.label}
              {tab === item.id && <span className="ml-auto w-1 h-4 rounded-full bg-cyan-400 hidden lg:block" />}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 w-full space-y-6">
          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {primaryKpis.map((card) => (
                  <div
                    key={card.label}
                    className="glass-panel rounded-2xl border border-cyan-500/20 p-5 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-400/30 flex items-center justify-center shrink-0">
                      <i className={`${card.icon} text-brand-neon-cyan text-lg`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-orbitron font-extrabold text-3xl text-white leading-none">{card.value}</div>
                      <div className="font-rajdhani text-[11px] uppercase tracking-widest text-cyan-400/80 mt-1.5">
                        {card.label}
                      </div>
                      <div className="font-mono text-[10px] text-gray-500 mt-0.5 hidden sm:block">{card.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-2xl border border-cyan-500/20 grid grid-cols-2 sm:grid-cols-4">
                {secondaryStats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={`px-4 py-4 text-center ${index % 2 === 1 ? "border-l border-cyan-500/10" : ""} ${
                      index < 2 ? "border-b border-cyan-500/10 sm:border-b-0" : ""
                    } sm:border-l ${index === 0 ? "sm:border-l-0" : ""}`}
                  >
                    <div className="font-orbitron font-bold text-lg text-white">{stat.value}</div>
                    <div className="font-rajdhani text-[10px] uppercase tracking-widest text-cyan-400/70 mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <Panel title="Execution Languages" icon="fa-solid fa-server" caption="Availability from the configured code runner">
                <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-3">
                  {LANGUAGES.map((lang) => {
                    const ready = Boolean(overview.runtimes[lang]);
                    return (
                      <div
                        key={lang}
                        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusDot ok={ready} />
                          <span className="font-rajdhani font-bold text-white text-sm truncate">
                            {LANGUAGE_LABELS[lang]}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase tracking-wider ${
                            ready
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          }`}
                        >
                          {ready ? "available" : "unavailable"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel
                title="Live Submission Feed"
                icon="fa-solid fa-wave-square"
                caption="Streaming judge results in real time"
                right={<LivePill label="Live" />}
              >
                {overview.submissions.length === 0 ? (
                  <EmptyState icon="fa-solid fa-inbox" message="No submissions yet — waiting for the arena to heat up." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-rajdhani">
                      <thead className="bg-brand-navy/90 text-cyan-400 text-[11px] font-orbitron uppercase border-b border-cyan-500/15">
                        <tr>
                          <th className="py-3 px-4 sm:px-5 w-28">Time</th>
                          <th className="py-3 px-4 sm:px-5 w-40">User</th>
                          <th className="py-3 px-4 sm:px-5">Challenge</th>
                          <th className="py-3 px-4 sm:px-5 w-24 text-center hidden lg:table-cell">Lang</th>
                          <th className="py-3 px-4 sm:px-5 w-36 text-center">Status</th>
                          <th className="py-3 px-4 sm:px-5 w-24 text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyan-500/10 text-sm text-gray-300">
                        {overview.submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-cyan-500/[0.06] transition-colors">
                            <td className="py-3.5 px-4 sm:px-5 font-mono text-xs text-gray-500 whitespace-nowrap">
                              {new Date(sub.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3.5 px-4 sm:px-5 font-bold text-white truncate">{sub.username}</td>
                            <td className="py-3.5 px-4 sm:px-5 text-gray-300 truncate">{sub.challengeTitle}</td>
                            <td className="py-3.5 px-4 sm:px-5 text-center font-mono text-xs text-cyan-400 hidden lg:table-cell">
                              {LANGUAGE_LABELS[sub.language]?.split(" ")[0] ?? sub.language}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full border font-mono text-[11px] ${
                                  STATUS_BADGE[sub.status] ?? "bg-gray-500/10 border-gray-500/30 text-gray-400"
                                }`}
                              >
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono text-brand-neon-cyan">
                              {sub.points > 0 ? `+${sub.points}` : "0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}
          {tab === "challenges" && (
            <Panel
              title="Challenge Library"
              icon="fa-solid fa-layer-group"
              caption={`${filteredChallenges.length} of ${challenges.length} challenges`}
              right={
                <SearchInput
                  value={challengeQuery}
                  onChange={setChallengeQuery}
                  placeholder="Search title, category, difficulty…"
                />
              }
            >
              {filteredChallenges.length === 0 ? (
                <EmptyState
                  icon="fa-solid fa-layer-group"
                  message={challenges.length === 0 ? "No challenges yet — hit Add Challenge to build the arena." : "No challenges match your search."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-rajdhani">
                    <thead className="bg-brand-navy/90 text-cyan-400 text-[11px] font-orbitron uppercase border-b border-cyan-500/15">
                      <tr>
                        <th className="py-3 px-4 sm:px-5 w-24">ID</th>
                        <th className="py-3 px-4 sm:px-5">Challenge</th>
                        <th className="py-3 px-4 sm:px-5 w-32">Category</th>
                        <th className="py-3 px-4 sm:px-5 w-28">Difficulty</th>
                        <th className="py-3 px-4 sm:px-5 w-24 text-right">Points</th>
                        <th className="py-3 px-4 sm:px-5 w-40 hidden xl:table-cell">Updated</th>
                        <th className="py-3 px-4 sm:px-5 w-36 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-500/10 text-sm text-gray-300">
                      {filteredChallenges.map((challenge) => (
                        <tr key={challenge.id} className="hover:bg-cyan-500/[0.06] transition-colors group">
                          <td className="py-4 px-4 sm:px-5 font-mono text-cyan-300 text-xs">
                            #{challengeCode(challenge.number)}
                          </td>
                          <td className="py-4 px-4 sm:px-5 font-bold text-white truncate">{challenge.title}</td>
                          <td className="py-4 px-4 sm:px-5 text-cyan-300/80">
                            <span className="inline-flex px-2 py-0.5 rounded-md border border-cyan-500/25 bg-cyan-500/10 text-[11px] font-mono">
                              {challenge.category}
                            </span>
                          </td>
                          <td className="py-4 px-4 sm:px-5">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full border font-mono text-[11px] ${DIFF_STYLES[challenge.difficulty] ?? DIFF_STYLES.Easy}`}
                            >
                              {challenge.difficulty}
                            </span>
                          </td>
                          <td className="py-4 px-4 sm:px-5 text-right font-mono text-brand-neon-cyan">{challenge.points}</td>
                          <td className="py-4 px-4 sm:px-5 font-mono text-xs text-gray-500 whitespace-nowrap hidden xl:table-cell">
                            {new Date(challenge.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 sm:px-5">
                            <div className="flex items-center justify-end rounded-lg border border-white/10 bg-white/[0.02] divide-x divide-white/5 w-max ml-auto">
                              <IconAction
                                icon="fa-solid fa-pen"
                                label="Edit challenge"
                                onClick={() => openEdit(challenge)}
                              />
                              <IconAction
                                icon="fa-solid fa-trash-can"
                                label="Delete challenge"
                                tone="danger"
                                onClick={() =>
                                  askForConfirmation({
                                    title: "Delete challenge?",
                                    description: `Delete “${challenge.title}”? Scores earned from this challenge will also be removed.`,
                                    confirmLabel: "Delete challenge",
                                    destructive: true,
                                    onConfirm: () => deleteChallenge(challenge),
                                  })
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {tab === "monitor" && (
            <>
              <Panel
                title="Anti-Cheat Alerts"
                icon="fa-solid fa-triangle-exclamation"
                caption="Tab-switch and violation popups streamed live"
                right={<LivePill label="Live" />}
              >
                {alerts.length === 0 ? (
                  <EmptyState icon="fa-solid fa-shield-halved" message="No violations yet — the arena is clean." />
                ) : (
                  <ul className="divide-y divide-amber-500/10 text-sm">
                    {alerts.map((alert) => (
                      <li
                        key={alert.id}
                        className="px-5 sm:px-6 py-3 flex flex-wrap items-center gap-3 bg-amber-500/[0.04]"
                      >
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-300 font-mono text-[11px]">
                          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                          {alert.banned ? "BAN" : `WARN ${alert.violations}`}
                        </span>
                        <span className="font-rajdhani font-bold text-white">{alert.username}</span>
                        {alert.teamName && (
                          <span className="font-mono text-xs text-cyan-300">team {alert.teamName}</span>
                        )}
                        <span className="font-mono text-[11px] text-gray-500 ml-auto">
                          {new Date(alert.at).toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel
                title="Live Monitor"
                icon="fa-solid fa-tower-broadcast"
                caption="Team standings streaming over SSE"
                right={<LivePill label="Live" />}
              >
                {overview.leaderboard.length === 0 ? (
                  <EmptyState icon="fa-solid fa-ranking-star" message="No teams on the board yet." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-rajdhani">
                      <thead className="bg-brand-navy/90 text-cyan-400 text-[11px] font-orbitron uppercase border-b border-cyan-500/15">
                        <tr>
                          <th className="py-3 px-4 sm:px-5 w-20">Rank</th>
                          <th className="py-3 px-4 sm:px-5">Team</th>
                          <th className="py-3 px-4 sm:px-5">Solved IDs</th>
                          <th className="py-3 px-4 sm:px-5 w-24 text-center">Solves</th>
                          <th className="py-3 px-4 sm:px-5 w-24 text-center">Warns</th>
                          <th className="py-3 px-4 sm:px-5 w-32 text-center">Status</th>
                          <th className="py-3 px-4 sm:px-5 w-32 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyan-500/10 text-sm text-gray-300">
                        {overview.leaderboard.map((entry) => (
                          <tr
                            key={`${entry.rank}-${entry.teamName}`}
                            className={`hover:bg-cyan-500/[0.06] transition-colors ${entry.isSelf ? "bg-cyan-500/[0.04]" : ""}`}
                          >
                            <td className="py-4 px-4 sm:px-5">
                              <span
                                className={`font-orbitron font-extrabold text-lg ${RANK_STYLES[entry.rank] ?? "text-gray-400"}`}
                              >
                                #{entry.rank}
                              </span>
                            </td>
                            <td className="py-4 px-4 sm:px-5 font-bold text-white truncate">{entry.teamName}</td>
                            <td className="py-4 px-4 sm:px-5">
                              {entry.solvedIds?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {entry.solvedIds.map((code) => (
                                    <span
                                      key={code}
                                      className="px-1.5 py-0.5 rounded border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 font-mono text-[11px] leading-none"
                                    >
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-mono text-xs text-gray-600">—</span>
                              )}
                            </td>
                            <td className="py-4 px-4 sm:px-5 text-center font-mono text-cyan-300">{entry.solves}</td>
                            <td className="py-4 px-4 sm:px-5 text-center">
                              {entry.warnings > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-300 font-mono text-[11px]">
                                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                  {entry.warnings}
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-gray-600">—</span>
                              )}
                            </td>
                          <td className="py-4 px-4 sm:px-5 text-center">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full border font-mono text-[11px] ${
                                entry.status === "active"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : "bg-gray-500/10 border-gray-500/30 text-gray-400"
                              }`}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right font-mono font-bold text-brand-neon-cyan text-base">
                            {entry.score.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            </>
          )}

          {tab === "timer" && (
            <Panel
              title="Event Timer"
              icon="fa-solid fa-stopwatch"
              caption="Homepage start countdown + challenge visibility window"
            >
              <div className="p-5 sm:p-6">
                <AdminTimerSettings />
              </div>
            </Panel>
          )}

          {tab === "users" && (
            <Panel
              title="User Management"
              icon="fa-solid fa-users-gear"
              caption={`${filteredUsers.length} of ${overview.users.length} accounts`}
              right={
                <SearchInput
                  value={userQuery}
                  onChange={setUserQuery}
                  placeholder="Search username, email, role…"
                />
              }
            >
              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon="fa-solid fa-users-slash"
                  message={overview.users.length === 0 ? "No users registered yet." : "No users match your search."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-rajdhani">
                    <thead className="bg-brand-navy/90 text-cyan-400 text-[11px] font-orbitron uppercase border-b border-cyan-500/15">
                      <tr>
                        <th className="py-3 px-4 sm:px-5 w-44">User</th>
                        <th className="py-3 px-4 sm:px-5 hidden xl:table-cell">Email</th>
                        <th className="py-3 px-4 sm:px-5 w-24 hidden sm:table-cell">Role</th>
                        <th className="py-3 px-4 sm:px-5 w-24 text-right">Score</th>
                        <th className="py-3 px-4 sm:px-5 w-24 text-center hidden md:table-cell">Solves</th>
                        <th className="py-3 px-4 sm:px-5 w-32">Status</th>
                        <th className="py-3 px-4 sm:px-5 min-w-52 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-500/10 text-sm text-gray-300">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-cyan-500/[0.06] transition-colors">
                          <td className="py-4 px-4 sm:px-5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-600/10 border border-cyan-400/30 flex items-center justify-center font-orbitron font-bold text-xs text-cyan-300 shrink-0">
                                {user.username.slice(0, 2).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">{user.username}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span
                                    className={`sm:hidden inline-flex px-1.5 py-px rounded-full border font-mono text-[9px] uppercase ${
                                      user.role === "admin"
                                        ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                                        : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                                    }`}
                                  >
                                    {user.role}
                                  </span>
                                  <span className="font-mono text-[10px] text-gray-500 truncate">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 sm:px-5 font-mono text-xs text-gray-400 truncate max-w-[200px] hidden xl:table-cell">
                            {user.email}
                          </td>
                          <td className="py-4 px-4 sm:px-5 hidden sm:table-cell">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full border font-mono text-[11px] ${
                                user.role === "admin"
                                  ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 sm:px-5 text-right font-mono text-brand-neon-cyan">{user.score.toLocaleString()}</td>
                          <td className="py-4 px-4 sm:px-5 text-center font-mono text-cyan-300 hidden md:table-cell">
                            {user.solves}
                          </td>
                          <td className="py-4 px-4 sm:px-5">
                            <div className="flex flex-col items-start gap-1.5">
                              {user.banned ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-rose-500/10 border-rose-500/30 text-rose-300 font-mono text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> banned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> active
                                </span>
                              )}
                              {user.warnings > 0 && (
                                <span
                                  title={`${user.warnings} anti-cheat warning${user.warnings === 1 ? "" : "s"}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-300 font-mono text-[11px]"
                                >
                                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                  {user.warnings} warn{user.warnings === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 sm:px-5">
                            {confirmation?.userId === user.id ? (
                              <ConfirmationDialog
                                inline
                                request={confirmation}
                                busy={confirmationBusy}
                                onCancel={() => setConfirmation(null)}
                                onConfirm={confirmPendingAction}
                              />
                            ) : (
                            <div className="flex w-max items-center justify-end rounded-lg border border-white/10 bg-white/[0.02] divide-x divide-white/5 ml-auto">
                              <IconAction
                                icon="fa-solid fa-rotate-left"
                                label="Reset score and solves"
                                tone="warn"
                                onClick={() =>
                                  askForConfirmation({
                                    userId: user.id,
                                    title: "Reset user progress?",
                                    description: `Reset ${user.username}’s score and completed challenges? This cannot be undone.`,
                                    confirmLabel: "Reset progress",
                                    destructive: true,
                                    onConfirm: () => userAction(user, "reset"),
                                  })
                                }
                              />
                              <IconAction
                                icon="fa-solid fa-user-shield"
                                label={user.role === "admin" ? "Demote to user" : "Promote to admin"}
                                tone="admin"
                                onClick={() => {
                                  const nextRole = user.role === "admin" ? "regular user" : "administrator";
                                  askForConfirmation({
                                    userId: user.id,
                                    title: "Change user role?",
                                    description: `Change ${user.username}’s role to ${nextRole}?`,
                                    confirmLabel: user.role === "admin" ? "Demote user" : "Promote to admin",
                                    onConfirm: () => userAction(user, "toggle-role"),
                                  });
                                }}
                              />
                              {user.banned && (
                                <IconAction
                                  icon="fa-solid fa-unlock"
                                  label="Unban user"
                                  tone="success"
                                  onClick={() => userAction(user, "unban")}
                                />
                              )}
                              {user.warnings > 0 && (
                                <IconAction
                                  icon="fa-solid fa-eye-slash"
                                  label="Clear warnings"
                                  tone="warn"
                                  onClick={() => userAction(user, "clear-warnings")}
                                />
                              )}
                              <IconAction
                                icon="fa-solid fa-user-minus"
                                label="Delete user"
                                tone="danger"
                                onClick={() =>
                                  askForConfirmation({
                                    userId: user.id,
                                    title: "Delete user?",
                                    description: `Permanently delete ${user.username} and their account data? This cannot be undone.`,
                                    confirmLabel: "Delete user",
                                    destructive: true,
                                    onConfirm: () => deleteUser(user),
                                  })
                                }
                              />
                            </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {tab === "arena" && (
            <section className="glass-panel rounded-2xl border border-cyan-500/20 p-5 sm:p-6">
              <ChallengesView user={null} initialChallenges={challenges} initialSolved={[]} compact />
            </section>
          )}

          {tab === "leaderboard" && (
            <section className="glass-panel rounded-2xl border border-cyan-500/20 p-5 sm:p-6">
              <LeaderboardPage />
            </section>
          )}
        </div>
      </div>
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-cyan-500/40 p-6 space-y-5 relative tech-border max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setFormOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 text-xl"
              aria-label="Close form"
            >
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="text-left flex items-center gap-3 pr-8">
              <div>
                <h3 className="font-orbitron font-extrabold text-xl sm:text-2xl text-white">
                  {form.id ? "EDIT PATTERN CHALLENGE" : "ADD PATTERN CHALLENGE"}
                </h3>
                <p className="font-rajdhani text-sm text-cyan-400">
                  Configure question details &amp; the verification matrix.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3 font-mono text-[11px] text-cyan-300/90 leading-relaxed">
              <i className="fa-solid fa-diagram-project mr-1.5" aria-hidden="true" />
              <span className="font-bold text-cyan-200">Player flow:</span> Stage 1 — the player reads your problem
              statement and types the pattern (verified server-side, answer hidden). Stage 2 — the code editor
              unlocks, the judge runs their code against the expected output, and correct code awards points once
              per team.
            </div>

            <form onSubmit={saveChallenge} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Diamond Star Matrix"
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    list="challenge-categories"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Matrix"
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                  <datalist id="challenge-categories">
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">
                    Stage 1 · Pattern Points (correct pattern)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={10000}
                    value={form.patternPoints}
                    onChange={(e) => setForm({ ...form, patternPoints: e.target.value })}
                    placeholder="50"
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">
                    Stage 2 · Code Points (correct code)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={10000}
                    value={form.codePoints}
                    onChange={(e) => setForm({ ...form, codePoints: e.target.value })}
                    placeholder="100"
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="font-mono text-xs text-cyan-300 pb-2">
                  Total reward: {Number(form.patternPoints || 0) + Number(form.codePoints || 0)} PTS
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-cyan-400 mb-1">
                  Problem Statement (Stage 1 — describe the pattern in words)
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  placeholder="Describe the pattern in words: rows, symbols, counts... e.g. Print a right triangle of stars with n rows."
                  className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-cyan-400 mb-1">
                  Expected Pattern (Stage 1 answer &amp; Stage 2 judge target — hidden from players until Stage 1
                  passes; trailing spaces ignored)
                </label>
                <textarea
                  rows={5}
                  required
                  value={form.sampleOutput}
                  onChange={(e) => setForm({ ...form, sampleOutput: e.target.value })}
                  placeholder={"*\n**\n***"}
                  className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase rounded-lg shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Challenge"}
              </button>
            </form>
          </div>
        </div>
      )}
      {confirmation && !confirmation.userId && (
        <ConfirmationDialog
          request={confirmation}
          busy={confirmationBusy}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmPendingAction}
        />
      )}
    </div>
  );
}

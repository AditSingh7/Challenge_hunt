"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "./toast";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function AdminTimerSettings() {
  const [hasTimer, setHasTimer] = useState(false);
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [challengesVisible, setChallengesVisible] = useState(false);
  const [challengesEndsAt, setChallengesEndsAt] = useState<string | null>(null);
  const [challengeDuration, setChallengeDuration] = useState("120");
  const [antiCheatPaused, setAntiCheatPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingChallenges, setSavingChallenges] = useState(false);
  const [savingAntiCheat, setSavingAntiCheat] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const applyTimer = useCallback((startsAt: string | null) => {
    setHasTimer(!!startsAt);
    setStartsAtLocal(startsAt ? toLocalInput(startsAt) : "");
  }, []);

  const applyChallenges = useCallback((challenges: { visible: boolean; endsAt: string | null } | null) => {
    setChallengesVisible(!!challenges?.visible);
    setChallengesEndsAt(challenges?.endsAt ?? null);
  }, []);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        applyTimer(d.timer?.startsAt ?? null);
        applyChallenges(d.challenges ?? null);
        setAntiCheatPaused(d.antiCheat?.paused === true);
      })
      .catch(() => {
        applyTimer(null);
        applyChallenges(null);
        setAntiCheatPaused(false);
      })
      .finally(() => setLoading(false));
  }, [applyTimer, applyChallenges]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function save() {
    if (!startsAtLocal) {
      toast("Pick a start date & time first.");
      return;
    }
    const startDate = new Date(startsAtLocal);
    if (Number.isNaN(startDate.getTime())) {
      toast("Invalid start time.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: startDate.toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to save the timer.");
        return;
      }
      applyTimer(data.timer?.startsAt ?? null);
      toast("Timer saved. The homepage now counts down to the start.");
    } catch {
      toast("Network error — timer not saved.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "Failed to clear the timer.");
        return;
      }
      applyTimer(null);
      toast("Timer cleared — the countdown is hidden.");
    } catch {
      toast("Network error — timer not cleared.");
    } finally {
      setSaving(false);
    }
  }

  async function enableChallenges() {
    const minutes = Number(challengeDuration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
      toast("Solve time must be 1–10080 minutes.");
      return;
    }
    setSavingChallenges(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengesVisible: true, durationMinutes: minutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to open the challenge window.");
        return;
      }
      applyChallenges(data.challenges ?? null);
      toast(`Challenges are LIVE for participants — ${minutes} minute solve window started.`);
    } catch {
      toast("Network error — challenge window not opened.");
    } finally {
      setSavingChallenges(false);
    }
  }

  async function disableChallenges() {
    setSavingChallenges(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengesVisible: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to close the challenge window.");
        return;
      }
      applyChallenges(data.challenges ?? null);
      toast("Challenge window closed — challenges are hidden from participants.");
    } catch {
      toast("Network error — challenge window not closed.");
    } finally {
      setSavingChallenges(false);
    }
  }

  async function toggleAntiCheat() {
    const nextPaused = !antiCheatPaused;
    setSavingAntiCheat(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ antiCheatPaused: nextPaused }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to update anti-cheat settings.");
        return;
      }
      setAntiCheatPaused(data.antiCheat?.paused === true);
      toast(nextPaused ? "Anti-cheat paused for all participants." : "Anti-cheat resumed for all participants.");
    } catch {
      toast("Network error — anti-cheat setting not changed.");
    } finally {
      setSavingAntiCheat(false);
    }
  }

  let preview = "No timer configured — the homepage shows no countdown.";
  if (hasTimer && startsAtLocal) {
    const startMs = new Date(startsAtLocal).getTime();
    if (Number.isNaN(startMs)) {
      preview = "Invalid start time.";
    } else if (now < startMs) {
      preview = `Starts in ${formatMs(startMs - now)} · begins ${new Date(startMs).toLocaleString()}`;
    } else {
      preview = `The event already started — began ${new Date(startMs).toLocaleString()}`;
    }
  }

  const challengeEndMs = challengesEndsAt ? Date.parse(challengesEndsAt) : NaN;
  const challengeLive = challengesVisible && !Number.isNaN(challengeEndMs) && now < challengeEndMs;
  const challengeExpired = challengesVisible && !Number.isNaN(challengeEndMs) && now >= challengeEndMs;
  const challengePreview = loading
    ? "Loading current window…"
    : challengeLive
      ? `LIVE — participants see challenges · time left ${formatMs(challengeEndMs - now)}`
      : challengeExpired
        ? `Window ended ${new Date(challengeEndMs).toLocaleString()} — challenges locked again.`
        : "Locked — participants cannot see challenges yet.";

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="flex items-center gap-2 font-orbitron text-[11px] tracking-[0.25em] text-cyan-400 uppercase font-bold border-b border-cyan-500/15 pb-2">
          <i className="fa-solid fa-hourglass-start" aria-hidden="true" />
          Homepage Start Countdown
        </div>

        <div>
          <label className="block font-mono text-xs text-cyan-400 mb-1">Starts At (your local time)</label>
          <input
            type="datetime-local"
            required
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="w-full sm:max-w-sm bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-brand-navy/60 px-4 py-3 font-mono text-xs text-cyan-400">
          <i className="fa-solid fa-eye mr-2 text-cyan-500" aria-hidden="true" />
          {loading ? "Loading current timer…" : preview}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-60"
          >
            {saving ? "Saving…" : hasTimer ? "Update Start Time" : "Set Start Time"}
          </button>
          {hasTimer && (
            <button
              type="button"
              onClick={clear}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-rose-500/40 text-rose-300 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-rose-500/10 transition-colors disabled:opacity-60"
            >
              Clear Timer
            </button>
          )}
        </div>

        <p className="font-rajdhani text-sm text-cyan-500/70">
          The homepage counts down in Days : Hours : Mins : Secs boxes until the start time, then switches to
          &quot;EVENT STARTED&quot;. The countdown is not shown on any other page.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2 font-orbitron text-[11px] tracking-[0.25em] text-cyan-400 uppercase font-bold border-b border-cyan-500/15 pb-2">
          <i className="fa-solid fa-eye" aria-hidden="true" />
          Challenge Visibility
        </div>

        <div
          className={`rounded-xl border px-4 py-3 font-mono text-xs ${
            challengeLive
              ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
              : challengeExpired
                ? "border-rose-500/40 bg-rose-950/40 text-rose-300"
                : "border-cyan-500/20 bg-brand-navy/60 text-cyan-400"
          }`}
        >
          <i
            className={`fa-solid ${
              challengeLive ? "fa-unlock text-emerald-400" : "fa-lock text-cyan-500"
            } mr-2`}
            aria-hidden="true"
          />
          {challengePreview}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block font-mono text-xs text-cyan-400 mb-1">Solve time (minutes, 1–10080)</label>
            <input
              type="number"
              required
              min={1}
              max={10080}
              value={challengeDuration}
              onChange={(e) => setChallengeDuration(e.target.value)}
              placeholder="120"
              className="w-40 bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button
            type="button"
            onClick={enableChallenges}
            disabled={savingChallenges || loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-60"
          >
            {savingChallenges ? "Saving…" : challengeLive ? "Restart Window" : "Show Challenges"}
          </button>
          {challengesVisible && (
            <button
              type="button"
              onClick={disableChallenges}
              disabled={savingChallenges}
              className="px-5 py-2.5 rounded-xl border border-rose-500/40 text-rose-300 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-rose-500/10 transition-colors disabled:opacity-60"
            >
              Hide Challenges
            </button>
          )}
        </div>

        <p className="font-rajdhani text-sm text-cyan-500/70">
          Participants can log in anytime, but challenges stay hidden until you open the window. Opening starts the
          solve countdown on the challenges page — when it reaches zero, challenges lock automatically and players see
          an &quot;Event Has Ended&quot; screen pointing to the leaderboard, which stays open for final results.
          Admins always see everything.
        </p>
      </div>

      <div className="space-y-4 border-t border-cyan-500/15 pt-6">
        <div className="flex items-center gap-2 font-orbitron text-[11px] tracking-[0.25em] text-cyan-400 uppercase font-bold border-b border-cyan-500/15 pb-2">
          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
          Anti-Cheat Enforcement
        </div>

        <div
          className={`rounded-xl border px-4 py-3 font-mono text-xs ${
            antiCheatPaused
              ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
              : "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
          }`}
          role="status"
          aria-live="polite"
        >
          <i className={`fa-solid ${antiCheatPaused ? "fa-pause" : "fa-shield-halved"} mr-2`} aria-hidden="true" />
          {loading ? "Loading anti-cheat setting…" : antiCheatPaused ? "PAUSED — tab switches will not create warnings or bans." : "ACTIVE — tab-switch warnings and ban threshold are enforced."}
        </div>

        <button
          type="button"
          onClick={toggleAntiCheat}
          disabled={savingAntiCheat || loading}
          aria-pressed={antiCheatPaused}
          className={`px-5 py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase tracking-wider transition-colors disabled:opacity-60 ${
            antiCheatPaused
              ? "bg-gradient-to-r from-emerald-500 to-cyan-600 text-black shadow-neon-cyan hover:shadow-neon-blue"
              : "border border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
          }`}
        >
          {savingAntiCheat ? "Saving…" : antiCheatPaused ? "Resume Anti-Cheat" : "Pause Anti-Cheat"}
        </button>

        <p className="font-rajdhani text-sm text-cyan-500/70">
          This global setting immediately pauses new tab-switch warnings and bans, including during a live event. It does not clear existing warnings or reinstate accounts already banned; use the Users panel to unban them.
        </p>
      </div>
    </div>
  );
}

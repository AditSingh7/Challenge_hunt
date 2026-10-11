"use client";

import { useEffect, useState } from "react";

type Phase = "pending" | "started";

function TimeBox({ value, label, phase }: { value: number; label: string; phase: Phase }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl border flex items-center justify-center font-orbitron text-2xl sm:text-4xl font-black tabular-nums ${
          phase === "started"
            ? "bg-brand-deep border-cyan-400/50 text-white shadow-neon-cyan"
            : "bg-brand-deep border-cyan-500/25 text-white"
        }`}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="font-rajdhani text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-cyan-400/80">
        {label}
      </span>
    </div>
  );
}

function TimeColon() {
  return (
    <span className="self-start mt-3 sm:mt-4 font-orbitron text-2xl sm:text-3xl font-black text-cyan-400/60 select-none" aria-hidden="true">
      :
    </span>
  );
}

export default function EventTimer() {
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const load = () => {
      fetch("/api/settings", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setStartsAt(d.timer?.startsAt ?? null))
        .catch(() => setStartsAt(null));
    };
    load();

    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      try {
        if (JSON.parse(event.data).type === "settings") load();
      } catch {
        // ignore malformed frames
      }
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!startsAt) return null;

  const startMs = Date.parse(startsAt);
  if (Number.isNaN(startMs)) return null;

  const phase: Phase = now < startMs ? "pending" : "started";
  const label = phase === "pending" ? "STARTS IN" : "EVENT STARTED";

  const remaining = Math.max(0, startMs - now);
  const totalSec = Math.floor(remaining / 1000);
  const parts = {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    mins: Math.floor((totalSec % 3600) / 60),
    secs: totalSec % 60,
  };

  return (
    <div className="glass-panel rounded-3xl border border-cyan-500/40 px-6 sm:px-10 py-7 inline-flex flex-col items-center gap-4 shadow-neon-cyan">
      <span className="font-orbitron text-xs sm:text-sm tracking-[0.3em] text-cyan-400 uppercase font-bold">{label}</span>

      <div className="flex items-start justify-center gap-1.5 sm:gap-3">
        <TimeBox value={parts.days} label="Days" phase={phase} />
        <TimeColon />
        <TimeBox value={parts.hours} label="Hours" phase={phase} />
        <TimeColon />
        <TimeBox value={parts.mins} label="Mins" phase={phase} />
        <TimeColon />
        <TimeBox value={parts.secs} label="Secs" phase={phase} />
      </div>

      <span className="font-mono text-[11px] text-cyan-500/80 text-center">
        {phase === "pending"
          ? `Event starts ${new Date(startMs).toLocaleString()}`
          : `The event began ${new Date(startMs).toLocaleString()}`}
      </span>
    </div>
  );
}

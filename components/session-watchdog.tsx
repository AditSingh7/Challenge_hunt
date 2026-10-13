"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "./toast";

const PING_INTERVAL_MS = 20_000;

function post(action: "ping" | "resume" | "close", keepalive = false): Promise<Response> {
  return fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
    keepalive,
    credentials: "same-origin",
  });
}

export default function SessionWatchdog() {
  const pathname = usePathname();
  const [banStage, setBanStage] = useState<number | "banned" | null>(null);

  useEffect(() => {
    let active = true;

    const send = async (action: "ping" | "resume") => {
      if (!active) return;
      try {
        const res = await post(action);
        if (res.status === 401) active = false;
      } catch {
        // Transient network failure; the next beat retries.
      }
    };

    void send("ping");
    const interval = window.setInterval(() => void send("resume"), PING_INTERVAL_MS);

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted || !active) return;
      const payload = JSON.stringify({ action: "close" });
      try {
        const queued = navigator.sendBeacon?.(
          "/api/session",
          new Blob([payload], { type: "application/json" })
        );
        if (!queued) void post("close", true).catch(() => {});
      } catch {
        void post("close", true).catch(() => {});
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void send("resume");
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void send("resume");
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/" || banStage === "banned") return;

    let mounted = true;
    let isParticipant = false;
    let monitoring = false;
    let lastReport = 0;
    let endTimer: number | undefined;

    const reportViolation = async () => {
      const now = Date.now();
      if (!monitoring || now - lastReport < 2000) return;
      lastReport = now;

      try {
        const res = await fetch("/api/anti-cheat", { method: "POST", credentials: "same-origin" });
        if (res.status === 401) {
          monitoring = false;
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;

        if (data.banned) {
          toast(data.message ?? "You are Banned", "error");
          setBanStage(3);
        } else if (typeof data.leftAttempts === "number" && !data.ignored) {
          toast(`Unusual Detection! Left attempts: ${data.leftAttempts}`, "error");
        }
      } catch {
        // Offline — ignore and wait for the next tab-switch event.
      }
    };

    const onVisibility = () => {
      // Only leaving this browser tab counts. Window focus changes and normal
      // in-app actions (including closing the challenge editor) are not violations.
      if (document.visibilityState === "hidden") void reportViolation();
    };

    const stopMonitoring = () => {
      if (!monitoring) return;
      monitoring = false;
      document.removeEventListener("visibilitychange", onVisibility);
    };

    const startMonitoring = () => {
      if (monitoring) return;
      monitoring = true;
      document.addEventListener("visibilitychange", onVisibility);
    };

    const syncChallengeWindow = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store", credentials: "same-origin" });
        if (!res.ok || !mounted) return;
        const data = await res.json();
        const endsAt = Date.parse(data.challenges?.endsAt ?? "");
        const active = isParticipant && data.challenges?.visible === true && Number.isFinite(endsAt) && endsAt > Date.now();
        if (endTimer !== undefined) window.clearTimeout(endTimer);
        if (active) {
          startMonitoring();
          endTimer = window.setTimeout(stopMonitoring, endsAt - Date.now());
        } else {
          stopMonitoring();
        }
      } catch {
        // Keep the current monitor state until settings can be checked again.
      }
    };

    let settingsEvents: EventSource | undefined;
    void fetch("/api/me", { cache: "no-store", credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || data?.user?.role !== "user") return;
        isParticipant = true;
        void syncChallengeWindow();
        settingsEvents = new EventSource("/api/events");
        settingsEvents.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "settings") void syncChallengeWindow();
          } catch {
            // Ignore malformed event frames.
          }
        };
      })
      .catch(() => {
        // No session or temporary network failure; the next navigation retries.
      });

    return () => {
      mounted = false;
      stopMonitoring();
      if (endTimer !== undefined) window.clearTimeout(endTimer);
      settingsEvents?.close();
    };
  }, [pathname, banStage]);

  useEffect(() => {
    if (typeof banStage !== "number") return;
    const timer = window.setTimeout(() => {
      setBanStage((stage) => (typeof stage === "number" ? (stage > 1 ? stage - 1 : "banned") : stage));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [banStage]);

  return banStage === null ? null : (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label="Account banned"
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center text-center px-6"
    >
      {banStage === "banned" ? (
        <div className="max-w-lg space-y-5">
          <i className="fa-solid fa-ban text-6xl text-rose-500" aria-hidden="true" />
          <h1 className="font-orbitron font-black text-4xl sm:text-6xl uppercase text-rose-500 drop-shadow-[0_0_18px_rgba(244,63,94,0.5)]">
            You are Banned
          </h1>
          <p className="font-rajdhani text-lg text-gray-300">
            Unusual activity detected. Your account has been suspended.
          </p>
          <p className="font-mono text-xs text-gray-500">Contact the administrator to restore your access.</p>
          <a
            href="/logout"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-rose-500/40 text-rose-400 font-orbitron font-bold text-xs uppercase hover:bg-rose-500/10 transition-colors"
          >
            <i className="fa-solid fa-power-off" aria-hidden="true" />
            Sign Out
          </a>
        </div>
      ) : (
        <div className="font-orbitron font-black text-[7rem] sm:text-[9rem] leading-none text-rose-500 animate-pulse">
          {banStage}
        </div>
      )}
    </div>
  );
}

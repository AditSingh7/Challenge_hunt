"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

  return null;
}

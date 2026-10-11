"use client";

import { useSyncExternalStore } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

let toasts: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function toast(message: string, kind: ToastKind = "success", durationMs = 3500) {
  const id = ++seq;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, durationMs);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toasts;
}

const ICONS: Record<ToastKind, string> = {
  success: "fa-solid fa-circle-check text-brand-neon-cyan",
  error: "fa-solid fa-circle-exclamation text-rose-400",
  info: "fa-solid fa-circle-info text-cyan-400",
};

export function ToastHost() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[60] flex flex-col items-end gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
      {list.map((t) => (
        <div
          key={t.id}
          className="glass-panel px-5 py-3 rounded-xl border border-cyan-400 shadow-neon-cyan flex items-center gap-3 animate-[slideDown_0.3s_ease-out]"
        >
          <i className={`${ICONS[t.kind]} text-lg`} />
          <span className="font-rajdhani font-bold text-sm text-white">{t.message}</span>
        </div>
      ))}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

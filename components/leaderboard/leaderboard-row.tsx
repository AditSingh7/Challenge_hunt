"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LeaderboardRow } from "@/lib/types";
import TeamAvatar from "./team-avatar";
import BadgeIcon from "./badge-icon";

function formatActivity(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const RANK_STYLES: Record<number, string> = {
  1: "text-yellow-300",
  2: "text-slate-200",
  3: "text-amber-500",
};

export default function LeaderboardRow({ row }: { row: LeaderboardRow }) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showMembers(button: HTMLButtonElement) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = button.getBoundingClientRect();
    const width = 256;
    const estimatedHeight = Math.min(260, 92 + row.members.length * 32);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = rect.bottom + 8 + estimatedHeight <= window.innerHeight
      ? rect.bottom + 8
      : Math.max(8, rect.top - estimatedHeight - 8);
    setPopupPosition({ top, left });
    setMembersOpen(true);
  }

  function scheduleClose() {
    if (pinnedOpen) return;
    closeTimer.current = setTimeout(() => setMembersOpen(false), 120);
  }

  return (
    <tr
      className={`transition-colors ${row.isSelf ? "bg-cyan-500/[0.07]" : "hover:bg-white/[0.03]"}`}
    >
      <td className="py-3.5 px-4 sm:px-5 font-orbitron font-bold text-sm">
        <span className={RANK_STYLES[row.rank] ?? "text-cyan-300/80"}>#{row.rank}</span>
      </td>
      <td className="py-3.5 px-4 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <TeamAvatar username={row.teamName} size="sm" />
          <span className="font-rajdhani font-bold text-white text-sm truncate max-w-[10rem] sm:max-w-none">
            {row.teamName}
            {row.isSelf && (
              <span className="ms-2 inline-flex items-center gap-1 text-[10px] font-mono text-yellow-300 align-middle">
                <i className="fa-solid fa-crown" aria-hidden="true" />
                (Your Team)
              </span>
            )}
          </span>
          <button
            type="button"
            aria-label={`Show ${row.teamName} team members`}
            aria-expanded={membersOpen}
            title="Show team members"
            onMouseEnter={(event) => showMembers(event.currentTarget)}
            onMouseLeave={scheduleClose}
            onFocus={(event) => showMembers(event.currentTarget)}
            onBlur={scheduleClose}
            onClick={(event) => {
              if (pinnedOpen) {
                setPinnedOpen(false);
                setMembersOpen(false);
              } else {
                showMembers(event.currentTarget);
                setPinnedOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setPinnedOpen(false);
                setMembersOpen(false);
              }
            }}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-cyan-300/70 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <i className="fa-solid fa-eye text-xs" aria-hidden="true" />
          </button>
          {membersOpen && typeof document !== "undefined" && createPortal(
            <div
              role="dialog"
              aria-label={`${row.teamName} team members`}
              onMouseEnter={() => {
                if (closeTimer.current) clearTimeout(closeTimer.current);
              }}
              onMouseLeave={scheduleClose}
              style={{ top: popupPosition.top, left: popupPosition.left }}
              className="fixed z-[200] w-64 overflow-hidden rounded-xl border border-cyan-400/30 bg-[#081326] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between border-b border-cyan-500/15 px-3 py-2">
                <span className="truncate font-orbitron text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                  {row.teamName} · Members
                </span>
                <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-400">{row.members.length}</span>
              </div>
              <ul className="max-h-52 overflow-y-auto p-2">
                {row.members.length > 0 ? row.members.map((member) => (
                  <li key={member} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200">
                    <i className="fa-solid fa-user text-[10px] text-cyan-400/70" aria-hidden="true" />
                    <span className="truncate">{member}</span>
                  </li>
                )) : (
                  <li className="px-2 py-2 text-xs text-slate-400">No members found.</li>
                )}
              </ul>
            </div>,
            document.body
          )}
        </div>
      </td>
      <td className="py-3.5 px-4 sm:px-5 font-mono text-sm text-cyan-300 font-semibold whitespace-nowrap">
        {row.score.toLocaleString()}
      </td>
      <td className="py-3.5 px-4 sm:px-5 font-mono text-xs text-slate-400 whitespace-nowrap">
        {formatActivity(row.lastSeenAt)}
      </td>
      <td className="py-3.5 px-4 sm:px-5">
        {row.solvedIds.length === 0 ? (
          <span className="font-mono text-xs text-slate-600">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.solvedIds.map((code) => (
              <span
                key={code}
                title={`Challenge ${code} solved`}
                className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono text-[11px] leading-none"
              >
                {code}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="py-3.5 px-4 sm:px-5 text-center font-mono text-sm text-slate-200">{row.solves}</td>
      <td className="py-3.5 px-4 sm:px-5 text-center">
        {row.warnings > 0 ? (
          <span
            title={`${row.warnings} anti-cheat warning${row.warnings === 1 ? "" : "s"} for this team`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-[11px] whitespace-nowrap"
          >
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            {row.warnings} warn{row.warnings === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="font-mono text-xs text-slate-600">—</span>
        )}
      </td>
      <td className="py-3.5 px-4 sm:px-5 text-center text-sm">
        <BadgeIcon solves={row.solves} />
      </td>
      <td className="py-3.5 px-4 sm:px-5 text-center">
        <span
          className={`px-2 py-0.5 rounded border font-mono text-[11px] whitespace-nowrap ${
            row.status === "Online"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-slate-500/10 text-slate-400 border-slate-500/30"
          }`}
        >
          {row.status}
        </span>
      </td>
    </tr>
  );
}

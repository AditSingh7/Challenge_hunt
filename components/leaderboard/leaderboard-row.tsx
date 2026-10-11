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

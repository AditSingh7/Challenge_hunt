import type { LeaderboardRow } from "@/lib/types";
import RankMedal from "./rank-medal";
import TeamAvatar from "./team-avatar";
import TeamStats from "./team-stats";

interface PodiumCardProps {
  row: LeaderboardRow;
  variant: "first" | "standard";
  className?: string;
}

export default function PodiumCard({ row, variant, className = "" }: PodiumCardProps) {
  const first = variant === "first";
  return (
    <article
      className={`flex flex-col items-center text-center rounded-2xl backdrop-blur-sm bg-[#0a1626]/85 ${
        first
          ? "border border-cyan-400/50 p-6 sm:p-7 shadow-[0_0_30px_rgba(34,211,238,0.15)]"
          : "border border-slate-600/40 p-5 shadow-lg shadow-black/30"
      } ${className}`}
    >
      <RankMedal rank={row.rank} />
      <div className={`${first ? "mt-3" : "mt-2.5"}`}>
        <TeamAvatar username={row.teamName} size={first ? "lg" : "md"} />
      </div>

      <h3
        className={`font-orbitron font-bold text-white mt-3 w-full truncate ${
          first ? "text-xl" : "text-sm sm:text-base"
        }`}
        title={row.teamName}
      >
        {row.teamName}
      </h3>
      <p className="text-[#58E85B] font-rajdhani text-xs sm:text-sm font-semibold uppercase tracking-wider mt-0.5">
        {row.group}
      </p>

      <div className="w-full mt-3">
        <TeamStats score={row.score} completed={row.solves} />
      </div>
    </article>
  );
}

import type { LeaderboardRow } from "@/lib/types";
import PodiumCard from "./podium-card";

export default function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const first = rows.find((r) => r.rank === 1);
  const second = rows.find((r) => r.rank === 2);
  const third = rows.find((r) => r.rank === 3);
  if (!first) return null;

  return (
    <section aria-label="Top three teams" className="max-w-4xl mx-auto mt-4 mb-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 items-end">
        <PodiumCard row={first} variant="first" className="sm:order-2 sm:-translate-y-4" />
        {second && <PodiumCard row={second} variant="standard" className="sm:order-1" />}
        {third && <PodiumCard row={third} variant="standard" className="sm:order-3" />}
      </div>
    </section>
  );
}

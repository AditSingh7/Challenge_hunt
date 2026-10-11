const MEDALS: Record<number, { ring: string; label: string }> = {
  1: { ring: "from-yellow-300 via-amber-400 to-yellow-600", label: "Gold medal, rank 1" },
  2: { ring: "from-slate-200 via-slate-400 to-slate-500", label: "Silver medal, rank 2" },
  3: { ring: "from-amber-600 via-orange-500 to-amber-800", label: "Bronze medal, rank 3" },
};

export default function RankMedal({ rank }: { rank: number }) {
  const medal = MEDALS[rank];
  if (!medal) return null;
  return (
    <div
      role="img"
      aria-label={medal.label}
      className={`w-9 h-9 rounded-full bg-gradient-to-br ${medal.ring} flex items-center justify-center ring-2 ring-black/40 shadow-lg`}
    >
      <i className="fa-solid fa-medal text-sm text-black/75" aria-hidden="true" />
    </div>
  );
}

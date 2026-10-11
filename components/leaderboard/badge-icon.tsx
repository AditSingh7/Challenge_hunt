const BADGES: Record<string, { icon: string; className: string; label: string }> = {
  star: { icon: "fa-solid fa-star", className: "text-yellow-400", label: "Star badge" },
  shield: { icon: "fa-solid fa-shield-halved", className: "text-cyan-400", label: "Shield badge" },
  trophy: { icon: "fa-solid fa-trophy", className: "text-sky-400", label: "Trophy badge" },
  medal: { icon: "fa-solid fa-medal", className: "text-slate-400", label: "Medal badge" },
};

export function badgeForSolves(solves: number): keyof typeof BADGES {
  if (solves >= 6) return "star";
  if (solves >= 4) return "shield";
  if (solves >= 2) return "trophy";
  return "medal";
}

export default function BadgeIcon({ solves }: { solves: number }) {
  const badge = BADGES[badgeForSolves(solves)];
  return (
    <span role="img" aria-label={badge.label} title={badge.label} className={`inline-flex ${badge.className}`}>
      <i className={badge.icon} aria-hidden="true" />
    </span>
  );
}

const PALETTE: { bg: string; fg: string }[] = [
  { bg: "from-red-500 to-rose-800", fg: "text-red-100" },
  { bg: "from-purple-500 to-indigo-800", fg: "text-purple-100" },
  { bg: "from-emerald-500 to-green-800", fg: "text-emerald-50" },
  { bg: "from-yellow-400 to-amber-700", fg: "text-amber-950" },
  { bg: "from-sky-500 to-blue-800", fg: "text-sky-50" },
  { bg: "from-teal-400 to-cyan-700", fg: "text-cyan-50" },
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return hash;
}

const SIZES = {
  sm: "w-8 h-8 text-xs",
  md: "w-11 h-11 text-base",
  lg: "w-20 h-20 text-3xl",
};

export default function TeamAvatar({
  username,
  size = "md",
}: {
  username: string;
  size?: keyof typeof SIZES;
}) {
  const tone = PALETTE[hashName(username) % PALETTE.length];
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-full bg-gradient-to-br ${tone.bg} ${tone.fg} ${SIZES[size]} flex items-center justify-center font-orbitron font-bold ring-1 ring-white/15 shadow-lg select-none`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

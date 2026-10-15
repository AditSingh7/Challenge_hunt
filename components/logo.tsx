export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} tekqbe-logo-glow`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M 135 174 A 82 82 0 1 1 167 147"
        stroke="white"
        strokeWidth="22"
        strokeLinecap="butt"
      />
      <circle cx="100" cy="100" r="49" fill="white" />
      <path d="M 99 58 L 113 72 L 99 86 L 151 138 L 137 152 L 85 100 L 68 117 L 54 103 Z" fill="#020617" />
    </svg>
  );
}

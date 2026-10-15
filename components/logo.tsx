export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} tekqbe-logo-glow`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="82" stroke="white" strokeWidth="22" />
      <circle cx="100" cy="100" r="49" stroke="white" strokeWidth="16" />
      <path d="M 101 61 L 117 77 L 100 94 L 156 150 L 140 166 L 84 110 L 66 128 L 50 112 Z" fill="white" />
    </svg>
  );
}

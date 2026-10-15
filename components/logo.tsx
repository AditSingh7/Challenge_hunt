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
      <path d="M 101 65 L 115 79 L 100 94 L 153 147 L 139 161 L 86 108 L 72 122 L 58 108 Z" fill="white" />
    </svg>
  );
}

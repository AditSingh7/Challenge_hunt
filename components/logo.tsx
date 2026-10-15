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
      <circle cx="100" cy="100" r="48" stroke="white" strokeWidth="16" />
      <rect x="76" y="70" width="48" height="18" rx="2" fill="white" transform="rotate(-45 100 100)" />
      <rect x="91" y="70" width="18" height="70" rx="2" fill="white" transform="rotate(-45 100 100)" />
    </svg>
  );
}

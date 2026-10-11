import Link from "next/link";
import Logo from "./logo";

export default function Footer() {
  return (
    <footer className="border-t border-cyan-500/20 py-8 relative z-10 bg-brand-navy/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <span className="font-typewriter text-xl font-bold text-white">TekQbe</span>
        </div>
        <p className="font-rajdhani text-sm text-gray-400 text-center">
          &copy; {new Date().getFullYear()} TekQbe Hack the Pattern. All rights reserved.
        </p>
        <div className="flex items-center gap-4 font-mono text-xs text-cyan-500/70">
          <Link href="/rules" className="hover:text-brand-neon-cyan transition-colors uppercase tracking-widest">
            Rules
          </Link>
          <span>{"// pattern matrix online"}</span>
        </div>
      </div>
    </footer>
  );
}

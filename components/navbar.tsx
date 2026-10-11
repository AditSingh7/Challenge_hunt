"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./logo";
import type { PublicUser } from "@/lib/types";

const NAV_LINKS = [
  { href: "/challenges", label: "Challenges", icon: "fa-solid fa-trophy" },
  { href: "/leaderboard", label: "Leaderboard", icon: "fa-solid fa-chart-column" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const load = () => {
      fetch("/api/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setUser(d.user ?? null))
        .catch(() => setUser(null))
        .finally(() => setLoaded(true));
    };
    load();
    window.addEventListener("htp-auth", load);
    return () => window.removeEventListener("htp-auth", load);
  }, [pathname]);

  useEffect(() => {
    const onOpen = () => setOverlayOpen(true);
    const onClose = () => setOverlayOpen(false);
    window.addEventListener("htp-overlay-open", onOpen);
    window.addEventListener("htp-overlay-close", onClose);
    return () => {
      window.removeEventListener("htp-overlay-open", onOpen);
      window.removeEventListener("htp-overlay-close", onClose);
    };
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function closeMenus() {
    setMenuOpen(false);
    setAccountOpen(false);
  }

  if (overlayOpen) return null;

  const hideNavLinks =
    !user ||
    pathname === "/admin" ||
    (pathname === "/profile" && user.role === "admin");

  return (
    <nav
      className={`sticky top-0 z-40 border-b border-cyan-500/10 px-4 lg:px-8 py-3 transition-colors duration-300 ${
        scrolled ? "bg-[#04101d]/70 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Logo className="w-full h-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-typewriter font-bold text-2xl tracking-wider text-white group-hover:text-brand-neon-cyan transition-colors leading-none">
              TekQbe
            </span>
            <span className="font-rajdhani text-[10px] tracking-[0.25em] text-cyan-400 font-bold uppercase mt-1">
              Hack The Pattern
            </span>
          </div>
        </Link>

        {!hideNavLinks && (
          <div className="hidden md:flex items-center gap-6 lg:gap-8 font-rajdhani text-sm font-semibold tracking-wide">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-1 py-2 transition-colors after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-[#00f0ff] after:shadow-[0_0_8px_rgba(0,240,255,0.8)] ${
                    active
                      ? "text-brand-neon-cyan after:block"
                      : "text-gray-300 hover:text-brand-neon-cyan after:hidden"
                  }`}
                >
                  <i className={`${link.icon} text-xs`} aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          {loaded && user === null && (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="font-rajdhani font-bold px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 text-xs uppercase transition-all"
              >
                <i className="fa-solid fa-right-to-bracket mr-1" aria-hidden="true" /> Sign In
              </Link>
              <Link
                href="/register"
                className="font-rajdhani font-extrabold px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs uppercase shadow-neon-cyan hover:shadow-neon-blue transition-all"
              >
                Register
              </Link>
            </div>
          )}

          {loaded && user && (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="Account menu"
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center font-bold text-xs text-brand-neon-cyan">
                  {user.username.charAt(0).toUpperCase()}
                </span>
                <i
                  aria-hidden="true"
                  className={`fa-solid fa-chevron-down text-[9px] text-cyan-400 transition-transform ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-cyan-500/25 bg-[#04101d]/95 backdrop-blur-md p-2 shadow-xl shadow-black/50"
                >
                  <div className="px-3 py-2 mb-1 border-b border-white/10">
                    <div className="font-rajdhani font-bold text-white text-sm truncate">{user.username}</div>
                    <div className="font-mono text-[10px] text-cyan-400">{user.score} PTS</div>
                  </div>
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={closeMenus}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-200"
                  >
                    <i className="fa-solid fa-user w-4 text-cyan-500" aria-hidden="true" />
                    Profile
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-200"
                    >
                      <i className="fa-solid fa-shield-halved w-4 text-cyan-500" aria-hidden="true" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenus();
                      router.push("/logout");
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 text-left"
                  >
                    <i className="fa-solid fa-power-off w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden text-cyan-400 text-2xl focus:outline-none p-2"
            aria-label="Toggle menu"
          >
            <i className="fa-solid fa-bars-staggered" aria-hidden="true" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden mt-3 rounded-xl bg-brand-deep/95 backdrop-blur-md border border-cyan-500/20 p-4 flex flex-col gap-1 font-rajdhani text-base font-semibold">
          {!hideNavLinks &&
            NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenus}
                className={`flex items-center gap-2.5 px-3 py-2 rounded hover:bg-cyan-500/10 ${
                  pathname === link.href ? "text-brand-neon-cyan" : "text-gray-300"
                }`}
              >
                <i className={`${link.icon} text-xs w-4`} aria-hidden="true" />
                {link.label}
              </Link>
            ))}
          <div className={`${user ? "pt-2 mt-1 border-t border-cyan-500/20" : ""} flex flex-col gap-2`}>
            {user === null ? (
              <>
                <Link
                  href="/login"
                  onClick={closeMenus}
                  className="text-cyan-300 px-3 py-1.5 rounded hover:bg-cyan-500/10 text-sm"
                >
                  <i className="fa-solid fa-right-to-bracket mr-2" aria-hidden="true" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenus}
                  className="text-brand-neon-cyan px-3 py-1.5 rounded hover:bg-cyan-500/10 text-sm"
                >
                  <i className="fa-solid fa-user-plus mr-2" aria-hidden="true" />
                  Register
                </Link>
              </>
            ) : (
              <>
                <div className="text-xs text-cyan-400 font-mono px-3">
                  {user.username} · {user.score} PTS
                </div>
                <Link
                  href="/profile"
                  onClick={closeMenus}
                  className="text-cyan-300 px-3 py-1.5 rounded hover:bg-cyan-500/10 text-sm"
                >
                  <i className="fa-solid fa-user mr-2" aria-hidden="true" />
                  Profile
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={closeMenus}
                    className="text-cyan-300 px-3 py-1.5 rounded hover:bg-cyan-500/10 text-sm"
                  >
                    <i className="fa-solid fa-shield-halved mr-2" aria-hidden="true" />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => {
                    closeMenus();
                    router.push("/logout");
                  }}
                  className="text-rose-400 text-left px-3 py-1.5 rounded hover:bg-rose-500/10 text-sm"
                >
                  <i className="fa-solid fa-power-off mr-2" aria-hidden="true" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

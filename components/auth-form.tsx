"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "./logo";
import { toast } from "./toast";

interface AuthFormProps {
  mode: "login" | "register";
  next: string;
  notice?: string;
}

export default function AuthForm({ mode, next, notice }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/challenges";
  const switchHref = isRegister ? `/login?next=${encodeURIComponent(safeNext)}` : `/register?next=${encodeURIComponent(safeNext)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/register" : "/api/login";
      const payload = isRegister ? { username, email, password } : { identifier, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Authentication failed. Try again.");
        setLoading(false);
        return;
      }

      if (isRegister) {
        // Registration never opens the portal — send the player to sign in first.
        toast(`Account created, ${data.user.username}! Sign in to enter the arena.`);
        router.push(`/login?next=${encodeURIComponent(safeNext)}&registered=1`);
        router.refresh();
      } else {
        window.dispatchEvent(new Event("htp-auth"));
        toast(`Welcome back, ${data.user.username}!`);
        router.push(data.user?.role === "admin" ? "/admin" : safeNext);
        router.refresh();
      }
    } catch {
      setError("Network error. Is the platform online?");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="glass-panel rounded-2xl border border-cyan-500/40 p-6 sm:p-8 space-y-6 relative tech-border">
        <div className="text-center flex flex-col items-center">
          <Logo className="w-14 h-14 mb-3" />
          <h3 className="font-orbitron font-extrabold text-2xl text-white">
            {isRegister ? "TEKQBE REGISTER" : "TEKQBE LOGIN"}
          </h3>
          <p className="font-rajdhani text-sm text-cyan-400 mt-1">
            Access pattern quests &amp; save live leaderboard standing
          </p>
        </div>

        {notice && (
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-300 text-xs font-mono text-center">
            {notice}
          </div>
        )}

        <div className="flex border-b border-cyan-500/20 font-orbitron text-xs font-bold text-center">
          <Link
            href={`/login?next=${encodeURIComponent(safeNext)}`}
            className={`w-1/2 py-2.5 ${
              !isRegister ? "text-brand-neon-cyan border-b-2 border-brand-neon-cyan" : "text-gray-400 hover:text-cyan-300"
            }`}
          >
            LOGIN
          </Link>
          <Link
            href={`/register?next=${encodeURIComponent(safeNext)}`}
            className={`w-1/2 py-2.5 ${
              isRegister ? "text-brand-neon-cyan border-b-2 border-brand-neon-cyan" : "text-gray-400 hover:text-cyan-300"
            }`}
          >
            REGISTER
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister ? (
            <>
              <div className="space-y-1">
                <label className="block font-mono text-xs text-cyan-400">Hacker Handle / User Name</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="CyberNinja_99"
                  className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-mono text-xs text-cyan-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@tekqbe.io"
                  className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="block font-mono text-xs text-cyan-400">Handle or Email Address</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="user@tekqbe.io"
                className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block font-mono text-xs text-cyan-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs font-mono text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase rounded-lg shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-60"
          >
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>

          <div className="pt-1 text-center font-mono text-xs text-gray-500">
            {switchHref ? (
              <Link href={switchHref} className="text-cyan-400 hover:text-brand-neon-cyan underline">
                {isRegister ? "Already registered? Sign in" : "New user? Create an account"}
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

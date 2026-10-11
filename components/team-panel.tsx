"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./toast";

export interface TeamMemberInfo {
  id: string;
  username: string;
  role: string;
  isLeader: boolean;
  isSelf: boolean;
}

interface TeamPanelProps {
  team: {
    id: string;
    name: string;
    slug: string;
    leaderId: string;
    createdAt: string;
  } | null;
  members: TeamMemberInfo[];
  isLeader: boolean;
  maxSize: number;
}

export default function TeamPanel({ team, members, isLeader, maxSize }: TeamPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [player, setPlayer] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not create the team.", "error");
        return;
      }
      toast(`Team "${data.team.name}" is live. Add your players!`, "success");
      setName("");
      setSlug("");
      router.refresh();
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddPlayer(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !player.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: player.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not add the player.", "error");
        return;
      }
      toast(`${player.trim()} joined ${data.team.name}`, "success");
      setPlayer("");
      setAdding(false);
      router.refresh();
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-panel rounded-2xl border border-cyan-500/30 p-6 sm:p-8">
      <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest border-b border-cyan-500/10 pb-3">
        <i className="fa-solid fa-people-group" /> Squad Registry
      </div>

      {!team ? (
        <div className="pt-5">
          <h2 className="font-orbitron font-extrabold text-xl text-white">
            NO <span className="text-brand-neon-cyan">SQUAD</span> REGISTERED
          </h2>
          <p className="font-rajdhani text-sm text-gray-400 mt-1 mb-5">
            Assemble your squad to compete on the team leaderboard. Pick a name, claim an optional
            slug, then invite players by handle.
          </p>

          <form onSubmit={handleCreate} className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block font-mono text-[11px] text-cyan-400 uppercase tracking-wider mb-1.5">
                Team Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                maxLength={32}
                placeholder="e.g. Null Pointers"
                className="w-full bg-brand-navy/60 border border-cyan-500/30 rounded-xl px-4 py-2.5 font-rajdhani text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-cyan-400 uppercase tracking-wider mb-1.5">
                Slug <span className="text-gray-500">(optional)</span>
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                maxLength={32}
                placeholder="null-pointers"
                className="w-full sm:w-44 bg-brand-navy/60 border border-cyan-500/30 rounded-xl px-4 py-2.5 font-mono text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create Team"}
            </button>
          </form>
        </div>
      ) : (
        <div className="pt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-orbitron font-extrabold text-2xl text-white truncate">
                  {team.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded font-mono text-[11px] border bg-cyan-500/10 border-cyan-500/40 text-cyan-300">
                  /{team.slug}
                </span>
              </div>
              <p className="font-mono text-[11px] text-gray-500 mt-1">
                {members.length}/{maxSize} players · registered{" "}
                {new Date(team.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {isLeader && !adding && (
              <button
                onClick={() => setAdding(true)}
                disabled={members.length >= maxSize}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-40"
              >
                <i className="fa-solid fa-user-plus mr-2" />
                {members.length >= maxSize ? "Roster Full" : "Add Player"}
              </button>
            )}
          </div>

          {isLeader && adding && (
            <form onSubmit={handleAddPlayer} className="flex flex-wrap gap-2 items-center">
              <input
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                required
                autoFocus
                maxLength={20}
                placeholder="Player handle (e.g. ApexCoder)"
                className="flex-1 min-w-[220px] bg-brand-navy/60 border border-cyan-500/30 rounded-xl px-4 py-2.5 font-mono text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-orbitron font-bold text-xs uppercase hover:bg-emerald-500/25 transition-all disabled:opacity-50"
              >
                {busy ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setPlayer("");
                }}
                className="px-4 py-2.5 rounded-xl glass-panel border border-cyan-500/30 text-gray-300 font-rajdhani font-bold text-xs uppercase hover:bg-cyan-500/10 transition-all"
              >
                Cancel
              </button>
            </form>
          )}

          {!isLeader && (
            <p className="font-mono text-[11px] text-gray-500">
              Only the team leader can add players to the roster.
            </p>
          )}

          <ul className="divide-y divide-cyan-500/10 border-t border-cyan-500/10">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-orbitron font-bold text-cyan-300 shrink-0">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-rajdhani font-bold text-white text-sm truncate">
                      {member.username}
                      {member.isSelf && <span className="text-gray-500 font-normal"> (you)</span>}
                    </div>
                    <div className="font-mono text-[10px] text-gray-500 uppercase">
                      {member.role === "admin" ? "Administrator" : "User"}
                    </div>
                  </div>
                </div>
                {member.isLeader && (
                  <span className="shrink-0 px-2.5 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wider bg-yellow-500/10 border-yellow-500/40 text-yellow-300">
                    <i className="fa-solid fa-crown mr-1" /> Team Leader
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserRecord } from "@/lib/auth";
import { getTeamMembers, getTeamOf, MAX_TEAM_SIZE } from "@/lib/teams";
import TeamPanel from "@/components/team-panel";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUserRecord();
  if (!user) redirect("/login?next=/profile");

  const team = await getTeamOf(user);
  const members = team ? await getTeamMembers(team) : [];

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="space-y-8 pb-8 max-w-5xl mx-auto">
        <div className="border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
            <i className="fa-solid fa-fingerprint" /> User Dossier
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
            USER <span className="text-brand-neon-cyan">PROFILE</span>
          </h1>
        </div>

        <div className="glass-panel rounded-2xl border border-cyan-500/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-cyan-500/10 border-2 border-brand-neon-cyan flex items-center justify-center font-orbitron font-black text-4xl text-brand-neon-cyan shadow-neon-cyan shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white">{user.username}</h2>
              <span
                className={`px-2.5 py-0.5 rounded font-mono text-xs border ${
                  user.role === "admin"
                    ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                    : "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                }`}
              >
                {user.role === "admin" ? "ADMINISTRATOR" : "USER"}
              </span>
            </div>
            <p className="font-mono text-xs text-cyan-400 mt-2 break-all">{user.email}</p>
            <p className="font-rajdhani text-sm text-gray-400 mt-1">
              Joined {new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}{" "}
              · Last active {new Date(user.lastSeenAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Link
              href="/challenges"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase text-center shadow-neon-cyan hover:shadow-neon-blue transition-all"
            >
              <i className="fa-solid fa-terminal mr-2" />
              Solve Patterns
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="px-5 py-2.5 rounded-xl glass-panel border border-cyan-500/50 text-cyan-300 font-orbitron font-bold text-xs uppercase text-center hover:bg-cyan-500/20 transition-all"
              >
                <i className="fa-solid fa-shield-halved mr-2" />
                Admin Panel
              </Link>
            )}
            <a
              href="/logout"
              className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 font-orbitron font-bold text-xs uppercase text-center hover:bg-rose-500/20 transition-all"
            >
              <i className="fa-solid fa-power-off mr-2" />
              Sign Out
            </a>
          </div>
        </div>

        <TeamPanel
          team={team ? { id: team.id, name: team.name, slug: team.slug, leaderId: team.leaderId, createdAt: team.createdAt } : null}
          members={members.map((member) => ({
            id: member.id,
            username: member.username,
            role: member.role,
            isLeader: member.id === team?.leaderId,
            isSelf: member.id === user.id,
          }))}
          isLeader={Boolean(team && team.leaderId === user.id)}
          maxSize={MAX_TEAM_SIZE}
        />
      </div>
    </main>
  );
}

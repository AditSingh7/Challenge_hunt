import { redirect } from "next/navigation";
import { getSessionUserRecord } from "@/lib/auth";
import { challengesCol, teamsCol, toPublicUser } from "@/lib/db";
import { getChallengeWindow } from "@/lib/challenge-window";
import ChallengesView from "@/components/challenges-view";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const user = await getSessionUserRecord();
  if (!user) redirect("/login?next=/challenges");

  const window = await getChallengeWindow();

  if (user.role !== "admin" && !window.open) {
    return (
      <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="glass-panel rounded-3xl border border-cyan-500/30 px-6 sm:px-14 py-12 sm:py-16 max-w-2xl w-full text-center space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10 pointer-events-none" aria-hidden="true" />
            {window.expired ? (
              <div className="relative space-y-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-brand-navy border border-cyan-500/40 flex items-center justify-center shadow-neon-cyan">
                  <i className="fa-solid fa-flag-checkered text-brand-neon-cyan text-4xl" aria-hidden="true" />
                </div>
                <h1 className="font-orbitron text-4xl sm:text-6xl font-black uppercase tracking-wide title-gradient leading-tight">
                  Event Has Ended Now
                </h1>
                <p className="font-rajdhani text-lg sm:text-xl text-cyan-100/80 max-w-lg mx-auto font-medium">
                  The challenge window is closed and submissions are locked. Check the final standings to see where
                  you landed!
                </p>
                <a
                  href="/leaderboard"
                  className="inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-black font-orbitron font-extrabold text-base sm:text-lg tracking-wider uppercase shadow-neon-cyan hover:shadow-neon-blue transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <i className="fa-solid fa-chart-column" aria-hidden="true" />
                  Check Leaderboard
                </a>
              </div>
            ) : (
              <div className="relative">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-brand-navy border border-cyan-500/40 flex items-center justify-center mb-2 shadow-neon-cyan">
                  <i className="fa-solid fa-lock text-brand-neon-cyan text-3xl" aria-hidden="true" />
                </div>
                <h1 className="font-orbitron text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
                  Arena Locked
                </h1>
                <p className="font-rajdhani text-cyan-100/80 text-base sm:text-lg mt-3 leading-relaxed">
                  Challenges stay hidden until the admin opens the event window. You&apos;re logged in — hang tight,
                  register your team, and study the rules while you wait.
                </p>
                <a
                  href="/rules"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl glass-panel border border-cyan-500/50 text-cyan-300 font-orbitron font-bold text-xs tracking-wider uppercase hover:bg-cyan-500/20 hover:border-cyan-400 transition-all"
                >
                  <i className="fa-solid fa-scroll" aria-hidden="true" />
                  Read the Rules
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const [challenges, team] = await Promise.all([
    (await challengesCol())
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray(),
    user.teamId
      ? (await teamsCol()).findOne({ id: user.teamId }, { projection: { _id: 0, solved: 1 } })
      : Promise.resolve(null),
  ]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <ChallengesView
        user={toPublicUser(user)}
        initialChallenges={challenges}
        initialSolved={team ? team.solved : user.solved}
        initialPatterns={user.patterns ?? []}
        endsAt={window.endsAt}
      />
    </main>
  );
}

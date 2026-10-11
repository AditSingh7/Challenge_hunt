import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getChallengeWindow } from "@/lib/challenge-window";
import LeaderboardPage from "@/components/leaderboard/leaderboard-page";

export const dynamic = "force-dynamic";

export default async function LeaderboardRoute() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/leaderboard");

  const window = await getChallengeWindow();

  if (user.role !== "admin" && !window.open && !window.expired) {
    return (
      <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="min-h-[55vh] flex items-center justify-center">
          <div className="glass-panel rounded-3xl border border-cyan-500/30 px-8 sm:px-14 py-12 sm:py-16 max-w-xl w-full text-center space-y-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10 pointer-events-none" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-end justify-center gap-1.5 h-16 mb-4" aria-hidden="true">
                <div className="w-9 h-10 rounded-md border-2 border-cyan-400/60 bg-cyan-500/10" />
                <div className="w-9 h-16 rounded-md border-2 border-brand-neon-cyan bg-cyan-500/15 shadow-neon-cyan" />
                <div className="w-9 h-12 rounded-md border-2 border-cyan-400/60 bg-cyan-500/10" />
              </div>
              <h1 className="font-orbitron text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
                Leaderboard not available yet
              </h1>
              <p className="font-rajdhani text-cyan-100/80 text-base sm:text-lg mt-3 leading-relaxed">
                Standings stay hidden until the admin opens the challenge window. Solve challenges while the event is
                live and the podium will appear here.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <LeaderboardPage windowEndsAt={window.endsAt} />
    </main>
  );
}

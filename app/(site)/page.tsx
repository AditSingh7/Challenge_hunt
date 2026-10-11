import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/logo";
import Footer from "@/components/footer";
import AuthNotice from "@/components/auth-notice";
import EventTimer from "@/components/event-timer";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/challenges");

  const challengesHref = "/login?next=/challenges";

  return (
    <>
      <AuthNotice />
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-20 pb-8">
          <section className="min-h-[72vh] flex flex-col justify-center items-center text-center pt-4 pb-8 relative">
            <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6 group cursor-pointer">
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-2xl group-hover:bg-cyan-400/40 transition-all duration-500" />
              <Logo className="w-full h-full relative z-10 transition-transform duration-500 group-hover:scale-105" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs mb-6 shadow-neon-cyan">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <i className="fa-solid fa-code text-cyan-400" />
              <span className="uppercase tracking-widest">TekQbe Hackathon Arena Active</span>
            </div>

            <div className="max-w-4xl space-y-4">
              <div className="font-typewriter text-3xl md:text-5xl text-white tracking-widest font-bold mb-2 drop-shadow-md">
                TekQbe
              </div>
              <h1 className="font-orbitron text-4xl sm:text-6xl md:text-7xl font-black tracking-tight title-gradient leading-tight">
                HACK THE PATTERN
              </h1>
              <p className="font-rajdhani text-lg sm:text-xl text-cyan-100/80 max-w-2xl mx-auto font-medium tracking-wide">
                Write algorithms, compile pattern matrices, execute test cases, and claim your place on the live hacker
                leaderboard.
              </p>
            </div>

            <div className="mt-8">
              <EventTimer />
            </div>

            <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
              <Link
                href="/register"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-black font-orbitron font-extrabold text-sm tracking-wider uppercase shadow-neon-cyan hover:shadow-neon-blue transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-3"
              >
                <i className="fa-solid fa-rocket" />
                <span>Get Started</span>
              </Link>
              <Link
                href={challengesHref}
                className="px-8 py-3.5 rounded-xl glass-panel border border-cyan-500/50 text-cyan-300 font-orbitron font-bold text-sm tracking-wider uppercase hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 flex items-center gap-2"
              >
                <i className="fa-solid fa-terminal text-brand-neon-cyan" />
                <span>View Challenges</span>
              </Link>
            </div>

            <Link
              href="/rules"
              className="mt-6 inline-flex items-center gap-2 font-rajdhani text-sm font-semibold text-cyan-400 hover:text-cyan-200 uppercase tracking-widest transition-colors"
            >
              <i className="fa-solid fa-scroll" aria-hidden="true" />
              Read the Rules
            </Link>
          </section>
        </div>
      </main>

      {/* {!user && <Footer />} */}
    </>
  );
}

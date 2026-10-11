export const metadata = { title: "Rules - TekQbe Hack the Pattern" };

const SECTIONS = [
  {
    icon: "fa-solid fa-scroll",
    title: "Arena Conduct",
    rules: [
      "Respect fellow users. Harassment, spam or abuse of any kind leads to an immediate ban.",
      "The administrator team's decision is final in all dispute scenarios.",
    ],
  },
  {
    icon: "fa-solid fa-terminal",
    title: "Solving & Submissions",
    rules: [
      "Every pattern challenge must be solved in the built-in editor using Java or C, subject to server runtime availability.",
      "Run & Verify executes your program against the target matrix — the output must match line-for-line, including spacing.",
      "Code runs on the server with a 5-second time limit; infinite loops and runaway output are killed automatically.",
      "Leaving the challenge tab is monitored — repeated violations trigger warnings and then an automatic ban.",
    ],
  },
  {
    icon: "fa-solid fa-ranking-star",
    title: "Teams & Scoring",
    rules: [
      "The leaderboard ranks teams only. Create a team from your profile and add players by handle — only the team leader manages the roster.",
      "Each challenge awards its points once per team: a pattern solved by any member counts as solved for the whole team, with no duplicate scores.",
      "Team ranks are ordered by total points, then by number of solves; ties are broken alphabetically, and scores update in real time.",
    ],
  },
  {
    icon: "fa-solid fa-user-shield",
    title: "Fair Play",
    rules: [
      "Do not attempt to read platform files, the database or other users' solutions from inside the judge environment.",
      "Do not attack, probe or overload the platform infrastructure (DDoS, brute force, injection).",
      "Sharing solutions during a live event undermines the arena — solve your own patterns.",
      "Automated solvers that call the submission API directly are prohibited.",
    ],
  },
];

export default function RulesPage() {
  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="space-y-8 pb-8 max-w-4xl mx-auto">
        <div className="border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
            <i className="fa-solid fa-scale-balanced" /> Arena Protocol
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
            RULES OF <span className="text-brand-neon-cyan">ENGAGEMENT</span>
          </h1>
          <p className="font-sans text-sm text-gray-400 mt-2 max-w-3xl">
            Read every section before entering the arena. By registering on TekQbe Hack the Pattern you agree to all rules
            listed below.
          </p>
        </div>

        <div className="glass-panel rounded-2xl border border-cyan-500/20 p-6 sm:p-8 space-y-8">
          {SECTIONS.map((section, index) => (
            <section key={section.title} className={index > 0 ? "border-t border-cyan-500/10 pt-8" : ""}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <i className={`${section.icon} text-brand-neon-cyan text-sm`} aria-hidden="true" />
                </div>
                <h2 className="font-orbitron font-bold text-base sm:text-lg text-white uppercase tracking-wide">
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-2.5">
                {section.rules.map((rule) => (
                  <li key={rule} className="flex gap-3 items-start text-sm text-gray-200 leading-relaxed">
                    <i className="fa-solid fa-chevron-right text-cyan-400 text-[10px] mt-1.5 shrink-0" aria-hidden="true" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function TeamStats({ score, completed }: { score: number; completed: number }) {
  return (
    <div className="grid grid-cols-2 w-full mt-auto pt-4 border-t border-white/10">
      <div className="text-center pe-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Score</div>
        <div className="font-orbitron font-extrabold text-lg text-cyan-300">{score.toLocaleString()}</div>
      </div>
      <div className="text-center ps-3 border-s border-white/10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Completed</div>
        <div className="font-orbitron font-extrabold text-lg text-white">{completed}</div>
      </div>
    </div>
  );
}

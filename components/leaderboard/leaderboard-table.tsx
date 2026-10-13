import type { LeaderboardRow } from "@/lib/types";
import TableControls from "./table-controls";
import LeaderboardRowComponent from "./leaderboard-row";
import BadgeIcon from "./badge-icon";

export type SortKey = "rank" | "score" | "activity" | "completed";
export type SortDir = "asc" | "desc";

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  loaded: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  adminMode?: boolean;
}

function SortTh({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === column;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={`py-3 px-2 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-bold ${
          active ? "text-cyan-300" : "text-cyan-500/80 hover:text-cyan-300"
        }`}
      >
        {label}
        <i
          aria-hidden="true"
          className={`fa-solid text-[9px] ${
            active
              ? sortDir === "asc"
                ? "fa-sort-up text-cyan-300"
                : "fa-sort-down text-cyan-300"
              : "fa-sort text-slate-500"
          }`}
        />
      </button>
    </th>
  );
}

export default function LeaderboardTable({
  rows,
  loaded,
  search,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  sortKey,
  sortDir,
  onSort,
  adminMode = false,
}: LeaderboardTableProps) {
  return (
    <section
      aria-label="Leaderboard table"
      className="rounded-2xl border border-white/10 bg-[#071320]/85 overflow-hidden shadow-xl shadow-black/40"
    >
      <TableControls
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        search={search}
        onSearchChange={onSearchChange}
        adminMode={adminMode}
      />

      <div className="2xl:hidden space-y-3 p-3 sm:p-4">
        {!loaded ? (
          <div className="py-10 text-center font-mono text-sm text-slate-500">
            <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true" />
            Syncing live standings...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center font-mono text-sm text-slate-500">
            {search ? <>No teams match &quot;{search}&quot;.</> : <>No teams on the board yet.</>}
          </div>
        ) : rows.map((row) => (
          <article
            key={row.teamSlug}
            className={`min-w-0 rounded-xl border p-4 ${row.isSelf ? "border-cyan-400/30 bg-cyan-500/[0.07]" : "border-white/10 bg-[#0d1b2d]/70"}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 font-orbitron text-sm font-bold text-cyan-300">#{row.rank}</span>
                <span className="truncate font-rajdhani text-base font-bold text-white">{row.teamName}</span>
                {row.isSelf && <span className="shrink-0 font-mono text-[10px] text-yellow-300">Your Team</span>}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-lg font-semibold text-cyan-300">{row.score.toLocaleString()}</div>
                <div className="font-mono text-[10px] uppercase text-slate-500">Score</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3 text-xs sm:grid-cols-3">
              <div className="min-w-0">
                <div className="font-mono uppercase text-slate-500">Completed</div>
                <div className="mt-1 font-mono text-slate-200">{row.solves}</div>
              </div>
              <div className="min-w-0">
                <div className="font-mono uppercase text-slate-500">Last activity</div>
                <div className="mt-1 break-words font-mono text-slate-300">{row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</div>
              </div>
              <div className="min-w-0">
                <div className="font-mono uppercase text-slate-500">Status</div>
                <div className={`mt-1 inline-flex rounded border px-2 py-0.5 font-mono text-[11px] ${row.status === "Online" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-500/30 bg-slate-500/10 text-slate-400"}`}>{row.status}</div>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <div className="font-mono uppercase text-slate-500">Solved IDs</div>
                {row.solvedIds.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.solvedIds.map((code) => <span key={code} className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">{code}</span>)}
                  </div>
                ) : <div className="mt-1 font-mono text-slate-600">—</div>}
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div>
                  <div className="font-mono uppercase text-slate-500">Warnings</div>
                  <div className="mt-1 font-mono text-slate-200">{row.warnings || "—"}</div>
                </div>
                <div className="shrink-0"><BadgeIcon solves={row.solves} /></div>
              </div>
            </div>
            <details className="mt-3 border-t border-white/10 pt-2">
              <summary className="cursor-pointer select-none font-mono text-xs text-cyan-300">Team members ({row.members.length})</summary>
              <ul className="mt-2 flex flex-wrap gap-2">
                {row.members.length ? row.members.map((member) => <li key={member} className="max-w-full truncate rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-xs text-slate-200">{member}</li>) : <li className="font-mono text-xs text-slate-500">No members found.</li>}
              </ul>
            </details>
          </article>
        ))}
      </div>

      <div className="hidden 2xl:block">
        <table className="w-full table-fixed text-left text-xs border-collapse">
          <thead className="bg-[#0d1b2d] border-b border-white/10 text-cyan-400">
            <tr>
              <SortTh label="Rank" column="rank" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th scope="col" className="py-3 px-2 uppercase tracking-wider text-[11px] font-bold">
                Team Name
              </th>
              <SortTh label="Score" column="score" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Last Activity" column="activity" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th
                scope="col"
                className="py-3 px-2 uppercase tracking-wider text-[11px] font-bold"
              >
                Solved IDs
              </th>
              <SortTh
                label="Total Completed"
                column="completed"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                align="right"
              />
              <th
                scope="col"
                className="py-3 px-2 text-center uppercase tracking-wider text-[11px] font-bold"
              >
                Warnings
              </th>
              <th
                scope="col"
                className="py-3 px-2 text-center uppercase tracking-wider text-[11px] font-bold"
              >
                Badge
              </th>
              <th
                scope="col"
                className="py-3 px-2 text-center uppercase tracking-wider text-[11px] font-bold"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] font-rajdhani text-sm">
            {!loaded && (
              <tr>
                <td colSpan={9} className="py-10 text-center font-mono text-sm text-slate-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true" />
                  Syncing live standings...
                </td>
              </tr>
            )}
            {loaded && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center font-mono text-sm text-slate-500">
                  {search ? (
                    <>
                      No teams match &quot;{search}&quot;.
                    </>
                  ) : (
                    <>No teams on the board yet.</>
                  )}
                </td>
              </tr>
            )}
            {loaded && rows.map((row) => <LeaderboardRowComponent key={row.teamSlug} row={row} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

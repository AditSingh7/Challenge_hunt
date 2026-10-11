import type { LeaderboardRow } from "@/lib/types";
import TableControls from "./table-controls";
import LeaderboardRowComponent from "./leaderboard-row";

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
      className={`py-3 px-4 sm:px-5 ${align === "right" ? "text-right" : "text-left"}`}
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
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[1080px] border-collapse">
          <thead className="bg-[#0d1b2d] border-b border-white/10 text-cyan-400">
            <tr>
              <SortTh label="Rank" column="rank" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th scope="col" className="py-3 px-4 sm:px-5 uppercase tracking-wider text-[11px] font-bold">
                Team Name
              </th>
              <SortTh label="Score" column="score" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Last Activity" column="activity" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th
                scope="col"
                className="py-3 px-4 sm:px-5 uppercase tracking-wider text-[11px] font-bold min-w-[10rem]"
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
                className="py-3 px-4 sm:px-5 text-center uppercase tracking-wider text-[11px] font-bold"
              >
                Warnings
              </th>
              <th
                scope="col"
                className="py-3 px-4 sm:px-5 text-center uppercase tracking-wider text-[11px] font-bold"
              >
                Badge
              </th>
              <th
                scope="col"
                className="py-3 px-4 sm:px-5 text-center uppercase tracking-wider text-[11px] font-bold"
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

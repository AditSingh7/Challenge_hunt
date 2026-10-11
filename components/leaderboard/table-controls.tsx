interface TableControlsProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

const PAGE_SIZES = [10, 25, 50];

export default function TableControls({ pageSize, onPageSizeChange, search, onSearchChange }: TableControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-b border-white/10">
      <label className="flex items-center gap-2 font-rajdhani text-sm text-slate-300">
        <span className="whitespace-nowrap">Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Entries per page"
          className="bg-[#0d1b2d] border border-cyan-500/30 rounded-md px-2 py-1 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap">entries</span>
      </label>

      <div className="relative">
        <i
          className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/60 text-xs"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search teams..."
          aria-label="Search teams"
          className="w-full sm:w-64 bg-[#0d1b2d] border border-cyan-500/25 rounded-lg pl-9 pr-4 py-2 text-sm font-rajdhani text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
      </div>
    </div>
  );
}

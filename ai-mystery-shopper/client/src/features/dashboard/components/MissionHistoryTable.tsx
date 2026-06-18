import { FileText, Image, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { cn } from "../../../lib/cn";
import { MissionHistoryItem } from "../../../types/dashboard";

type Props = {
  rows: MissionHistoryItem[];
  onOpenReport: (missionId: string) => void;
  onViewEvidence: (missionId: string) => void;
  onDeleteFaulty?: (missionId: string) => void;
};

const statusStyles: Record<MissionHistoryItem["status"], string> = {
  Smooth: "border-green-500/25 bg-green-500/10 text-green-300",
  Warning: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  Critical: "border-red-500/25 bg-red-500/10 text-red-300",
};

export function MissionHistoryTable({ rows, onOpenReport, onViewEvidence, onDeleteFaulty }: Props) {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.targetUrl, row.goal, row.persona, row.device, row.status, row.timestamp].some((value) => value.toLowerCase().includes(q))
    );
  }, [query, rows]);

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Mission History</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {filteredRows.length} of {rows.length} runs
          </p>
        </div>
        <label className="relative w-full md:w-80">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search runs"
            className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-purple-500/50"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1080px] table-fixed text-left">
          <thead className="bg-zinc-950 text-xs text-zinc-500">
            <tr>
              <th className="w-[24%] px-4 py-2.5 font-medium">Target URL</th>
              <th className="w-[24%] px-4 py-2.5 font-medium">Goal</th>
              <th className="w-[12%] px-4 py-2.5 font-medium">Persona</th>
              <th className="w-[10%] px-4 py-2.5 font-medium">Device</th>
              <th className="w-[9%] px-4 py-2.5 text-right font-medium">Friction</th>
              <th className="w-[10%] px-4 py-2.5 font-medium">Status</th>
              <th className="w-[14%] px-4 py-2.5 font-medium">Timestamp</th>
              <th className="w-[11%] px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {filteredRows.map((row) => (
              <tr key={row.id} className="text-sm text-zinc-400 transition hover:bg-zinc-900/45">
                <td className="truncate px-4 py-2.5 text-zinc-500" title={row.targetUrl}>
                  {row.targetUrl}
                </td>
                <td className="truncate px-4 py-2.5 font-medium text-zinc-100" title={row.goal}>
                  {row.goal || "-"}
                </td>
                <td className="truncate px-4 py-2.5" title={row.persona}>
                  {row.persona}
                </td>
                <td className="truncate px-4 py-2.5" title={row.device}>
                  {row.device}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-zinc-200">{row.frictionScore}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", statusStyles[row.status])}>{row.status}</span>
                </td>
                <td className="truncate px-4 py-2.5 text-zinc-500" title={row.timestamp}>
                  {row.timestamp}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      title="Evidence"
                      onClick={() => onViewEvidence(row.id)}
                      className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
                    >
                      <Image size={14} />
                    </button>
                    <button
                      title="Report"
                      onClick={() => onOpenReport(row.id)}
                      className="rounded-md border border-purple-500/25 bg-purple-500/10 p-1.5 text-purple-300 transition hover:bg-purple-500/15"
                    >
                      <FileText size={14} />
                    </button>
                    {onDeleteFaulty ? (
                      <button
                        title="Delete"
                        onClick={() => onDeleteFaulty(row.id)}
                        className="rounded-md border border-red-500/25 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/15"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 ? <p className="border-t border-zinc-900 px-4 py-8 text-center text-sm text-zinc-500">No runs match your search.</p> : null}
      </div>
    </SurfaceCard>
  );
}

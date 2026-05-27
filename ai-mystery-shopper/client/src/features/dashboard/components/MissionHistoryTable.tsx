import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { cn } from "../../../lib/cn";
import { MissionHistoryItem } from "../../../types/dashboard";

type Props = {
  rows: MissionHistoryItem[];
};

const statusStyles: Record<MissionHistoryItem["status"], string> = {
  Smooth: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Warning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  Critical: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

export function MissionHistoryTable({ rows }: Props) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-zinc-800/80 px-5 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Mission History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-zinc-950/80 text-xs uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Target URL</th>
              <th className="px-5 py-3 font-medium">Goal</th>
              <th className="px-5 py-3 font-medium">Persona</th>
              <th className="px-5 py-3 font-medium">Device</th>
              <th className="px-5 py-3 font-medium">Friction Score</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-900 text-sm text-zinc-300 transition hover:bg-zinc-900/60">
                <td className="px-5 py-3 text-zinc-400">{row.targetUrl}</td>
                <td className="px-5 py-3 font-medium text-zinc-200">{row.goal}</td>
                <td className="px-5 py-3">{row.persona}</td>
                <td className="px-5 py-3">{row.device}</td>
                <td className="px-5 py-3">{row.frictionScore}</td>
                <td className="px-5 py-3">
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", statusStyles[row.status])}>{row.status}</span>
                </td>
                <td className="px-5 py-3 text-zinc-500">{row.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

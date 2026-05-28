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
  Smooth: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Warning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  Critical: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

export function MissionHistoryTable({ rows, onOpenReport, onViewEvidence, onDeleteFaulty }: Props) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mission History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Target URL</th>
              <th className="px-5 py-3 font-medium">Goal</th>
              <th className="px-5 py-3 font-medium">Persona</th>
              <th className="px-5 py-3 font-medium">Device</th>
              <th className="px-5 py-3 font-medium">Friction Score</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Timestamp</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 text-sm text-slate-700 transition hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-500">{row.targetUrl}</td>
                <td className="px-5 py-3 font-medium text-slate-900">{row.goal}</td>
                <td className="px-5 py-3">{row.persona}</td>
                <td className="px-5 py-3">{row.device}</td>
                <td className="px-5 py-3">{row.frictionScore}</td>
                <td className="px-5 py-3">
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", statusStyles[row.status])}>{row.status}</span>
                </td>
                <td className="px-5 py-3 text-slate-400">{row.timestamp}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onViewEvidence(row.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700">
                      Evidence
                    </button>
                    <button onClick={() => onOpenReport(row.id)} className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                      Report
                    </button>
                    {onDeleteFaulty ? (
                      <button
                        onClick={() => onDeleteFaulty(row.id)}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

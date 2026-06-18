import { Cpu, Globe, UserCircle2 } from "lucide-react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { LiveMission } from "../../../types/dashboard";

type Props = {
  mission: LiveMission | null;
};

const statusStyles = {
  running: "border-green-500/25 bg-green-500/10 text-green-300",
  paused: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  completed: "border-purple-500/25 bg-purple-500/10 text-purple-300",
};

export function LiveMissionPanel({ mission }: Props) {
  if (!mission) {
    return (
      <SurfaceCard>
        <p className="text-lg font-semibold text-zinc-100">Live Mission</p>
        <p className="mt-2 text-sm text-zinc-500">No active or recent missions yet.</p>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard>
      <div>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-zinc-100">Live Mission</p>
              <h3 className="mt-2 truncate text-base font-medium text-zinc-300">{mission.goal}</h3>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[mission.status]}`}>{mission.status}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm text-zinc-500 md:grid-cols-2">
            <p className="inline-flex min-w-0 items-center gap-2">
              <Cpu size={14} className="shrink-0 text-zinc-600" /> <span className="truncate">{mission.device}</span>
            </p>
            <p className="inline-flex min-w-0 items-center gap-2">
              <UserCircle2 size={14} className="shrink-0 text-zinc-600" /> <span className="truncate">{mission.persona}</span>
            </p>
            <p className="inline-flex min-w-0 items-center gap-2 md:col-span-2">
              <Globe size={14} className="shrink-0 text-zinc-600" /> <span className="truncate">{mission.targetUrl}</span>
            </p>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Progress</span>
              <span>{mission.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-900">
              <div style={{ width: `${mission.progress}%` }} className="h-1.5 rounded-full bg-purple-500" />
            </div>
          </div>

          <div className="mt-6 border-l border-zinc-800">
            {mission.stream.map((item, index) => (
              <div key={item.id} className="relative pb-4 pl-4 last:pb-0">
                <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-zinc-950 bg-zinc-600" />
                <p className="text-sm leading-relaxed text-zinc-300">{item.reasoning}</p>
                <p className="mt-1 text-xs text-zinc-600">{item.timestamp}</p>
              </div>
            ))}
          </div>
      </div>
    </SurfaceCard>
  );
}

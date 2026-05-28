import { SurfaceCard } from "../../../components/ui/SurfaceCard";

type Props = {
  videoUrl: string | null;
  persona: string;
  device: string;
  startedAt?: string;
};

export function ReplayVideoPanel({ videoUrl, persona, device, startedAt }: Props) {
  return (
    <SurfaceCard className="border-slate-700 bg-slate-950 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Session Replay</p>
        <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">{persona}</span>
        <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">{device}</span>
        {startedAt ? <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">{startedAt}</span> : null}
      </div>

      {videoUrl ? (
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <video controls className="aspect-video max-h-[220px] w-full object-contain" src={videoUrl} />
        </div>
      ) : (
        <p className="text-xs text-slate-400">No replay video captured for this mission.</p>
      )}
    </SurfaceCard>
  );
}

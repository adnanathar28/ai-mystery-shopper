type Props = {
  goal: string;
  targetUrl: string;
  status: string;
  confusionScore: number;
};

export function MissionStickyHeader({ goal, targetUrl, status, confusionScore }: Props) {
  return (
    <div className="sticky top-[72px] z-20 rounded-xl border border-slate-700 bg-slate-950/95 px-4 py-3 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Mission Replay</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-base font-semibold text-slate-100">{goal}</h1>
        <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300">{status}</span>
        <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-indigo-300">
          Friction {confusionScore}/100
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-slate-400">{targetUrl}</p>
    </div>
  );
}

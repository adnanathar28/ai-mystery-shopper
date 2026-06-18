import { SkeletonBlock } from "../../../components/ui/SkeletonBlock";

export function DashboardLoading() {
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        <SkeletonBlock className="h-[360px] w-full rounded-lg border border-zinc-800" />
        <SkeletonBlock className="h-[180px] w-full rounded-lg border border-zinc-800" />
      </div>
      <SkeletonBlock className="h-[260px] w-full rounded-lg border border-zinc-800" />
    </div>
  );
}

import { SkeletonBlock } from "../../../components/ui/SkeletonBlock";

export function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
        <SkeletonBlock className="h-[510px] w-full rounded-2xl border border-zinc-800" />
        <SkeletonBlock className="h-[510px] w-full rounded-2xl border border-zinc-800" />
      </div>
      <SkeletonBlock className="h-[300px] w-full rounded-2xl border border-zinc-800" />
    </div>
  );
}

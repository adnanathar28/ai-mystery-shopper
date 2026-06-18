import { ExternalLink, FileSearch2 } from "lucide-react";
import { SeverityBadge } from "../../../components/ui/SeverityBadge";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { Issue } from "../../../types/dashboard";

type Props = {
  issues: Issue[];
  onViewEvidence: (missionId: string) => void;
  onOpenReport: (missionId: string) => void;
  onViewAll: () => void;
};

export function LatestIssuesPanel({ issues, onViewEvidence, onOpenReport, onViewAll }: Props) {
  return (
    <SurfaceCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Latest Issues</h3>
        <button onClick={onViewAll} className="text-xs text-zinc-500 transition hover:text-zinc-300">View all</button>
      </div>

      <div className="space-y-2">
        {issues.map((issue) => (
          <article key={issue.id} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">{issue.diagnosis}</p>
                <p className="mt-1 text-xs text-zinc-600">{issue.id}</p>
              </div>
              <SeverityBadge level={issue.severity} />
            </div>
            {issue.image ? (
              <div className="mb-3 overflow-hidden rounded-md border border-zinc-800">
                <img src={issue.image} alt={issue.diagnosis} className="h-16 w-full object-cover opacity-80" />
              </div>
            ) : null}
            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-zinc-400">{issue.summary}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onViewEvidence(issue.missionId)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition hover:text-zinc-100"
              >
                <FileSearch2 size={13} /> Evidence
              </button>
              <button
                onClick={() => onOpenReport(issue.missionId)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-xs text-purple-300 transition hover:bg-purple-500/15"
              >
                <ExternalLink size={13} /> Report
              </button>
            </div>
          </article>
        ))}
      </div>
    </SurfaceCard>
  );
}

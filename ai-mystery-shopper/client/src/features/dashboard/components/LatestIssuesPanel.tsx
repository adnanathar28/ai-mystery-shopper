import { motion } from "framer-motion";
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
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Latest Issues</h3>
        <button onClick={onViewAll} className="text-xs text-slate-500 transition hover:text-slate-700">View all</button>
      </div>

      <div className="space-y-3">
        {issues.map((issue, index) => (
          <motion.article
            key={issue.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{issue.diagnosis}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{issue.id}</p>
              </div>
              <SeverityBadge level={issue.severity} />
            </div>
            <div className="mb-3 overflow-hidden rounded-lg border border-slate-200">
              <img src={issue.image} alt={issue.diagnosis} className="h-16 w-full object-cover opacity-85" />
            </div>
            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{issue.summary}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onViewEvidence(issue.missionId)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 transition hover:border-slate-400"
              >
                <FileSearch2 size={13} /> View Evidence
              </button>
              <button
                onClick={() => onOpenReport(issue.missionId)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 transition hover:bg-indigo-100"
              >
                <ExternalLink size={13} /> Open Report
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </SurfaceCard>
  );
}

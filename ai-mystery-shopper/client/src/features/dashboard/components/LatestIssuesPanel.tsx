import { motion } from "framer-motion";
import { ExternalLink, FileSearch2 } from "lucide-react";
import { SeverityBadge } from "../../../components/ui/SeverityBadge";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { Issue } from "../../../types/dashboard";

type Props = {
  issues: Issue[];
};

export function LatestIssuesPanel({ issues }: Props) {
  return (
    <SurfaceCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Latest Issues</h3>
        <button className="text-xs text-zinc-500 transition hover:text-zinc-300">View all</button>
      </div>

      <div className="space-y-3">
        {issues.map((issue, index) => (
          <motion.article
            key={issue.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-200">{issue.diagnosis}</p>
                <p className="text-xs text-zinc-500">{issue.id}</p>
              </div>
              <SeverityBadge level={issue.severity} />
            </div>
            <div className="mb-3 overflow-hidden rounded-lg border border-zinc-800">
              <img src={issue.image} alt={issue.diagnosis} className="h-24 w-full object-cover" />
            </div>
            <p className="mb-3 text-sm text-zinc-400">{issue.summary}</p>
            <div className="flex gap-2">
              <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-600">
                <FileSearch2 size={13} /> View Evidence
              </button>
              <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 transition hover:bg-indigo-500/20">
                <ExternalLink size={13} /> Open Report
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </SurfaceCard>
  );
}

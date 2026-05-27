import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AnalyticsCards } from "../components/AnalyticsCards";
import { DashboardLoading } from "../components/DashboardLoading";
import { EmptyState } from "../components/EmptyState";
import { LatestIssuesPanel } from "../components/LatestIssuesPanel";
import { LiveMissionPanel } from "../components/LiveMissionPanel";
import { MissionHistoryTable } from "../components/MissionHistoryTable";
import { latestIssues, liveMission, metricCards, missionHistory } from "../../../data/dashboardData";

export function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 850);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <DashboardLoading />;

  const hasIssues = latestIssues.length > 0;
  const hasHistory = missionHistory.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-5">
      <AnalyticsCards cards={metricCards} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
        <LiveMissionPanel mission={liveMission} />
        {hasIssues ? (
          <LatestIssuesPanel issues={latestIssues} />
        ) : (
          <EmptyState
            title="No issues detected"
            message="Your latest runs are clean. New mission insights will appear here once friction is detected."
          />
        )}
      </section>

      {hasHistory ? (
        <MissionHistoryTable rows={missionHistory} />
      ) : (
        <EmptyState title="No mission history yet" message="Run your first mission to populate the execution history table." />
      )}
    </motion.div>
  );
}

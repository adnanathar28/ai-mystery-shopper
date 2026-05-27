import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AnalyticsCards } from "../components/AnalyticsCards";
import { DashboardLoading } from "../components/DashboardLoading";
import { EmptyState } from "../components/EmptyState";
import { LatestIssuesPanel } from "../components/LatestIssuesPanel";
import { LiveMissionPanel } from "../components/LiveMissionPanel";
import { MissionHistoryTable } from "../components/MissionHistoryTable";
import { loadDashboardBundle, type DashboardBundle } from "../lib/dashboardMapper";

type Props = {
  refreshToken: number;
  runningMission: boolean;
};

export function DashboardPage({ refreshToken, runningMission }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const navigate = useNavigate();

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadDashboardBundle();
      setBundle(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load dashboard data from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate, refreshToken]);

  useEffect(() => {
    if (!runningMission) return;
    const interval = window.setInterval(() => {
      hydrate();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [runningMission, hydrate]);

  if (loading || !bundle) return <DashboardLoading />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-5">
      {error ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">{error}</p> : null}
      <AnalyticsCards cards={bundle.metricCards} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
        <LiveMissionPanel mission={bundle.liveMission} />
        {bundle.issues.length ? (
          <LatestIssuesPanel
            issues={bundle.issues}
            onViewAll={() => navigate("/issues")}
            onViewEvidence={(id) => navigate(`/evidence?missionId=${id}`)}
            onOpenReport={(id) => navigate(`/runs/${id}`)}
          />
        ) : (
          <EmptyState
            title="No issues detected"
            message="Your latest runs are clean. New mission insights will appear here once friction is detected."
          />
        )}
      </section>

      {bundle.historyRows.length ? (
        <MissionHistoryTable
          rows={bundle.historyRows}
          onOpenReport={(id) => navigate(`/runs/${id}`)}
          onViewEvidence={(id) => navigate(`/evidence?missionId=${id}`)}
        />
      ) : (
        <EmptyState title="No mission history yet" message="Run your first mission to populate the execution history table." />
      )}
    </motion.div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AnalyticsCards } from "../components/AnalyticsCards";
import { DashboardLoading } from "../components/DashboardLoading";
import { LiveMissionPanel } from "../components/LiveMissionPanel";
import { SlackPreviewPanel } from "../components/SlackPreviewPanel";
import { loadDashboardBundle, type DashboardBundle } from "../lib/dashboardMapper";

type Props = {
  refreshToken: number;
  runningMission: boolean;
};

export function DashboardPage({ refreshToken, runningMission }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);

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
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}
      <AnalyticsCards cards={bundle.metricCards} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
        <LiveMissionPanel mission={bundle.liveMission} />
        <SlackPreviewPanel
          missionTitle={bundle.liveMission.goal}
          diagnosis={bundle.issues[0]?.diagnosis || "Healthy"}
          frictionScore={bundle.historyRows[0]?.frictionScore || 0}
        />
      </section>
    </motion.div>
  );
}

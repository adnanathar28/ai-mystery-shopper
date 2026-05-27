import { useState } from "react";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { AppShell } from "./layout/AppShell";
import { MissionLaunchModal } from "./layout/MissionLaunchModal";
import { runMission } from "../services/api";
import { ShopRequest, ShopResponseApi } from "../types/api";

export function App() {
  const [launchOpen, setLaunchOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [runningMission, setRunningMission] = useState(false);
  const [latestRunReport, setLatestRunReport] = useState<ShopResponseApi["report"] | null>(null);

  const handleRunMission = async (payload: ShopRequest) => {
    setRunningMission(true);
    try {
      const response = await runMission(payload);
      setLatestRunReport(response.report);
      setRefreshToken((v) => v + 1);
    } finally {
      setRunningMission(false);
    }
  };

  return (
    <AppShell onRunMission={() => setLaunchOpen(true)} runningMission={runningMission}>
      <DashboardPage refreshToken={refreshToken} latestRunReport={latestRunReport} runningMission={runningMission} />
      <MissionLaunchModal open={launchOpen} onClose={() => setLaunchOpen(false)} onSubmit={handleRunMission} />
    </AppShell>
  );
}

import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { EvidencePage } from "../features/evidence/pages/EvidencePage";
import { IssuesPage } from "../features/issues/pages/IssuesPage";
import { RunReportPage } from "../features/runs/pages/RunReportPage";
import { RunsPage } from "../features/runs/pages/RunsPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { fetchHumanGateStatus, resumeHumanGate, runMission } from "../services/api";
import { HumanGateStatusApi, ShopRequest } from "../types/api";
import { AppShell } from "./layout/AppShell";
import { MissionLaunchModal } from "./layout/MissionLaunchModal";

function ShellRoutes() {
  const [launchOpen, setLaunchOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [runningMission, setRunningMission] = useState(false);
  const [humanGate, setHumanGate] = useState<HumanGateStatusApi | null>(null);
  const [resumingHumanGate, setResumingHumanGate] = useState(false);

  const refreshHumanGate = useCallback(async () => {
    try {
      const status = await fetchHumanGateStatus();
      setHumanGate(status);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleRunMission = async (payload: ShopRequest) => {
    setRunningMission(true);
    try {
      await runMission(payload);
      setRefreshToken((v) => v + 1);
    } finally {
      setRunningMission(false);
    }
  };

  const handleResumeHumanGate = async () => {
    setResumingHumanGate(true);
    try {
      await resumeHumanGate();
      await refreshHumanGate();
    } catch (err) {
      console.error(err);
    } finally {
      setResumingHumanGate(false);
    }
  };

  useEffect(() => {
    if (!runningMission && !humanGate?.active) return;

    refreshHumanGate();
    const interval = window.setInterval(refreshHumanGate, 2500);
    return () => window.clearInterval(interval);
  }, [humanGate?.active, refreshHumanGate, runningMission]);

  return (
    <AppShell
      onRunMission={() => setLaunchOpen(true)}
      runningMission={runningMission}
      humanGate={humanGate}
      resumingHumanGate={resumingHumanGate}
      onResumeHumanGate={handleResumeHumanGate}
    >
      <Routes>
        <Route path="/" element={<DashboardPage refreshToken={refreshToken} runningMission={runningMission} />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:missionId" element={<RunReportPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <MissionLaunchModal open={launchOpen} onClose={() => setLaunchOpen(false)} onSubmit={handleRunMission} />
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ShellRoutes />
    </BrowserRouter>
  );
}

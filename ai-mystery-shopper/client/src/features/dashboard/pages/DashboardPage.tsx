import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AnalyticsCards } from "../components/AnalyticsCards";
import { DashboardLoading } from "../components/DashboardLoading";
import { EmptyState } from "../components/EmptyState";
import { LatestIssuesPanel } from "../components/LatestIssuesPanel";
import { LiveMissionPanel } from "../components/LiveMissionPanel";
import { MissionHistoryTable } from "../components/MissionHistoryTable";
import { latestIssues as fallbackIssues, liveMission as fallbackLiveMission, metricCards as fallbackMetricCards } from "../../../data/dashboardData";
import { fetchMissionById, fetchMissions } from "../../../services/api";
import { API_BASE_URL } from "../../../config/env";
import { MetricCard, MissionHistoryItem } from "../../../types/dashboard";
import { MissionListItemApi } from "../../../types/api";

type Props = {
  refreshToken: number;
  runningMission: boolean;
  latestRunReport: {
    goal: string;
    persona: string;
    device: string;
    confusionScore: number;
    topDiagnosis: string;
    videoUrl: string | null;
    screenshotTimeline?: Array<{ imageUrl: string; message: string; step: number }>;
    log?: Array<{ type: string; details?: { thought?: string; diagnosis?: string } }>;
  } | null;
};

function toStatus(score: number | null): MissionHistoryItem["status"] {
  if ((score || 0) >= 50) return "Critical";
  if ((score || 0) >= 30) return "Warning";
  return "Smooth";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function DashboardPage({ refreshToken, latestRunReport, runningMission }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missions, setMissions] = useState<MissionListItemApi[]>([]);
  const [issues, setIssues] = useState(fallbackIssues);
  const [liveMissionData, setLiveMissionData] = useState(fallbackLiveMission);

  const historyRows: MissionHistoryItem[] = useMemo(
    () =>
      missions.map((m) => ({
        id: m.id,
        targetUrl: m.targetUrl,
        goal: m.goal || "Autonomous mission",
        persona: m.persona,
        device: m.device,
        frictionScore: m.confusionScore || 0,
        status: toStatus(m.confusionScore),
        timestamp: formatDate(m.createdAt),
      })),
    [missions]
  );

  const metricCards: MetricCard[] = useMemo(() => {
    if (!missions.length) return fallbackMetricCards;
    const runsToday = missions.filter((m) => {
      const d = new Date(m.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    const critical = missions.filter((m) => (m.confusionScore || 0) >= 50).length;
    const issueCount = missions.filter((m) => (m.topDiagnosis || "Healthy") !== "Healthy").length;
    const avg =
      missions.length > 0
        ? missions.reduce((acc, m) => acc + (m.confusionScore || 0), 0) / missions.length
        : 0;
    return [
      { title: "Runs Today", value: String(runsToday), trend: { value: "Live", direction: "flat" }, hint: "24h mission volume", icon: "runs" },
      { title: "Issues Detected", value: String(issueCount), trend: { value: "Live", direction: "flat" }, hint: "Non-healthy diagnoses", icon: "issues" },
      { title: "Avg Friction Score", value: avg.toFixed(1), trend: { value: "Live", direction: "flat" }, hint: "Lower is healthier", icon: "friction" },
      { title: "Critical Failures", value: String(critical), trend: { value: "Live", direction: "flat" }, hint: "Score >= 50", icon: "critical" },
    ];
  }, [missions]);

  const hydrate = useCallback(async () => {
    let cancelled = false;
    async function runHydration() {
      setLoading(true);
      setError("");
      try {
        const list = await fetchMissions(1, 20);
        if (cancelled) return;
        setMissions(list.missions || []);

        if (list.missions.length > 0) {
          const top = list.missions.slice(0, 3);
          const details = await Promise.all(top.map((m) => fetchMissionById(m.id).catch(() => null)));
          if (cancelled) return;

          const nextIssues = details
            .filter((d): d is NonNullable<typeof d> => !!d)
            .map((d, idx) => ({
              id: d.mission.id,
              severity: ((d.mission.confusionScore || 0) >= 50 ? "P0" : (d.mission.confusionScore || 0) >= 30 ? "P1" : "P2") as "P0" | "P1" | "P2",
              diagnosis: d.mission.topDiagnosis || "Healthy",
              summary: d.mission.steps.find((s) => !!s.thought)?.thought || "Mission completed with no extended RCA summary.",
              image:
                d.mission.screenshots[0]?.imageUrl
                  ? `${API_BASE_URL}${d.mission.screenshots[0].imageUrl}`
                  : fallbackIssues[idx % fallbackIssues.length].image,
            }));
          setIssues(nextIssues.length ? nextIssues : fallbackIssues);

          const latest = details[0]?.mission;
          if (latest) {
            setLiveMissionData({
              status: latest.status === "running" ? "running" : latest.status.includes("fail") ? "paused" : "completed",
              goal: latest.goal || "Autonomous mission",
              device: latest.device,
              targetUrl: latest.targetUrl,
              persona: latest.persona,
              progress: latest.status === "running" ? 70 : 100,
              previewLabel: "Latest mission evidence",
              previewImage: latest.screenshots[0]?.imageUrl ? `${API_BASE_URL}${latest.screenshots[0].imageUrl}` : fallbackLiveMission.previewImage,
              stream: latest.steps.slice(-4).map((s) => ({
                id: `${latest.id}-${s.stepIndex}`,
                reasoning: s.thought || `${s.action} (${s.diagnosis || "Healthy"})`,
                timestamp: `step ${s.stepIndex}`,
              })),
            });
          }
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load dashboard data from backend.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    await runHydration();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cleanup = await hydrate();
      if (!mounted) cleanup();
    })();
    return () => {
      mounted = false;
    };
  }, [refreshToken, hydrate]);

  useEffect(() => {
    if (!runningMission) return;
    const interval = window.setInterval(() => {
      hydrate();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [runningMission, hydrate]);

  useEffect(() => {
    if (!latestRunReport) return;
    setLiveMissionData((prev) => ({
      ...prev,
      status: runningMission ? "running" : "completed",
      goal: latestRunReport.goal || prev.goal,
      persona: latestRunReport.persona || prev.persona,
      device: latestRunReport.device || prev.device,
      progress: runningMission ? 65 : 100,
      previewImage:
        latestRunReport.screenshotTimeline?.[0]?.imageUrl
          ? `${API_BASE_URL}${latestRunReport.screenshotTimeline[0].imageUrl}`
          : prev.previewImage,
      stream:
        latestRunReport.log
          ?.filter((l) => l.type === "ai_thought")
          .slice(-4)
          .map((l, i) => ({
            id: `latest-${i}`,
            reasoning: l.details?.thought || "Agent observation",
            timestamp: "now",
          })) || prev.stream,
    }));
  }, [latestRunReport, runningMission]);

  if (loading) return <DashboardLoading />;
  const hasIssues = issues.length > 0;
  const hasHistory = historyRows.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-5">
      {error ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">{error}</p> : null}
      <AnalyticsCards cards={metricCards} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
        <LiveMissionPanel mission={liveMissionData} />
        {hasIssues ? (
          <LatestIssuesPanel issues={issues} />
        ) : (
          <EmptyState
            title="No issues detected"
            message="Your latest runs are clean. New mission insights will appear here once friction is detected."
          />
        )}
      </section>

      {hasHistory ? (
        <MissionHistoryTable rows={historyRows} />
      ) : (
        <EmptyState title="No mission history yet" message="Run your first mission to populate the execution history table." />
      )}
    </motion.div>
  );
}

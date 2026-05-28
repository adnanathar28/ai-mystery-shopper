import { API_BASE_URL } from "../../../config/env";
import { fetchMissionById, fetchMissions } from "../../../services/api";
import { Issue, LiveMission, MetricCard, MissionHistoryItem } from "../../../types/dashboard";
import { MissionDetailsApi, MissionListItemApi } from "../../../types/api";

export type DashboardBundle = {
  missions: MissionListItemApi[];
  missionDetails: MissionDetailsApi[];
  metricCards: MetricCard[];
  historyRows: MissionHistoryItem[];
  issues: Issue[];
  liveMission: LiveMission | null;
};

function toStatus(score: number | null): MissionHistoryItem["status"] {
  if ((score || 0) >= 50) return "Critical";
  if ((score || 0) >= 30) return "Warning";
  return "Smooth";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export async function loadDashboardBundle(): Promise<DashboardBundle> {
  const list = await fetchMissions(1, 20);
  const missions = list.missions || [];
  const top = missions.slice(0, 8);
  const details = await Promise.all(top.map((m) => fetchMissionById(m.id).then((r) => r.mission).catch(() => null)));
  const missionDetails = details.filter((d): d is MissionDetailsApi => !!d);

  const historyRows: MissionHistoryItem[] = missions.map((m) => ({
    id: m.id,
    targetUrl: m.targetUrl,
    goal: m.goal || "",
    persona: m.persona,
    device: m.device,
    frictionScore: m.confusionScore || 0,
    status: toStatus(m.confusionScore),
    timestamp: formatDate(m.createdAt),
  }));

  const runsToday = missions.filter((m) => new Date(m.createdAt).toDateString() === new Date().toDateString()).length;
  const critical = missions.filter((m) => (m.confusionScore || 0) >= 50).length;
  const issueCount = missions.filter((m) => !!m.topDiagnosis && m.topDiagnosis !== "Healthy").length;
  const avg = missions.length ? missions.reduce((acc, m) => acc + (m.confusionScore || 0), 0) / missions.length : 0;

  const metricCards: MetricCard[] = missions.length
    ? [
        { title: "Runs Today", value: String(runsToday), trend: { value: "Live", direction: "flat" }, hint: "24h mission volume", icon: "runs" },
        { title: "Issues Detected", value: String(issueCount), trend: { value: "Live", direction: "flat" }, hint: "Non-healthy diagnoses", icon: "issues" },
        { title: "Avg Friction Score", value: avg.toFixed(1), trend: { value: "Live", direction: "flat" }, hint: "Lower is healthier", icon: "friction" },
        { title: "Critical Failures", value: String(critical), trend: { value: "Live", direction: "flat" }, hint: "Score >= 50", icon: "critical" },
      ]
    : [
        { title: "Runs Today", value: "0", trend: { value: "Live", direction: "flat" }, hint: "24h mission volume", icon: "runs" },
        { title: "Issues Detected", value: "0", trend: { value: "Live", direction: "flat" }, hint: "Non-healthy diagnoses", icon: "issues" },
        { title: "Avg Friction Score", value: "0.0", trend: { value: "Live", direction: "flat" }, hint: "Lower is healthier", icon: "friction" },
        { title: "Critical Failures", value: "0", trend: { value: "Live", direction: "flat" }, hint: "Score >= 50", icon: "critical" },
      ];

  const issues: Issue[] = missionDetails.length
    ? missionDetails.slice(0, 6).map((m) => ({
        id: m.id,
        missionId: m.id,
        severity: ((m.confusionScore || 0) >= 50 ? "P0" : (m.confusionScore || 0) >= 30 ? "P1" : "P2") as "P0" | "P1" | "P2",
        diagnosis: m.topDiagnosis || "",
        summary: m.steps.find((s) => !!s.thought)?.thought || "",
        image: m.screenshots[0]?.imageUrl ? `${API_BASE_URL}${m.screenshots[0].imageUrl}` : "",
      }))
    : [];

  const latest = missionDetails[0];
  const liveMission: LiveMission | null = latest
    ? {
        status: latest.status === "running" ? "running" : latest.status.includes("fail") ? "paused" : "completed",
        goal: latest.goal || "",
        device: latest.device,
        targetUrl: latest.targetUrl,
        persona: latest.persona,
        progress: latest.status === "running" ? 70 : 100,
        previewLabel: "",
        previewImage: latest.screenshots[0]?.imageUrl ? `${API_BASE_URL}${latest.screenshots[0].imageUrl}` : "",
        stream: latest.steps.slice(-4).map((s) => ({
          id: `${latest.id}-${s.stepIndex}`,
          reasoning: s.thought || "",
          timestamp: `step ${s.stepIndex}`,
        })),
      }
    : null;

  return { missions, missionDetails, metricCards, historyRows, issues, liveMission };
}

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { API_BASE_URL } from "../../../config/env";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { fetchMissionById } from "../../../services/api";
import { MissionDetailsApi } from "../../../types/api";
import { MissionStickyHeader } from "../components/MissionStickyHeader";
import { AIFindingsPanel } from "../components/AIFindingsPanel";
import { ReplayVideoPanel } from "../components/ReplayVideoPanel";
import { EvidenceTimeline } from "../components/EvidenceTimeline";

function deriveSeverity(score: number | null): "P0" | "P1" | "P2" {
  if ((score || 0) >= 50) return "P0";
  if ((score || 0) >= 30) return "P1";
  return "P2";
}

export function EvidencePage() {
  const [searchParams] = useSearchParams();
  const missionId = searchParams.get("missionId");
  const [mission, setMission] = useState<MissionDetailsApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) {
      setLoading(false);
      return;
    }
    fetchMissionById(missionId)
      .then((r) => setMission(r.mission))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [missionId]);

  const findings = useMemo(() => {
    if (!mission) return null;
    const rca = (mission as unknown as { rcaJson?: any }).rcaJson || {};
    const diagnosis = mission.topDiagnosis || rca.rootCause || "Healthy";
    const confidence = Number.isFinite(Number(rca.confidence)) ? Math.round(Number(rca.confidence) * 100) : 92;
    const evidenceSignals = [
      mission.steps.some((s) => (s.diagnosis || "").includes("Missing Route")) ? "URL redirected to missing route signal" : null,
      mission.steps.some((s) => (s.diagnosis || "").includes("Dead Link")) ? "No meaningful DOM mutation after click attempts" : null,
      mission.steps.length > 5 ? "Repeated recovery interactions observed" : null,
    ].filter(Boolean) as string[];

    return {
      diagnosis,
      confidence,
      severity: deriveSeverity(mission.confusionScore),
      impact: rca.summary || "User progression was blocked during key task flow.",
      recommendedFix: rca.suggestedFix || "Review failing route/action path and add deterministic fallback handling with stronger UX feedback.",
      evidenceSignals: evidenceSignals.length ? evidenceSignals : ["Interaction evidence indicates friction against expected mission progression."],
    };
  }, [mission]);

  if (loading) return <DashboardLoading />;
  if (!missionId || !mission || !findings) return <EmptyState title="Select mission evidence" message="Open evidence from dashboard, issues, or runs table." />;

  return (
    <div className="space-y-5">
      <MissionStickyHeader
        goal={mission.goal}
        targetUrl={mission.targetUrl}
        status={mission.status}
        confusionScore={mission.confusionScore || 0}
      />

      <AIFindingsPanel
        diagnosis={findings.diagnosis}
        confidence={findings.confidence}
        severity={findings.severity}
        evidenceSignals={findings.evidenceSignals}
        impact={findings.impact}
        recommendedFix={findings.recommendedFix}
      />

      <ReplayVideoPanel
        videoUrl={mission.videoUrl ? `${API_BASE_URL}${mission.videoUrl}` : null}
        persona={mission.persona}
        device={mission.device}
        startedAt={new Date(mission.createdAt).toLocaleString()}
      />

      <EvidenceTimeline
        steps={mission.steps}
        screenshots={mission.screenshots}
        imageBase={API_BASE_URL}
        onExpandImage={(url) => setExpandedImage(url)}
      />

      {expandedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setExpandedImage(null)}>
          <div className="relative max-h-[94vh] max-w-[96vw]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setExpandedImage(null)} className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white">
              <X size={16} />
            </button>
            <img src={expandedImage} alt="Expanded evidence" className="max-h-[94vh] max-w-[96vw] rounded-lg object-contain shadow-2xl" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

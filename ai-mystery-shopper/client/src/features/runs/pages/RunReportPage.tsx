import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { fetchMissionById } from "../../../services/api";
import { MissionDetailsApi } from "../../../types/api";

export function RunReportPage() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<MissionDetailsApi | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <DashboardLoading />;
  if (!mission) return <EmptyState title="Run not found" message="The selected mission report is unavailable." />;

  return (
    <div className="space-y-4">
      <SurfaceCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Run Report</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{mission.goal}</h2>
            <p className="mt-1 text-sm text-slate-500">{mission.targetUrl}</p>
          </div>
          <button onClick={() => navigate(`/evidence?missionId=${mission.id}`)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            Open Evidence
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">Persona: {mission.persona}</p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">Device: {mission.device}</p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">Friction: {mission.confusionScore ?? 0}</p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">Diagnosis: {mission.topDiagnosis || "Healthy"}</p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Reasoning Timeline</h3>
        <div className="space-y-2">
          {mission.steps.map((s) => (
            <div key={`${s.stepIndex}-${s.createdAt}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Step {s.stepIndex} • {s.action} • {s.diagnosis || "Healthy"}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{s.thought || "No thought captured."}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

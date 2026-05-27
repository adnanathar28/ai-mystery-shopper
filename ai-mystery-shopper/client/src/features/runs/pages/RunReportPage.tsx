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
            <h2 className="text-lg font-semibold text-zinc-100">{mission.goal}</h2>
            <p className="mt-1 text-sm text-zinc-400">{mission.targetUrl}</p>
          </div>
          <button onClick={() => navigate(`/evidence?missionId=${mission.id}`)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300">
            Open Evidence
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <p className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-zinc-300">Persona: {mission.persona}</p>
          <p className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-zinc-300">Device: {mission.device}</p>
          <p className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-zinc-300">Friction: {mission.confusionScore ?? 0}</p>
          <p className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-zinc-300">Diagnosis: {mission.topDiagnosis || "Healthy"}</p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Reasoning Timeline</h3>
        <div className="space-y-2">
          {mission.steps.map((s) => (
            <div key={`${s.stepIndex}-${s.createdAt}`} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <p className="text-xs text-zinc-500">Step {s.stepIndex} • {s.action} • {s.diagnosis || "Healthy"}</p>
              <p className="mt-1 text-sm text-zinc-300">{s.thought || "No thought captured."}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

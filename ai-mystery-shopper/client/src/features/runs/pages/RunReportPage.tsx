import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { deleteMission, fetchMissionById } from "../../../services/api";
import { MissionDetailsApi } from "../../../types/api";

export function RunReportPage() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<MissionDetailsApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    const approved = window.confirm("Delete this faulty run and all related evidence?");
    if (!approved) return;
    try {
      setDeleting(true);
      await deleteMission(mission.id);
      navigate("/runs");
    } catch (err) {
      console.error(err);
      alert("Delete failed. This endpoint deletes only faulty runs by default.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <SurfaceCard>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Run Report</p>
            <h2 className="mt-2 truncate text-xl font-semibold text-zinc-100">{mission.goal}</h2>
            <p className="mt-1 truncate text-sm text-zinc-500">{mission.targetUrl}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => navigate(`/evidence?missionId=${mission.id}`)} className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100">
              Open Evidence
            </button>
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete Run"}
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <p className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-zinc-300">Persona: {mission.persona}</p>
          <p className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-zinc-300">Device: {mission.device}</p>
          <p className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-zinc-300">Friction: {mission.confusionScore ?? 0}</p>
          <p className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-zinc-300">Diagnosis: {mission.topDiagnosis || "Healthy"}</p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <h3 className="mb-3 text-lg font-semibold text-zinc-100">Reasoning Timeline</h3>
        <div className="space-y-2">
          {mission.steps.map((s) => (
            <div key={`${s.stepIndex}-${s.createdAt}`} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <p className="text-xs text-zinc-500">
                Step {s.stepIndex} / {s.action} / {s.diagnosis || "Healthy"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">{s.thought || "No thought captured."}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

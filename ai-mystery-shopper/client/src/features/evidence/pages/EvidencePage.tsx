import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config/env";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { fetchMissionById } from "../../../services/api";
import { MissionDetailsApi } from "../../../types/api";

export function EvidencePage() {
  const [searchParams] = useSearchParams();
  const missionId = searchParams.get("missionId");
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
  if (!missionId || !mission) return <EmptyState title="Select mission evidence" message="Open evidence from dashboard, issues, or runs table." />;

  return (
    <div className="space-y-4">
      <SurfaceCard>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mission Evidence</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{mission.goal}</h2>
        <p className="mt-1 text-sm text-slate-500">{mission.targetUrl}</p>
        {mission.videoUrl ? (
          <video controls className="mt-4 w-full rounded-xl border border-slate-200" src={`${API_BASE_URL}${mission.videoUrl}`} />
        ) : (
          <p className="mt-3 text-sm text-slate-500">No video evidence available for this mission.</p>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Screenshot Timeline</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {mission.screenshots.map((s) => (
            <div key={`${s.stepIndex}-${s.imageUrl}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
              <img src={`${API_BASE_URL}${s.imageUrl}`} alt={`step ${s.stepIndex}`} className="h-24 w-full rounded-lg object-cover opacity-90" />
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">Step {s.stepIndex}</p>
              <p className="mt-1 text-sm text-slate-700">{s.message || "No note"}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

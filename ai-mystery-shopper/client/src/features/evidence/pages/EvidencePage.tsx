import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config/env";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { fetchMissionById } from "../../../services/api";
import { MissionDetailsApi } from "../../../types/api";
import { X } from "lucide-react";

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

  if (loading) return <DashboardLoading />;
  if (!missionId || !mission) return <EmptyState title="Select mission evidence" message="Open evidence from dashboard, issues, or runs table." />;

  return (
    <div className="space-y-4">
      <SurfaceCard>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mission Evidence</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{mission.goal}</h2>
        <p className="mt-1 text-sm text-slate-500">{mission.targetUrl}</p>
        {mission.videoUrl ? (
          <div className="mt-4 max-w-3xl">
            <video controls className="w-full rounded-xl border border-slate-200" src={`${API_BASE_URL}${mission.videoUrl}`} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No video evidence available for this mission.</p>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Screenshot Timeline</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {mission.screenshots.map((s) => (
            <div key={`${s.stepIndex}-${s.imageUrl}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
              <button
                type="button"
                onClick={() => setExpandedImage(`${API_BASE_URL}${s.imageUrl}`)}
                className="w-full overflow-hidden rounded-lg border border-slate-200"
              >
                <img src={`${API_BASE_URL}${s.imageUrl}`} alt={`step ${s.stepIndex}`} className="h-28 w-full object-cover opacity-95 transition hover:opacity-100" />
              </button>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">Step {s.stepIndex}</p>
              <p className="mt-1 text-sm text-slate-700">{s.message || "No note"}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {expandedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setExpandedImage(null)}>
          <div className="relative max-h-[92vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute right-2 top-2 rounded-md bg-black/70 p-1.5 text-white"
            >
              <X size={16} />
            </button>
            <img src={expandedImage} alt="Expanded mission evidence" className="max-h-[92vh] max-w-[95vw] rounded-lg object-contain shadow-2xl" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

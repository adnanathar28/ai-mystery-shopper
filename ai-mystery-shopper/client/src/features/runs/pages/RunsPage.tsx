import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { MissionHistoryTable } from "../../dashboard/components/MissionHistoryTable";
import { loadDashboardBundle, type DashboardBundle } from "../../dashboard/lib/dashboardMapper";
import { deleteMission } from "../../../services/api";

export function RunsPage() {
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const hydrate = () => loadDashboardBundle().then(setBundle).catch(console.error);

  useEffect(() => {
    hydrate();
  }, []);

  const handleDeleteFaulty = async (missionId: string) => {
    const approved = window.confirm("Delete this faulty run and all related steps/screenshots?");
    if (!approved) return;
    try {
      setDeletingId(missionId);
      await deleteMission(missionId);
      await hydrate();
    } catch (err) {
      console.error(err);
      alert("Delete failed. If the run is healthy, backend blocks deletion unless forced.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!bundle) return <DashboardLoading />;
  if (!bundle.historyRows.length) return <EmptyState title="No runs yet" message="Launch a mission to populate run history." />;

  return (
    <MissionHistoryTable
      rows={bundle.historyRows}
      onOpenReport={(id) => navigate(`/runs/${id}`)}
      onViewEvidence={(id) => navigate(`/evidence?missionId=${id}`)}
      onDeleteFaulty={(id) => {
        if (deletingId) return;
        handleDeleteFaulty(id);
      }}
    />
  );
}

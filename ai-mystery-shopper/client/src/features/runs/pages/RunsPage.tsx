import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { MissionHistoryTable } from "../../dashboard/components/MissionHistoryTable";
import { loadDashboardBundle, type DashboardBundle } from "../../dashboard/lib/dashboardMapper";

export function RunsPage() {
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardBundle().then(setBundle).catch(console.error);
  }, []);

  if (!bundle) return <DashboardLoading />;
  if (!bundle.historyRows.length) return <EmptyState title="No runs yet" message="Launch a mission to populate run history." />;

  return (
    <MissionHistoryTable
      rows={bundle.historyRows}
      onOpenReport={(id) => navigate(`/runs/${id}`)}
      onViewEvidence={(id) => navigate(`/evidence?missionId=${id}`)}
    />
  );
}

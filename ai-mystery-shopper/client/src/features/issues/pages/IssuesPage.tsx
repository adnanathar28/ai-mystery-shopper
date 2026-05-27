import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLoading } from "../../dashboard/components/DashboardLoading";
import { EmptyState } from "../../dashboard/components/EmptyState";
import { LatestIssuesPanel } from "../../dashboard/components/LatestIssuesPanel";
import { loadDashboardBundle, type DashboardBundle } from "../../dashboard/lib/dashboardMapper";

export function IssuesPage() {
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardBundle().then(setBundle).catch(console.error);
  }, []);

  if (!bundle) return <DashboardLoading />;
  if (!bundle.issues.length) return <EmptyState title="No issues" message="No issue records available for current missions." />;

  return (
    <LatestIssuesPanel
      issues={bundle.issues}
      onViewAll={() => {}}
      onViewEvidence={(id) => navigate(`/evidence?missionId=${id}`)}
      onOpenReport={(id) => navigate(`/runs/${id}`)}
    />
  );
}

import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { AppShell } from "./layout/AppShell";

export function App() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}

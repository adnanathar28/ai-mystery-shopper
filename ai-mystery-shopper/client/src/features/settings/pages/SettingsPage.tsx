import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { API_BASE_URL } from "../../../config/env";

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <SurfaceCard>
        <h2 className="text-lg font-semibold text-zinc-100">Workspace Settings</h2>
        <p className="mt-1 text-sm text-zinc-400">Current API base: {API_BASE_URL}</p>
      </SurfaceCard>
      <SurfaceCard>
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Profile</h3>
        <p className="mt-2 text-sm text-zinc-500">User controls can be connected here when auth is added.</p>
      </SurfaceCard>
    </div>
  );
}

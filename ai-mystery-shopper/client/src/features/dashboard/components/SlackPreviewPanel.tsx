import { MessageSquareText } from "lucide-react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";

type Props = {
  missionTitle: string;
  diagnosis: string;
  frictionScore: number;
};

export function SlackPreviewPanel({ missionTitle, diagnosis, frictionScore }: Props) {
  return (
    <SurfaceCard>
      <div className="mb-4 flex items-center gap-2">
        <MessageSquareText size={16} className="text-violet-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Slack Preview</h3>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <p className="text-sm font-semibold text-slate-100">Friction Alert: {diagnosis || "Healthy"}</p>
        <p className="mt-1 text-sm text-slate-300">Mission: {missionTitle || "Autonomous mission"}</p>
        <p className="mt-1 text-sm text-slate-300">Confusion Score: {frictionScore}/100</p>
        <p className="mt-2 text-xs text-slate-500">Preview of outbound alert payload for engineering triage.</p>
      </div>
    </SurfaceCard>
  );
}

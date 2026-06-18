import { MessageSquareText } from "lucide-react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";

type Props = {
  missionTitle?: string;
  diagnosis?: string;
  frictionScore: number;
};

export function SlackPreviewPanel({ missionTitle, diagnosis, frictionScore }: Props) {
  return (
    <SurfaceCard className="py-3.5">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareText size={15} className="text-purple-300" />
        <h3 className="text-sm font-semibold text-zinc-200">Slack Preview</h3>
      </div>
      <div className="space-y-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
        <p className="truncate text-sm font-medium text-zinc-100">Friction Alert: {diagnosis || "-"}</p>
        <p className="truncate text-sm text-zinc-400">Mission: {missionTitle || "-"}</p>
        <p className="text-sm text-zinc-400">Confusion Score: {frictionScore}/100</p>
      </div>
    </SurfaceCard>
  );
}

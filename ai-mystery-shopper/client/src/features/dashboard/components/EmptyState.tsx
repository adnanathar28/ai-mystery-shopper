import { Inbox } from "lucide-react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";

type Props = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: Props) {
  return (
    <SurfaceCard className="flex min-h-56 flex-col items-center justify-center text-center">
      <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-500">
        <Inbox size={18} />
      </div>
      <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{message}</p>
    </SurfaceCard>
  );
}

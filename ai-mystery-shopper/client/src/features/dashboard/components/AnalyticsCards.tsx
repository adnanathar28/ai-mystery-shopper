import { AlertTriangle, Gauge, Radar, ShieldCheck } from "lucide-react";
import { MetricCard } from "../../../types/dashboard";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";

type Props = {
  cards: MetricCard[];
};

const iconMap = {
  runs: Radar,
  issues: ShieldCheck,
  friction: Gauge,
  critical: AlertTriangle,
};

export function AnalyticsCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = iconMap[card.icon];
        return (
          <SurfaceCard key={card.title} className="py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500">{card.title}</p>
                <p className="mt-2 text-3xl font-semibold leading-none text-zinc-50">{card.value}</p>
                <p className="mt-2 truncate text-xs text-zinc-500">{card.hint}</p>
              </div>
              <span className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-500">
                <Icon size={15} />
              </span>
            </div>
          </SurfaceCard>
        );
      })}
    </div>
  );
}

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Gauge, Radar, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = iconMap[card.icon];
        const trendUp = card.trend.direction === "up";
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            whileHover={{ y: -3 }}
          >
            <SurfaceCard className="group transition-colors hover:border-zinc-700">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{card.title}</span>
                <span className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 transition group-hover:text-indigo-300">
                  <Icon size={14} />
                </span>
              </div>
              <p className="text-3xl font-semibold leading-none text-zinc-100">{card.value}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className={`inline-flex items-center gap-1 ${trendUp ? "text-emerald-300" : "text-amber-300"}`}>
                  {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.trend.value}
                </span>
                <span className="text-zinc-500">{card.hint}</span>
              </div>
            </SurfaceCard>
          </motion.div>
        );
      })}
    </div>
  );
}

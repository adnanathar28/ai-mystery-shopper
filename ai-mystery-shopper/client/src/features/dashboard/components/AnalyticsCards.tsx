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
            <SurfaceCard className="group transition-colors hover:border-slate-700">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">{card.title}</span>
                <span className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition group-hover:text-indigo-300">
                  <Icon size={14} />
                </span>
              </div>
              <p className="text-3xl font-semibold leading-none text-slate-100">{card.value}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1 font-medium ${trendUp ? "text-emerald-300" : "text-amber-300"}`}>
                  {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.trend.value}
                </span>
                <span className="uppercase tracking-[0.12em] text-slate-400">{card.hint}</span>
              </div>
            </SurfaceCard>
          </motion.div>
        );
      })}
    </div>
  );
}

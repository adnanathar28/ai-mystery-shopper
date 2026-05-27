import { motion } from "framer-motion";
import { BadgeCheck, Cpu, Globe, UserCircle2 } from "lucide-react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { LiveMission } from "../../../types/dashboard";

type Props = {
  mission: LiveMission;
};

const statusStyles = {
  running: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-amber-200 bg-amber-50 text-amber-700",
  completed: "border-sky-200 bg-sky-50 text-sky-700",
};

export function LiveMissionPanel({ mission }: Props) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.8fr]">
        <div className="border-b border-slate-200 p-5 xl:border-b-0 xl:border-r">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">Live Mission</p>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[mission.status]}`}>{mission.status}</span>
          </div>
          <h3 className="text-xl font-semibold leading-snug text-slate-900">{mission.goal}</h3>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <Cpu size={14} className="text-slate-400" /> {mission.device}
            </p>
            <p className="inline-flex items-center gap-2">
              <UserCircle2 size={14} className="text-slate-400" /> {mission.persona}
            </p>
            <p className="inline-flex items-center gap-2 md:col-span-2">
              <Globe size={14} className="text-slate-400" /> {mission.targetUrl}
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
              <span>Progress</span>
              <span>{mission.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mission.progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {mission.stream.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm leading-relaxed text-slate-800">{item.reasoning}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.timestamp}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">Evidence Snapshot</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img src={mission.previewImage} alt={mission.previewLabel} className="h-36 w-full object-cover opacity-90" />
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
            <BadgeCheck size={14} className="text-emerald-600" /> Evidence stream synced to active run
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

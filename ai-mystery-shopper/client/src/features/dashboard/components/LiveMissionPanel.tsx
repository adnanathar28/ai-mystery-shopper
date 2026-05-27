import { motion } from "framer-motion";
import { BadgeCheck, Cpu, Globe, UserCircle2 } from "lucide-react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";
import { LiveMission } from "../../../types/dashboard";

type Props = {
  mission: LiveMission;
};

const statusStyles = {
  running: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  paused: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  completed: "border-sky-400/30 bg-sky-500/10 text-sky-300",
};

export function LiveMissionPanel({ mission }: Props) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr]">
        <div className="border-b border-zinc-800/80 p-5 xl:border-b-0 xl:border-r">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Live Mission</p>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[mission.status]}`}>{mission.status}</span>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">{mission.goal}</h3>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <Cpu size={14} className="text-zinc-500" /> {mission.device}
            </p>
            <p className="inline-flex items-center gap-2">
              <UserCircle2 size={14} className="text-zinc-500" /> {mission.persona}
            </p>
            <p className="inline-flex items-center gap-2 md:col-span-2">
              <Globe size={14} className="text-zinc-500" /> {mission.targetUrl}
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-zinc-500">
              <span>Progress</span>
              <span>{mission.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mission.progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {mission.stream.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <p className="text-sm text-zinc-200">{item.reasoning}</p>
                <p className="mt-1 text-xs text-zinc-500">{item.timestamp}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Preview</p>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            <img src={mission.previewImage} alt={mission.previewLabel} className="h-56 w-full object-cover lg:h-[310px]" />
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400">
            <BadgeCheck size={14} className="text-emerald-300" /> Evidence stream synced to active run
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

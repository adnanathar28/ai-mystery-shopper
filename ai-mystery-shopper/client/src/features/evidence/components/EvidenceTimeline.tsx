import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Expand } from "lucide-react";
import { useMemo, useState } from "react";
import { MissionScreenshotApi, MissionStepApi } from "../../../types/api";

type TimelineItem = {
  stepIndex: number;
  action: string;
  diagnosis: string;
  thought: string;
  timestamp: string;
  imageUrl?: string;
  message?: string;
  severity: "P0" | "P1" | "P2";
};

type Props = {
  steps: MissionStepApi[];
  screenshots: MissionScreenshotApi[];
  imageBase: string;
  onExpandImage: (url: string) => void;
};

function mapSeverity(diagnosis: string): "P0" | "P1" | "P2" {
  if (["Backend Failure", "Frontend Failure", "CRITICAL_FAILURE", "Stuck"].includes(diagnosis)) return "P0";
  if (["Missing Route", "Broken Navigation", "Dead Link"].includes(diagnosis)) return "P1";
  return "P2";
}

function statusTone(diagnosis: string) {
  if (["Healthy", "UI Glitch"].includes(diagnosis)) return { label: "success", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" };
  if (["Missing Route", "Broken Navigation", "Dead Link"].includes(diagnosis)) return { label: "warning", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" };
  return { label: "critical", cls: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
}

function compactReasoning(text: string) {
  return text
    .replace(/I have successfully entered/gi, "Entered")
    .replace(/I am currently trying to/gi, "Attempting to")
    .replace(/I can see that/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function EvidenceTimeline({ steps, screenshots, imageBase, onExpandImage }: Props) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [actionFilter, setActionFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const items: TimelineItem[] = useMemo(() => {
    const shotMap = new Map(screenshots.map((s) => [s.stepIndex, s]));
    return steps.map((s) => {
      const shot = shotMap.get(s.stepIndex);
      const diagnosis = s.diagnosis || "Healthy";
      return {
        stepIndex: s.stepIndex,
        action: s.action || "unknown",
        diagnosis,
        thought: s.thought || "No reasoning captured.",
        timestamp: new Date(s.createdAt).toLocaleTimeString(),
        imageUrl: shot?.imageUrl ? `${imageBase}${shot.imageUrl}` : undefined,
        message: shot?.message || undefined,
        severity: mapSeverity(diagnosis),
      };
    });
  }, [steps, screenshots, imageBase]);

  const actionOptions = useMemo(() => ["all", ...Array.from(new Set(items.map((i) => i.action)))], [items]);

  const filtered = items.filter((i) => (actionFilter === "all" || i.action === actionFilter) && (severityFilter === "all" || i.severity === severityFilter));

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Timeline</p>
        <div className="flex gap-2">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
            <option value="all">all severity</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
          </select>
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.map((item) => {
          const isOpen = !!expanded[item.stepIndex];
          const tone = statusTone(item.diagnosis);
          return (
            <motion.div key={`${item.stepIndex}-${item.timestamp}`} layout className="rounded-lg border border-slate-700 bg-slate-950/70 p-2.5">
              <div className="grid grid-cols-[64px_1fr_auto] items-start gap-2.5">
                <div className="mt-0.5 w-16 shrink-0">
                  {item.imageUrl ? (
                    <button onClick={() => onExpandImage(item.imageUrl!)} className="group relative w-full overflow-hidden rounded border border-slate-700">
                      <img src={item.imageUrl} alt={`step ${item.stepIndex}`} className="h-12 w-full object-cover opacity-85 group-hover:opacity-100" />
                      <span className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white">
                        <Expand size={10} />
                      </span>
                    </button>
                  ) : (
                    <div className="h-12 rounded border border-dashed border-slate-700 bg-slate-800/70" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">step {item.stepIndex}</span>
                    <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-indigo-300">{item.action}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] ${tone.cls}`}>{tone.label}</span>
                  </div>

                  <p className="mt-1 text-xs text-slate-200 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                    {compactReasoning(item.thought)}
                  </p>

                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [item.stepIndex]: !prev[item.stepIndex] }))}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300"
                  >
                    {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isOpen ? "collapse" : "expand"}
                  </button>

                  {isOpen ? (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded border border-slate-800 bg-slate-950 p-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Diagnosis</p>
                      <p className="text-xs text-slate-300">{item.diagnosis}</p>
                      {item.message ? (
                        <>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">Screenshot note</p>
                          <p className="text-xs text-slate-300">{item.message}</p>
                        </>
                      ) : null}
                    </motion.div>
                  ) : null}
                </div>

                <div className="flex min-w-[92px] flex-col items-end gap-1">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.timestamp}</span>
                  <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">{item.severity}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

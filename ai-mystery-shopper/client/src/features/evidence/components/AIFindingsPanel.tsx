import { AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { SurfaceCard } from "../../../components/ui/SurfaceCard";

type Props = {
  diagnosis: string;
  confidence: number;
  severity: "P0" | "P1" | "P2";
  evidenceSignals: string[];
  impact: string;
  recommendedFix: string;
};

const sevStyle = {
  P0: "border-rose-400/30 bg-rose-500/10 text-rose-300",
  P1: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  P2: "border-sky-400/30 bg-sky-500/10 text-sky-300",
};

export function AIFindingsPanel({ diagnosis, confidence, severity, evidenceSignals, impact, recommendedFix }: Props) {
  return (
    <SurfaceCard className="border-slate-800 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Sparkles size={15} className="text-indigo-300" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">AI Findings</p>
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${sevStyle[severity]}`}>{severity}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Diagnosis</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{diagnosis}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Confidence</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{confidence}%</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Impact</p>
          <p className="mt-1 text-xs text-slate-300">{impact}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Recommendation</p>
          <p className="mt-1 text-xs text-slate-300">{recommendedFix}</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5">
          <p className="mb-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <ShieldAlert size={12} /> Evidence Signals
          </p>
          <div className="space-y-1.5">
            {evidenceSignals.map((signal) => (
              <p key={signal} className="inline-flex items-center gap-2 text-xs text-slate-300">
                <AlertTriangle size={12} className="text-amber-300" /> {signal}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5">
          <p className="mb-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <CheckCircle2 size={12} /> Recommended Fix
          </p>
          <p className="text-xs leading-relaxed text-slate-300">{recommendedFix}</p>
        </div>
      </div>
    </SurfaceCard>
  );
}

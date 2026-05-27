import { cn } from "../../lib/cn";

type SeverityBadgeProps = {
  level: "P0" | "P1" | "P2";
};

const styles = {
  P0: "border-rose-400/30 bg-rose-500/15 text-rose-300",
  P1: "border-amber-400/30 bg-amber-500/15 text-amber-300",
  P2: "border-sky-400/30 bg-sky-500/15 text-sky-300",
};

export function SeverityBadge({ level }: SeverityBadgeProps) {
  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", styles[level])}>{level}</span>;
}

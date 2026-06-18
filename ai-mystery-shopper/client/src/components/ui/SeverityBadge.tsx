import { cn } from "../../lib/cn";

type SeverityBadgeProps = {
  level: "P0" | "P1" | "P2";
};

const styles = {
  P0: "border-red-500/25 bg-red-500/10 text-red-300",
  P1: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  P2: "border-purple-500/25 bg-purple-500/10 text-purple-300",
};

export function SeverityBadge({ level }: SeverityBadgeProps) {
  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", styles[level])}>{level}</span>;
}

import { cn } from "../../lib/cn";

type SeverityBadgeProps = {
  level: "P0" | "P1" | "P2";
};

const styles = {
  P0: "border-rose-200 bg-rose-50 text-rose-700",
  P1: "border-amber-200 bg-amber-50 text-amber-700",
  P2: "border-sky-200 bg-sky-50 text-sky-700",
};

export function SeverityBadge({ level }: SeverityBadgeProps) {
  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", styles[level])}>{level}</span>;
}

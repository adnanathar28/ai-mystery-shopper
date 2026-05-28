import { ReactNode } from "react";
import { cn } from "../../lib/cn";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className }: SurfaceCardProps) {
  return <div className={cn("rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-[0_12px_30px_rgba(2,6,23,0.45)]", className)}>{children}</div>;
}

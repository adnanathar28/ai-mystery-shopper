import { ReactNode } from "react";
import { cn } from "../../lib/cn";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className }: SurfaceCardProps) {
  return <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-card", className)}>{children}</div>;
}

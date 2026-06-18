import { ReactNode } from "react";
import { cn } from "../../lib/cn";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className }: SurfaceCardProps) {
  return <div className={cn("rounded-lg border border-zinc-800 bg-zinc-950 p-4", className)}>{children}</div>;
}

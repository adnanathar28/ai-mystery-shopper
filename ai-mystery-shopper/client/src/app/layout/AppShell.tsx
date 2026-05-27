import { Bell, Bot, CircleUserRound, Rocket, Settings, ShieldAlert, TableProperties, TerminalSquare } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "../../lib/cn";

type ShellProps = {
  children: ReactNode;
};

const navItems = [
  { label: "Dashboard", icon: TableProperties, active: true },
  { label: "Runs", icon: TerminalSquare },
  { label: "Issues", icon: ShieldAlert },
  { label: "Evidence", icon: Bot },
  { label: "Settings", icon: Settings },
];

export function AppShell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-sentinel-grid bg-[size:34px_34px] opacity-[0.14]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-800/80 bg-neutral-950/90 px-5 py-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 p-2.5 text-zinc-950">
              <Bot size={19} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">SentinelBot</p>
              <p className="text-sm font-semibold text-zinc-200">AI Mystery Shopper</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                  item.active
                    ? "border-indigo-400/30 bg-indigo-500/10 text-zinc-100"
                    : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <item.icon size={17} className={item.active ? "text-indigo-300" : "text-zinc-500 group-hover:text-zinc-300"} />
                {item.label}
              </button>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-indigo-300">
              <Rocket size={15} />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Growth Plan</p>
            </div>
            <p className="text-sm text-zinc-300">Scale to 10x parallel agents and advanced RCA workflows.</p>
            <button className="mt-3 w-full rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25">
              Upgrade Workspace
            </button>
          </motion.div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/85 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none transition hover:border-zinc-700">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Local</option>
                </select>
                <span className="hidden items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 md:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Agents Online
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button className="rounded-lg border border-indigo-400/40 bg-gradient-to-r from-indigo-500/40 to-violet-500/35 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:from-indigo-500/50 hover:to-violet-500/50">
                  Run Mission
                </button>
                <button className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition hover:text-zinc-200">
                  <Bell size={16} />
                </button>
                <button className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition hover:text-zinc-200">
                  <CircleUserRound size={17} />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

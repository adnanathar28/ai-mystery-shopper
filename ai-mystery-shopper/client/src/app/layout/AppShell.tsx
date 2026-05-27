import { Bell, Bot, CircleUserRound, Rocket, Settings, ShieldAlert, TableProperties, TerminalSquare } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { NavLink, useNavigate } from "react-router-dom";

type ShellProps = {
  children: ReactNode;
  onRunMission: () => void;
  runningMission?: boolean;
};

const navItems = [
  { label: "Dashboard", icon: TableProperties, to: "/" },
  { label: "Runs", icon: TerminalSquare, to: "/runs" },
  { label: "Issues", icon: ShieldAlert, to: "/issues" },
  { label: "Evidence", icon: Bot, to: "/evidence" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

export function AppShell({ children, onRunMission, runningMission = false }: ShellProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-sentinel-grid bg-[size:34px_34px] opacity-[0.05]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 p-2.5 text-zinc-950">
              <Bot size={19} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">SentinelBot</p>
              <p className="text-sm font-semibold text-slate-900">AI Mystery Shopper</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.label} to={item.to}>
                {({ isActive }) => (
                  <span
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                      isActive
                        ? "border-indigo-200 bg-indigo-50 text-slate-900"
                        : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                    )}
                  >
                    <item.icon size={17} className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"} />
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-indigo-700">
              <Rocket size={15} />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Growth Plan</p>
            </div>
            <p className="text-sm text-slate-600">Scale to 10x parallel agents and advanced RCA workflows.</p>
            <button className="mt-3 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
              Upgrade Workspace
            </button>
          </motion.div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-400">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Local</option>
                </select>
                <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 md:flex">
                  <span className={`h-1.5 w-1.5 rounded-full ${runningMission ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {runningMission ? "Agent Running" : "Agent Online"}
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={onRunMission}
                  className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-95"
                >
                  Run Mission
                </button>
                <button onClick={() => navigate("/issues")} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800">
                  <Bell size={16} />
                </button>
                <button onClick={() => navigate("/settings")} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800">
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

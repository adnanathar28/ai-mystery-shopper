import { Bell, Bot, CircleUserRound, ShieldAlert, TableProperties, TerminalSquare } from "lucide-react";
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
];

export function AppShell({ children, onRunMission, runningMission = false }: ShellProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-sentinel-grid bg-[size:34px_34px] opacity-[0.12]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-950 px-5 py-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 p-2.5 text-zinc-950">
              <Bot size={19} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">SentinelBot</p>
              <p className="text-sm font-semibold text-slate-200">AI Mystery Shopper</p>
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
                        ? "border-indigo-400/30 bg-indigo-500/10 text-slate-100"
                        : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200"
                    )}
                  >
                    <item.icon size={17} className={isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"} />
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto" />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-800 bg-zinc-950/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none transition hover:border-slate-600">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Local</option>
                </select>
                <span className="hidden items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 md:flex">
                  <span className={`h-1.5 w-1.5 rounded-full ${runningMission ? "bg-emerald-300" : "bg-slate-500"}`} />
                  {runningMission ? "Agent Running" : "Agent Online"}
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={onRunMission}
                  className="rounded-lg border border-indigo-400/30 bg-gradient-to-r from-indigo-500/40 to-violet-500/35 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:from-indigo-500/50 hover:to-violet-500/50"
                >
                  Run Mission
                </button>
                <button onClick={() => navigate("/issues")} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 transition hover:text-slate-200">
                  <Bell size={16} />
                </button>
                <button onClick={() => navigate("/")} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 transition hover:text-slate-200">
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

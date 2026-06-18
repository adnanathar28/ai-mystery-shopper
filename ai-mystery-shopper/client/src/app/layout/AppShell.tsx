import { Bell, Bot, CircleUserRound, Loader2, ShieldAlert, TableProperties, TerminalSquare } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { NavLink, useNavigate } from "react-router-dom";
import { HumanGateStatusApi } from "../../types/api";

type ShellProps = {
  children: ReactNode;
  onRunMission: () => void;
  runningMission?: boolean;
  humanGate?: HumanGateStatusApi | null;
  resumingHumanGate?: boolean;
  onResumeHumanGate?: () => void;
};

const navItems = [
  { label: "Dashboard", icon: TableProperties, to: "/" },
  { label: "Runs", icon: TerminalSquare, to: "/runs" },
  { label: "Issues", icon: ShieldAlert, to: "/issues" },
  { label: "Evidence", icon: Bot, to: "/evidence" },
];

export function AppShell({
  children,
  onRunMission,
  runningMission = false,
  humanGate = null,
  resumingHumanGate = false,
  onResumeHumanGate,
}: ShellProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="relative flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 px-4 py-5 lg:flex lg:flex-col">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="rounded-md border border-purple-500/30 bg-purple-500/10 p-2 text-purple-300">
              <Bot size={19} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">SentinelBot</p>
              <p className="text-sm font-semibold text-zinc-100">AI Mystery Shopper</p>
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
                        ? "border-purple-500/20 bg-purple-500/10 text-zinc-100"
                        : "border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                    )}
                  >
                    <item.icon size={17} className={isActive ? "text-purple-300" : "text-zinc-500 group-hover:text-zinc-300"} />
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto" />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-5 py-3 lg:px-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition hover:border-zinc-700">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Local</option>
                </select>
                <span className="hidden items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300 md:flex">
                  <span className={`h-1.5 w-1.5 rounded-full ${runningMission ? "bg-green-300" : "bg-zinc-500"}`} />
                  {runningMission ? "Agent Running" : "Agent Online"}
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={onRunMission}
                  className="rounded-md border border-purple-500/30 bg-purple-500/15 px-3.5 py-2 text-sm font-medium text-purple-100 transition hover:bg-purple-500/20"
                >
                  Run Mission
                </button>
                <button onClick={() => navigate("/issues")} className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-zinc-500 transition hover:text-zinc-200">
                  <Bell size={16} />
                </button>
                <button onClick={() => navigate("/")} className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-zinc-500 transition hover:text-zinc-200">
                  <CircleUserRound size={17} />
                </button>
              </div>
            </div>
            {humanGate?.active ? (
              <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Human Intervention Required</p>
                    <p className="mt-1 text-sm text-amber-100">{humanGate.reason || "CAPTCHA or security challenge detected."}</p>
                    {humanGate.url ? <p className="mt-1 truncate text-xs text-amber-200/70">{humanGate.url}</p> : null}
                  </div>
                  <button
                    type="button"
                    disabled={resumingHumanGate}
                    onClick={onResumeHumanGate}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-60"
                  >
                    {resumingHumanGate ? <Loader2 size={14} className="animate-spin" /> : null}
                    {resumingHumanGate ? "Resuming..." : "Resume Mission"}
                  </button>
                </div>
              </div>
            ) : null}
          </header>

          <div className="flex-1 px-5 py-7 lg:px-7">{children}</div>
        </main>
      </div>
    </div>
  );
}

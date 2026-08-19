import { Apple, Baby, ClipboardCheck, LayoutDashboard, ShieldCheck } from "lucide-react";

const workflow = [
  { icon: ShieldCheck, label: "Supervisor" },
  { icon: Baby, label: "Child Analysis" },
  { icon: Apple, label: "Nutrition" },
  { icon: ClipboardCheck, label: "Report" },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="AnganAI" className="h-10 w-10 object-contain" />
        </div>
        <div>
          <div className="font-semibold text-sidebar-foreground leading-tight">AnganAI</div>
          <div className="text-xs text-muted-foreground">AI Assistant for Anganwadi</div>
        </div>
      </div>

      <nav className="px-4">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-sidebar-accent text-sidebar-accent-foreground">
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
      </nav>

      <section className="mt-8 px-6" aria-labelledby="workflow-heading">
        <h2
          id="workflow-heading"
          className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          AI workflow
        </h2>
        <ol className="relative space-y-4 pl-2">
          {workflow.map((step, index) => (
            <li key={step.label} className="relative flex items-center gap-3">
              {index < workflow.length - 1 ? (
                <span
                  className="absolute left-[13px] top-7 h-5 w-px bg-border"
                  aria-hidden="true"
                />
              ) : null}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-muted-foreground">
                <step.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-medium text-sidebar-foreground">{step.label}</span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { TLOS, YEARS, WEIGHTAGE } from "@/lib/framework-data";
import { ArrowRight, Compass, Map, Gauge, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · NST Entrepreneurship Master Framework" },
      {
        name: "description",
        content: "Dashboard overview of the NST Entrepreneurship Track master framework.",
      },
    ],
  }),
  component: Page,
});

const NAV = [
  {
    to: "/philosophy",
    icon: Compass,
    title: "Philosophy",
    sub: "Strategic intent · failure patterns",
  },
  { to: "/roadmap", icon: Map, title: "4-Year Roadmap", sub: "Foundation → Residency" },
  { to: "/evaluation", icon: Gauge, title: "Evaluation Logic", sub: "Weightage · anti-gaming" },
  { to: "/outcomes", icon: Trophy, title: "Track Outcomes", sub: "TLO × CLO matrix" },
] as const;

function Page() {
  return (
    <>
      <TopBar title="Master Framework · Overview" breadcrumb="NST 2026" />
      <main className="relative flex-1 px-6 py-8 lg:px-10 lg:py-12">
        <section className="glass-strong relative overflow-hidden rounded-2xl p-8 lg:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-chart-2/10 blur-3xl" />
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-primary/80">
            Consolidated Master Framework · v1
          </p>
          <h2 className="mt-3 max-w-3xl font-mono text-3xl leading-tight tracking-tight lg:text-5xl">
            Building <span className="gold-text">execution-first</span> founders, startup operators
            &amp; venture-ready engineers.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground lg:text-base">
            A structured execution-oriented entrepreneurial engineering track. Execution over
            theory. Validation over ideation. Systems thinking over hype.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/philosophy"
              className="group inline-flex items-center gap-2 rounded-md border border-border bg-background/30 px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground hover:bg-accent/40"
            >
              Read the philosophy
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { k: "TLOs", v: TLOS.length },
              { k: "Years", v: YEARS.length },
              { k: "Courses", v: YEARS.reduce((a, y) => a + y.courses.length, 0) },
              { k: "Execution Weight", v: `${WEIGHTAGE[0].value}%` },
            ].map((m) => (
              <div
                key={m.k}
                className="rounded-lg border border-border/60 bg-background/20 px-4 py-3"
              >
                <div className="font-mono text-2xl gold-text">{m.v}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {m.k}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="glass group relative overflow-hidden rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
                  <n.icon className="h-4 w-4 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <h3 className="mt-4 font-mono text-base tracking-tight">{n.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{n.sub}</p>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}

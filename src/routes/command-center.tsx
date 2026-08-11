import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import {
  TLOS_EXT,
  TLO_SEMESTER_COVERAGE,
  CAPABILITY_CLUSTERS,
  COURSES_DESIGN,
  TRACK_KPIS,
} from "@/lib/tlo-extended";
import { FAILURE_PATTERNS } from "@/lib/framework-data";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import {
  ArrowUpRight,
  Activity,
  Layers,
  Target,
  AlertTriangle,
  GitBranch,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/command-center")({
  head: () => ({
    meta: [
      { title: "Command Center · NST Entrepreneurship Track" },
      {
        name: "description",
        content:
          "Cross-functional analytics dashboard for the NST Entrepreneurship Track: TLO coverage heatmap, CO×TLO mapping, assessment weight distribution, capability clusters and failure-pattern density.",
      },
    ],
  }),
  component: Page,
});

const STRENGTH_BG = ["bg-muted/15", "bg-primary/15", "bg-primary/40", "bg-primary/70"] as const;
const STRENGTH_LABEL = ["—", "Supporting", "Strong", "Primary"] as const;

function Page() {
  const [selectedTlo, setSelectedTlo] = useState<string | null>(null);
  const sem1 = COURSES_DESIGN[0];

  // CO×TLO matrix derived from Sem 1 course
  const coTloRows = useMemo(
    () =>
      sem1.cos.map((co) => ({
        coId: co.id,
        statement: co.statement,
        map: TLOS_EXT.map((t) => co.tloMap.includes(t.id)),
      })),
    [sem1],
  );

  // Cluster usage frequency
  const clusterFreq = useMemo(
    () =>
      CAPABILITY_CLUSTERS.map((c) => ({
        cluster: c,
        count: TLOS_EXT.filter((t) => t.clusters.includes(c.id)).length,
      })),
    [],
  );
  const maxCluster = Math.max(...clusterFreq.map((c) => c.count));

  // Assessment weight totals
  const totalWeight = sem1.assessments.reduce((s, a) => s + a.weight, 0);

  // Failure density (count items per cluster)
  const failureMax = Math.max(...FAILURE_PATTERNS.map((f) => f.items.length));

  return (
    <>
      <TopBar title="Command Center · Cross-Functional Analytics" breadcrumb="NST 2026" />
      <main className="relative flex-1 px-6 py-8 lg:px-10 lg:py-10 space-y-8">
        {/* HERO */}
        <section className="glass-strong relative overflow-hidden rounded-2xl p-6 lg:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-primary/80">
                Operating Console · v2
              </p>
              <h2 className="mt-2 font-mono text-2xl tracking-tight lg:text-4xl">
                Track <span className="gold-text">command center</span>
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Live cross-section of the 10 Track-Level Outcomes, course-level outcomes, weekly
                execution plans and assessment weightages — wired into the same data model that
                drives every other page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/outcomes"
                className="rounded-md border border-border/60 bg-background/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest hover:bg-accent/40"
              >
                Outcomes ↗
              </Link>
              <Link
                to="/syllabus"
                className="rounded-md border border-border/60 bg-background/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest hover:bg-accent/40"
              >
                Syllabus ↗
              </Link>
              <Link
                to="/course/$courseId"
                params={{ courseId: "entrepreneurship-1" }}
                className="rounded-md border border-primary/40 bg-primary/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-primary/25"
              >
                Course Designer ↗
              </Link>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {TRACK_KPIS.map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-border/60 bg-background/30 p-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-1 font-mono text-xl tracking-tight text-foreground">{k.value}</p>
                <p className="font-mono text-[10px] text-muted-foreground/70">{k.unit}</p>
              </div>
            ))}
          </div>
        </section>

        <Tabs defaultValue="coverage" className="w-full">
          <TabsList className="bg-background/40">
            <TabsTrigger value="coverage" className="font-mono text-xs">
              <Layers className="mr-2 h-3.5 w-3.5" />
              TLO × Semester
            </TabsTrigger>
            <TabsTrigger value="cotlo" className="font-mono text-xs">
              <GitBranch className="mr-2 h-3.5 w-3.5" />
              CO × TLO
            </TabsTrigger>
            <TabsTrigger value="weight" className="font-mono text-xs">
              <Target className="mr-2 h-3.5 w-3.5" />
              Assessment Weight
            </TabsTrigger>
            <TabsTrigger value="cluster" className="font-mono text-xs">
              <Activity className="mr-2 h-3.5 w-3.5" />
              Capability Clusters
            </TabsTrigger>
            <TabsTrigger value="failure" className="font-mono text-xs">
              <AlertTriangle className="mr-2 h-3.5 w-3.5" />
              Failure Density
            </TabsTrigger>
          </TabsList>

          {/* HEATMAP TLO x SEMESTER */}
          <TabsContent value="coverage" className="mt-4">
            <div className="glass-strong rounded-2xl p-5 lg:p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="font-mono text-lg">TLO Coverage Heatmap</h3>
                  <p className="text-xs text-muted-foreground">
                    Click any TLO row to drill into its full statement. Strength shades show how
                    deeply each semester reinforces the outcome.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {STRENGTH_BG.map((bg, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className={`h-3 w-6 rounded-sm border border-border/40 ${bg}`} />
                      {STRENGTH_LABEL[i]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-160 border-collapse font-mono text-xs">
                  <thead>
                    <tr className="text-left">
                      <th className="w-72 pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Outcome
                      </th>
                      {[1, 2, 3, 4].map((s) => (
                        <th
                          key={s}
                          className="pb-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                        >
                          S{s}
                        </th>
                      ))}
                      <th className="pb-2 pl-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Verb tier
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TLOS_EXT.map((t) => {
                      const cov = TLO_SEMESTER_COVERAGE[t.id];
                      const active = selectedTlo === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTlo(active ? null : t.id)}
                          className={`cursor-pointer border-t border-border/30 transition ${active ? "bg-primary/5" : "hover:bg-accent/20"}`}
                        >
                          <td className="py-2 pr-3">
                            <HoverCard openDelay={120}>
                              <HoverCardTrigger asChild>
                                <div>
                                  <span className="text-primary">{t.id}</span> ·{" "}
                                  <span className="text-foreground">{t.short}</span>
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="glass-strong w-80 border-border/60 text-xs">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-primary/80">
                                  {t.id} · {t.verbTier}
                                </p>
                                <p className="mt-2 text-sm">{t.statement}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {t.clusters.map((c) => (
                                    <Badge
                                      key={c}
                                      variant="outline"
                                      className="font-mono text-[10px]"
                                    >
                                      C{c} · {CAPABILITY_CLUSTERS[c - 1].name}
                                    </Badge>
                                  ))}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </td>
                          {cov.map((v, i) => (
                            <td key={i} className="px-1 py-2">
                              <div
                                className={`mx-auto h-7 w-full rounded-sm border border-border/40 ${STRENGTH_BG[v]} transition`}
                                title={STRENGTH_LABEL[v]}
                              />
                            </td>
                          ))}
                          <td className="py-2 pl-3 text-muted-foreground">{t.verbTier}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedTlo && (
                <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  {(() => {
                    const t = TLOS_EXT.find((x) => x.id === selectedTlo)!;
                    return (
                      <>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                          {t.id} · {t.short}
                        </p>
                        <p className="mt-1 text-sm">{t.statement}</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </TabsContent>

          {/* CO x TLO MAP */}
          <TabsContent value="cotlo" className="mt-4">
            <div className="glass-strong rounded-2xl p-5 lg:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-mono text-lg">
                    Course CO → TLO Mapping{" "}
                    <span className="text-muted-foreground">· Entrepreneurship 1</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Backward-design cascade: every Course Outcome traces upward to at least one
                    Track-Level Outcome.
                  </p>
                </div>
                <Link
                  to="/course/$courseId"
                  params={{ courseId: "entrepreneurship-1" }}
                  className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
                >
                  Open course <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-205 border-collapse font-mono text-xs">
                  <thead>
                    <tr>
                      <th className="w-80 pb-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                        CO statement
                      </th>
                      {TLOS_EXT.map((t) => (
                        <th
                          key={t.id}
                          className="pb-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground"
                        >
                          {t.id.replace("TLO-", "T")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coTloRows.map((row) => (
                      <tr key={row.coId} className="border-t border-border/30">
                        <td className="py-2 pr-3">
                          <span className="text-primary">{row.coId}</span>
                          <span className="ml-2 text-muted-foreground">
                            {row.statement.slice(0, 70)}…
                          </span>
                        </td>
                        {row.map.map((v, i) => (
                          <td key={i} className="px-1 py-2 text-center">
                            <div
                              className={`mx-auto h-6 w-6 rounded-sm border border-border/40 ${v ? "bg-primary/70" : "bg-muted/15"}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ASSESSMENT WEIGHT BAR */}
          <TabsContent value="weight" className="mt-4">
            <div className="glass-strong rounded-2xl p-5 lg:p-6">
              <h3 className="font-mono text-lg">
                Assessment Weight Distribution{" "}
                <span className="text-muted-foreground">· Entrepreneurship 1</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Total weight: {totalWeight}% · Execution-heavy by design (80%+ on doing, not
                memorising).
              </p>

              {/* Stacked bar */}
              <div className="mt-5 flex h-10 w-full overflow-hidden rounded-md border border-border/40">
                {sem1.assessments.map((a, i) => (
                  <HoverCard key={a.name} openDelay={100}>
                    <HoverCardTrigger asChild>
                      <div
                        className="flex items-center justify-center font-mono text-[10px] text-background transition hover:opacity-80"
                        style={{
                          width: `${a.weight}%`,
                          background: `hsl(${(i * 47) % 360} 60% ${55 - i * 2}%)`,
                        }}
                      >
                        {a.weight}%
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="glass-strong w-72 border-border/60 text-xs">
                      <p className="font-mono text-sm text-foreground">{a.name}</p>
                      <p className="mt-1 text-muted-foreground">{a.proves}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.cos.map((c) => (
                          <Badge key={c} variant="outline" className="font-mono text-[10px]">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sem1.assessments.map((a, i) => (
                  <div
                    key={a.name}
                    className="rounded-lg border border-border/60 bg-background/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-foreground">{a.name}</p>
                      <span className="font-mono text-[11px] text-primary">{a.weight}%</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/30">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${a.weight * 5}%`,
                          background: `hsl(${(i * 47) % 360} 60% 55%)`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{a.doVerb}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* CLUSTER RADAR (bar variant) */}
          <TabsContent value="cluster" className="mt-4">
            <div className="glass-strong rounded-2xl p-5 lg:p-6">
              <h3 className="font-mono text-lg">Capability Cluster Activation</h3>
              <p className="text-xs text-muted-foreground">
                How frequently each capability cluster is referenced across the 10 TLOs.
              </p>
              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                {clusterFreq.map(({ cluster, count }) => (
                  <div
                    key={cluster.id}
                    className="rounded-xl border border-border/60 bg-background/30 p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                      Cluster {cluster.id}
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">{cluster.name}</p>
                    <div className="mt-3 flex h-24 items-end">
                      <div className="flex w-full items-end gap-1">
                        {Array.from({ length: maxCluster }).map((_, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm ${i < count ? "bg-primary/70" : "bg-muted/20"}`}
                            style={{ height: `${((i + 1) / maxCluster) * 100}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                      {count} of {TLOS_EXT.length} TLOs
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cluster.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" className="font-mono text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* FAILURE DENSITY */}
          <TabsContent value="failure" className="mt-4">
            <div className="glass-strong rounded-2xl p-5 lg:p-6">
              <h3 className="font-mono text-lg">Failure Pattern Density</h3>
              <p className="text-xs text-muted-foreground">
                Anti-patterns the track actively flags during reviews. Density shows the surface
                area each cluster covers in the evaluation rubric.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {FAILURE_PATTERNS.map((f) => (
                  <div
                    key={f.cluster}
                    className="rounded-xl border border-border/60 bg-background/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm text-foreground">{f.cluster}</p>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {f.items.length} flags
                      </Badge>
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-muted/30">
                      <div
                        className="h-full rounded-full bg-destructive/70"
                        style={{ width: `${(f.items.length / failureMax) * 100}%` }}
                      />
                    </div>
                    <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                      {f.items.map((i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-destructive">×</span>
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA STRIP */}
        <section className="glass-strong flex flex-col items-start justify-between gap-3 rounded-2xl p-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm">Course Designer · backward-design cascade</p>
              <p className="text-xs text-muted-foreground">
                Full COs, transfer tasks, 16-week plan, rubric bands and forward handoff for
                Entrepreneurship 1.
              </p>
            </div>
          </div>
          <Link
            to="/course/$courseId"
            params={{ courseId: "entrepreneurship-1" }}
            className="rounded-md border border-primary/40 bg-primary/15 px-4 py-2 font-mono text-xs uppercase tracking-widest text-primary hover:bg-primary/25"
          >
            Open Course Designer →
          </Link>
        </section>
      </main>
    </>
  );
}

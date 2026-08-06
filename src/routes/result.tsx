import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Loader2,
  FolderPlus,
  Lock,
  ShieldAlert,
  X,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ResultSearch {
  studentId?: string;
}

export const Route = createFileRoute("/result")({
  validateSearch: (search: Record<string, unknown>): ResultSearch => {
    return {
      studentId: search.studentId ? String(search.studentId) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Venture KPIs & Evaluation · NST Entrepreneurship" },
      {
        name: "description",
        content: "Track venture metrics, KPIs, and evaluation grades.",
      },
    ],
  }),
  component: Page,
});

interface Subcategory {
  id?: string;
  name: string;
  obtainGrade: string;
  totalGrade: number;
}

interface KPI {
  id: string;
  name: string;
  obtainGrade: string;
  totalGrade: number;
  subcategories?: Subcategory[];
}

interface Venture {
  id: string;
  subject: string;
  studentName: string;
  rollNo: string;
  kpis: KPI[];
}

function Page() {
  const { studentId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const canEdit = isAdmin || isSuperAdmin;

  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Add Venture Modal State
  const [ventureModalOpen, setVentureModalOpen] = useState(false);
  const [ventureSubject, setVentureSubject] = useState("");
  const [ventureStudentName, setVentureStudentName] = useState("");
  const [ventureRollNo, setVentureRollNo] = useState("");
  const [submittingVenture, setSubmittingVenture] = useState(false);

  // Add/Edit KPI Modal State
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [targetVentureId, setTargetVentureId] = useState<string>("");
  const [kpiName, setKpiName] = useState("");
  const [kpiObtain, setKpiObtain] = useState("");
  const [kpiTotal, setKpiTotal] = useState<number>(10);
  const [subgradesList, setSubgradesList] = useState<Subcategory[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchVentureData();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading, studentId, canEdit]);

  const fetchVentureData = async () => {
    setLoading(true);
    setAccessDeniedMessage(null);
    try {
      let userRollNo: string | null = null;
      if (user) {
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        userRollNo = (userRole as any)?.roll_no || null;
      }

      let query = supabase
        .from("ventures")
        .select(`
          id,
          subject,
          student_name,
          roll_no,
          user_id,
          created_at,
          venture_kpis (
            id,
            name,
            obtain_grade,
            total_grade,
            created_at,
            kpi_subcategories (
              id,
              name,
              obtain_grade,
              total_grade,
              created_at
            )
          )
        `)
        .order("created_at", { ascending: true });

      if (!canEdit && user) {
        const orConditions: string[] = [`user_id.eq.${user.id}`];

        if (userRollNo && userRollNo.trim()) {
          orConditions.push(`roll_no.ilike.${userRollNo.trim()}`);
          orConditions.push(`student_name.ilike.${userRollNo.trim()}`);
        }
        if (user.email && user.email.trim()) {
          orConditions.push(`roll_no.ilike.${user.email.trim()}`);
          orConditions.push(`student_name.ilike.${user.email.trim()}`);
        }
        if (user.user_metadata?.roll_no) {
          orConditions.push(`roll_no.ilike.${String(user.user_metadata.roll_no).trim()}`);
        }
        if (user.user_metadata?.full_name) {
          orConditions.push(`student_name.ilike.${String(user.user_metadata.full_name).trim()}`);
        }

        query = query.or(orConditions.join(","));
      }

      if (studentId) {
        query = query.eq("id", studentId);
      }

      const { data: venturesData, error: vError } = await query;

      if (vError) {
        console.error("Supabase ventures query error:", vError);
        toast.error("Failed to load ventures from database");
        setVentures([]);
        setLoading(false);
        return;
      }

      if (!venturesData || venturesData.length === 0) {
        if (studentId && !canEdit) {
          setAccessDeniedMessage(
            "Access Denied: You are only authorized to view your own result.",
          );
          toast.error("Access Denied: You can only view your own result.");
        }
        setVentures([]);
        setLoading(false);
        return;
      }

      const formattedVentures: Venture[] = (venturesData as any[]).map((v) => {
        const sortedKpis = (v.venture_kpis || []).sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        const vKpis: KPI[] = sortedKpis.map((k: any) => {
          const sortedSubs = (k.kpi_subcategories || []).sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );

          const kSubs: Subcategory[] = sortedSubs.map((s: any) => ({
            id: s.id,
            name: s.name,
            obtainGrade: s.obtain_grade,
            totalGrade: Number(s.total_grade),
          }));

          return {
            id: k.id,
            name: k.name,
            obtainGrade: k.obtain_grade,
            totalGrade: Number(k.total_grade),
            subcategories: kSubs.length > 0 ? kSubs : undefined,
          };
        });

        return {
          id: v.id,
          subject: v.subject,
          studentName: v.student_name,
          rollNo: v.roll_no || "",
          kpis: vKpis,
        };
      });

      setVentures(formattedVentures);
    } catch (err) {
      console.error("Error fetching ventures from Supabase:", err);
      setVentures([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    setOpenRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAddVentureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventureSubject.trim() || !ventureStudentName.trim()) {
      toast.error("Please fill in subject and student name.");
      return;
    }

    setSubmittingVenture(true);
    try {
      const { data, error } = await supabase
        .from("ventures")
        .insert([
          {
            subject: ventureSubject.trim(),
            student_name: ventureStudentName.trim(),
            roll_no: ventureRollNo.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) {
        toast.error(`Error creating venture: ${error.message}`);
      } else if (data) {
        toast.success(`Venture "${data.subject}" created successfully.`);
        setVentureModalOpen(false);
        setVentureSubject("");
        setVentureStudentName("");
        setVentureRollNo("");
        fetchVentureData();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Failed to create venture");
    } finally {
      setSubmittingVenture(false);
    }
  };

  const handleDeleteVenture = async (ventureId: string, subject: string) => {
    if (!confirm(`Are you sure you want to delete venture "${subject}" and all its KPIs?`)) return;

    try {
      const { error } = await supabase.from("ventures").delete().eq("id", ventureId);
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
      } else {
        toast.success(`Venture "${subject}" deleted.`);
        setVentures((prev) => prev.filter((v) => v.id !== ventureId));
        if (studentId) {
          navigate({ to: "/manageResult" });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      toast.error(message || "Failed to delete venture");
    }
  };

  const handleOpenAddKpi = (ventureId: string) => {
    setEditingKpiId(null);
    setTargetVentureId(ventureId);
    setKpiName("");
    setKpiObtain("");
    setKpiTotal(10);
    setSubgradesList([]);
    setKpiModalOpen(true);
  };

  const handleOpenEditKpi = (kpi: KPI, ventureId: string) => {
    setEditingKpiId(kpi.id);
    setTargetVentureId(ventureId);
    setKpiName(kpi.name);
    setKpiObtain(kpi.obtainGrade);
    setKpiTotal(kpi.totalGrade);
    setSubgradesList(kpi.subcategories ? kpi.subcategories.map((s) => ({ ...s })) : []);
    setKpiModalOpen(true);
  };

  const handleAddDraftSubgrade = () => {
    setSubgradesList((prev) => [...prev, { name: "", obtainGrade: "", totalGrade: 10 }]);
  };

  const handleUpdateDraftSubgrade = (
    index: number,
    field: keyof Subcategory,
    value: string | number,
  ) => {
    setSubgradesList((prev) =>
      prev.map((sub, i) => (i === index ? { ...sub, [field]: value } : sub)),
    );
  };

  const handleRemoveDraftSubgrade = (index: number) => {
    setSubgradesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddKpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName.trim()) {
      toast.error("Please enter a valid KPI name.");
      return;
    }

    setSubmitting(true);
    const validSubgrades = subgradesList
      .filter((s) => s.name.trim().length > 0)
      .map((s) => ({
        name: s.name.trim(),
        obtainGrade: s.obtainGrade.trim() || `${s.totalGrade}/${s.totalGrade}`,
        totalGrade: Number(s.totalGrade) || 10,
      }));

    try {
      const obtainGradeVal = kpiObtain.trim() || `${kpiTotal}/${kpiTotal}`;

      if (editingKpiId) {
        // --- EDIT EXISTING KPI ---
        const { error: kpiErr } = await supabase
          .from("venture_kpis")
          .update({
            name: kpiName.trim(),
            obtain_grade: obtainGradeVal,
            total_grade: Number(kpiTotal) || 10,
          })
          .eq("id", editingKpiId);

        if (kpiErr) {
          toast.error(`KPI update error: ${kpiErr.message}`);
          return;
        }

        // Replace subcategories
        await supabase.from("kpi_subcategories").delete().eq("kpi_id", editingKpiId);

        if (validSubgrades.length > 0) {
          await supabase.from("kpi_subcategories").insert(
            validSubgrades.map((sub) => ({
              kpi_id: editingKpiId,
              name: sub.name,
              obtain_grade: sub.obtainGrade,
              total_grade: sub.totalGrade,
            })),
          );
        }

        // Update local state
        const updatedKpi: KPI = {
          id: editingKpiId,
          name: kpiName.trim(),
          obtainGrade: obtainGradeVal,
          totalGrade: Number(kpiTotal) || 10,
          subcategories: validSubgrades.length > 0 ? validSubgrades : undefined,
        };

        setVentures((prev) =>
          prev.map((v) =>
            v.id === targetVentureId
              ? {
                  ...v,
                  kpis: v.kpis.map((k) => (k.id === editingKpiId ? updatedKpi : k)),
                }
              : v,
          ),
        );

        if (validSubgrades.length > 0) {
          setOpenRows((prev) => ({ ...prev, [editingKpiId]: true }));
        }

        setKpiModalOpen(false);
        toast.success(`KPI "${updatedKpi.name}" updated successfully.`);
      } else {
        // --- ADD NEW KPI ---
        const { data: kpiInsertData, error: kpiErr } = await supabase
          .from("venture_kpis")
          .insert([
            {
              venture_id: targetVentureId,
              name: kpiName.trim(),
              obtain_grade: obtainGradeVal,
              total_grade: Number(kpiTotal) || 10,
            },
          ])
          .select()
          .single();

        if (kpiErr) {
          toast.error(`KPI insert error: ${kpiErr.message}`);
          return;
        }

        const createdKpiId = kpiInsertData.id;

        if (validSubgrades.length > 0) {
          await supabase.from("kpi_subcategories").insert(
            validSubgrades.map((sub) => ({
              kpi_id: createdKpiId,
              name: sub.name,
              obtain_grade: sub.obtainGrade,
              total_grade: sub.totalGrade,
            })),
          );
        }

        // Update local state instantly
        const newKpi: KPI = {
          id: createdKpiId,
          name: kpiName.trim(),
          obtainGrade: obtainGradeVal,
          totalGrade: Number(kpiTotal) || 10,
          subcategories: validSubgrades,
        };

        setVentures((prev) =>
          prev.map((v) =>
            v.id === targetVentureId
              ? {
                  ...v,
                  kpis: [...v.kpis, newKpi],
                }
              : v,
          ),
        );

        if (validSubgrades.length > 0) {
          setOpenRows((prev) => ({ ...prev, [createdKpiId]: true }));
        }

        setKpiModalOpen(false);
        toast.success(
          `KPI "${newKpi.name}" added successfully${
            validSubgrades.length > 0 ? ` with ${validSubgrades.length} subgrades` : ""
          }.`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      toast.error(message || "Failed to save KPI");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKpi = async (kpiId: string, kpiNameStr: string, ventureId: string) => {
    if (!confirm(`Are you sure you want to delete KPI "${kpiNameStr}"?`)) return;

    try {
      const { error } = await supabase.from("venture_kpis").delete().eq("id", kpiId);
      if (error) {
        toast.error(`Delete KPI error: ${error.message}`);
      } else {
        toast.success(`KPI "${kpiNameStr}" deleted.`);
        setVentures((prev) =>
          prev.map((v) =>
            v.id === ventureId
              ? {
                  ...v,
                  kpis: v.kpis.filter((k) => k.id !== kpiId),
                }
              : v,
          ),
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      toast.error(message || "Failed to delete KPI");
    }
  };

  if (authLoading || loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <>
      <TopBar title="Venture KPIs & Evaluation Grades" breadcrumb="Governance & Outcomes" />
      <main className="flex-1 space-y-8 px-6 py-8 lg:px-10 lg:py-10">
        {accessDeniedMessage ? (
          <div className="glass-strong max-w-lg mx-auto rounded-2xl p-8 text-center space-y-4 border-destructive/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 ring-1 ring-destructive/40 mx-auto text-destructive">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="font-mono text-xl tracking-tight text-foreground font-semibold">
              Unauthorized Result Access
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {accessDeniedMessage}
            </p>
            <div className="pt-2">
              <Link to="/result">
                <Button className="font-mono text-xs uppercase tracking-wider">
                  View My Authorized Result
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Header Info & Add Venture Button */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/80">
                Evaluation &amp; Performance
              </p>
              <h2 className="font-mono text-2xl tracking-tight">Student Venture KPIs</h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {canEdit && studentId && (
                <Link to="/manageResult">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs border-primary/30 text-primary cursor-pointer"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" /> Back to Manage Results
                  </Button>
                </Link>
              )}
              {canEdit && (
                <Button
                  onClick={() => setVentureModalOpen(true)}
                  className="font-mono text-xs uppercase tracking-wider cursor-pointer"
                >
                  <FolderPlus className="mr-1.5 h-4 w-4" />
                  Add Venture Project
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Ventures List */}
        {!accessDeniedMessage && ventures.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center font-mono text-sm text-muted-foreground space-y-4">
            <p>No venture KPI records found.</p>
            {studentId && canEdit && (
              <div>
                <Link to="/manageResult">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs border-primary/30 text-primary cursor-pointer"
                  >
                    ← Back to Manage Results
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          ventures.map((venture) => (
            <div key={venture.id} className="space-y-3">
              {/* Venture Title Banner */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-mono text-lg font-semibold tracking-tight gold-text">
                    {venture.subject}
                  </h3>
                  {venture.studentName && (
                    <Badge variant="outline" className="font-mono text-xs border-primary/30">
                      Student: {venture.studentName} {venture.rollNo && `(Roll: ${venture.rollNo})`}
                    </Badge>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddKpi(venture.id)}
                      className="font-mono text-xs border-primary/30 text-primary cursor-pointer"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add KPI
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVenture(venture.id, venture.subject)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <section className="glass-strong overflow-hidden rounded-2xl">
                <div>
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-3 border-b border-border/50 bg-background/40 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <div className="col-span-7 sm:col-span-8">KPI</div>
                    <div className="col-span-2">Obtained</div>
                    <div className="col-span-2 sm:col-span-1">Total</div>
                    {canEdit && <div className="col-span-1 text-right">Action</div>}
                  </div>

                  {/* KPI List */}
                  {venture.kpis.length === 0 ? (
                    <div className="p-6 text-center text-xs font-mono text-muted-foreground">
                      No KPIs added for this venture yet.
                      {canEdit && (
                        <span
                          className="block mt-1 text-primary cursor-pointer hover:underline"
                          onClick={() => handleOpenAddKpi(venture.id)}
                        >
                          + Add the first KPI
                        </span>
                      )}
                    </div>
                  ) : (
                    venture.kpis.map((kpi, kpiIdx) => {
                      const hasSubcategories = Boolean(
                        kpi.subcategories && kpi.subcategories.length > 0,
                      );
                      const isOpen = Boolean(openRows[kpi.id]);

                      return (
                        <div
                          key={kpi.id || kpiIdx}
                          className="border-b border-border/30 last:border-b-0"
                        >
                          <div
                            onClick={() => hasSubcategories && toggleRow(kpi.id)}
                            className={`grid grid-cols-12 items-center gap-3 px-5 py-4 transition-colors ${
                              hasSubcategories ? "cursor-pointer hover:bg-background/60" : ""
                            }`}
                          >
                            <div className="col-span-7 sm:col-span-8">
                              <div className="flex items-center gap-2">
                                {hasSubcategories &&
                                  (isOpen ? (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  ))}
                                <p className="font-mono text-sm">{kpi.name}</p>
                              </div>
                            </div>
                            <div className="col-span-2 text-xs font-mono text-muted-foreground">
                              {kpi.obtainGrade}
                            </div>
                            <div className="col-span-2 sm:col-span-1 text-xs font-mono text-muted-foreground">
                              {kpi.totalGrade}
                            </div>

                            {canEdit && (
                              <div className="col-span-1 text-right flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditKpi(kpi, venture.id);
                                  }}
                                  className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                                  title="Edit KPI"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteKpi(kpi.id, kpi.name, venture.id);
                                  }}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                                  title="Delete KPI"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {hasSubcategories && isOpen && (
                            <div className="bg-background/20 pl-6 border-t border-border/10">
                              {kpi.subcategories?.map((sub, sIdx) => (
                                <div
                                  key={sub.id || sIdx}
                                  className="grid grid-cols-12 gap-3 px-5 py-2 text-[11px] font-mono text-muted-foreground border-b border-border/5 last:border-0"
                                >
                                  <div className="col-span-7 sm:col-span-8 italic">└ {sub.name}</div>
                                  <div className="col-span-2">{sub.obtainGrade}</div>
                                  <div className="col-span-3 sm:col-span-2">{sub.totalGrade}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          ))
        )}

        {/* Modal: Add Venture */}
        <Dialog open={ventureModalOpen} onOpenChange={setVentureModalOpen}>
          <DialogContent className="glass-strong max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono text-lg flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary" />
                Add New Venture Project
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddVentureSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label className="font-mono text-[10px] uppercase">Subject</Label>
                <Input
                  value={ventureSubject}
                  onChange={(e) => setVentureSubject(e.target.value)}
                  className="bg-background/50 font-mono text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-mono text-[10px] uppercase">Student Name</Label>
                  <Input
                    value={ventureStudentName}
                    onChange={(e) => setVentureStudentName(e.target.value)}
                    className="bg-background/50 font-mono text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-mono text-[10px] uppercase">Roll No</Label>
                  <Input
                    value={ventureRollNo}
                    onChange={(e) => setVentureRollNo(e.target.value)}
                    className="bg-background/50 font-mono text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submittingVenture}>
                  {submittingVenture ? <Loader2 className="animate-spin" /> : "Save Venture"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Add/Edit KPI */}
        <Dialog open={kpiModalOpen} onOpenChange={setKpiModalOpen}>
          <DialogContent className="glass-strong border-border/60 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono text-lg flex items-center gap-2">
                {editingKpiId ? (
                  <Pencil className="h-4 w-4 text-primary" />
                ) : (
                  <Plus className="h-4 w-4 text-primary" />
                )}
                {editingKpiId ? "Edit KPI" : "Add New KPI"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddKpiSubmit} className="space-y-5 py-2">
              <div className="space-y-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  KPI / Metric Name
                </Label>
                <Input
                  placeholder="e.g. Market Research & Validation"
                  value={kpiName}
                  onChange={(e) => setKpiName(e.target.value)}
                  className="bg-background/40 font-mono text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Obtained Grade / Marks
                  </Label>
                  <Input
                    placeholder="e.g. 8.5/10"
                    value={kpiObtain}
                    onChange={(e) => setKpiObtain(e.target.value)}
                    className="bg-background/40 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Total Marks
                  </Label>
                  <Input
                    type="number"
                    value={kpiTotal}
                    onChange={(e) => setKpiTotal(Number(e.target.value))}
                    className="bg-background/40 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Subgrades / Subcategories (Optional)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDraftSubgrade}
                    className="h-7 font-mono text-[11px] border-primary/30 hover:bg-primary/10 text-primary cursor-pointer"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Subgrade
                  </Button>
                </div>

                {subgradesList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic font-mono">
                    No subgrades added. Click above to break this KPI into granular metrics.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {subgradesList.map((sub, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border/40 bg-background/30 p-2"
                      >
                        <div className="col-span-5">
                          <Input
                            placeholder="Subgrade name"
                            value={sub.name}
                            onChange={(e) =>
                              handleUpdateDraftSubgrade(idx, "name", e.target.value)
                            }
                            className="h-8 bg-background/50 font-mono text-xs"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="Obtained (e.g. 4)"
                            value={sub.obtainGrade}
                            onChange={(e) =>
                              handleUpdateDraftSubgrade(idx, "obtainGrade", e.target.value)
                            }
                            className="h-8 bg-background/50 font-mono text-xs"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Total (e.g. 10)"
                            value={sub.totalGrade}
                            onChange={(e) =>
                              handleUpdateDraftSubgrade(
                                idx,
                                "totalGrade",
                                Number(e.target.value),
                              )
                            }
                            className="h-8 bg-background/50 font-mono text-xs"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftSubgrade(idx)}
                            className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setKpiModalOpen(false)}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="font-mono text-xs uppercase tracking-wider"
                >
                  {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingKpiId ? "Save Changes" : "Save KPI"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}

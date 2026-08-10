import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { canManageVentures } from "@/lib/permissions";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/manageResult")({
  component: () => (
    <RoleGate>
      <RouteComponent />
    </RoleGate>
  ),
});

interface StudentRecord {
  id: string;
  roll_no: string;
  name: string;
  subject?: string;
  mentor_id: string | null;
}

type Mentor = { user_id: string; email: string | null };

const UNASSIGNED = "__unassigned__";

function RouteComponent() {
  const { isStaff, role, user } = useAuth();
  const canManage = isStaff;
  const canAssign = role !== null && user !== null && canManageVentures({ userId: user.id, role });

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (canManage) {
      fetchStudents();
    } else {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return;
    supabase
      .from("user_roles")
      .select("user_id, email")
      .eq("role", "mentor")
      .order("email")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading mentors:", error);
          return;
        }
        setMentors(data ?? []);
      });
  }, [canManage]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ventures")
        .select("*")
        .order("created_at", { ascending: true });

      if (error || !data) {
        setStudents([]);
      } else {
        const formatted = data.map((item, idx) => ({
          id: item.id,
          roll_no: item.roll_no || `${idx + 1}`,
          name: item.student_name,
          subject: item.subject,
          mentor_id: item.mentor_id,
        }));
        setStudents(formatted);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const mentorLabel = (id: string | null) => {
    if (!id) return null;
    const m = mentors.find((x) => x.user_id === id);
    return m?.email ?? `Mentor ${id.slice(0, 8)}`;
  };

  const assignMentor = async (ventureId: string, value: string) => {
    const mentorId = value === UNASSIGNED ? null : value;
    setSavingId(ventureId);
    const { error } = await supabase
      .from("ventures")
      .update({ mentor_id: mentorId })
      .eq("id", ventureId);
    setSavingId(null);

    if (error) {
      toast.error(`Could not assign mentor: ${error.message}`);
      return;
    }
    setStudents((prev) =>
      prev.map((s) => (s.id === ventureId ? { ...s, mentor_id: mentorId } : s)),
    );
    toast.success(mentorId ? `Mentor set to ${mentorLabel(mentorId)}.` : "Mentor cleared.");
  };

  if (!canManage) {
    return (
      <>
        <TopBar title="Credit & Evaluation Architecture" breadcrumb="Governance & Outcomes" />
        <main className="flex-1 px-6 py-12 lg:px-10">
          <div className="glass-strong max-w-xl mx-auto rounded-2xl p-10 text-center space-y-4">
            <h2 className="font-mono text-xl tracking-tight text-foreground font-semibold">
              Faculty Access Required
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The student directory and result management portal is reserved for administrators and
              faculty members.
            </p>
            <div className="pt-2">
              <Link to="/result">
                <Button className="font-mono text-xs uppercase tracking-wider">
                  View My Result
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Credit & Evaluation Architecture" breadcrumb="Governance & Outcomes" />
      <main className="flex-1 space-y-8 px-6 py-8 lg:px-10 lg:py-10">
        <section className="glass-strong overflow-hidden rounded-2xl">
          <div className="grid grid-cols-12 gap-3 border-b border-border/50 bg-background/40 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <div className="col-span-2">Roll no.</div>
            <div className="col-span-4">Student Name</div>
            <div className="col-span-3">Venture / Subject</div>
            <div className="col-span-3">Mentor</div>
          </div>

          {loading ? (
            <div className="flex h-24 items-center justify-center font-mono text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
              Loading student directory from Supabase...
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center space-y-3 font-mono text-xs text-muted-foreground">
              <p>No student venture records found in database.</p>
              <Link to="/result">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs border-primary/30 text-primary"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Go to /result to Add Venture
                </Button>
              </Link>
            </div>
          ) : (
            students.map((student, idx) => (
              <div
                key={student.id || idx}
                className="grid grid-cols-12 items-center border-b border-border/30 px-5 py-4 last:border-b-0"
              >
                <div className="col-span-2 text-xs font-mono text-muted-foreground">
                  {student.roll_no}
                </div>

                {/* name */}
                <Link to="/result" search={{ studentId: student.id }} className="col-span-4">
                  <div className="flex items-center gap-2 hover:text-primary transition-colors">
                    <p className="font-mono text-sm font-medium">{student.name}</p>
                  </div>
                </Link>

                <div className="col-span-3 text-xs font-mono text-muted-foreground">
                  {student.subject || "Entrepreneurship Project"}
                </div>

                <div className="col-span-3">
                  {canAssign ? (
                    <Select
                      value={student.mentor_id ?? UNASSIGNED}
                      disabled={savingId === student.id}
                      onValueChange={(v) => assignMentor(student.id, v)}
                    >
                      <SelectTrigger className="h-8 w-full font-mono text-xs">
                        <SelectValue
                          placeholder={mentors.length ? "Assign mentor" : "No mentors yet"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED} className="font-mono text-xs">
                          Unassigned
                        </SelectItem>
                        {mentors.map((m) => (
                          <SelectItem
                            key={m.user_id}
                            value={m.user_id}
                            className="font-mono text-xs"
                          >
                            {m.email ?? `Mentor ${m.user_id.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-mono text-xs text-muted-foreground">
                      {mentorLabel(student.mentor_id) ?? "Unassigned"}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}

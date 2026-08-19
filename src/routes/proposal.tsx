import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  canReviewProposal,
  mustPickMentorToAccept,
  resolveMentorForAccept,
  type Actor,
} from "@/lib/permissions";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Clock, Check, X } from "lucide-react";
import { fetchMentors, fetchProposals } from "./-proposal.functions";

export const Route = createFileRoute("/proposal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Venture Proposals · NST Entrepreneurship" },
      {
        name: "description",
        content: "Review and manage student venture proposals.",
      },
    ],
  }),
  loader: async () => ({ proposals: await fetchProposals() }),
  component: Page,
});

type Mentor = { user_id: string; email: string | null };

const mentorLabel = (m?: Mentor) => m?.email ?? "unknown";

function Page() {
  const initialData = Route.useLoaderData();
  const [proposals, setProposals] = useState(initialData.proposals);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorChoice, setMentorChoice] = useState<Record<number, string>>({});

  const { role, user } = useAuth();

  const actor: Actor | null = user && role ? { userId: user.id, role } : null;
  const canManage = actor !== null && canReviewProposal(actor);
  const mustPickMentor = actor !== null && mustPickMentorToAccept(actor);

  useEffect(() => {
    if (!mustPickMentor) return;
    fetchMentors()
      .then(setMentors)
      .catch((err: unknown) => {
        console.error("Error loading mentors:", err);
      });
  }, [mustPickMentor]);

  const handleApproval = async (accepted: boolean, proposal_id: number) => {
    if (!canManage || !actor) return;

    let mentorId: string | null = null;
    if (accepted) {
      mentorId = resolveMentorForAccept(actor, mentorChoice[proposal_id] ?? null);
      if (!mentorId) {
        toast.error("Assign a mentor before accepting this proposal.");
        return;
      }
    }

    const status = accepted ? "accepted" : "rejected";
    setLoadingId(proposal_id);

    try {
      const { data: _, error } = await supabase
        .from("proposal")
        .update({ status })
        .eq("id", proposal_id)
        .select();

      if (error) {
        toast.error(`Failed to update proposal: ${error.message}`);
        console.error("Proposal update error:", error);
        return;
      }

      setProposals((prev) => prev?.map((p) => (p.id === proposal_id ? { ...p, status } : p)) ?? []);

      if (accepted) {
        const target = proposals?.find((p) => p.id === proposal_id);
        if (target) {
          const submitter = target.user_roles;

          const { error: vError } = await supabase.from("ventures").insert([
            {
              user_id: target.user_id,
              mentor_id: mentorId,
              student_name: submitter?.email?.trim() ?? `Proposal #${target.id}`,
              subject: target.subject || target.venture || "Entrepreneurship Venture",
              roll_no: submitter?.roll_no?.trim() || `${target.id}`,
            },
          ]);

          if (vError) {
            console.error("Auto venture creation notice:", vError.message);
          } else {
            const mentorNote =
              mentorId === actor.userId
                ? "You are assigned as mentor."
                : `Mentor assigned: ${mentorLabel(mentors.find((m) => m.user_id === mentorId))}.`;
            toast.success(
              `Proposal accepted! Student "${submitter?.email?.trim() ?? `#${target.id}`}" added to Manage Result. ${mentorNote}`,
            );
          }
        }
      } else {
        toast.info("Proposal rejected.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "An unexpected error occurred.");
    } finally {
      setLoadingId(null);
    }
  };

  const renderStatusBadge = (status: string | null) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-mono text-xs py-1 px-2.5">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="font-mono text-xs py-1 px-2.5">
            <XCircle className="mr-1 h-3.5 w-3.5" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="font-mono text-xs text-amber-400 border-amber-400/30 py-1 px-2.5"
          >
            <Clock className="mr-1 h-3.5 w-3.5" /> Pending
          </Badge>
        );
    }
  };

  return (
    <>
      <TopBar title="Credit & Evaluation Architecture" breadcrumb="Governance & Outcomes" />
      <main className="flex-1 space-y-8 px-6 py-8 lg:px-10 lg:py-10">
        <section className="glass-strong overflow-hidden rounded-2xl">
          <div className="grid grid-cols-12 gap-3 border-b border-border/50 bg-background/40 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <div className="col-span-3">Student Name</div>
            <div className="col-span-2">Subject</div>
            <div className="col-span-4">Venture Idea</div>
            <div className="col-span-3"> {canManage ? "Action & Status" : "Status"}</div>
          </div>

          {!proposals || proposals.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-muted-foreground">
              No proposal submissions found. Use "Apply Now" to submit a venture proposal.
            </div>
          ) : (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="grid grid-cols-12 items-center gap-3 border-b border-border/30 px-5 py-4 last:border-b-0"
              >
                <div className="col-span-3">
                  <p className="font-mono text-sm font-medium">
                    {proposal.user_roles?.email ?? "Unknown submitter"}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground/70">
                    {proposal.user_roles?.roll_no ?? "—"}
                  </p>
                </div>

                <div className="col-span-2 text-xs font-mono text-muted-foreground">
                  {proposal.subject}
                </div>

                <div className="col-span-4 text-xs font-mono text-muted-foreground">
                  {proposal.venture}
                </div>

                <div className="col-span-3 flex items-center gap-2">
                  {canManage && (proposal.status === "pending" || !proposal.status) ? (
                    <div className="flex flex-wrap items-center gap-2.5">
                      {mustPickMentor && (
                        <Select
                          value={mentorChoice[proposal.id] ?? ""}
                          onValueChange={(v) =>
                            setMentorChoice((prev) => ({ ...prev, [proposal.id]: v }))
                          }
                        >
                          <SelectTrigger className="h-8 w-full font-mono text-xs">
                            <SelectValue
                              placeholder={mentors.length ? "Assign mentor" : "No mentors yet"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {mentors.map((m) => (
                              <SelectItem
                                key={m.user_id}
                                value={m.user_id}
                                className="font-mono text-xs"
                              >
                                {mentorLabel(m)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        size="sm"
                        disabled={
                          loadingId === proposal.id ||
                          (mustPickMentor && !mentorChoice[proposal.id])
                        }
                        onClick={() => handleApproval(true, proposal.id)}
                        className="h-8 font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 border border-emerald-500/40 shadow-sm transition-all"
                      >
                        {loadingId === proposal.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        disabled={loadingId === proposal.id}
                        onClick={() => handleApproval(false, proposal.id)}
                        className="h-8 font-mono text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-3.5 border border-rose-500/40 shadow-sm transition-all"
                      >
                        {loadingId === proposal.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <X className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    renderStatusBadge(proposal.status)
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

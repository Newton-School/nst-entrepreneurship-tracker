import { useEffect, useState } from "react";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canEditKpi, canLockKpi, canUnlockKpi, type Actor } from "@/lib/permissions";

export interface GradeTarget {
  kpiId: string;
  ventureId: string;
  name: string;
  score: number | null;
  totalGrade: number;
  feedback: string | null;
  isLocked: boolean;
  ventureMentorId: string | null;
}

export function GradeDialog({
  target,
  open,
  onOpenChange,
  actor,
  onSaved,
}: {
  target: GradeTarget | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actor: Actor | null;
  onSaved: () => void;
}) {
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScore(target?.score != null ? String(target.score) : "");
    setFeedback(target?.feedback ?? "");
  }, [target]);

  if (!target) return null;

  const ctx = {
    ventureMentorId: target.ventureMentorId,
    isLocked: target.isLocked,
  };
  const canEdit = actor !== null && canEditKpi(actor, ctx);
  const canLock = actor !== null && canLockKpi(actor, ctx);
  const canUnlock = actor !== null && canUnlockKpi(actor, ctx);

  async function save(lock: boolean) {
    if (!target) return;
    const trimmed = score.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > target.totalGrade)) {
      toast.error(`Score must be a number between 0 and ${target.totalGrade}.`);
      return;
    }
    if (lock && parsed === null) {
      toast.error("Give a score before locking.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("venture_kpis")
      .update({
        score: parsed,
        feedback: feedback.trim() || null,
        ...(lock ? { is_locked: true } : {}),
      })
      .eq("id", target.kpiId);
    setSaving(false);

    if (error) {
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    toast.success(lock ? "Score saved and locked." : "Score saved.");
    onOpenChange(false);
    onSaved();
  }

  async function unlock() {
    if (!target) return;
    setSaving(true);
    const { error } = await supabase
      .from("venture_kpis")
      .update({ is_locked: false })
      .eq("id", target.kpiId);
    setSaving(false);

    if (error) {
      toast.error(`Could not unlock: ${error.message}`);
      return;
    }
    toast.success("KPI unlocked for editing.");
    onSaved();
  }

  const readOnly = !canEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm">
            {target.isLocked && <Lock className="h-3.5 w-3.5 text-amber-400" />}
            {target.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label
              htmlFor="grade-score"
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Score (out of {target.totalGrade})
            </Label>
            <Input
              id="grade-score"
              type="number"
              step="0.5"
              min={0}
              max={target.totalGrade}
              value={score}
              disabled={readOnly || saving}
              onChange={(e) => setScore(e.target.value)}
              className="mt-1.5 font-mono text-xs"
              placeholder="Not scored"
            />
          </div>

          <div>
            <Label
              htmlFor="grade-feedback"
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Feedback (optional)
            </Label>
            <Textarea
              id="grade-feedback"
              rows={3}
              value={feedback}
              disabled={readOnly || saving}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-1.5 font-mono text-xs"
              placeholder="Visible to the student."
            />
          </div>

          {target.isLocked && (
            <p className="font-mono text-[11px] text-amber-400">
              This score is locked. Only the academic board or an admin can change it.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {canUnlock && (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={unlock}
              className="font-mono text-xs"
            >
              <LockOpen className="mr-1.5 h-3.5 w-3.5" />
              Unlock
            </Button>
          )}
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => save(false)}
              className="font-mono text-xs"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          )}
          {canEdit && canLock && (
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                if (
                  window.confirm("Lock this score? You will not be able to edit it afterwards.")
                ) {
                  save(true);
                }
              }}
              className="font-mono text-xs"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Save &amp; Lock
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  LockOpen,
  FileCheck,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canEditKpi, canLockKpi, canUnlockKpi, type Actor } from "@/lib/permissions";
import { sendLockedKpiEmailsFn } from "@/lib/email/email.actions";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_NOTE_LENGTH = 1000;
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "rtf",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
]);

export interface KpiModalTarget {
  kpiId: string;
  ventureId: string;
  name: string;
  score: number | null;
  totalGrade: number;
  obtainGrade?: string | null;
  feedback: string | null;
  isLocked: boolean;
  dueDate: string | null;
  subject: string;
  studentName: string;
  rollNo?: string | null;
  studentId?: string | null;
  ventureMentorId: string | null;
}

export interface KpiSubmissionData {
  id: string;
  venture_id: string;
  kpi_id: string;
  student_id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  is_late: boolean;
  note: string | null;
  submitted_at: string;
}

export function KpiSubmissionModal({
  target,
  open,
  onOpenChange,
  actor,
  isStudentView = false,
  onSaved,
}: {
  target: KpiModalTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: Actor | null;
  isStudentView?: boolean;
  onSaved: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"submission" | "score">("submission");
  const [submission, setSubmission] = useState<KpiSubmissionData | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Student upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Evaluator scoring state
  const [scoreInput, setScoreInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  useEffect(() => {
    if (open && target) {
      fetchSubmission();
      setScoreInput(target.score != null ? String(target.score) : "");
      setFeedbackInput(target.feedback ?? "");
      setSelectedFile(null);
      setActiveTab("submission");
    } else {
      setSubmission(null);
      setSelectedFile(null);
      setNote("");
      setIsEditing(false);
    }
  }, [open, target]);

  const fetchSubmission = async () => {
    if (!target) return;
    setLoadingSubmission(true);
    try {
      const { data, error } = await supabase
        .from("kpi_submissions")
        .select("*")
        .eq("kpi_id", target.kpiId)
        .maybeSingle();

      if (error) {
        console.error("[SubmissionModal] Error fetching submission:", error);
      } else if (data) {
        setSubmission(data as KpiSubmissionData);
        setNote(data.note || "");
        setIsEditing(false);
      } else {
        setSubmission(null);
        setNote("");
        setIsEditing(true);
      }
    } catch (err) {
      console.error("[SubmissionModal] Failed to load submission:", err);
    } finally {
      setLoadingSubmission(false);
    }
  };

  if (!target) return null;

  const isDueDatePassed = Boolean(
    target.dueDate && !Number.isNaN(new Date(target.dueDate).getTime()) && new Date() > new Date(target.dueDate)
  );

  const isScoredOrLocked = target.isLocked || target.score !== null;
  const canStudentEdit = isStudentView && !isScoredOrLocked && !isDueDatePassed;

  const ctx = {
    ventureMentorId: target.ventureMentorId,
    isLocked: target.isLocked,
  };
  const canEvaluatorEdit = actor !== null && canEditKpi(actor, ctx);
  const canEvaluatorLock = actor !== null && canLockKpi(actor, ctx);
  const canEvaluatorUnlock = actor !== null && canUnlockKpi(actor, ctx);

  // File selection validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      toast.error(`File type '.${ext}' is not supported. Please upload a Document or ZIP file.`);
      return;
    }

    setSelectedFile(file);
    toast.success(`Selected file: ${file.name}`);
  };

  // Handle Student Submit / Update
  const handleSubmitSubmission = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile && !submission) {
      toast.error("Please upload an evidence file before submitting.");
      return;
    }

    if (note.length > MAX_NOTE_LENGTH) {
      toast.error(`Supporting explanation must not exceed ${MAX_NOTE_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("kpiId", target.kpiId);
      formData.append("ventureId", target.ventureId);
      if (target.studentId) formData.append("studentId", target.studentId);
      formData.append("note", note);
      if (selectedFile) formData.append("file", selectedFile);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/submission/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.statusMessage || resData.message || "Upload failed.");
        }
      } else {
        // Dev server fallback
        const isLate = target.dueDate ? new Date() > new Date(target.dueDate) : false;
        const { data: existingSub } = await supabase
          .from("kpi_submissions")
          .select("id, storage_path")
          .eq("kpi_id", target.kpiId)
          .maybeSingle();

        const submissionId = existingSub?.id || crypto.randomUUID();
        const fileName = selectedFile?.name || submission?.file_name || "evidence.file";
        const storagePath = `ventures/${target.ventureId}/submissions/${submissionId}/${fileName}`;

        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData.user?.id || target.studentId || "";

        const { error: saveErr } = await supabase
          .from("kpi_submissions")
          .upsert({
            id: submissionId,
            venture_id: target.ventureId,
            kpi_id: target.kpiId,
            student_id: currentUserId,
            file_name: fileName,
            storage_path: storagePath,
            size_bytes: selectedFile?.size || submission?.size_bytes || 0,
            mime_type: selectedFile?.type || submission?.mime_type || "application/octet-stream",
            note: note.trim() || null,
            submitted_at: new Date().toISOString(),
            is_late: isLate,
          });

        if (saveErr) {
          throw new Error(`Database save failed: ${saveErr.message}`);
        }
      }

      toast.success(
        submission ? "Submission updated successfully!" : "Submission uploaded successfully!"
      );
      setSelectedFile(null);
      setIsEditing(false);
      onSaved();
      onOpenChange(false); // Automatically close modal after save
    } catch (err: any) {
      toast.error(err.message || "Failed to process submission");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Download Action
  const handleDownloadFile = async () => {
    if (!submission) return;
    setDownloading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`/api/submission/download?kpiId=${target.kpiId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok && data.url && data.url.startsWith("http")) {
          window.open(data.url, "_blank");
          return;
        }
        if (!res.ok) {
          throw new Error(data.statusMessage || data.message || "Could not generate S3 download link.");
        }
      }

      throw new Error(`AWS S3 download link unavailable. Storage key: ${submission.storage_path}`);
    } catch (err: any) {
      toast.error(err.message || "Could not download file.");
    } finally {
      setDownloading(false);
    }
  };

  // Handle Evaluator Score Save / Lock
  const handleSaveScore = async (lock: boolean) => {
    const trimmed = scoreInput.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > target.totalGrade)) {
      toast.error(`Score must be a number between 0 and ${target.totalGrade}.`);
      return;
    }

    if (lock && parsed === null) {
      toast.error("Please enter a numeric score before locking.");
      return;
    }

    setSavingScore(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const evaluatorId = sessionData.session?.user?.id || null;

      const updateData: any = {
        score: parsed,
        feedback: feedbackInput.trim() || null,
        scored_by: evaluatorId,
        scored_at: new Date().toISOString(),
      };

      if (lock) {
        updateData.is_locked = true;
        updateData.locked_by = evaluatorId;
        updateData.locked_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("venture_kpis")
        .update(updateData)
        .eq("id", target.kpiId);

      if (error) {
        toast.error(`Could not save score: ${error.message}`);
        return;
      }

      toast.success(lock ? "Score saved and locked successfully!" : "Score saved successfully!");

      if (lock) {
        sendLockedKpiEmailsFn({
          data: {
            kpiId: target.kpiId,
            ventureId: target.ventureId,
          },
        })
          .then((res) => {
            if (!res?.success) {
              toast.error(`Score locked, but email failed: ${res?.error || "Unknown email error"}`);
            }
          })
          .catch((err) => {
            console.warn("[EmailTrigger Error]", err);
          });
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save score");
    } finally {
      setSavingScore(false);
    }
  };

  // Unlock KPI score
  const handleUnlockScore = async () => {
    setSavingScore(true);
    try {
      const { error } = await supabase
        .from("venture_kpis")
        .update({ is_locked: false })
        .eq("id", target.kpiId);

      if (error) {
        toast.error(`Could not unlock KPI: ${error.message}`);
        return;
      }
      toast.success("KPI unlocked for evaluation.");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to unlock KPI");
    } finally {
      setSavingScore(false);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-base tracking-tight gold-text">
            {target.isLocked && <Lock className="h-4 w-4 text-amber-400" />}
            {target.name}
          </DialogTitle>
        </DialogHeader>

        {isStudentView ? (
          /* ================= STUDENT SUBMISSION VIEW ================= */
          loadingSubmission ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : submission && !isEditing ? (
            /* --- 1. DISPLAY PREVIOUS SUBMISSION VIEW --- */
            <div className="space-y-5 py-2">
              <div className="glass-strong rounded-xl p-4 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Submitted Evidence
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 bg-background/40 p-3 rounded-lg border border-border/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium text-foreground truncate">
                        {submission.file_name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {formatBytes(submission.size_bytes)} · Submitted {formatDateTime(submission.submitted_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadFile}
                    disabled={downloading}
                    className="font-mono text-xs border-primary/30 text-primary cursor-pointer shrink-0"
                  >
                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </Button>
                </div>
              </div>

              {/* Submitted Explanation */}
              {submission.note && (
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Supporting Explanation
                  </Label>
                  <div className="glass-strong p-3.5 rounded-xl border border-border/40 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {submission.note}
                  </div>
                </div>
              )}

              {/* Bottom Action Footer */}
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="font-mono text-xs cursor-pointer"
                >
                  Close
                </Button>
                {canStudentEdit && (
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="font-mono text-xs cursor-pointer"
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Submission
                  </Button>
                )}
              </DialogFooter>
            </div>
          ) : (
            /* --- 2. UPLOAD / EDIT FORM VIEW --- */
            <form onSubmit={handleSubmitSubmission} className="space-y-5 py-2">
              {/* File Upload Area */}
              <div className="space-y-2">
                <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {submission ? "Replace Evidence File" : "Upload Evidence File"}
                </Label>

                <div className="relative border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-5 text-center bg-background/20 space-y-2">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.rtf,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,.tar,.gz"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                    <Upload className="h-5 w-5" />
                  </div>
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-semibold text-primary truncate px-4">
                        {selectedFile.name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        Size: {formatBytes(selectedFile.size)} (Ready to upload)
                      </p>
                    </div>
                  ) : submission ? (
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-foreground font-medium">
                        Current file: <span className="text-primary">{submission.file_name}</span>
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        Click or drag new file here to replace current file
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-foreground font-medium">
                        Click or drag file here to upload
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        PDF, DOCX, TXT, PPTX, XLSX, ZIP, RAR (Max 10 MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Supporting Explanation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="submission-note" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Explain your submission
                  </Label>
                  <span className={`font-mono text-[10px] ${note.length > MAX_NOTE_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
                    {note.length} / {MAX_NOTE_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="submission-note"
                  rows={4}
                  maxLength={MAX_NOTE_LENGTH}
                  value={note}
                  disabled={submitting}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe your work, key outcomes, metrics achieved, or attached evidence files..."
                  className="font-mono text-xs bg-background/40 resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (submission) {
                      setIsEditing(false);
                    } else {
                      onOpenChange(false);
                    }
                  }}
                  className="font-mono text-xs cursor-pointer"
                >
                  {submission ? "Cancel" : "Close"}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || (!selectedFile && !submission) || note.length > MAX_NOTE_LENGTH}
                  className="font-mono text-xs cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Save Submission
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )
        ) : (
          /* ================= EVALUATOR REVIEW & SCORE TABS ================= */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full pt-2">
            <TabsList className="grid grid-cols-2 w-full font-mono text-xs">
              <TabsTrigger type="button" value="submission">
                <FileText className="mr-2 h-3.5 w-3.5" />
                Submission
              </TabsTrigger>
              <TabsTrigger type="button" value="score">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Give Score
              </TabsTrigger>
            </TabsList>

            {/* --- TAB 1: SUBMISSION REVIEW --- */}
            <TabsContent value="submission" className="space-y-4 pt-4">
              {loadingSubmission ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !submission ? (
                <div className="glass-strong rounded-xl p-8 text-center space-y-2 border-border/40">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="font-mono text-xs text-muted-foreground">No submission evidence uploaded yet for this KPI.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Metadata Header */}
                  <div className="grid grid-cols-3 gap-2 bg-background/30 p-3 rounded-xl border border-border/40 font-mono text-xs text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">Student</span>
                      <span className="font-medium text-foreground truncate block">{target.studentName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">Venture</span>
                      <span className="font-medium text-foreground truncate block">{target.subject}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">Submitted At</span>
                      <span className="text-foreground truncate block">{formatDateTime(submission.submitted_at)}</span>
                    </div>
                  </div>

                  {/* Submitted File Card */}
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Submitted Evidence File
                    </span>
                    <div className="flex items-center justify-between gap-3 bg-background/30 p-3.5 rounded-xl border border-border/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-medium text-foreground truncate">
                            {submission.file_name}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {formatBytes(submission.size_bytes)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={handleDownloadFile}
                        disabled={downloading}
                        className="font-mono text-xs cursor-pointer shrink-0"
                      >
                        {downloading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Supporting Explanation */}
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Supporting Explanation
                    </Label>
                    <div className="bg-background/30 p-3.5 rounded-xl border border-border/40 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {submission.note || "No explanation provided."}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* --- TAB 2: GIVE SCORE --- */}
            <TabsContent value="score" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="eval-score" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Score (Out of {target.totalGrade})
                  </Label>
                  <Input
                    id="eval-score"
                    type="number"
                    step="0.5"
                    min={0}
                    max={target.totalGrade}
                    value={scoreInput}
                    disabled={!canEvaluatorEdit || savingScore}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="mt-1.5 font-mono text-xs"
                    placeholder={`0 - ${target.totalGrade}`}
                  />
                </div>

                <div>
                  <Label htmlFor="eval-feedback" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Evaluator Feedback (Optional)
                  </Label>
                  <Textarea
                    id="eval-feedback"
                    rows={4}
                    value={feedbackInput}
                    disabled={!canEvaluatorEdit || savingScore}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="mt-1.5 font-mono text-xs bg-background/40"
                    placeholder="Provide constructive feedback for the student..."
                  />
                </div>

                {target.isLocked && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2 font-mono text-xs text-amber-300">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>This score is locked. Only Academic Board or Admin can unlock it.</span>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                {canEvaluatorUnlock && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingScore}
                    onClick={handleUnlockScore}
                    className="font-mono text-xs"
                  >
                    <LockOpen className="mr-1.5 h-3.5 w-3.5" />
                    Unlock
                  </Button>
                )}
                {canEvaluatorEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingScore}
                    onClick={() => handleSaveScore(false)}
                    className="font-mono text-xs"
                  >
                    {savingScore && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Save Draft Score
                  </Button>
                )}
                {canEvaluatorEdit && canLockKpi && (
                  <Button
                    type="button"
                    disabled={savingScore}
                    onClick={() => {
                      const trimmed = scoreInput.trim();
                      const parsed = trimmed === "" ? null : Number(trimmed);
                      if (parsed === null || Number.isNaN(parsed) || parsed < 0 || parsed > target.totalGrade) {
                        toast.error(`Please enter a valid numeric score between 0 and ${target.totalGrade} before locking.`);
                        return;
                      }
                      setShowLockConfirm(true);
                    }}
                    className="font-mono text-xs cursor-pointer"
                  >
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Save &amp; Lock
                  </Button>
                )}
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      {/* --- SAVE & LOCK CONFIRMATION MODAL --- */}
      <AlertDialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <AlertDialogContent className="glass-strong border-amber-500/30 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-mono text-base text-amber-400">
              <Lock className="h-4 w-4" />
              Lock Evaluation Score?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs text-muted-foreground leading-relaxed pt-1">
              Saving and locking will finalize this score. The student will no longer be able to submit or edit evidence for this KPI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="font-mono text-xs cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLockConfirm(false);
                handleSaveScore(true);
              }}
              className="font-mono text-xs cursor-pointer bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Confirm &amp; Lock Score
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

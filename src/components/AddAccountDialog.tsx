import { useState } from "react";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccountFn } from "@/lib/account-admin";
import { accountDraftError, MIN_PASSWORD_LENGTH, ROLL_NO_EXAMPLE } from "@/lib/account-validation";
import type { Role } from "@/lib/auth";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

const EMPTY = { email: "", password: "", rollNo: "", role: "student" as Role };

export function AddAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const close = () => {
    setDraft(EMPTY);
    onOpenChange(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = accountDraftError(draft);
    if (invalid) return toast.error(invalid);

    setBusy(true);
    const result = await createAccountFn({ data: draft }).catch((error: unknown) => ({
      ok: false as const,
      error: error instanceof Error ? error.message : "The server could not be reached.",
    }));
    setBusy(false);

    if (!result.ok) return toast.error(result.error);

    toast.success(
      `${draft.email.trim().toLowerCase()} created as ${ROLE_LABELS[draft.role]}. Share the password with them — it is not shown again.`,
    );
    if (!result.logged) toast.warning("The new account could not be written to the audit log.");
    close();
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Add an account
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            The account is created already confirmed, so they can sign in straight away with the
            password you set here. It is never shown again — copy it before you save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="new-email">Email</FieldLabel>
            <Input
              id="new-email"
              type="email"
              autoComplete="off"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@adypu.edu.in"
              className="bg-background/40 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="new-role">Role</FieldLabel>
            <Select value={draft.role} onValueChange={(v) => set("role", v as Role)}>
              <SelectTrigger id="new-role" className="w-full font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="font-mono text-xs">
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="new-roll">
              Roll no. {draft.role === "student" ? "" : "(optional)"}
            </FieldLabel>
            <Input
              id="new-roll"
              value={draft.rollNo}
              onChange={(e) => set("rollNo", e.target.value)}
              placeholder={`e.g. ${ROLL_NO_EXAMPLE}`}
              className="bg-background/40 font-mono text-sm"
            />
            <p className="font-mono text-[10px] text-muted-foreground/70">
              {draft.role === "student"
                ? "Links the account to the venture accepted under this roll number."
                : "Staff rarely have one — leave it empty unless they do."}
            </p>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="new-password">
              Initial password ({MIN_PASSWORD_LENGTH}+ chars)
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id="new-password"
                type="text"
                autoComplete="new-password"
                value={draft.password}
                onChange={(e) => set("password", e.target.value)}
                className="bg-background/40 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set("password", crypto.randomUUID().replaceAll("-", "").slice(0, 16))
                }
                className="shrink-0 cursor-pointer border-primary/30 font-mono text-[10px] text-primary"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Generate
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              className="cursor-pointer font-mono text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="cursor-pointer font-mono text-xs">
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {busy ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      {children}
    </Label>
  );
}

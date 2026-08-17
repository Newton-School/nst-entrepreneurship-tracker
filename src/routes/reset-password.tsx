import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, KeyRound } from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "@/lib/account-validation";

type ResetSearch = { token_hash?: string; type?: string };

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password · NST Entrepreneurship" }] }),
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token_hash: typeof search.token_hash === "string" ? search.token_hash : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token_hash, type } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const linkIsUsable = Boolean(token_hash) && type === "recovery";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token_hash) return;
    if (password.length < MIN_PASSWORD_LENGTH)
      return toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirm) return toast.error("Passwords do not match.");

    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: "recovery",
      });
      if (verifyError) {
        toast.error("This reset link is invalid or has expired. Request a new one.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      await supabase.auth.signOut({ scope: "global" }).catch(() => {});

      toast.success("Password updated. Sign in with your new password.");
      navigate({ to: "/auth" });
    } catch {
      toast.error("Could not update the password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="glass-strong relative w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              NST · 2026
            </p>
            <p className="font-mono text-sm">Set a New Password</p>
          </div>
        </div>

        {linkIsUsable ? (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="new-pw"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                New password ({MIN_PASSWORD_LENGTH}+ chars)
              </Label>
              <Input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/40 font-mono text-sm"
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm-pw"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Confirm password
              </Label>
              <Input
                id="confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="bg-background/40 font-mono text-sm"
                suppressHydrationWarning
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full font-mono text-xs uppercase tracking-widest"
            >
              <KeyRound className="mr-2 h-3.5 w-3.5" />
              {busy ? "Updating…" : "Update password"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              You will be signed out everywhere and can sign in again with the new password.
            </p>
          </form>
        ) : (
          <div className="space-y-3">
            <h1 className="font-mono text-sm">This link is not valid</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Open the page straight from the reset email, or request a fresh link — each one can
              only be used once.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block rounded-md bg-primary px-4 py-2 font-mono text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            >
              Request a new link
            </Link>
          </div>
        )}

        <Link
          to="/auth"
          className="mt-6 block text-center font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}

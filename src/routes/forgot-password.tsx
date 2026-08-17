import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, MailCheck, Send } from "lucide-react";
import { requestPasswordResetFn } from "@/lib/password-reset.actions";
import { EMAIL_PATTERN as emailPattern } from "@/lib/account-validation";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · NST Entrepreneurship" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailPattern.test(email.trim())) return toast.error("Enter a valid email address.");
    setBusy(true);
    try {
      await requestPasswordResetFn({ data: { email: email.trim() } });
      setSent(true);
    } catch {
      toast.error("Could not send the reset email. Try again in a moment.");
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
            <p className="font-mono text-sm">Password Recovery</p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <MailCheck className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-mono text-sm">Check your inbox</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              If an account exists for{" "}
              <span className="font-mono text-foreground">{email.trim()}</span>, a reset link is on
              its way. The link works once and expires in an hour.
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Nothing arrived after a few minutes? Check your spam folder, or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="underline underline-offset-2 hover:text-foreground"
              >
                try another address
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enter the email on your account and we&apos;ll send you a link to set a new password.
            </p>
            <div className="space-y-1.5">
              <Label
                htmlFor="reset-email"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <Send className="mr-2 h-3.5 w-3.5" />
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
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

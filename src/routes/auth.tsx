import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  EMAIL_PATTERN as emailPattern,
  ROLL_NO_PATTERN as rollNoPattern,
  ROLL_NO_EXAMPLE,
  MIN_PASSWORD_LENGTH,
} from "@/lib/account-validation";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · NST Entrepreneurship" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!emailPattern.test(email.trim())) return toast.error("Enter a valid email address.");
    if (!password) return toast.error("Password is required.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back.");
    navigate({ to: "/" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!emailPattern.test(email.trim())) return toast.error("Enter a valid email address.");
    if (!rollNoPattern.test(rollNo.trim()))
      return toast.error(`Roll no. must look like ${ROLL_NO_EXAMPLE}.`);
    if (password.length < MIN_PASSWORD_LENGTH)
      return toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          roll_no: rollNo.trim(),
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
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
            <p className="font-mono text-sm">Master Framework Access</p>
          </div>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2 bg-background/40">
            <TabsTrigger value="signin" className="font-mono text-xs">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="font-mono text-xs">
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <form onSubmit={signIn} className="space-y-3">
              <Field id="email" label="Email" value={email} onChange={setEmail} type="email" />
              <Field
                id="pw"
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
              />
              <Button
                type="submit"
                disabled={busy}
                className="w-full font-mono text-xs uppercase tracking-widest"
              >
                <Lock className="mr-2 h-3.5 w-3.5" />
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <form onSubmit={signUp} className="space-y-3">
              <Field id="email2" label="Email" value={email} onChange={setEmail} type="email" />
              <Field
                id="rollNo"
                label="Roll No."
                placeholder={`e.g. ${ROLL_NO_EXAMPLE}`}
                value={rollNo}
                onChange={setRollNo}
                type="text"
                required
              />
              <Field
                id="pw2"
                label={`Password (${MIN_PASSWORD_LENGTH}+ chars)`}
                value={password}
                onChange={setPassword}
                type="password"
              />
              <Button
                type="submit"
                disabled={busy}
                className="w-full font-mono text-xs uppercase tracking-widest"
              >
                Create account
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Students get read-only access by default. Admins are seeded by the super admin.
              </p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <Link
          to="/"
          className="mt-5 block text-center font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          ← Continue as student (read-only)
        </Link>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  type,
  required = true,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="bg-background/40 font-mono text-sm"
      />
    </div>
  );
}

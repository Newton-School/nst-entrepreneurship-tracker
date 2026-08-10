import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";

function Panel({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <>
      <TopBar title="Credit & Evaluation Architecture" breadcrumb="Governance & Outcomes" />
      <main className="flex-1 px-6 py-12 lg:px-10">
        <div className="glass-strong mx-auto max-w-xl space-y-4 rounded-2xl p-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h2 className="font-mono text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </main>
    </>
  );
}

export function RoleGate({ children }: { children: ReactNode }) {
  const { status, roleError } = useAuth();

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (status === "signedOut") {
    return (
      <Panel
        title="Sign In Required"
        body="This page is part of the evaluation portal. Sign in to continue."
        action={
          <Link to="/auth">
            <Button className="font-mono text-xs uppercase tracking-wider">Sign In</Button>
          </Link>
        }
      />
    );
  }

  if (status === "error") {
    return (
      <Panel
        title="No Role Assigned"
        body={
          roleError
            ? `${roleError} Ask an administrator to assign your account a role before using the evaluation portal.`
            : "Your account has no role assigned. Ask an administrator to assign one."
        }
      />
    );
  }

  return <>{children}</>;
}

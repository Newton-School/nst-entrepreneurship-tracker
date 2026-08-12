import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, ShieldCheck, History } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { RoleGate } from "@/components/RoleGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/lib/auth";
import { canChangeRoleOf, type Actor } from "@/lib/permissions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Role Management · NST Entrepreneurship" },
      {
        name: "description",
        content: "Assign and audit portal roles across every account in the track.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow={["admin"]}>
      <Page />
    </RoleGate>
  ),
});

type Account = {
  user_id: string;
  email: string | null;
  roll_no: string | null;
  role: Role | null;
  role_assigned_at: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
};

type LogEntry = {
  id: string;
  target_email: string | null;
  previous_role: Role | null;
  new_role: Role;
  changed_by_email: string | null;
  created_at: string;
};

type PendingChange = { account: Account; nextRole: Role };

const NO_ROLE = "__none__";

const LOG_COLUMNS = "id, target_email, previous_role, new_role, changed_by_email, created_at";

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "—";

const fmtDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function Page() {
  const { user, role } = useAuth();
  const actor: Actor | null = user && role ? { userId: user.id, role } : null;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [users, entries] = await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase
        .from("role_change_log")
        .select(LOG_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    if (users.error) {
      console.error("Error loading accounts:", users.error);
      setLoadError(users.error.message);
      setAccounts([]);
    } else {
      setLoadError(null);
      setAccounts((users.data ?? []) as Account[]);
    }

    // The audit strip is supporting detail — a failure there must not blank the directory.
    if (entries.error) console.error("Error loading role change log:", entries.error);
    setLog(entries.data ?? []);
    setLoading(false);
  };

  const refreshLog = async () => {
    const { data } = await supabase
      .from("role_change_log")
      .select(LOG_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(15);
    setLog(data ?? []);
  };

  const counts = useMemo(() => {
    const tally: Record<string, number> = { unassigned: 0 };
    ROLES.forEach((r) => (tally[r] = 0));
    accounts.forEach((a) => (a.role ? (tally[a.role] += 1) : (tally.unassigned += 1)));
    return tally;
  }, [accounts]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== "all" && a.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        (a.email ?? "").toLowerCase().includes(needle) ||
        (a.roll_no ?? "").toLowerCase().includes(needle)
      );
    });
  }, [accounts, query, roleFilter]);

  const applyChange = async ({ account, nextRole }: PendingChange) => {
    setSavingId(account.user_id);
    const { error } = await supabase.rpc("admin_set_user_role", {
      _user_id: account.user_id,
      _role: nextRole,
    });
    setSavingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => (a.user_id === account.user_id ? { ...a, role: nextRole } : a)),
    );
    toast.success(`${account.email ?? "Account"} is now ${ROLE_LABELS[nextRole]}.`);
    void refreshLog();
  };

  return (
    <>
      <TopBar title="Role Management" breadcrumb="NST 2026 · Administration" />
      <main className="relative flex-1 space-y-6 px-6 py-8 lg:px-10 lg:py-10">
        {/* Hero */}
        <section className="glass-strong relative overflow-hidden rounded-2xl p-6 lg:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-primary/80">
                Administration · Access control
              </p>
              <h2 className="mt-2 font-mono text-2xl tracking-tight lg:text-4xl">
                Role <span className="gold-text">management</span>
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Every account in the portal and the role it carries. Roles are written through a
                database function that re-checks you are an admin, records the change, and refuses
                to let you edit your own role or remove the last admin.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {accounts.length} accounts
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                Admin-only page
              </Badge>
            </div>
          </div>

          {/* Role strip — click a tile to filter the directory */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}
                className={`cursor-pointer rounded-lg border bg-background/30 p-3 text-left transition ${
                  roleFilter === r
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 hover:bg-accent/30"
                }`}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {ROLE_LABELS[r]}
                </p>
                <p className="mt-1 font-mono text-xl tracking-tight text-foreground">{counts[r]}</p>
                <p className="font-mono text-[10px] text-muted-foreground/70">
                  {roleFilter === r ? "filtering" : "accounts"}
                </p>
              </button>
            ))}
            <div className="rounded-lg border border-border/60 bg-background/30 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                No role
              </p>
              <p
                className={`mt-1 font-mono text-xl tracking-tight ${
                  counts.unassigned > 0 ? "text-amber-400" : "text-foreground"
                }`}
              >
                {counts.unassigned}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/70">locked out of portal</p>
            </div>
          </div>
        </section>

        {/* Directory */}
        <section className="glass-strong overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-border/50 px-5 py-4">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by email or roll number…"
                className="h-9 bg-background/40 pl-9 font-mono text-xs placeholder:text-muted-foreground/60"
              />
            </div>
            {roleFilter !== "all" && (
              <Badge
                variant="outline"
                className="cursor-pointer border-primary/30 font-mono text-[10px] text-primary"
                onClick={() => setRoleFilter("all")}
              >
                {ROLE_LABELS[roleFilter]} only ✕
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="cursor-pointer border-primary/30 font-mono text-xs text-primary"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-3 border-b border-border/50 bg-background/40 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <div className="col-span-5">Account</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2">Last sign-in</div>
            <div className="col-span-3">Role</div>
          </div>

          {loading ? (
            <div className="flex h-24 items-center justify-center font-mono text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
              Loading accounts from Supabase...
            </div>
          ) : loadError ? (
            <div className="space-y-1 p-6 text-center font-mono text-xs text-muted-foreground">
              <p className="text-destructive">{loadError}</p>
              <p>Apply the latest migration in supabase/migrations, then refresh.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-muted-foreground">
              No account matches this filter.
            </div>
          ) : (
            visible.map((account) => {
              const isSelf = account.user_id === user?.id;
              const editable = actor !== null && canChangeRoleOf(actor, account.user_id);
              return (
                <div
                  key={account.user_id}
                  className="grid grid-cols-12 items-center gap-3 border-b border-border/30 px-5 py-4 last:border-b-0"
                >
                  <div className="col-span-5 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-sm">
                        {account.email ?? `Account ${account.user_id.slice(0, 8)}`}
                      </p>
                      {isSelf && (
                        <Badge variant="outline" className="shrink-0 font-mono text-[9px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground/70">
                      {account.roll_no && <span>Roll {account.roll_no}</span>}
                      {account.role === null && (
                        <span className="text-amber-400">No role assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 font-mono text-xs text-muted-foreground">
                    {fmtDate(account.signed_up_at)}
                  </div>
                  <div className="col-span-2 font-mono text-xs text-muted-foreground">
                    {account.last_sign_in_at ? fmtDate(account.last_sign_in_at) : "Never"}
                  </div>

                  <div className="col-span-3">
                    <Select
                      value={account.role ?? NO_ROLE}
                      disabled={!editable || savingId === account.user_id}
                      onValueChange={(v) => setPending({ account, nextRole: v as Role })}
                    >
                      <SelectTrigger className="h-8 w-full font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {account.role === null && (
                          <SelectItem value={NO_ROLE} disabled className="font-mono text-xs">
                            No role assigned
                          </SelectItem>
                        )}
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="font-mono text-xs">
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSelf && (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                        Another admin has to change your role.
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Audit trail */}
        <section className="glass-strong rounded-2xl p-5 lg:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="font-mono text-lg">Recent role changes</h3>
              <p className="text-xs text-muted-foreground">
                Written by the database, not the browser — every promotion and demotion is recorded
                with who made it.
              </p>
            </div>
            <History className="h-4 w-4 shrink-0 text-primary" />
          </div>

          <div className="mt-5 overflow-x-auto">
            {log.length === 0 ? (
              <p className="py-4 text-center font-mono text-xs text-muted-foreground">
                No role has been changed through this panel yet.
              </p>
            ) : (
              <table className="w-full min-w-160 border-collapse font-mono text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Account
                    </th>
                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Change
                    </th>
                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      By
                    </th>
                    <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((entry) => (
                    <tr key={entry.id} className="border-t border-border/30">
                      <td className="py-2 pr-3">{entry.target_email ?? "Deleted account"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {entry.previous_role ? ROLE_LABELS[entry.previous_role] : "No role"}{" "}
                        <span className="text-muted-foreground/50">→</span>{" "}
                        <span className="text-primary">{ROLE_LABELS[entry.new_role]}</span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {entry.changed_by_email ?? "unknown"}
                      </td>
                      <td className="py-2 text-right text-muted-foreground/70">
                        {fmtDateTime(entry.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-mono text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Change this role?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              {pending && (
                <>
                  <span className="text-foreground">{pending.account.email ?? "This account"}</span>{" "}
                  moves from {pending.account.role ? ROLE_LABELS[pending.account.role] : "no role"}{" "}
                  to <span className="text-primary">{ROLE_LABELS[pending.nextRole]}</span>. It takes
                  effect the next time they load the portal.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer font-mono text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer font-mono text-xs"
              onClick={() => {
                if (pending) void applyChange(pending);
                setPending(null);
              }}
            >
              Change role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

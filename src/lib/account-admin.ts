import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountDraftError, type AccountDraft } from "@/lib/account-validation";
import type { Database } from "@/integrations/supabase/types";
import type { Role } from "@/lib/auth";

export type AccountActionResult =
  | { ok: true; userId: string; logged: boolean }
  | { ok: false; error: string };

const MISSING_KEY_ERROR =
  "The server has no SUPABASE_SERVICE_ROLE_KEY, so accounts cannot be created or deleted. " +
  "Add it to .env and restart the server.";

async function loadAdminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function refuseIfNotAdmin(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: false; error: string } | null> {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) return { ok: false, error: "Could not verify your role. Try again." };
  if (!data) return { ok: false, error: "Only an admin can manage accounts." };
  return null;
}

export const createAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: AccountDraft) => data)
  .handler(async ({ data, context }): Promise<AccountActionResult> => {
    const admin = await loadAdminClient();
    if (!admin) return { ok: false, error: MISSING_KEY_ERROR };

    const refused = await refuseIfNotAdmin(admin, context.userId);
    if (refused) return refused;

    const invalid = accountDraftError(data);
    if (invalid) return { ok: false, error: invalid };

    const email = data.email.trim().toLowerCase();
    const rollNo = data.rollNo.trim() || null;

    const created = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: rollNo ? { roll_no: rollNo } : {},
    });

    if (created.error || !created.data.user) {
      return { ok: false, error: created.error?.message ?? "Supabase did not return an account." };
    }

    const userId = created.data.user.id;

    const cleared = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .neq("role", data.role);

    const assigned = cleared.error
      ? cleared
      : await admin
          .from("user_roles")
          .upsert(
            { user_id: userId, role: data.role, email, roll_no: rollNo },
            { onConflict: "user_id,role" },
          );

    if (assigned.error) {
      await admin.auth.admin.deleteUser(userId);
      return {
        ok: false,
        error: `The account was created but its role could not be set (${assigned.error.message}), so it was removed. Try again.`,
      };
    }

    const logged = await admin.from("account_change_log").insert({
      action: "created",
      target_user_id: userId,
      target_email: email,
      target_roll_no: rollNo,
      role: data.role,
      actor_id: context.userId,
      actor_email: actorEmail(context.claims),
    });

    if (logged.error) console.error("[account-admin] create not logged:", logged.error);

    return { ok: true, userId, logged: !logged.error };
  });

export const deleteAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string }) => data)
  .handler(async ({ data, context }): Promise<AccountActionResult> => {
    const admin = await loadAdminClient();
    if (!admin) return { ok: false, error: MISSING_KEY_ERROR };

    const refused = await refuseIfNotAdmin(admin, context.userId);
    if (refused) return refused;

    if (data.userId === context.userId) {
      return {
        ok: false,
        error: "You cannot delete your own account. Ask another admin to do it.",
      };
    }

    const target = await admin.auth.admin.getUserById(data.userId);
    if (target.error || !target.data.user) {
      return { ok: false, error: "No account exists with that id. Refresh the directory." };
    }

    const roles = await admin.from("user_roles").select("role, roll_no").eq("user_id", data.userId);
    if (roles.error) return { ok: false, error: roles.error.message };

    if (roles.data.some((r) => r.role === "admin")) {
      const others = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .neq("user_id", data.userId);

      if (others.error) return { ok: false, error: others.error.message };
      if (others.data.length === 0) {
        return {
          ok: false,
          error: "This is the last admin account — promote another admin before deleting it.",
        };
      }
    }

    const deleted = await admin.auth.admin.deleteUser(data.userId);
    if (deleted.error) return { ok: false, error: deleted.error.message };

    const logged = await admin.from("account_change_log").insert({
      action: "deleted",
      target_user_id: data.userId,
      target_email: target.data.user.email ?? null,
      target_roll_no: roles.data.find((r) => r.roll_no)?.roll_no ?? null,
      role: (roles.data[0]?.role as Role | undefined) ?? null,
      actor_id: context.userId,
      actor_email: actorEmail(context.claims),
    });

    if (logged.error) console.error("[account-admin] delete not logged:", logged.error);

    return { ok: true, userId: data.userId, logged: !logged.error };
  });

function actorEmail(claims: Record<string, unknown>): string | null {
  const email = claims.email;
  return typeof email === "string" ? email : null;
}

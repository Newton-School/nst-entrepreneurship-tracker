import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const fetchProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("proposal")
      .select(
        `
        *,
        user_roles ( user_id, roll_no, email )
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load proposals: ${error.message}`);
    }
    return data ?? [];
  });

export const fetchMentors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, email")
      .eq("role", "mentor")
      .order("email");

    if (error) {
      throw new Error(`Failed to load mentors: ${error.message}`);
    }
    return data ?? [];
  });

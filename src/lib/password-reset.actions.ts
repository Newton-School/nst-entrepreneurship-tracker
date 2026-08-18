import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RESET_TOKEN_TTL_MINUTES = 60;

export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().min(1).max(254).email(),
    }),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      let targetEmail = email;
      let targetUser: any = null;

      // 1. Try generate link directly with provided email
      let linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
      });

      // 2. If user not found directly, check user_roles table for matching email or roll_no
      if (linkRes.error && linkRes.error.message.toLowerCase().includes("user with this email not found")) {
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, email, roll_no")
          .or(`email.ilike.${email},roll_no.ilike.${email}`)
          .maybeSingle();

        if (roleData?.user_id) {
          const authUser = await supabaseAdmin.auth.admin.getUserById(roleData.user_id);
          if (authUser.data?.user?.email) {
            targetEmail = authUser.data.user.email;
            targetUser = authUser.data.user;
            linkRes = await supabaseAdmin.auth.admin.generateLink({
              type: "recovery",
              email: targetEmail,
            });
          }
        }
      }

      const tokenHash = linkRes.data?.properties?.hashed_token;
      if (linkRes.error || !tokenHash) {
        console.warn(
          `[PasswordReset] No recovery link generated for ${email}: ${linkRes.error?.message || "no token returned"}`,
        );
        return { success: true };
      }

      const appUrl = (
        process.env.APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
        "http://localhost:5173"
      ).replace(/\/+$/, "");

      const resetUrl = `${appUrl}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

      const user = targetUser || linkRes.data?.user;
      const recipientName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.roll_no as string | undefined) ||
        targetEmail.split("@")[0] ||
        "there";

      const { EmailService } = await import("./email/email.service");
      await new EmailService().sendPasswordResetEmail(
        targetEmail,
        { recipientName, resetUrl, expiresInMinutes: RESET_TOKEN_TTL_MINUTES },
        user?.id,
      );

      return { success: true };
    } catch (err: any) {
      console.error("[PasswordReset] Failed to process password reset request:", err?.message || err);
      return { success: true };
    }
  });

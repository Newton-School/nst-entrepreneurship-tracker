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

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      const tokenHash = linkData?.properties?.hashed_token;
      if (linkError || !tokenHash) {
        console.warn(
          `[PasswordReset] No recovery link generated: ${linkError?.message || "no token returned"}`,
        );
        return { success: true };
      }

      const appUrl = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
      const resetUrl = `${appUrl}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

      const user = linkData?.user;
      const recipientName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.roll_no as string | undefined) ||
        email.split("@")[0] ||
        "there";

      const { EmailService } = await import("./email/email.service");
      await new EmailService().sendPasswordResetEmail(
        email,
        { recipientName, resetUrl, expiresInMinutes: RESET_TOKEN_TTL_MINUTES },
        user?.id,
      );

      return { success: true };
    } catch (err) {
      console.error("[PasswordReset] Failed to send reset email:", err);
      return { success: true };
    }
  });

import { Resend } from "resend";
import type { EmailProvider } from "./email.types";

export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private fromAddress: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      console.warn(
        `[ResendProvider] Missing RESEND_API_KEY or EMAIL_FROM in environment variables. Email sending disabled.`
      );
      this.resend = null as any;
      this.fromAddress = from || "";
    } else {
      this.resend = new Resend(apiKey);
      this.fromAddress = from;
    }
  }

  async sendEmail(params: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<{ messageId?: string; error?: string }> {
    if (!this.resend || !this.fromAddress) {
      const missing = [
        ...(!process.env.RESEND_API_KEY ? ["RESEND_API_KEY"] : []),
        ...(!process.env.EMAIL_FROM ? ["EMAIL_FROM"] : []),
      ];
      return {
        error: `Email not sent. Missing environment variables on server/Vercel: ${missing.join(", ")}`,
      };
    }
    try {
      const response = await this.resend.emails.send({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (response.error) {
        return { error: response.error.message || JSON.stringify(response.error) };
      }

      return { messageId: response.data?.id };
    } catch (err: any) {
      return { error: err.message || String(err) };
    }
  }
}

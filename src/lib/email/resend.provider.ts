import { Resend } from "resend";
import type { EmailProvider } from "./email.types";

function normalizeFromAddress(value: string): string {
  const from = value
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  if (/<[^\s<>]+@[^\s<>]+>$/.test(from)) return from;
  const match = from.match(/^(.*?)\s*([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)$/);
  if (!match) return from;
  const [, name, address] = match;
  return name ? `${name} <${address}>` : address;
}

export class ResendProvider implements EmailProvider {
  private resend: Resend | null;
  private fromAddress: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      console.warn(
        `[ResendProvider] Missing RESEND_API_KEY or EMAIL_FROM in environment variables. Email sending disabled.`,
      );
      this.resend = null;
      this.fromAddress = from ? normalizeFromAddress(from) : "";
    } else {
      this.resend = new Resend(apiKey);
      this.fromAddress = normalizeFromAddress(from);
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
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}

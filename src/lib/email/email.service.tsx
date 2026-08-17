import React from "react";
import { render } from "@react-email/render";
import type { TablesUpdate } from "@/integrations/supabase/types";
import type {
  EmailProvider,
  EmailNotificationType,
  EvaluationResultEmailProps,
  EvaluationFollowUpEmailProps,
  EvaluationLowScoreEmailProps,
  AcademicBoardLowScoreEmailProps,
  PasswordResetEmailProps,
} from "./email.types";
import { ResendProvider } from "./resend.provider";
import { PasswordResetEmail } from "./templates/auth/PasswordResetEmail";
import { EvaluationResultEmail } from "./templates/student/EvaluationResultEmail";
import { EvaluationFollowUpEmail } from "./templates/mentor/EvaluationFollowUpEmail";
import { EvaluationLowScoreEmail } from "./templates/mentor/EvaluationLowScoreEmail";
import { AcademicBoardLowScoreEmail } from "./templates/academic-board/EvaluationLowScoreEmail";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class EmailService {
  private provider: EmailProvider;

  constructor(provider?: EmailProvider) {
    this.provider = provider || new ResendProvider();
  }

  private async createPendingLog(params: {
    recipient_email: string;
    recipient_user_id?: string | null;
    type: EmailNotificationType;
    subject: string;
  }): Promise<{ id: string } | null> {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("email_notifications")
        .insert([
          {
            recipient_email: params.recipient_email,
            recipient_user_id: params.recipient_user_id || null,
            type: params.type,
            subject: params.subject,
            status: "PENDING",
            provider: "resend",
          },
        ])
        .select("id")
        .single();

      if (error) {
        console.error(`[EmailService] Failed to insert PENDING notification log: ${error.message}`);
        return null;
      }
      return data;
    } catch (err) {
      console.error(`[EmailService] Exception during PENDING log creation: ${errorMessage(err)}`);
      return null;
    }
  }

  private async updateLogStatus(
    logId: string,
    params: {
      status: "SENT" | "FAILED";
      providerMessageId?: string | null;
      error?: string | null;
    },
  ): Promise<void> {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const updateData: TablesUpdate<"email_notifications"> = {
        status: params.status,
        provider_message_id: params.providerMessageId || null,
        error: params.error || null,
      };
      if (params.status === "SENT") {
        updateData.sent_at = new Date().toISOString();
      }
      const { error } = await supabaseAdmin
        .from("email_notifications")
        .update(updateData)
        .eq("id", logId);

      if (error) {
        console.error(
          `[EmailService] Failed to update email log ${logId} to ${params.status}: ${error.message}`,
        );
      }
    } catch (err) {
      console.error(`[EmailService] Exception during log update: ${errorMessage(err)}`);
    }
  }

  async sendKpiScoredStudentEmail(
    toEmail: string,
    params: EvaluationResultEmailProps,
    studentUserId?: string,
  ): Promise<void> {
    const subject = "Your Entrepreneurship Evaluation Result is Ready";
    let html = "";
    let logId: string | null = null;

    try {
      html = await render(<EvaluationResultEmail {...params} />);
    } catch (err) {
      console.error(`[EmailService] Render error student: ${errorMessage(err)}`);
      throw new Error(`Failed to render student email: ${errorMessage(err)}`);
    }

    try {
      const logRecord = await this.createPendingLog({
        recipient_email: toEmail,
        recipient_user_id: studentUserId || null,
        type: "KPI_SCORED_STUDENT",
        subject,
      });
      logId = logRecord?.id || null;
    } catch (dbErr) {
      console.error("[EmailService] DB log failure ignored", dbErr);
    }

    console.log(`[EmailService] Dispatching student email to ${toEmail}`);
    const { messageId, error } = await this.provider.sendEmail({
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      if (logId) await this.updateLogStatus(logId, { status: "FAILED", error });
      throw new Error(`Resend failed: ${error}`);
    } else {
      if (logId)
        await this.updateLogStatus(logId, { status: "SENT", providerMessageId: messageId });
      console.log(`[EmailService] Student email sent successfully. Message ID: ${messageId}`);
    }
  }

  async sendMentorFollowUpEmail(
    toEmail: string,
    params: EvaluationFollowUpEmailProps,
  ): Promise<void> {
    const subject = `Action Required: Connect with ${params.studentName} Regarding Evaluation`;
    let html = "";
    let logId: string | null = null;

    try {
      html = await render(<EvaluationFollowUpEmail {...params} />);
    } catch (err) {
      console.error(`[EmailService] Render error mentor follow-up: ${errorMessage(err)}`);
      throw new Error(`Failed to render mentor follow-up email: ${errorMessage(err)}`);
    }

    try {
      const logRecord = await this.createPendingLog({
        recipient_email: toEmail,
        type: "CONSECUTIVE_MID_SCORE_MENTOR",
        subject,
      });
      logId = logRecord?.id || null;
    } catch (dbErr) {
      console.error("[EmailService] DB log failure ignored", dbErr);
    }

    console.log(`[EmailService] Dispatching mentor follow-up to ${toEmail}`);
    const { messageId, error } = await this.provider.sendEmail({
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      if (logId) await this.updateLogStatus(logId, { status: "FAILED", error });
      throw new Error(`Resend failed: ${error}`);
    } else {
      if (logId)
        await this.updateLogStatus(logId, { status: "SENT", providerMessageId: messageId });
      console.log(`[EmailService] Mentor follow-up email sent. Message ID: ${messageId}`);
    }
  }

  async sendMentorLowScoreEmail(
    toEmail: string,
    params: EvaluationLowScoreEmailProps,
  ): Promise<void> {
    const subject = `Attention Required: ${params.studentName}'s Evaluation Score is Below 40%`;
    let html = "";
    let logId: string | null = null;

    try {
      html = await render(<EvaluationLowScoreEmail {...params} />);
    } catch (err) {
      console.error(`[EmailService] Render error mentor low score: ${errorMessage(err)}`);
      throw new Error(`Failed to render mentor low score email: ${errorMessage(err)}`);
    }

    try {
      const logRecord = await this.createPendingLog({
        recipient_email: toEmail,
        type: "CONSECUTIVE_LOW_SCORE_BOARD",
        subject,
      });
      logId = logRecord?.id || null;
    } catch (dbErr) {
      console.error("[EmailService] DB log failure ignored", dbErr);
    }

    console.log(`[EmailService] Dispatching mentor low score email to ${toEmail}`);
    const { messageId, error } = await this.provider.sendEmail({
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      if (logId) await this.updateLogStatus(logId, { status: "FAILED", error });
      throw new Error(`Resend failed: ${error}`);
    } else {
      if (logId)
        await this.updateLogStatus(logId, { status: "SENT", providerMessageId: messageId });
      console.log(`[EmailService] Mentor low score email sent. Message ID: ${messageId}`);
    }
  }

  async sendAcademicBoardLowScoreEmail(
    toEmail: string,
    params: AcademicBoardLowScoreEmailProps,
  ): Promise<void> {
    const subject = `Academic Board Notification: ${params.studentName}'s Evaluation Score is Below 40%`;
    let html = "";
    let logId: string | null = null;

    try {
      html = await render(<AcademicBoardLowScoreEmail {...params} />);
    } catch (err) {
      console.error(`[EmailService] Render error board low score: ${errorMessage(err)}`);
      throw new Error(`Failed to render academic board low score email: ${errorMessage(err)}`);
    }

    try {
      const logRecord = await this.createPendingLog({
        recipient_email: toEmail,
        type: "CONSECUTIVE_LOW_SCORE_BOARD",
        subject,
      });
      logId = logRecord?.id || null;
    } catch (dbErr) {
      console.error("[EmailService] DB log failure ignored", dbErr);
    }

    console.log(`[EmailService] Dispatching academic board low score email to ${toEmail}`);
    const { messageId, error } = await this.provider.sendEmail({
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      if (logId) await this.updateLogStatus(logId, { status: "FAILED", error });
      throw new Error(`Resend failed: ${error}`);
    } else {
      if (logId)
        await this.updateLogStatus(logId, { status: "SENT", providerMessageId: messageId });
      console.log(`[EmailService] Academic board low score email sent. Message ID: ${messageId}`);
    }
  }

  async sendPasswordResetEmail(
    toEmail: string,
    params: PasswordResetEmailProps,
    userId?: string,
  ): Promise<void> {
    const subject = "Reset your NST Entrepreneurship Tracker password";
    let html = "";
    let logId: string | null = null;

    try {
      html = await render(<PasswordResetEmail {...params} />);
    } catch (err) {
      console.error(`[EmailService] Render error password reset: ${errorMessage(err)}`);
      throw new Error(`Failed to render password reset email: ${errorMessage(err)}`);
    }

    try {
      const logRecord = await this.createPendingLog({
        recipient_email: toEmail,
        recipient_user_id: userId || null,
        type: "PASSWORD_RESET",
        subject,
      });
      logId = logRecord?.id || null;
    } catch (dbErr) {
      console.error("[EmailService] DB log failure ignored", dbErr);
    }

    console.log(`[EmailService] Dispatching password reset email to ${toEmail}`);
    const { messageId, error } = await this.provider.sendEmail({
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      if (logId) await this.updateLogStatus(logId, { status: "FAILED", error });
      throw new Error(`Resend failed: ${error}`);
    } else {
      if (logId)
        await this.updateLogStatus(logId, { status: "SENT", providerMessageId: messageId });
      console.log(`[EmailService] Password reset email sent. Message ID: ${messageId}`);
    }
  }
}

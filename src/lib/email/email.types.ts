export interface EmailProvider {
  sendEmail(params: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<{ messageId?: string; error?: string }>;
}

export type EmailNotificationType =
  | "KPI_SCORED_STUDENT"
  | "CONSECUTIVE_LOW_SCORE_BOARD"
  | "CONSECUTIVE_MID_SCORE_MENTOR"
  | "PASSWORD_RESET";

export interface PasswordResetEmailProps {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface EvaluationResultEmailProps {
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  evaluationName: string;
  dashboardUrl: string;
}

export interface EvaluationFollowUpEmailProps {
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  evaluationName: string;
  dashboardUrl: string;
}

export interface EvaluationLowScoreEmailProps {
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  evaluationName: string;
  dashboardUrl: string;
}

export interface AcademicBoardLowScoreEmailProps {
  studentName: string;
  studentEmail: string;
  batch: string;
  score: number;
  totalMarks: number;
  percentage: number;
  mentorName: string;
  evaluationName: string;
  dashboardUrl: string;
}

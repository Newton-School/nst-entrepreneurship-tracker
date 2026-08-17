import * as React from "react";
import { createServerFn } from "@tanstack/react-start";
import { render } from "@react-email/render";
import { EvaluationResultEmail } from "@/lib/email/templates/student/EvaluationResultEmail";
import { EvaluationFollowUpEmail } from "@/lib/email/templates/mentor/EvaluationFollowUpEmail";
import { EvaluationLowScoreEmail } from "@/lib/email/templates/mentor/EvaluationLowScoreEmail";
import { AcademicBoardLowScoreEmail } from "@/lib/email/templates/academic-board/EvaluationLowScoreEmail";
import { PasswordResetEmail } from "@/lib/email/templates/auth/PasswordResetEmail";

export const getEmailPreviewHtmlFn = createServerFn({ method: "GET" })
  .validator((val: unknown) => {
    return val as { template: string; score: number };
  })
  .handler(async ({ data }) => {
    const { template, score } = data;
    const studentName = "Divya";
    const totalMarks = 100;
    const percentage = score;
    const evaluationName = "Final Entrepreneurship Evaluation";
    const appUrl = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
    const dashboardUrl = `${appUrl}/result`;

    let component: React.ReactElement;

    switch (template) {
      case "student":
        component = (
          <EvaluationResultEmail
            studentName={studentName}
            score={score}
            totalMarks={totalMarks}
            percentage={percentage}
            evaluationName={evaluationName}
            dashboardUrl={dashboardUrl}
          />
        );
        break;
      case "mentor-follow-up":
        component = (
          <EvaluationFollowUpEmail
            studentName={studentName}
            score={score}
            totalMarks={totalMarks}
            percentage={percentage}
            evaluationName={evaluationName}
            dashboardUrl={dashboardUrl}
          />
        );
        break;
      case "mentor-low":
        component = (
          <EvaluationLowScoreEmail
            studentName={studentName}
            score={score}
            totalMarks={totalMarks}
            percentage={percentage}
            evaluationName={evaluationName}
            dashboardUrl={dashboardUrl}
          />
        );
        break;
      case "board":
        component = (
          <AcademicBoardLowScoreEmail
            studentName={studentName}
            studentEmail="divyapahuja250@gmail.com"
            batch="2024–2028"
            score={score}
            totalMarks={totalMarks}
            percentage={percentage}
            mentorName="Raghav Khandelwal"
            evaluationName={evaluationName}
            dashboardUrl={dashboardUrl}
          />
        );
        break;
      case "password-reset":
        component = (
          <PasswordResetEmail
            recipientName={studentName}
            resetUrl={`${appUrl}/reset-password?token_hash=preview-token&type=recovery`}
            expiresInMinutes={60}
          />
        );
        break;
      default:
        throw new Error("Invalid template");
    }

    const html = await render(component);
    return { html };
  });

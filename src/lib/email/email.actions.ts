import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const sendLockedKpiEmailsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      kpiId: z.string(),
      ventureId: z.string(),
      mentorUserId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { kpiId, ventureId, mentorUserId = "" } = data;

    try {
      const { EmailService } = await import("./email.service");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      console.log(`[EmailActions] Triggering notifications for KPI ${kpiId} and Venture ${ventureId}`);

      // 1. Fetch KPI details
      const { data: kpi, error: kpiErr } = await supabaseAdmin
        .from("venture_kpis")
        .select("*")
        .eq("id", kpiId)
        .single();

      if (kpiErr || !kpi) {
        throw new Error(`KPI not found: ${kpiErr?.message || "No record"}`);
      }

      // 2. Fetch Venture details
      const { data: venture, error: vErr } = await supabaseAdmin
        .from("ventures")
        .select("*")
        .eq("id", ventureId)
        .single();

      if (vErr || !venture) {
        throw new Error(`Venture not found: ${vErr?.message || "No record"}`);
      }

      // 3. Fetch Student email
      let studentEmail: string | null = null;
      
      // Smart Fallback: If the roll number is typed as an email address, use it directly
      if (venture.roll_no && venture.roll_no.includes("@")) {
        studentEmail = venture.roll_no.trim();
      }

      if (!studentEmail && venture.user_id) {
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("email")
          .eq("user_id", venture.user_id)
          .maybeSingle();
        studentEmail = roleData?.email || null;
      }
      if (!studentEmail && venture.roll_no) {
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("email")
          .eq("roll_no", venture.roll_no)
          .maybeSingle();
        studentEmail = roleData?.email || null;
      }
      
      // Secondary fallback to Auth table query
      if (!studentEmail && venture.user_id) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(venture.user_id);
          studentEmail = authUser?.user?.email || null;
        } catch (authErr) {
          console.warn("[EmailActions] Failed to query auth.users:", authErr);
        }
      }

      if (!studentEmail) {
        console.warn(`[EmailActions] Student email not found for venture ${ventureId}`);
      }

      // 4. Fetch Academic Board emails dynamically
      const { data: boardRoles } = await supabaseAdmin
        .from("user_roles")
        .select("email")
        .eq("role", "academic_board");

      const boardEmails = (boardRoles || [])
        .map((r: any) => r.email)
        .filter(Boolean) as string[];

      // 5. Fetch Mentor name and email
      const { data: mentorRole } = await supabaseAdmin
        .from("user_roles")
        .select("email")
        .eq("user_id", mentorUserId)
        .maybeSingle();

      let mentorEmailResolved = mentorRole?.email || null;
      let mentorName = mentorRole?.email || "Mentor";
      try {
        const { data: authMentor } = await supabaseAdmin.auth.admin.getUserById(mentorUserId);
        if (authMentor?.user) {
          if (!mentorEmailResolved) {
            mentorEmailResolved = authMentor.user.email || null;
          }
          mentorName =
            authMentor.user.user_metadata?.full_name ||
            authMentor.user.email ||
            mentorName;
        }
      } catch (authErr) {
        console.warn("[EmailActions] Failed to query auth mentor details:", authErr);
      }

      const emailService = new EmailService();
      const dashboardBaseUrl = process.env.APP_URL || "http://localhost:3000";

      // 6. Calculate score percentage
      const currentScoreVal = kpi.score !== null ? kpi.score : 0;
      const currentPct = (currentScoreVal / kpi.total_grade) * 100;
      const roundedPct = Math.round(currentPct);

      // 7. Send notification to student (always)
      if (studentEmail) {
        try {
          await emailService.sendKpiScoredStudentEmail(
            studentEmail,
            {
              studentName: venture.student_name,
              score: currentScoreVal,
              totalMarks: kpi.total_grade,
              percentage: roundedPct,
              evaluationName: kpi.name,
              dashboardUrl: `${dashboardBaseUrl}/result`,
            },
            venture.user_id || undefined
          );
        } catch (studErr: any) {
          console.error(`[EmailActions] Error sending student email: ${studErr.message}`);
        }
      }

      // 8. Resolve assigned Mentor's details
      let assignedMentorEmail = mentorEmailResolved;
      let assignedMentorName = mentorName;

      if (venture.mentor_id && venture.mentor_id !== mentorUserId) {
        const { data: vMentorRole } = await supabaseAdmin
          .from("user_roles")
          .select("email")
          .eq("user_id", venture.mentor_id)
          .maybeSingle();

        if (vMentorRole?.email) {
          assignedMentorEmail = vMentorRole.email;
          assignedMentorName = vMentorRole.email;
        } else {
          // Fallback to query auth.users for the assigned mentor email
          try {
            const { data: authAssigned } = await supabaseAdmin.auth.admin.getUserById(venture.mentor_id);
            if (authAssigned?.user?.email) {
              assignedMentorEmail = authAssigned.user.email;
              assignedMentorName = authAssigned.user.user_metadata?.full_name || authAssigned.user.email;
            }
          } catch (authErr) {
            console.warn("[EmailActions] Failed to query assigned mentor auth details:", authErr);
          }
        }
      }

      // 9. Performance Check Warnings
      // Case A: Score <= 40% -> Alert Academic Board AND Mentor
      if (currentPct <= 40) {
        // Send to Academic Board members
        if (boardEmails.length > 0) {
          for (const boardEmail of boardEmails) {
            try {
              await emailService.sendAcademicBoardLowScoreEmail(boardEmail, {
                studentName: venture.student_name,
                studentEmail: studentEmail || "N/A",
                batch: venture.roll_no || "2024-2028",
                score: currentScoreVal,
                totalMarks: kpi.total_grade,
                percentage: roundedPct,
                mentorName: assignedMentorName,
                evaluationName: kpi.name,
                dashboardUrl: `${dashboardBaseUrl}/result`,
              });
            } catch (alertErr: any) {
              console.error(
                `[EmailActions] Error sending board low score alert to ${boardEmail}: ${alertErr.message}`
              );
            }
          }
        }

        // Send to Mentor
        if (assignedMentorEmail) {
          try {
            await emailService.sendMentorLowScoreEmail(assignedMentorEmail, {
              studentName: venture.student_name,
              score: currentScoreVal,
              totalMarks: kpi.total_grade,
              percentage: roundedPct,
              evaluationName: kpi.name,
              dashboardUrl: `${dashboardBaseUrl}/result`,
            });
          } catch (alertErr: any) {
            console.error(
              `[EmailActions] Error sending mentor low score alert: ${alertErr.message}`
            );
          }
        }
      }
      // Case B: Score > 40% and < 70% -> Alert Mentor to connect
      else if (currentPct > 40 && currentPct < 70) {
        if (assignedMentorEmail) {
          try {
            await emailService.sendMentorFollowUpEmail(assignedMentorEmail, {
              studentName: venture.student_name,
              score: currentScoreVal,
              totalMarks: kpi.total_grade,
              percentage: roundedPct,
              evaluationName: kpi.name,
              dashboardUrl: `${dashboardBaseUrl}/result`,
            });
          } catch (alertErr: any) {
            console.error(
              `[EmailActions] Error sending mentor mid score connect alert: ${alertErr.message}`
            );
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error("[EmailActions] Critical error in sendLockedKpiEmailsFn:", err);
      return { success: false, error: err.message || String(err) };
    }
  });

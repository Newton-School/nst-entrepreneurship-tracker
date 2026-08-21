import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Helper to fetch user role and venture details on the server
async function checkKpiPermission(
  userId: string,
  ventureId: string,
  kpiId?: string
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Get user details
  const { data: userRole } = await supabaseAdmin
    .from("user_roles")
    .select("role, email, roll_no")
    .eq("user_id", userId)
    .maybeSingle();

  const role = userRole?.role || "student";
  const isBoard = role === "admin" || role === "academic_board";

  // Get venture details
  const { data: venture, error: vErr } = await supabaseAdmin
    .from("ventures")
    .select("user_id, mentor_id, roll_no, student_name")
    .eq("id", ventureId)
    .single();

  if (vErr || !venture) {
    throw new Error(`Venture not found: ${vErr?.message || "No record"}`);
  }

  // Get auth email fallback if not in user_roles
  let authEmail: string | null = userRole?.email || null;
  if (!authEmail) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      authEmail = authUser?.user?.email || null;
    } catch (err) {
      console.warn("[checkKpiPermission] Auth email fetch failed:", err);
    }
  }

  // Get KPI details if provided
  let isLocked = false;
  if (kpiId) {
    const { data: kpi } = await supabaseAdmin
      .from("venture_kpis")
      .select("is_locked")
      .eq("id", kpiId)
      .single();
    isLocked = kpi?.is_locked || false;
  }

  const normalize = (s?: string | null) => (s || "").trim().toLowerCase();

  const userEmailNorm = normalize(authEmail);
  const userRollNorm = normalize(userRole?.roll_no);
  const ventureRollNorm = normalize(venture.roll_no);
  const ventureStudentNameNorm = normalize(venture.student_name);

  const isMentor = role === "mentor" && venture.mentor_id === userId;
  const isOwner =
    role === "student" &&
    (venture.user_id === userId ||
      (userEmailNorm && (ventureRollNorm === userEmailNorm || ventureStudentNameNorm === userEmailNorm)) ||
      (userRollNorm && ventureRollNorm === userRollNorm));



  return {
    role,
    isBoard,
    isMentor,
    isOwner,
    isLocked,
    canAdd: isBoard || isOwner,
    canEdit: isBoard || ((isMentor || isOwner) && !isLocked),
    canDelete: isBoard || ((isMentor || isOwner) && !isLocked),
  };
}

export const addKpiServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      ventureId: z.string(),
      name: z.string(),
      totalGrade: z.number(),
      dueDate: z.string().nullable(),
      subcategories: z.array(
        z.object({
          name: z.string(),
          totalGrade: z.number(),
        })
      ),
    })
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Verify permissions
      const perm = await checkKpiPermission(userId, data.ventureId);
      if (!perm.canAdd) {
        throw new Error("You do not have permission to add KPIs to this venture.");
      }

      // Insert KPI
      const { data: kpi, error: kpiErr } = await supabaseAdmin
        .from("venture_kpis")
        .insert({
          venture_id: data.ventureId,
          name: data.name.trim(),
          total_grade: data.totalGrade,
          due_date: data.dueDate,
        })
        .select()
        .single();

      if (kpiErr || !kpi) {
        throw new Error(`KPI insert error: ${kpiErr?.message || "Failed to create"}`);
      }

      // Insert subcategories
      if (data.subcategories.length > 0) {
        const { error: subErr } = await supabaseAdmin
          .from("kpi_subcategories")
          .insert(
            data.subcategories.map((sub) => ({
              kpi_id: kpi.id,
              name: sub.name.trim(),
              total_grade: sub.totalGrade,
            }))
          );

        if (subErr) {
          throw new Error(`Subgrade insert error: ${subErr.message}`);
        }
      }

      return { success: true, kpiId: kpi.id };
    } catch (err: any) {
      console.error("[addKpiServerFn Error]", err);
      return { success: false, error: err.message || String(err) };
    }
  });

export const editKpiServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      kpiId: z.string(),
      ventureId: z.string(),
      name: z.string(),
      totalGrade: z.number(),
      dueDate: z.string().nullable(),
      subcategories: z.array(
        z.object({
          name: z.string(),
          totalGrade: z.number(),
        })
      ),
    })
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Verify permissions
      const perm = await checkKpiPermission(userId, data.ventureId, data.kpiId);
      if (!perm.canEdit) {
        throw new Error("You do not have permission to edit this KPI (or it is locked).");
      }

      // Update KPI
      const { error: kpiErr } = await supabaseAdmin
        .from("venture_kpis")
        .update({
          name: data.name.trim(),
          total_grade: data.totalGrade,
          due_date: data.dueDate,
        })
        .eq("id", data.kpiId);

      if (kpiErr) {
        throw new Error(`KPI update error: ${kpiErr.message}`);
      }

      // Re-create subcategories: delete old and insert new
      const { error: delErr } = await supabaseAdmin
        .from("kpi_subcategories")
        .delete()
        .eq("kpi_id", data.kpiId);

      if (delErr) {
        throw new Error(`Subgrade delete error: ${delErr.message}`);
      }

      if (data.subcategories.length > 0) {
        const { error: subErr } = await supabaseAdmin
          .from("kpi_subcategories")
          .insert(
            data.subcategories.map((sub) => ({
              kpi_id: data.kpiId,
              name: sub.name.trim(),
              total_grade: sub.totalGrade,
            }))
          );

        if (subErr) {
          throw new Error(`Subgrade insert error: ${subErr.message}`);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error("[editKpiServerFn Error]", err);
      return { success: false, error: err.message || String(err) };
    }
  });

export const deleteKpiServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      kpiId: z.string(),
      ventureId: z.string(),
    })
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Verify permissions
      const perm = await checkKpiPermission(userId, data.ventureId, data.kpiId);
      if (!perm.canDelete) {
        throw new Error("You do not have permission to delete this KPI (or it is locked).");
      }

      // Delete KPI (cascades subcategories & submissions)
      const { error: delErr } = await supabaseAdmin
        .from("venture_kpis")
        .delete()
        .eq("id", data.kpiId);

      if (delErr) {
        throw new Error(`KPI delete error: ${delErr.message}`);
      }

      return { success: true };
    } catch (err: any) {
      console.error("[deleteKpiServerFn Error]", err);
      return { success: false, error: err.message || String(err) };
    }
  });

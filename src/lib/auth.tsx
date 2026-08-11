import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

export type Role = Enums<"app_role">;

export type AuthStatus = "loading" | "signedOut" | "ready" | "error";

type AuthState = {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  role: Role | null;
  roleError: string | null;
  isStudent: boolean;
  isStaff: boolean;
  isMentor: boolean;
  isBoard: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  session: null,
  user: null,
  status: "loading",
  role: null,
  roleError: null,
  isStudent: false,
  isStaff: false,
  isMentor: false,
  isBoard: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [role, setRole] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setStatus("loading");
        setTimeout(() => loadRole(s.user.id), 0);
      } else {
        setRole(null);
        setRoleError(null);
        setStatus("signedOut");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRole(data.session.user.id);
      else setStatus("signedOut");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRole(uid: string) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      setRole(null);
      setRoleError(error.message);
      setStatus("error");
      return;
    }
    if (!data) {
      setRole(null);
      setRoleError("No role is assigned to this account.");
      setStatus("error");
      return;
    }
    setRole(data.role);
    setRoleError(null);
    setStatus("ready");
  }

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    status,
    role,
    roleError,
    isStudent: role === "student",
    isStaff: status === "ready" && role !== "student",
    isMentor: role === "mentor",
    isBoard: role === "admin" || role === "academic_board",
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

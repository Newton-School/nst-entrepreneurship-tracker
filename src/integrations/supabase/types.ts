export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      course_mappings: {
        Row: {
          bloom_level: string | null;
          co_code: string;
          co_statement: string;
          course_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          published: boolean;
          tlo_ids: string[];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          bloom_level?: string | null;
          co_code: string;
          co_statement: string;
          course_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          published?: boolean;
          tlo_ids?: string[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          bloom_level?: string | null;
          co_code?: string;
          co_statement?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          published?: boolean;
          tlo_ids?: string[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      evaluations: {
        Row: {
          course_id: string;
          created_at: string;
          evaluator_id: string | null;
          feedback: string | null;
          id: string;
          rubric_scores: Json;
          student_id: string | null;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          evaluator_id?: string | null;
          feedback?: string | null;
          id?: string;
          rubric_scores?: Json;
          student_id?: string | null;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          evaluator_id?: string | null;
          feedback?: string | null;
          id?: string;
          rubric_scores?: Json;
          student_id?: string | null;
        };
        Relationships: [];
      };
      kpi_subcategories: {
        Row: {
          created_at: string;
          id: string;
          kpi_id: string;
          name: string;
          obtain_grade: string | null;
          score: number | null;
          total_grade: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kpi_id: string;
          name: string;
          obtain_grade?: string | null;
          score?: number | null;
          total_grade?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          kpi_id?: string;
          name?: string;
          obtain_grade?: string | null;
          score?: number | null;
          total_grade?: number;
        };
        Relationships: [
          {
            foreignKeyName: "kpi_subcategories_kpi_id_fkey";
            columns: ["kpi_id"];
            isOneToOne: false;
            referencedRelation: "venture_kpis";
            referencedColumns: ["id"];
          },
        ];
      };
      kpi_submissions: {
        Row: {
          created_at: string;
          file_name: string;
          id: string;
          is_late: boolean;
          kpi_id: string;
          mime_type: string | null;
          note: string | null;
          size_bytes: number | null;
          storage_path: string;
          student_id: string;
          subcategory_id: string | null;
          submitted_at: string;
          venture_id: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          id?: string;
          is_late?: boolean;
          kpi_id: string;
          mime_type?: string | null;
          note?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          student_id?: string;
          subcategory_id?: string | null;
          submitted_at?: string;
          venture_id: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          id?: string;
          is_late?: boolean;
          kpi_id?: string;
          mime_type?: string | null;
          note?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          student_id?: string;
          subcategory_id?: string | null;
          submitted_at?: string;
          venture_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kpi_submissions_kpi_id_fkey";
            columns: ["kpi_id"];
            isOneToOne: false;
            referencedRelation: "venture_kpis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kpi_submissions_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "kpi_subcategories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kpi_submissions_venture_id_fkey";
            columns: ["venture_id"];
            isOneToOne: false;
            referencedRelation: "ventures";
            referencedColumns: ["id"];
          },
        ];
      };
      proposal: {
        Row: {
          created_at: string;
          email: string;
          id: number;
          name: string;
          status: Database["public"]["Enums"]["proposal_state"];
          subject: string;
          venture: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: number;
          name: string;
          status?: Database["public"]["Enums"]["proposal_state"];
          subject: string;
          venture: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: number;
          name?: string;
          status?: Database["public"]["Enums"]["proposal_state"];
          subject?: string;
          venture?: string;
        };
        Relationships: [];
      };
      residency_applications: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          stage: string;
          status: string;
          user_id: string | null;
          venture_name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          stage?: string;
          status?: string;
          user_id?: string | null;
          venture_name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          stage?: string;
          status?: string;
          user_id?: string | null;
          venture_name?: string;
        };
        Relationships: [];
      };
      role_change_log: {
        Row: {
          changed_by: string;
          changed_by_email: string | null;
          created_at: string;
          id: string;
          new_role: Database["public"]["Enums"]["app_role"];
          previous_role: Database["public"]["Enums"]["app_role"] | null;
          target_email: string | null;
          target_user_id: string;
        };
        Insert: {
          changed_by: string;
          changed_by_email?: string | null;
          created_at?: string;
          id?: string;
          new_role: Database["public"]["Enums"]["app_role"];
          previous_role?: Database["public"]["Enums"]["app_role"] | null;
          target_email?: string | null;
          target_user_id: string;
        };
        Update: {
          changed_by?: string;
          changed_by_email?: string | null;
          created_at?: string;
          id?: string;
          new_role?: Database["public"]["Enums"]["app_role"];
          previous_role?: Database["public"]["Enums"]["app_role"] | null;
          target_email?: string | null;
          target_user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          roll_no: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          roll_no?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          roll_no?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      venture_kpis: {
        Row: {
          created_at: string;
          due_date: string | null;
          feedback: string | null;
          id: string;
          is_locked: boolean;
          locked_at: string | null;
          locked_by: string | null;
          name: string;
          obtain_grade: string | null;
          score: number | null;
          scored_at: string | null;
          scored_by: string | null;
          total_grade: number;
          venture_id: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string | null;
          feedback?: string | null;
          id?: string;
          is_locked?: boolean;
          locked_at?: string | null;
          locked_by?: string | null;
          name: string;
          obtain_grade?: string | null;
          score?: number | null;
          scored_at?: string | null;
          scored_by?: string | null;
          total_grade?: number;
          venture_id: string;
        };
        Update: {
          created_at?: string;
          due_date?: string | null;
          feedback?: string | null;
          id?: string;
          is_locked?: boolean;
          locked_at?: string | null;
          locked_by?: string | null;
          name?: string;
          obtain_grade?: string | null;
          score?: number | null;
          scored_at?: string | null;
          scored_by?: string | null;
          total_grade?: number;
          venture_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venture_kpis_venture_id_fkey";
            columns: ["venture_id"];
            isOneToOne: false;
            referencedRelation: "ventures";
            referencedColumns: ["id"];
          },
        ];
      };
      ventures: {
        Row: {
          created_at: string;
          id: string;
          mentor_id: string | null;
          roll_no: string | null;
          student_name: string;
          subject: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mentor_id?: string | null;
          roll_no?: string | null;
          student_name: string;
          subject: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mentor_id?: string | null;
          roll_no?: string | null;
          student_name?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_list_users: {
        Args: never;
        Returns: {
          user_id: string;
          email: string | null;
          roll_no: string | null;
          role: Database["public"]["Enums"]["app_role"] | null;
          role_assigned_at: string | null;
          signed_up_at: string;
          last_sign_in_at: string | null;
        }[];
      };
      admin_set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: Database["public"]["Tables"]["user_roles"]["Row"];
      };
      can_read_venture: {
        Args: { v_roll_no: string; v_student_name: string; v_user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      is_board: { Args: never; Returns: boolean };
      is_mentor_of_venture: { Args: { _venture_id: string }; Returns: boolean };
      is_staff: { Args: never; Returns: boolean };
      is_venture_student: { Args: { _venture_id: string }; Returns: boolean };
      kpi_parent: {
        Args: { _kpi_id: string };
        Returns: Record<string, unknown>;
      };
      path_venture_id: { Args: { _name: string }; Returns: string };
    };
    Enums: {
      app_role: "admin" | "academic_board" | "mentor" | "student";
      proposal_state: "pending" | "rejected" | "accepted";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "academic_board", "mentor", "student"],
      proposal_state: ["pending", "rejected", "accepted"],
    },
  },
} as const;

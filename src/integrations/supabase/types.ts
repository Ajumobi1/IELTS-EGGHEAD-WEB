export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_notifications: {
        Row: {
          booking_id: string
          channel: string
          id: string
          kind: string
          provider_message_id: string | null
          sent_at: string
          sent_by: string | null
          status: string
        }
        Insert: {
          booking_id: string
          channel?: string
          id?: string
          kind: string
          provider_message_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          channel?: string
          id?: string
          kind?: string
          provider_message_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          notify_pref: string
          phone: string | null
          preferred_date: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          notify_pref?: string
          phone?: string | null
          preferred_date?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          notify_pref?: string
          phone?: string | null
          preferred_date?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          currency: string | null
          exam_date: string | null
          exam_type: string | null
          focus_skills: string[] | null
          full_name: string | null
          id: string
          marketing_opt_in: boolean | null
          native_language: string | null
          onboarded: boolean
          onboarding_step: number
          phone: string | null
          prep_purpose: string | null
          referral_source: string | null
          student_level:
            | Database["public"]["Enums"]["profile_student_level"]
            | null
          target_band: number | null
          terms_accepted_at: string | null
          test_timeframe: string | null
          timezone: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["profile_user_type"] | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          exam_date?: string | null
          exam_type?: string | null
          focus_skills?: string[] | null
          full_name?: string | null
          id: string
          marketing_opt_in?: boolean | null
          native_language?: string | null
          onboarded?: boolean
          onboarding_step?: number
          phone?: string | null
          prep_purpose?: string | null
          referral_source?: string | null
          student_level?:
            | Database["public"]["Enums"]["profile_student_level"]
            | null
          target_band?: number | null
          terms_accepted_at?: string | null
          test_timeframe?: string | null
          timezone?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["profile_user_type"] | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          exam_date?: string | null
          exam_type?: string | null
          focus_skills?: string[] | null
          full_name?: string | null
          id?: string
          marketing_opt_in?: boolean | null
          native_language?: string | null
          onboarded?: boolean
          onboarding_step?: number
          phone?: string | null
          prep_purpose?: string | null
          referral_source?: string | null
          student_level?:
            | Database["public"]["Enums"]["profile_student_level"]
            | null
          target_band?: number | null
          terms_accepted_at?: string | null
          test_timeframe?: string | null
          timezone?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["profile_user_type"] | null
        }
        Relationships: []
      }
      question_groups: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          meta: Json
          position: number
          question_type: string
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          meta?: Json
          position: number
          question_type: string
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          meta?: Json
          position?: number
          question_type?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_groups_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          group_id: string | null
          id: string
          number: number | null
          options: Json | null
          points: number
          position: number
          prompt: string
          question_type: string | null
          test_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          number?: number | null
          options?: Json | null
          points?: number
          position?: number
          prompt: string
          question_type?: string | null
          test_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          number?: number | null
          options?: Json | null
          points?: number
          position?: number
          prompt?: string
          question_type?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "question_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          admin_notes: string | null
          answers: Json
          id: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          started_at: string
          submitted: boolean
          submitted_at: string | null
          test_id: string
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          answers?: Json
          id?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          started_at?: string
          submitted?: boolean
          submitted_at?: string | null
          test_id: string
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          answers?: Json
          id?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          started_at?: string
          submitted?: boolean
          submitted_at?: string | null
          test_id?: string
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sections: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          image_url: string | null
          passage: string | null
          position: number
          speaking_cue: string | null
          test_id: string
          title: string | null
          updated_at: string
          writing_prompt: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          passage?: string | null
          position: number
          speaking_cue?: string | null
          test_id: string
          title?: string | null
          updated_at?: string
          writing_prompt?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          passage?: string | null
          position?: number
          speaking_cue?: string | null
          test_id?: string
          title?: string | null
          updated_at?: string
          writing_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sections_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          audio_url: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          duration_minutes: number
          id: string
          is_published: boolean
          passage: string | null
          title: string
          type: Database["public"]["Enums"]["test_type"]
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          is_published?: boolean
          passage?: string | null
          title: string
          type: Database["public"]["Enums"]["test_type"]
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          is_published?: boolean
          passage?: string | null
          title?: string
          type?: Database["public"]["Enums"]["test_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_security_healthcheck: { Args: never; Returns: Json }
      get_question_answers: {
        Args: { _test_id: string }
        Returns: {
          correct_answer: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_test_attempt: {
        Args: {
          _answers: Json
          _attempt_id: string
          _flagged?: Json
          _notes?: string
        }
        Returns: {
          score: number
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "student"
      profile_student_level:
        | "junior_middle"
        | "high_school"
        | "college_university"
        | "graduate"
        | "other"
      profile_user_type: "student" | "parent" | "professional" | "institution"
      test_type: "reading" | "listening" | "writing" | "speaking"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student"],
      profile_student_level: [
        "junior_middle",
        "high_school",
        "college_university",
        "graduate",
        "other",
      ],
      profile_user_type: ["student", "parent", "professional", "institution"],
      test_type: ["reading", "listening", "writing", "speaking"],
    },
  },
} as const

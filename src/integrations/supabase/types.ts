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
      exercises: {
        Row: {
          category: string
          created_at: string
          equipment: string | null
          id: string
          instructions: string | null
          name: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          name: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          name?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          ai_data_consent: boolean | null
          ai_data_consent_at: string | null
          allergies: string | null
          avatar_url: string | null
          cardio_duration: string | null
          cardio_enabled: boolean | null
          cardio_frequency: string | null
          cardio_timing: string | null
          cardio_type_preference: string | null
          created_at: string
          disliked_foods: string | null
          experience: string | null
          free_meals: string | null
          full_name: string | null
          goal: string | null
          gym_type: string | null
          height: number | null
          id: string
          injuries: string | null
          meal_count: number | null
          neat: string | null
          onboarding_complete: boolean
          preferred_foods: string[] | null
          sex: string | null
          sleep_hours: number | null
          stress_level: string | null
          supplements: string[] | null
          sweet_preference: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          training_days: number | null
          training_time: string | null
          training_weekdays: string[] | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          ai_data_consent?: boolean | null
          ai_data_consent_at?: string | null
          allergies?: string | null
          avatar_url?: string | null
          cardio_duration?: string | null
          cardio_enabled?: boolean | null
          cardio_frequency?: string | null
          cardio_timing?: string | null
          cardio_type_preference?: string | null
          created_at?: string
          disliked_foods?: string | null
          experience?: string | null
          free_meals?: string | null
          full_name?: string | null
          goal?: string | null
          gym_type?: string | null
          height?: number | null
          id?: string
          injuries?: string | null
          meal_count?: number | null
          neat?: string | null
          onboarding_complete?: boolean
          preferred_foods?: string[] | null
          sex?: string | null
          sleep_hours?: number | null
          stress_level?: string | null
          supplements?: string[] | null
          sweet_preference?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          training_days?: number | null
          training_time?: string | null
          training_weekdays?: string[] | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          ai_data_consent?: boolean | null
          ai_data_consent_at?: string | null
          allergies?: string | null
          avatar_url?: string | null
          cardio_duration?: string | null
          cardio_enabled?: boolean | null
          cardio_frequency?: string | null
          cardio_timing?: string | null
          cardio_type_preference?: string | null
          created_at?: string
          disliked_foods?: string | null
          experience?: string | null
          free_meals?: string | null
          full_name?: string | null
          goal?: string | null
          gym_type?: string | null
          height?: number | null
          id?: string
          injuries?: string | null
          meal_count?: number | null
          neat?: string | null
          onboarding_complete?: boolean
          preferred_foods?: string[] | null
          sex?: string | null
          sleep_hours?: number | null
          stress_level?: string | null
          supplements?: string[] | null
          sweet_preference?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          training_days?: number | null
          training_time?: string | null
          training_weekdays?: string[] | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      protocols: {
        Row: {
          created_at: string
          diet: Json
          end_date: string
          id: string
          start_date: string
          status: string
          training: Json
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          diet?: Json
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          training?: Json
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          diet?: Json
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          training?: Json
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_feedback: {
        Row: {
          created_at: string
          day_index: number
          id: string
          notes: string | null
          protocol_id: string | null
          rating: number
          session_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          id?: string
          notes?: string | null
          protocol_id?: string | null
          rating: number
          session_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          id?: string
          notes?: string | null
          protocol_id?: string | null
          rating?: number
          session_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_feedback_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          created_at: string
          day_index: number
          exercise_id: string
          exercise_name: string
          id: string
          notes: string | null
          protocol_id: string | null
          session_date: string
          sets: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          exercise_id: string
          exercise_name: string
          id?: string
          notes?: string | null
          protocol_id?: string | null
          session_date?: string
          sets?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          exercise_id?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          protocol_id?: string | null
          session_date?: string
          sets?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

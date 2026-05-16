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
      achievements: {
        Row: {
          code: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_analyses: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          meta: Json | null
          status: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind: string
          meta?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_participations: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          joined_at: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          reward_badge: string | null
          reward_points: number
          starts_at: string
          target_metric: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          reward_badge?: string | null
          reward_points?: number
          starts_at?: string
          target_metric?: string
          target_value?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          reward_badge?: string | null
          reward_points?: number
          starts_at?: string
          target_metric?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          adherence: number | null
          created_at: string
          id: string
          notes: string | null
          photo_back: string | null
          photo_front: string | null
          photo_side: string | null
          protocol_id: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          adherence?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_back?: string | null
          photo_front?: string | null
          photo_side?: string | null
          protocol_id?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          adherence?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_back?: string | null
          photo_front?: string | null
          photo_side?: string | null
          protocol_id?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_feedback: {
        Row: {
          created_at: string
          hunger: number | null
          id: string
          meal_index: number | null
          notes: string | null
          protocol_id: string | null
          rating: number
          session_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hunger?: number | null
          id?: string
          meal_index?: number | null
          notes?: string | null
          protocol_id?: string | null
          rating: number
          session_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hunger?: number | null
          id?: string
          meal_index?: number | null
          notes?: string | null
          protocol_id?: string | null
          rating?: number
          session_date?: string
          user_id?: string
        }
        Relationships: []
      }
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
      journal_entries: {
        Row: {
          created_at: string
          energy: number | null
          entry_date: string
          id: string
          mood: number | null
          notes: string | null
          sleep_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy?: number | null
          entry_date?: string
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy?: number | null
          entry_date?: string
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      monthly_analyses: {
        Row: {
          ai_summary: string | null
          analysis_date: string
          coach_notes: string | null
          created_at: string
          id: string
          measurements: Json | null
          photo_back: string | null
          photo_front: string | null
          photo_side: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          ai_summary?: string | null
          analysis_date?: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          measurements?: Json | null
          photo_back?: string | null
          photo_front?: string | null
          photo_side?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          ai_summary?: string | null
          analysis_date?: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          measurements?: Json | null
          photo_back?: string | null
          photo_front?: string | null
          photo_side?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          address: string | null
          aerobic_fasted: boolean | null
          aerobic_protocol: string | null
          age: number | null
          ai_data_consent: boolean | null
          ai_data_consent_at: string | null
          allergies: string | null
          anamnese_completed_at: string | null
          anamnese_extra: Json | null
          avatar_url: string | null
          birth_date: string | null
          bowel_routine: string | null
          cardio_duration: string | null
          cardio_enabled: boolean | null
          cardio_frequency: string | null
          cardio_timing: string | null
          cardio_type_preference: string | null
          cpf: string | null
          created_at: string
          current_diet_text: string | null
          current_split: string | null
          daily_discomfort: string | null
          daily_routine: string | null
          diet_status: string | null
          digestibility: string | null
          disliked_foods: string | null
          ergogenics_history: string | null
          exercise_discomfort: string | null
          experience: string | null
          fasting_morning: string | null
          free_meals: string | null
          full_name: string | null
          goal: string | null
          goal_1y: string | null
          goal_3m: string | null
          gym_brand: string | null
          gym_type: string | null
          hard_meal_times: string | null
          height: number | null
          hormonal_side_effects: string | null
          id: string
          injuries: string | null
          junk_food_choice: string | null
          liked_foods: string | null
          manipulated_fitoterapics: string | null
          meal_count: number | null
          neat: string | null
          onboarding_complete: boolean
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          preferred_foods: string[] | null
          previous_consultation: string | null
          profession: string | null
          psych_meds: string | null
          referral_source: string | null
          sex: string | null
          sleep_hours: number | null
          sleep_quality: string | null
          stress_level: string | null
          structural_limit: string | null
          supplements: string[] | null
          sweet_anxiety_times: string | null
          sweet_preference: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          training_days: number | null
          training_time: string | null
          training_weekdays: string[] | null
          updated_at: string
          user_id: string
          weekend_routine: string | null
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          address?: string | null
          aerobic_fasted?: boolean | null
          aerobic_protocol?: string | null
          age?: number | null
          ai_data_consent?: boolean | null
          ai_data_consent_at?: string | null
          allergies?: string | null
          anamnese_completed_at?: string | null
          anamnese_extra?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          bowel_routine?: string | null
          cardio_duration?: string | null
          cardio_enabled?: boolean | null
          cardio_frequency?: string | null
          cardio_timing?: string | null
          cardio_type_preference?: string | null
          cpf?: string | null
          created_at?: string
          current_diet_text?: string | null
          current_split?: string | null
          daily_discomfort?: string | null
          daily_routine?: string | null
          diet_status?: string | null
          digestibility?: string | null
          disliked_foods?: string | null
          ergogenics_history?: string | null
          exercise_discomfort?: string | null
          experience?: string | null
          fasting_morning?: string | null
          free_meals?: string | null
          full_name?: string | null
          goal?: string | null
          goal_1y?: string | null
          goal_3m?: string | null
          gym_brand?: string | null
          gym_type?: string | null
          hard_meal_times?: string | null
          height?: number | null
          hormonal_side_effects?: string | null
          id?: string
          injuries?: string | null
          junk_food_choice?: string | null
          liked_foods?: string | null
          manipulated_fitoterapics?: string | null
          meal_count?: number | null
          neat?: string | null
          onboarding_complete?: boolean
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          preferred_foods?: string[] | null
          previous_consultation?: string | null
          profession?: string | null
          psych_meds?: string | null
          referral_source?: string | null
          sex?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          stress_level?: string | null
          structural_limit?: string | null
          supplements?: string[] | null
          sweet_anxiety_times?: string | null
          sweet_preference?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          training_days?: number | null
          training_time?: string | null
          training_weekdays?: string[] | null
          updated_at?: string
          user_id: string
          weekend_routine?: string | null
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          address?: string | null
          aerobic_fasted?: boolean | null
          aerobic_protocol?: string | null
          age?: number | null
          ai_data_consent?: boolean | null
          ai_data_consent_at?: string | null
          allergies?: string | null
          anamnese_completed_at?: string | null
          anamnese_extra?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          bowel_routine?: string | null
          cardio_duration?: string | null
          cardio_enabled?: boolean | null
          cardio_frequency?: string | null
          cardio_timing?: string | null
          cardio_type_preference?: string | null
          cpf?: string | null
          created_at?: string
          current_diet_text?: string | null
          current_split?: string | null
          daily_discomfort?: string | null
          daily_routine?: string | null
          diet_status?: string | null
          digestibility?: string | null
          disliked_foods?: string | null
          ergogenics_history?: string | null
          exercise_discomfort?: string | null
          experience?: string | null
          fasting_morning?: string | null
          free_meals?: string | null
          full_name?: string | null
          goal?: string | null
          goal_1y?: string | null
          goal_3m?: string | null
          gym_brand?: string | null
          gym_type?: string | null
          hard_meal_times?: string | null
          height?: number | null
          hormonal_side_effects?: string | null
          id?: string
          injuries?: string | null
          junk_food_choice?: string | null
          liked_foods?: string | null
          manipulated_fitoterapics?: string | null
          meal_count?: number | null
          neat?: string | null
          onboarding_complete?: boolean
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          preferred_foods?: string[] | null
          previous_consultation?: string | null
          profession?: string | null
          psych_meds?: string | null
          referral_source?: string | null
          sex?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          stress_level?: string | null
          structural_limit?: string | null
          supplements?: string[] | null
          sweet_anxiety_times?: string | null
          sweet_preference?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          training_days?: number | null
          training_time?: string | null
          training_weekdays?: string[] | null
          updated_at?: string
          user_id?: string
          weekend_routine?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      protocols: {
        Row: {
          created_at: string
          diet: Json
          end_date: string
          hormones: Json
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
          hormones?: Json
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
          hormones?: Json
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
      share_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          include_notes: boolean
          include_photos: boolean
          title: string | null
          token: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          include_notes?: boolean
          include_photos?: boolean
          title?: string | null
          token: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          include_notes?: boolean
          include_photos?: boolean
          title?: string | null
          token?: string
          updated_at?: string
          user_id?: string
          views?: number
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
      weekly_feedbacks: {
        Row: {
          adherence_diet: number | null
          adherence_training: number | null
          created_at: string
          energy: number | null
          id: string
          measurements: Json | null
          notes: string | null
          sleep_quality: number | null
          updated_at: string
          user_id: string
          week_start: string
          weight: number | null
        }
        Insert: {
          adherence_diet?: number | null
          adherence_training?: number | null
          created_at?: string
          energy?: number | null
          id?: string
          measurements?: Json | null
          notes?: string | null
          sleep_quality?: number | null
          updated_at?: string
          user_id: string
          week_start?: string
          weight?: number | null
        }
        Update: {
          adherence_diet?: number | null
          adherence_training?: number | null
          created_at?: string
          energy?: number | null
          id?: string
          measurements?: Json | null
          notes?: string | null
          sleep_quality?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
          weight?: number | null
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

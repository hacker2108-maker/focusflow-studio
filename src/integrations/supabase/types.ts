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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          avg_speed_kmh: number | null
          calories_burned: number | null
          created_at: string
          date: string
          distance_km: number
          duration_minutes: number
          id: string
          route_points: Json | null
          steps: number | null
          type: string
          user_id: string
        }
        Insert: {
          avg_speed_kmh?: number | null
          calories_burned?: number | null
          created_at?: string
          date: string
          distance_km?: number
          duration_minutes?: number
          id?: string
          route_points?: Json | null
          steps?: number | null
          type?: string
          user_id: string
        }
        Update: {
          avg_speed_kmh?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_km?: number
          duration_minutes?: number
          id?: string
          route_points?: Json | null
          steps?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          color: string | null
          created_at: string
          date: string
          description: string | null
          end_time: string
          id: string
          is_recurring: boolean | null
          notification_id: number | null
          parent_event_id: string | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          reminder: number | null
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          date: string
          description?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          notification_id?: number | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          reminder?: number | null
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          notification_id?: number | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          reminder?: number | null
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed: boolean | null
          created_at: string
          date: string
          duration_minutes: number
          id: string
          mode: string
          note: string | null
          start_time: number
          task: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          date: string
          duration_minutes: number
          id?: string
          mode?: string
          note?: string | null
          start_time: number
          task?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          date?: string
          duration_minutes?: number
          id?: string
          mode?: string
          note?: string | null
          start_time?: number
          task?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          id: string
          note: string | null
          status: string
          timestamp: number
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          date: string
          habit_id: string
          id?: string
          note?: string | null
          status?: string
          timestamp?: number
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          note?: string | null
          status?: string
          timestamp?: number
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived: boolean | null
          color: string | null
          created_at: string
          description: string | null
          goal_target: number | null
          goal_type: string
          id: string
          name: string
          reminder_time: string | null
          schedule_days_of_week: number[] | null
          schedule_times_per_week: number | null
          schedule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          goal_target?: number | null
          goal_type?: string
          id?: string
          name: string
          reminder_time?: string | null
          schedule_days_of_week?: number[] | null
          schedule_times_per_week?: number | null
          schedule_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          goal_target?: number | null
          goal_type?: string
          id?: string
          name?: string
          reminder_time?: string | null
          schedule_days_of_week?: number[] | null
          schedule_times_per_week?: number | null
          schedule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string | null
          created_at: string
          date: string
          id: string
          mood: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          date: string
          id?: string
          mood?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          mood?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string | null
          content: string | null
          created_at: string
          folder: string | null
          id: string
          is_pinned: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          total_activities: number | null
          total_calories: number | null
          total_distance_km: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          total_activities?: number | null
          total_calories?: number | null
          total_distance_km?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          total_activities?: number | null
          total_calories?: number | null
          total_distance_km?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          focus_mode_enabled: boolean | null
          focus_preset: Json | null
          id: string
          theme: string | null
          updated_at: string
          user_id: string
          weather_location: string | null
          week_starts_monday: boolean | null
        }
        Insert: {
          created_at?: string
          focus_mode_enabled?: boolean | null
          focus_preset?: Json | null
          id?: string
          theme?: string | null
          updated_at?: string
          user_id: string
          weather_location?: string | null
          week_starts_monday?: boolean | null
        }
        Update: {
          created_at?: string
          focus_mode_enabled?: boolean | null
          focus_preset?: Json | null
          id?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
          weather_location?: string | null
          week_starts_monday?: boolean | null
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          category: string
          created_at: string
          creator_id: string | null
          description: string | null
          difficulty: string
          duration_minutes: number
          exercises: Json
          id: string
          image_url: string | null
          is_public: boolean | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          exercises?: Json
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          exercises?: Json
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          title?: string
        }
        Relationships: []
      }
      github_connections: {
        Row: {
          id: string
          user_id: string
          username: string
          user_data: Json | null
          repos: Json
          pushes_this_week: number
          last_push_date: string | null
          contribution_map: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          user_data?: Json | null
          repos?: Json
          pushes_this_week?: number
          last_push_date?: string | null
          contribution_map?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          user_data?: Json | null
          repos?: Json
          pushes_this_week?: number
          last_push_date?: string | null
          contribution_map?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          exercises_completed: number | null
          id: string
          plan_id: string | null
          started_at: string
          status: string
          total_exercises: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          exercises_completed?: number | null
          id?: string
          plan_id?: string | null
          started_at?: string
          status?: string
          total_exercises?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          exercises_completed?: number | null
          id?: string
          plan_id?: string | null
          started_at?: string
          status?: string
          total_exercises?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

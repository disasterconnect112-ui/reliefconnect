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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      emergency_requests: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          emergency_type: string
          id: string
          latitude: number | null
          longitude: number | null
          mobile: string | null
          name: string | null
          ngo_id: string | null
          people_count: number | null
          priority: string
          request_code: string
          status: string
          tracking_token: string
          updated_at: string
          volunteer_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          emergency_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          name?: string | null
          ngo_id?: string | null
          people_count?: number | null
          priority?: string
          request_code: string
          status?: string
          tracking_token?: string
          updated_at?: string
          volunteer_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          emergency_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          name?: string | null
          ngo_id?: string | null
          people_count?: number | null
          priority?: string
          request_code?: string
          status?: string
          tracking_token?: string
          updated_at?: string
          volunteer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          availability: string
          completed_tasks: number
          created_at: string
          emergency_tasks: number
          experience: string | null
          full_name: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          mobile: string | null
          org_name: string | null
          org_reg_no: string | null
          org_type: string | null
          points: number
          role: Database["public"]["Enums"]["app_role"]
          services: string[]
          skills: string[]
        }
        Insert: {
          address?: string | null
          availability?: string
          completed_tasks?: number
          created_at?: string
          emergency_tasks?: number
          experience?: string | null
          full_name?: string
          id: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          mobile?: string | null
          org_name?: string | null
          org_reg_no?: string | null
          org_type?: string | null
          points?: number
          role?: Database["public"]["Enums"]["app_role"]
          services?: string[]
          skills?: string[]
        }
        Update: {
          address?: string | null
          availability?: string
          completed_tasks?: number
          created_at?: string
          emergency_tasks?: number
          experience?: string | null
          full_name?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          mobile?: string | null
          org_name?: string | null
          org_reg_no?: string | null
          org_type?: string | null
          points?: number
          role?: Database["public"]["Enums"]["app_role"]
          services?: string[]
          skills?: string[]
        }
        Relationships: []
      }
      request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          request_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          request_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          quantity?: number
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
      approve_ngo: { Args: { _user: string }; Returns: undefined }
      can_see_request: {
        Args: { _ngo: string; _uid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_responder: { Args: { _uid: string }; Returns: boolean }
      priority_for: { Args: { t: string }; Returns: string }
      revoke_ngo: { Args: { _user: string }; Returns: undefined }
      submit_sos: {
        Args: {
          _description: string
          _lat: number
          _lng: number
          _mobile: string
          _name: string
          _people: number
          _type: string
        }
        Returns: {
          request_code: string
          tracking_token: string
        }[]
      }
      submit_sos_multi: {
        Args: {
          _description: string
          _lat: number
          _lng: number
          _mobile: string
          _name: string
          _people: number
          _severity: string
          _types: string[]
        }
        Returns: {
          request_code: string
          tracking_token: string
        }[]
      }
      track_request: {
        Args: { _code: string }
        Returns: {
          created_at: string
          emergency_type: string
          history: Json
          priority: string
          request_code: string
          status: string
          updated_at: string
        }[]
      }
      volunteer_action: {
        Args: { _action: string; _request: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "volunteer" | "ngo"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "volunteer", "ngo"],
    },
  },
} as const

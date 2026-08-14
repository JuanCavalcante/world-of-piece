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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          atk: number
          cost: number
          created_at: string
          effect: string | null
          effect_code: string
          id: string
          image_url: string | null
          name: string
          organization: string | null
          power: number
          race: string | null
          rarity: string
          status: string
          type: string | null
        }
        Insert: {
          atk?: number
          cost?: number
          created_at?: string
          effect?: string | null
          effect_code?: string
          id?: string
          image_url?: string | null
          name: string
          organization?: string | null
          power?: number
          race?: string | null
          rarity?: string
          status?: string
          type?: string | null
        }
        Update: {
          atk?: number
          cost?: number
          created_at?: string
          effect?: string | null
          effect_code?: string
          id?: string
          image_url?: string | null
          name?: string
          organization?: string | null
          power?: number
          race?: string | null
          rarity?: string
          status?: string
          type?: string | null
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          last_claim: string | null
          streak: number
          user_id: string
        }
        Insert: {
          last_claim?: string | null
          streak?: number
          user_id: string
        }
        Update: {
          last_claim?: string | null
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      deck_cards: {
        Row: {
          card_id: string
          deck_id: string
          quantity: number
        }
        Insert: {
          card_id: string
          deck_id: string
          quantity?: number
        }
        Update: {
          card_id?: string
          deck_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "deck_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      tcg_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tcg_duel_matches: {
        Row: {
          created_at: string
          id: string
          loser: string
          turns: number
          user_id: string
          winner: string
        }
        Insert: {
          created_at?: string
          id?: string
          loser: string
          turns?: number
          user_id: string
          winner: string
        }
        Update: {
          created_at?: string
          id?: string
          loser?: string
          turns?: number
          user_id?: string
          winner?: string
        }
        Relationships: []
      }
      tcg_duel_xp_rules: {
        Row: {
          created_at: string
          id: string
          label: string
          rule_key: string
          updated_at: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          rule_key: string
          updated_at?: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          rule_key?: string
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      tcg_players: {
        Row: {
          banner_url: string | null
          created_at: string
          last_daily_reward_at: string | null
          level: number
          losses: number
          user_id: string
          wins: number
          xp: number
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          last_daily_reward_at?: string | null
          level?: number
          losses?: number
          user_id: string
          wins?: number
          xp?: number
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          last_daily_reward_at?: string | null
          level?: number
          losses?: number
          user_id?: string
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: string
          obtained_at: string
          quantity: number
          user_id: string
        }
        Insert: {
          card_id: string
          obtained_at?: string
          quantity?: number
          user_id: string
        }
        Update: {
          card_id?: string
          obtained_at?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
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
      admin_release_cards: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      tcg_claim_daily_reward: {
        Args: never
        Returns: {
          out_card_id: string
          out_image_url: string
          out_is_new: boolean
          out_name: string
          out_rarity: string
          out_streak: number
          out_total_xp: number
          out_xp: number
        }[]
      }
      tcg_ensure_player: {
        Args: never
        Returns: {
          banner_url: string | null
          created_at: string
          last_daily_reward_at: string | null
          level: number
          losses: number
          user_id: string
          wins: number
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "tcg_players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tcg_grant_xp: {
        Args: { _amount: number; _user_id: string }
        Returns: {
          out_gained: number
          out_level: number
          out_xp: number
        }[]
      }
      tcg_xp_to_next_level: { Args: { _level: number }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

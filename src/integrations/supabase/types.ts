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
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          reconnect_required: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          reconnect_required?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          reconnect_required?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string
          completed_at: string | null
          cover_url: string | null
          created_at: string | null
          current_page: number
          display_order: number | null
          dnf_type: string | null
          finished_at: string | null
          id: string
          published_year: number | null
          started_at: string | null
          status: string | null
          title: string
          total_pages: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author: string
          completed_at?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_page?: number
          display_order?: number | null
          dnf_type?: string | null
          finished_at?: string | null
          id?: string
          published_year?: number | null
          started_at?: string | null
          status?: string | null
          title: string
          total_pages: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author?: string
          completed_at?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_page?: number
          display_order?: number | null
          dnf_type?: string | null
          finished_at?: string | null
          id?: string
          published_year?: number | null
          started_at?: string | null
          status?: string | null
          title?: string
          total_pages?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notion_book_links: {
        Row: {
          book_id: string
          created_at: string
          kind: string
          last_notion_edit_at: string | null
          last_pushed_at: string | null
          last_pushed_page: number | null
          last_pushed_percent: number | null
          notion_page_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          kind?: string
          last_notion_edit_at?: string | null
          last_pushed_at?: string | null
          last_pushed_page?: number | null
          last_pushed_percent?: number | null
          notion_page_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          kind?: string
          last_notion_edit_at?: string | null
          last_pushed_at?: string | null
          last_pushed_page?: number | null
          last_pushed_percent?: number | null
          notion_page_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notion_sync_queue: {
        Row: {
          attempts: number
          enqueued_at: string
          op: string
          target: string
          user_id: string
        }
        Insert: {
          attempts?: number
          enqueued_at?: string
          op?: string
          target: string
          user_id: string
        }
        Update: {
          attempts?: number
          enqueued_at?: string
          op?: string
          target?: string
          user_id?: string
        }
        Relationships: []
      }
      notion_sync_settings: {
        Row: {
          books_data_source_id: string | null
          books_database_id: string | null
          bot_id: string | null
          completed_data_source_id: string | null
          completed_database_id: string | null
          created_at: string
          enabled: boolean
          goal_block_id: string | null
          last_error: string | null
          last_reconciled_at: string | null
          last_synced_at: string | null
          parent_page_id: string | null
          progress_style: string
          tbr_data_source_id: string | null
          tbr_database_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          books_data_source_id?: string | null
          books_database_id?: string | null
          bot_id?: string | null
          completed_data_source_id?: string | null
          completed_database_id?: string | null
          created_at?: string
          enabled?: boolean
          goal_block_id?: string | null
          last_error?: string | null
          last_reconciled_at?: string | null
          last_synced_at?: string | null
          parent_page_id?: string | null
          progress_style?: string
          tbr_data_source_id?: string | null
          tbr_database_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          books_data_source_id?: string | null
          books_database_id?: string | null
          bot_id?: string | null
          completed_data_source_id?: string | null
          completed_database_id?: string | null
          created_at?: string
          enabled?: boolean
          goal_block_id?: string | null
          last_error?: string | null
          last_reconciled_at?: string | null
          last_synced_at?: string | null
          parent_page_id?: string | null
          progress_style?: string
          tbr_data_source_id?: string | null
          tbr_database_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notion_webhook_events: {
        Row: {
          event_id: string
          received_at: string
        }
        Insert: {
          event_id: string
          received_at?: string
        }
        Update: {
          event_id?: string
          received_at?: string
        }
        Relationships: []
      }
      notion_webhook_tokens: {
        Row: {
          id: string
          received_at: string
          token: string
        }
        Insert: {
          id?: string
          received_at?: string
          token: string
        }
        Update: {
          id?: string
          received_at?: string
          token?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          book_id: string | null
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id?: string | null
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string | null
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_background_id: string | null
          avatar_url: string | null
          background_color: string | null
          background_image_url: string | null
          background_tint: Json | null
          background_type: string | null
          bio: string | null
          birthday: string | null
          color_palette: Json | null
          created_at: string | null
          current_book_id: string | null
          display_name: string | null
          display_preference: string | null
          email: string | null
          favorite_book_id: string | null
          id: string
          social_media_links: Json | null
          temperature_unit: string | null
          top_five_books: Json | null
          username: string
          website_url: string | null
        }
        Insert: {
          active_background_id?: string | null
          avatar_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_tint?: Json | null
          background_type?: string | null
          bio?: string | null
          birthday?: string | null
          color_palette?: Json | null
          created_at?: string | null
          current_book_id?: string | null
          display_name?: string | null
          display_preference?: string | null
          email?: string | null
          favorite_book_id?: string | null
          id: string
          social_media_links?: Json | null
          temperature_unit?: string | null
          top_five_books?: Json | null
          username: string
          website_url?: string | null
        }
        Update: {
          active_background_id?: string | null
          avatar_url?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_tint?: Json | null
          background_type?: string | null
          bio?: string | null
          birthday?: string | null
          color_palette?: Json | null
          created_at?: string | null
          current_book_id?: string | null
          display_name?: string | null
          display_preference?: string | null
          email?: string | null
          favorite_book_id?: string | null
          id?: string
          social_media_links?: Json | null
          temperature_unit?: string | null
          top_five_books?: Json | null
          username?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_background_id_fkey"
            columns: ["active_background_id"]
            isOneToOne: false
            referencedRelation: "saved_backgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_favorite_book_id_fkey"
            columns: ["favorite_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_entries: {
        Row: {
          book_id: string
          created_at: string
          finished_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_entries_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_goals: {
        Row: {
          created_at: string
          goal_count: number
          id: string
          manual_count: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          goal_count?: number
          id?: string
          manual_count?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          goal_count?: number
          id?: string
          manual_count?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          created_at: string | null
          from_page: number | null
          id: string
          note: string | null
          to_page: number | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          from_page?: number | null
          id?: string
          note?: string | null
          to_page?: number | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          from_page?: number | null
          id?: string
          note?: string | null
          to_page?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          rating: number
          review: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          rating: number
          review?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          rating?: number
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_backgrounds: {
        Row: {
          created_at: string
          id: string
          image_url: string
          name: string | null
          tint_color: string | null
          tint_opacity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          name?: string | null
          tint_color?: string | null
          tint_opacity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          name?: string | null
          tint_color?: string | null
          tint_opacity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tbr_books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          id: string
          notes: string | null
          priority: number | null
          published_year: number | null
          title: string
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author: string
          cover_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number | null
          published_year?: number | null
          title: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number | null
          published_year?: number | null
          title?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          email: string | null
          id: string
        }
        Insert: {
          email?: string | null
          id: string
        }
        Update: {
          email?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_progress_from_notion: {
        Args: { p_book_id: string; p_new_page: number; p_user_id: string }
        Returns: number
      }
      get_public_profiles: {
        Args: { limit_count?: number; search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_public_profiles_by_ids: {
        Args: { ids: string[] }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_reading_goal_public: {
        Args: { p_user_id: string; p_year: number }
        Returns: {
          goal_count: number
          id: string
          manual_count: number
          user_id: string
          year: number
        }[]
      }
      get_safe_public_profiles: {
        Args: { limit_count?: number; search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_zodiac_sign: { Args: { birth_date: string }; Returns: string }
      start_reading_from_tbr: {
        Args: { p_tbr_id: string; p_user_id: string }
        Returns: string
      }
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
    Enums: {},
  },
} as const

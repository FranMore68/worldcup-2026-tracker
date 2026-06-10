export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: number;
          api_id: number;
          name: string;
          code: string | null;
          country: string | null;
          founded: number | null;
          national: boolean | null;
          logo: string | null;
          venue_id: number | null;
          raw_payload: Json;
          synced_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          api_id: number;
          name: string;
          code?: string | null;
          country?: string | null;
          founded?: number | null;
          national?: boolean | null;
          logo?: string | null;
          venue_id?: number | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          api_id?: number;
          name?: string;
          code?: string | null;
          country?: string | null;
          founded?: number | null;
          national?: boolean | null;
          logo?: string | null;
          venue_id?: number | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["api_id"];
          }
        ];
      };
      venues: {
        Row: {
          id: number;
          api_id: number;
          name: string;
          address: string | null;
          city: string | null;
          country: string | null;
          capacity: number | null;
          surface: string | null;
          image: string | null;
          raw_payload: Json;
          synced_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          api_id: number;
          name: string;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          capacity?: number | null;
          surface?: string | null;
          image?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          api_id?: number;
          name?: string;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          capacity?: number | null;
          surface?: string | null;
          image?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      fixtures: {
        Row: {
          id: number;
          api_id: number;
          match_date_utc: string;
          match_date_local: string | null;
          status_short: string;
          status_long: string | null;
          round: string | null;
          home_team_id: number;
          away_team_id: number;
          home_goals: number | null;
          away_goals: number | null;
          venue_id: number | null;
          league_id: number | null;
          season: number | null;
          raw_payload: Json;
          synced_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          api_id: number;
          match_date_utc: string;
          match_date_local?: string | null;
          status_short: string;
          status_long?: string | null;
          round?: string | null;
          home_team_id: number;
          away_team_id: number;
          home_goals?: number | null;
          away_goals?: number | null;
          venue_id?: number | null;
          league_id?: number | null;
          season?: number | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          api_id?: number;
          match_date_utc?: string;
          match_date_local?: string | null;
          status_short?: string;
          status_long?: string | null;
          round?: string | null;
          home_team_id?: number;
          away_team_id?: number;
          home_goals?: number | null;
          away_goals?: number | null;
          venue_id?: number | null;
          league_id?: number | null;
          season?: number | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fixtures_home_team_id_fkey";
            columns: ["home_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["api_id"];
          },
          {
            foreignKeyName: "fixtures_away_team_id_fkey";
            columns: ["away_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["api_id"];
          },
          {
            foreignKeyName: "fixtures_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["api_id"];
          }
        ];
      };
      standings: {
        Row: {
          id: number;
          season: number;
          group_name: string;
          team_id: number;
          rank: number;
          points: number | null;
          goals_diff: number | null;
          played: number | null;
          won: number | null;
          draw: number | null;
          lost: number | null;
          goals_for: number | null;
          goals_against: number | null;
          raw_payload: Json;
          synced_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          season: number;
          group_name: string;
          team_id: number;
          rank: number;
          points?: number | null;
          goals_diff?: number | null;
          played?: number | null;
          won?: number | null;
          draw?: number | null;
          lost?: number | null;
          goals_for?: number | null;
          goals_against?: number | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          season?: number;
          group_name?: string;
          team_id?: number;
          rank?: number;
          points?: number | null;
          goals_diff?: number | null;
          played?: number | null;
          won?: number | null;
          draw?: number | null;
          lost?: number | null;
          goals_for?: number | null;
          goals_against?: number | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "standings_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["api_id"];
          }
        ];
      };
      fixture_events: {
        Row: {
          id: number;
          fixture_id: number;
          event_type: string;
          elapsed: number | null;
          extra_time: number | null;
          team_id: number | null;
          player_id: number | null;
          player_name: string | null;
          assist_id: number | null;
          assist_name: string | null;
          detail: string | null;
          comments: string | null;
          raw_payload: Json;
          synced_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          fixture_id: number;
          event_type: string;
          elapsed?: number | null;
          extra_time?: number | null;
          team_id?: number | null;
          player_id?: number | null;
          player_name?: string | null;
          assist_id?: number | null;
          assist_name?: string | null;
          detail?: string | null;
          comments?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          fixture_id?: number;
          event_type?: string;
          elapsed?: number | null;
          extra_time?: number | null;
          team_id?: number | null;
          player_id?: number | null;
          player_name?: string | null;
          assist_id?: number | null;
          assist_name?: string | null;
          detail?: string | null;
          comments?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fixture_events_fixture_id_fkey";
            columns: ["fixture_id"];
            isOneToOne: false;
            referencedRelation: "fixtures";
            referencedColumns: ["api_id"];
          }
        ];
      };
      fixture_lineups: {
        Row: {
          id: number;
          fixture_id: number;
          team_id: number;
          formation: string | null;
          coach_id: number | null;
          coach_name: string | null;
          raw_payload: Json;
          synced_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          fixture_id: number;
          team_id: number;
          formation?: string | null;
          coach_id?: number | null;
          coach_name?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          fixture_id?: number;
          team_id?: number;
          formation?: string | null;
          coach_id?: number | null;
          coach_name?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fixture_lineups_fixture_id_fkey";
            columns: ["fixture_id"];
            isOneToOne: false;
            referencedRelation: "fixtures";
            referencedColumns: ["api_id"];
          }
        ];
      };
      fixture_statistics: {
        Row: {
          id: number;
          fixture_id: number;
          team_id: number;
          stat_type: string | null;
          stat_value: string | null;
          raw_payload: Json;
          synced_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          fixture_id: number;
          team_id: number;
          stat_type?: string | null;
          stat_value?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          fixture_id?: number;
          team_id?: number;
          stat_type?: string | null;
          stat_value?: string | null;
          raw_payload?: Json;
          synced_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fixture_statistics_fixture_id_fkey";
            columns: ["fixture_id"];
            isOneToOne: false;
            referencedRelation: "fixtures";
            referencedColumns: ["api_id"];
          }
        ];
      };
      api_sync_logs: {
        Row: {
          id: string;
          sync_type: string;
          status: string;
          records_processed: number | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          raw_request: Json | null;
          raw_response: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          sync_type: string;
          status: string;
          records_processed?: number | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          raw_request?: Json | null;
          raw_response?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          sync_type?: string;
          status?: string;
          records_processed?: number | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          raw_request?: Json | null;
          raw_response?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          key: string;
          value: string | null;
          description: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          key: string;
          value?: string | null;
          description?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          key?: string;
          value?: string | null;
          description?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      reset_api_rate_limit: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

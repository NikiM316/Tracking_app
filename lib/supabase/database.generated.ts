/**
 * Generated from the live Tracking_app schema (rxfcnpdwwkfaaxnciyxj).
 * Do not edit by hand.
 *
 * Regenerate after every migration with the Supabase MCP tool
 * `generate_typescript_types`, or:
 * `npx supabase gen types typescript --project-id rxfcnpdwwkfaaxnciyxj --schema public`
 */

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
      exercise_notes: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          note: string
          updated_at: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          note?: string
          updated_at?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          note?: string
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_notes_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_notes_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: Database["public"]["Enums"]["exercise_category"]
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          category: Database["public"]["Enums"]["exercise_category"]
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          category?: Database["public"]["Enums"]["exercise_category"]
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      finance_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["finance_account_type"]
          created_at: string
          currency: string
          external_id: string | null
          id: string
          institution: string | null
          is_archived: boolean
          name: string
          opening_balance: number
          opening_balance_date: string
          provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["finance_account_type"]
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          name: string
          opening_balance?: number
          opening_balance_date?: string
          provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["finance_account_type"]
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          name?: string
          opening_balance?: number
          opening_balance_date?: string
          provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_budget_items: {
        Row: {
          allocated_amount: number
          budget_id: string
          category_id: string
          created_at: string
          id: string
        }
        Insert: {
          allocated_amount: number
          budget_id: string
          category_id: string
          created_at?: string
          id?: string
        }
        Update: {
          allocated_amount?: number
          budget_id?: string
          category_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "finance_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budgets: {
        Row: {
          created_at: string
          currency: string
          end_date: string | null
          id: string
          name: string
          period: Database["public"]["Enums"]["finance_budget_period"]
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          name: string
          period?: Database["public"]["Enums"]["finance_budget_period"]
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          name?: string
          period?: Database["public"]["Enums"]["finance_budget_period"]
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          kind: Database["public"]["Enums"]["finance_category_kind"]
          name: string
          parent_id: string | null
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          kind: Database["public"]["Enums"]["finance_category_kind"]
          name: string
          parent_id?: string | null
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          kind?: Database["public"]["Enums"]["finance_category_kind"]
          name?: string
          parent_id?: string | null
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_fx_rates: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          quote_currency: string
          rate: number
          rate_date: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          id?: string
          quote_currency: string
          rate: number
          rate_date: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          quote_currency?: string
          rate?: number
          rate_date?: string
        }
        Relationships: []
      }
      finance_holdings: {
        Row: {
          average_cost: number
          currency: string
          id: string
          portfolio_id: string
          quantity: number
          security_id: string
          updated_at: string
        }
        Insert: {
          average_cost?: number
          currency?: string
          id?: string
          portfolio_id: string
          quantity?: number
          security_id: string
          updated_at?: string
        }
        Update: {
          average_cost?: number
          currency?: string
          id?: string
          portfolio_id?: string
          quantity?: number
          security_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "finance_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_holdings_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "finance_securities"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_investment_transactions: {
        Row: {
          amount: number
          cashflow_transaction_id: string | null
          created_at: string
          currency: string
          external_id: string | null
          fees: number
          id: string
          notes: string | null
          portfolio_id: string
          price: number | null
          provider: string | null
          quantity: number | null
          security_id: string | null
          trade_date: string
          type: Database["public"]["Enums"]["finance_investment_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          cashflow_transaction_id?: string | null
          created_at?: string
          currency?: string
          external_id?: string | null
          fees?: number
          id?: string
          notes?: string | null
          portfolio_id: string
          price?: number | null
          provider?: string | null
          quantity?: number | null
          security_id?: string | null
          trade_date?: string
          type: Database["public"]["Enums"]["finance_investment_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          cashflow_transaction_id?: string | null
          created_at?: string
          currency?: string
          external_id?: string | null
          fees?: number
          id?: string
          notes?: string | null
          portfolio_id?: string
          price?: number | null
          provider?: string | null
          quantity?: number | null
          security_id?: string | null
          trade_date?: string
          type?: Database["public"]["Enums"]["finance_investment_tx_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_investment_transactions_cashflow_transaction_id_fkey"
            columns: ["cashflow_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_investment_transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "finance_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_investment_transactions_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "finance_securities"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_portfolios: {
        Row: {
          account_id: string | null
          base_currency: string
          created_at: string
          id: string
          is_archived: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          base_currency?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          base_currency?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_portfolios_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_securities: {
        Row: {
          created_at: string
          currency: string
          exchange: string | null
          id: string
          isin: string | null
          metadata: Json
          name: string
          security_type: Database["public"]["Enums"]["finance_security_type"]
          symbol: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          isin?: string | null
          metadata?: Json
          name: string
          security_type: Database["public"]["Enums"]["finance_security_type"]
          symbol: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          isin?: string | null
          metadata?: Json
          name?: string
          security_type?: Database["public"]["Enums"]["finance_security_type"]
          symbol?: string
          user_id?: string | null
        }
        Relationships: []
      }
      finance_security_prices: {
        Row: {
          close: number
          created_at: string
          currency: string
          id: string
          price_date: string
          security_id: string
          source: string | null
        }
        Insert: {
          close: number
          created_at?: string
          currency?: string
          id?: string
          price_date: string
          security_id: string
          source?: string | null
        }
        Update: {
          close?: number
          created_at?: string
          currency?: string
          id?: string
          price_date?: string
          security_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_security_prices_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "finance_securities"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          base_currency: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          date: string
          external_id: string | null
          id: string
          is_cleared: boolean
          notes: string | null
          payee: string | null
          provider: string | null
          transfer_account_id: string | null
          transfer_transaction_id: string | null
          type: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          external_id?: string | null
          id?: string
          is_cleared?: boolean
          notes?: string | null
          payee?: string | null
          provider?: string | null
          transfer_account_id?: string | null
          transfer_transaction_id?: string | null
          type: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          external_id?: string | null
          id?: string
          is_cleared?: boolean
          notes?: string | null
          payee?: string | null
          provider?: string | null
          transfer_account_id?: string | null
          transfer_transaction_id?: string | null
          type?: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_transfer_account_id_fkey"
            columns: ["transfer_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_transfer_transaction_id_fkey"
            columns: ["transfer_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      monk_app_usage: {
        Row: {
          app_name: string
          created_at: string
          day_id: string
          id: string
          minutes: number
          updated_at: string
        }
        Insert: {
          app_name: string
          created_at?: string
          day_id: string
          id?: string
          minutes: number
          updated_at?: string
        }
        Update: {
          app_name?: string
          created_at?: string
          day_id?: string
          id?: string
          minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monk_app_usage_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "monk_days"
            referencedColumns: ["id"]
          },
        ]
      }
      monk_challenges: {
        Row: {
          attempt_number: number
          created_at: string
          ended_day_number: number | null
          ended_on: string | null
          id: string
          max_mandatory_failures_allowed: number
          reset_consecutive_count: number | null
          reset_rule: Database["public"]["Enums"]["monk_reset_rule"]
          reset_window_days: number | null
          reset_window_fail_count: number | null
          social_media_limit_minutes: number
          started_on: string
          status: Database["public"]["Enums"]["monk_challenge_status"]
          successful_days_count: number
          target_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_number: number
          created_at?: string
          ended_day_number?: number | null
          ended_on?: string | null
          id?: string
          max_mandatory_failures_allowed: number
          reset_consecutive_count?: number | null
          reset_rule: Database["public"]["Enums"]["monk_reset_rule"]
          reset_window_days?: number | null
          reset_window_fail_count?: number | null
          social_media_limit_minutes: number
          started_on: string
          status?: Database["public"]["Enums"]["monk_challenge_status"]
          successful_days_count?: number
          target_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          ended_day_number?: number | null
          ended_on?: string | null
          id?: string
          max_mandatory_failures_allowed?: number
          reset_consecutive_count?: number | null
          reset_rule?: Database["public"]["Enums"]["monk_reset_rule"]
          reset_window_days?: number | null
          reset_window_fail_count?: number | null
          social_media_limit_minutes?: number
          started_on?: string
          status?: Database["public"]["Enums"]["monk_challenge_status"]
          successful_days_count?: number
          target_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monk_commitments: {
        Row: {
          created_at: string
          day_id: string
          id: string
          is_completed: boolean
          rank: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          is_completed?: boolean
          rank: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          is_completed?: boolean
          rank?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monk_commitments_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "monk_days"
            referencedColumns: ["id"]
          },
        ]
      }
      monk_days: {
        Row: {
          accomplished: string | null
          challenge_id: string
          created_at: string
          date: string
          day_number: number
          failed_to_do: string | null
          finalization_source:
            | Database["public"]["Enums"]["monk_finalization_source"]
            | null
          finalized_at: string | null
          gaming_actual_minutes: number | null
          gaming_limit_minutes: number
          id: string
          improve_tomorrow: string | null
          social_media_actual_minutes: number | null
          social_media_limit_minutes: number
          status: Database["public"]["Enums"]["monk_day_status"]
          updated_at: string
          user_id: string
          why_failed: string | null
        }
        Insert: {
          accomplished?: string | null
          challenge_id: string
          created_at?: string
          date: string
          day_number: number
          failed_to_do?: string | null
          finalization_source?:
            | Database["public"]["Enums"]["monk_finalization_source"]
            | null
          finalized_at?: string | null
          gaming_actual_minutes?: number | null
          gaming_limit_minutes?: number
          id?: string
          improve_tomorrow?: string | null
          social_media_actual_minutes?: number | null
          social_media_limit_minutes: number
          status?: Database["public"]["Enums"]["monk_day_status"]
          updated_at?: string
          user_id: string
          why_failed?: string | null
        }
        Update: {
          accomplished?: string | null
          challenge_id?: string
          created_at?: string
          date?: string
          day_number?: number
          failed_to_do?: string | null
          finalization_source?:
            | Database["public"]["Enums"]["monk_finalization_source"]
            | null
          finalized_at?: string | null
          gaming_actual_minutes?: number | null
          gaming_limit_minutes?: number
          id?: string
          improve_tomorrow?: string | null
          social_media_actual_minutes?: number | null
          social_media_limit_minutes?: number
          status?: Database["public"]["Enums"]["monk_day_status"]
          updated_at?: string
          user_id?: string
          why_failed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monk_days_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "monk_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      monk_goals: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["monk_goal_status"]
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["monk_goal_status"]
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["monk_goal_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monk_habit_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          day_id: string
          habit_id: string
          id: string
          is_completed: boolean
          is_mandatory_snapshot: boolean
          target_unit_snapshot: string | null
          target_value_snapshot: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_id: string
          habit_id: string
          id?: string
          is_completed?: boolean
          is_mandatory_snapshot: boolean
          target_unit_snapshot?: string | null
          target_value_snapshot?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_id?: string
          habit_id?: string
          id?: string
          is_completed?: boolean
          is_mandatory_snapshot?: boolean
          target_unit_snapshot?: string | null
          target_value_snapshot?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monk_habit_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "monk_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monk_habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "monk_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      monk_habits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          name: string
          sort_order: number
          target_unit: string | null
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name: string
          sort_order?: number
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name?: string
          sort_order?: number
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monk_overrides: {
        Row: {
          created_at: string
          day_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["monk_override_entity_type"]
          field: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["monk_override_entity_type"]
          field: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_id?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["monk_override_entity_type"]
          field?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monk_overrides_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "monk_days"
            referencedColumns: ["id"]
          },
        ]
      }
      monk_settings: {
        Row: {
          created_at: string
          max_mandatory_failures_allowed: number
          reset_consecutive_count: number | null
          reset_rule: Database["public"]["Enums"]["monk_reset_rule"]
          reset_window_days: number | null
          reset_window_fail_count: number | null
          social_media_limit_minutes: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          max_mandatory_failures_allowed?: number
          reset_consecutive_count?: number | null
          reset_rule?: Database["public"]["Enums"]["monk_reset_rule"]
          reset_window_days?: number | null
          reset_window_fail_count?: number | null
          social_media_limit_minutes?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          max_mandatory_failures_allowed?: number
          reset_consecutive_count?: number | null
          reset_rule?: Database["public"]["Enums"]["monk_reset_rule"]
          reset_window_days?: number | null
          reset_window_fail_count?: number | null
          social_media_limit_minutes?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monk_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          day_id: string
          id: string
          is_completed: boolean
          is_mandatory: boolean
          sort_order: number
          study_item_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_id: string
          id?: string
          is_completed?: boolean
          is_mandatory?: boolean
          sort_order?: number
          study_item_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_id?: string
          id?: string
          is_completed?: boolean
          is_mandatory?: boolean
          sort_order?: number
          study_item_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monk_tasks_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "monk_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monk_tasks_study_item_id_fkey"
            columns: ["study_item_id"]
            isOneToOne: false
            referencedRelation: "study_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string | null
          distance_meters: number | null
          duration_seconds: number | null
          exercise_id: string | null
          id: string
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          set_category: Database["public"]["Enums"]["set_category"]
          set_order: number
          weight_kg: number | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_category: Database["public"]["Enums"]["set_category"]
          set_order: number
          weight_kg?: number | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_category?: Database["public"]["Enums"]["set_category"]
          set_order?: number
          weight_kg?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_items: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          is_primary: boolean
          kind: Database["public"]["Enums"]["study_item_kind"]
          sort_order: number
          title: string
          url: string | null
          week_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          is_primary?: boolean
          kind: Database["public"]["Enums"]["study_item_kind"]
          sort_order?: number
          title: string
          url?: string | null
          week_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["study_item_kind"]
          sort_order?: number
          title?: string
          url?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_items_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "study_plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_weeks: {
        Row: {
          build_target: string | null
          created_at: string
          focus: string | null
          id: string
          is_completed: boolean
          plan_id: string
          title: string
          week_number: number
        }
        Insert: {
          build_target?: string | null
          created_at?: string
          focus?: string | null
          id?: string
          is_completed?: boolean
          plan_id: string
          title: string
          week_number: number
        }
        Update: {
          build_target?: string | null
          created_at?: string
          focus?: string | null
          id?: string
          is_completed?: boolean
          plan_id?: string
          title?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_weeks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          source: Database["public"]["Enums"]["study_plan_source"]
          starts_on: string | null
          status: Database["public"]["Enums"]["study_plan_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: Database["public"]["Enums"]["study_plan_source"]
          starts_on?: string | null
          status?: Database["public"]["Enums"]["study_plan_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: Database["public"]["Enums"]["study_plan_source"]
          starts_on?: string | null
          status?: Database["public"]["Enums"]["study_plan_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          cns_readiness: number | null
          completed_at: string | null
          created_at: string | null
          cycle_day: number | null
          date: string
          id: string
          notes: string | null
          user_id: string
          water_ml: number
        }
        Insert: {
          cns_readiness?: number | null
          completed_at?: string | null
          created_at?: string | null
          cycle_day?: number | null
          date?: string
          id?: string
          notes?: string | null
          user_id: string
          water_ml?: number
        }
        Update: {
          cns_readiness?: number | null
          completed_at?: string | null
          created_at?: string | null
          cycle_day?: number | null
          date?: string
          id?: string
          notes?: string | null
          user_id?: string
          water_ml?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      catch_up_missed_days_tx: { Args: { payload: Json }; Returns: undefined }
      finance_cashflow_totals: {
        Args: { p_user_id: string }
        Returns: {
          account_id: string
          net: number
          type: Database["public"]["Enums"]["finance_transaction_type"]
        }[]
      }
      increment_workout_water: {
        Args: { p_amount: number; p_workout_id: string }
        Returns: number
      }
    }
    Enums: {
      exercise_category: "barbell" | "calisthenics" | "cardio" | "mobility"
      finance_account_type:
        | "checking"
        | "savings"
        | "cash"
        | "credit_card"
        | "loan"
        | "brokerage"
        | "other"
      finance_budget_period: "monthly" | "weekly" | "yearly"
      finance_category_kind: "expense" | "income"
      finance_investment_tx_type:
        | "buy"
        | "sell"
        | "dividend"
        | "interest"
        | "fee"
        | "split"
        | "transfer_in"
        | "transfer_out"
        | "other"
      finance_security_type:
        | "stock"
        | "etf"
        | "mutual_fund"
        | "bond"
        | "crypto"
        | "commodity"
        | "real_estate"
        | "other"
      finance_transaction_type: "expense" | "income" | "transfer"
      monk_challenge_status: "active" | "failed" | "completed" | "abandoned"
      monk_day_status: "in_progress" | "passed" | "failed"
      monk_finalization_source: "manual" | "automatic" | "system_missed"
      monk_goal_status: "active" | "completed" | "abandoned"
      monk_override_entity_type: "day" | "task" | "habit_log" | "app_usage"
      monk_reset_rule: "on_any_fail" | "consecutive_fails" | "fails_in_window"
      set_category: "warmup" | "top_set" | "back_off" | "working_set" | "zone_2"
      study_item_kind: "resource" | "build" | "task"
      study_plan_source: "seeded" | "custom"
      study_plan_status: "active" | "completed" | "archived"
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
      exercise_category: ["barbell", "calisthenics", "cardio", "mobility"],
      finance_account_type: [
        "checking",
        "savings",
        "cash",
        "credit_card",
        "loan",
        "brokerage",
        "other",
      ],
      finance_budget_period: ["monthly", "weekly", "yearly"],
      finance_category_kind: ["expense", "income"],
      finance_investment_tx_type: [
        "buy",
        "sell",
        "dividend",
        "interest",
        "fee",
        "split",
        "transfer_in",
        "transfer_out",
        "other",
      ],
      finance_security_type: [
        "stock",
        "etf",
        "mutual_fund",
        "bond",
        "crypto",
        "commodity",
        "real_estate",
        "other",
      ],
      finance_transaction_type: ["expense", "income", "transfer"],
      monk_challenge_status: ["active", "failed", "completed", "abandoned"],
      monk_day_status: ["in_progress", "passed", "failed"],
      monk_finalization_source: ["manual", "automatic", "system_missed"],
      monk_goal_status: ["active", "completed", "abandoned"],
      monk_override_entity_type: ["day", "task", "habit_log", "app_usage"],
      monk_reset_rule: ["on_any_fail", "consecutive_fails", "fails_in_window"],
      set_category: ["warmup", "top_set", "back_off", "working_set", "zone_2"],
      study_item_kind: ["resource", "build", "task"],
      study_plan_source: ["seeded", "custom"],
      study_plan_status: ["active", "completed", "archived"],
    },
  },
} as const


import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type UUID = string;
type Timestamp = string;
type DateString = string;

export type TransactionStage =
  | 'listing'
  | 'contract'
  | 'inspection'
  | 'appraisal'
  | 'close'
  | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type ClientTaskStatus = 'pending' | 'completed';

type SupabaseTable<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      contacts: SupabaseTable<
        {
          id: UUID;
          user_id: UUID;
          name: string;
          email: string | null;
          phone: string | null;
          contact_type: string;
          notes: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        },
        {
          id?: UUID;
          user_id: UUID;
          name: string;
          email?: string | null;
          phone?: string | null;
          contact_type?: string;
          notes?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        },
        {
          id?: UUID;
          user_id?: UUID;
          name?: string;
          email?: string | null;
          phone?: string | null;
          contact_type?: string;
          notes?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        }
      >;
      transaction_pipeline: SupabaseTable<
        {
          id: UUID;
          deal_id: UUID | null;
          agent_id: UUID | null;
          investor_id: UUID | null;
          lender_id: UUID | null;
          property_address: string;
          transaction_type: string;
          purchase_price: number;
          current_stage: TransactionStage;
          stage_order: number;
          estimated_close_date: DateString | null;
          actual_close_date: DateString | null;
          state: string;
          brokerage: string | null;
          status: string;
          created_at: Timestamp;
          updated_at: Timestamp;
          completed_at: Timestamp | null;
        },
        {
          id?: UUID;
          deal_id?: UUID | null;
          agent_id?: UUID | null;
          investor_id?: UUID | null;
          lender_id?: UUID | null;
          property_address: string;
          transaction_type?: string;
          purchase_price?: number;
          current_stage?: TransactionStage;
          stage_order?: number;
          estimated_close_date?: DateString | null;
          actual_close_date?: DateString | null;
          state: string;
          brokerage?: string | null;
          status?: string;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          completed_at?: Timestamp | null;
        },
        {
          id?: UUID;
          deal_id?: UUID | null;
          agent_id?: UUID | null;
          investor_id?: UUID | null;
          lender_id?: UUID | null;
          property_address?: string;
          transaction_type?: string;
          purchase_price?: number;
          current_stage?: TransactionStage;
          stage_order?: number;
          estimated_close_date?: DateString | null;
          actual_close_date?: DateString | null;
          state?: string;
          brokerage?: string | null;
          status?: string;
          created_at?: Timestamp;
          updated_at?: Timestamp;
          completed_at?: Timestamp | null;
        }
      >;
      transaction_milestones: SupabaseTable<
        {
          id: UUID;
          pipeline_id: UUID;
          name: string;
          description: string | null;
          status: MilestoneStatus;
          progress_percentage: number;
          order_index: number;
          due_date: Timestamp | null;
          completed_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        },
        {
          id?: UUID;
          pipeline_id: UUID;
          name: string;
          description?: string | null;
          status?: MilestoneStatus;
          progress_percentage?: number;
          order_index: number;
          due_date?: Timestamp | null;
          completed_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        },
        {
          id?: UUID;
          pipeline_id?: UUID;
          name?: string;
          description?: string | null;
          status?: MilestoneStatus;
          progress_percentage?: number;
          order_index?: number;
          due_date?: Timestamp | null;
          completed_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        }
      >;
      client_tasks: SupabaseTable<
        {
          id: UUID;
          pipeline_id: UUID;
          title: string;
          description: string | null;
          priority: TaskPriority;
          status: ClientTaskStatus;
          due_date: Timestamp | null;
          completed_at: Timestamp | null;
          created_by: UUID;
          created_at: Timestamp;
        },
        {
          id?: UUID;
          pipeline_id: UUID;
          title: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: ClientTaskStatus;
          due_date?: Timestamp | null;
          completed_at?: Timestamp | null;
          created_by: UUID;
          created_at?: Timestamp;
        },
        {
          id?: UUID;
          pipeline_id?: UUID;
          title?: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: ClientTaskStatus;
          due_date?: Timestamp | null;
          completed_at?: Timestamp | null;
          created_by?: UUID;
          created_at?: Timestamp;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      transaction_stage: TransactionStage;
      task_priority: TaskPriority;
      milestone_status: MilestoneStatus;
      client_task_status: ClientTaskStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

const SUPABASE_URL_PLACEHOLDER = 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY_PLACEHOLDER = 'placeholder-anon-key';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envSupabaseUrl || !envSupabaseAnonKey) {
  const missingVars = [
    !envSupabaseUrl && 'VITE_SUPABASE_URL',
    !envSupabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean);

  console.warn(
    `Missing Supabase environment variable(s): ${missingVars.join(
      ', ',
    )}. Using placeholder Supabase configuration.`,
  );
}

const supabaseUrl = envSupabaseUrl || SUPABASE_URL_PLACEHOLDER;
const supabaseAnonKey = envSupabaseAnonKey || SUPABASE_ANON_KEY_PLACEHOLDER;

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

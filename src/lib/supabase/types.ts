/**
 * Supabase Database & Domain Types
 */

export interface ProfileRecord {
  id: string; // references auth.users.id
  name: string;
  username: string;
  avatar_url: string;
  bio?: string;
  preferred_language?: string;
  preferred_accounting_standard?: 'pgc_angola' | 'pgc_intermedio' | 'pgc_snc';
  is_searchable?: boolean;
  is_online?: boolean;
  hide_presence?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyProgressRecord {
  id: string;
  user_id: string;
  module_id: string;
  category: string;
  progress_percent: number;
  is_favorite: boolean;
  notes?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface QuizResultRecord {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, any>;
  passed: boolean;
  created_at: string;
  updated_at: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked' | 'rejected';

export interface FriendshipRecord {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  file_url?: string;
  file_type?: string;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiConversationRecord {
  id: string;
  user_id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'model' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface EntityRecord {
  id: string;
  user_id: string;
  name: string;
  region: string;
  currency: string;
  status: 'Active' | 'Pending' | 'Archived';
  created_at: string;
  updated_at: string;
}

export interface RevenueDataRecord {
  id: string;
  entity_id: string;
  user_id: string;
  period: string; // e.g. '2026-Q1', '2026-08'
  revenue: number;
  expenses: number;
  net_income: number;
  created_at: string;
  updated_at: string;
}

export interface DeviceSessionRecord {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  is_current?: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSyncReport {
  timestamp: string;
  totalSynced: number;
  profilesSynced: number;
  studyProgressSynced: number;
  quizResultsSynced: number;
  aiConversationsSynced: number;
  entitiesSynced: number;
  conflictsResolved: number;
  errors: string[];
}

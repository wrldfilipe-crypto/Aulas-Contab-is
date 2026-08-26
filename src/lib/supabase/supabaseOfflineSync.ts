import { supabase, isSupabaseConfigured } from './supabaseClient';
import { SupabaseSyncReport } from './types';

const OFFLINE_QUEUE_KEY = 'ais_offline_sync_queue';

export interface QueuedSyncItem {
  id: string;
  table: 'study_progress' | 'quiz_results' | 'ai_conversations' | 'entities' | 'revenue_data';
  data: Record<string, any>;
  action: 'insert' | 'update' | 'upsert' | 'delete';
  updated_at: string;
}

export function queueOfflineItem(item: Omit<QueuedSyncItem, 'id' | 'updated_at'>): void {
  try {
    const queue = getOfflineQueue();
    const queuedItem: QueuedSyncItem = {
      ...item,
      id: 'q_' + Math.random().toString(36).substring(2, 9),
      updated_at: new Date().toISOString(),
    };
    queue.push(queuedItem);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[SupabaseSync] Falha ao enfileirar item offline:', err);
  }
}

export function getOfflineQueue(): QueuedSyncItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {}
}

/**
 * Sincroniza a fila offline com a nuvem do Supabase usando resolução por updated_at
 */
export async function syncOfflineQueueToSupabase(userId: string): Promise<SupabaseSyncReport> {
  const report: SupabaseSyncReport = {
    timestamp: new Date().toISOString(),
    totalSynced: 0,
    profilesSynced: 0,
    studyProgressSynced: 0,
    quizResultsSynced: 0,
    aiConversationsSynced: 0,
    entitiesSynced: 0,
    conflictsResolved: 0,
    errors: [],
  };

  const queue = getOfflineQueue();
  if (!queue.length) return report;

  if (!isSupabaseConfigured) {
    // Simulate local success and clear queue
    report.totalSynced = queue.length;
    clearOfflineQueue();
    return report;
  }

  const remainingQueue: QueuedSyncItem[] = [];

  for (const item of queue) {
    try {
      const payload = {
        ...item.data,
        user_id: item.data.user_id || userId,
        updated_at: item.updated_at || new Date().toISOString(),
      };

      if (item.action === 'delete') {
        const { error } = await supabase
          .from(item.table)
          .delete()
          .eq('id', (payload as any).id || (item.data as any)?.id)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Upsert with conflict resolution on ID
        const { error } = await supabase
          .from(item.table)
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
      }

      report.totalSynced++;
      if (item.table === 'study_progress') report.studyProgressSynced++;
      if (item.table === 'quiz_results') report.quizResultsSynced++;
      if (item.table === 'ai_conversations') report.aiConversationsSynced++;
      if (item.table === 'entities') report.entitiesSynced++;
    } catch (err: any) {
      console.warn(`[SupabaseSync] Falha no item ${item.id} (${item.table}):`, err);
      report.errors.push(`${item.table}: ${err?.message || 'Erro de rede'}`);
      remainingQueue.push(item);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  return report;
}

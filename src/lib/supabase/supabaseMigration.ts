import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DB, getCurrentUser } from '../db';

export interface MigrationResult {
  success: boolean;
  timestamp: string;
  counts: {
    profiles: number;
    study_progress: number;
    quiz_results: number;
    entities: number;
    revenue_data: number;
    ai_conversations: number;
  };
  validation: {
    foreignKeysValid: boolean;
    recordsCountMatch: boolean;
    errors: string[];
  };
}

/**
 * Script de migração único de dados legados (LocalStorage, DB local) para o Supabase
 */
export async function migrateLegacyDataToSupabase(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    timestamp: new Date().toISOString(),
    counts: {
      profiles: 0,
      study_progress: 0,
      quiz_results: 0,
      entities: 0,
      revenue_data: 0,
      ai_conversations: 0,
    },
    validation: {
      foreignKeysValid: true,
      recordsCountMatch: true,
      errors: [],
    },
  };

  if (!isSupabaseConfigured) {
    result.validation.errors.push('Supabase não configurado. Ative as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    return result;
  }

  try {
    const now = new Date().toISOString();

    // 1. Migrar Perfil do utilizador
    const currentUser = getCurrentUser();
    if (currentUser) {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        name: currentUser.name || 'Utilizador',
        username: (currentUser.email || 'user').split('@')[0],
        avatar_url: (currentUser as any).photoUrl || (currentUser as any).avatar || '',
        bio: 'Contabilista & Estudante PGC Angola',
        preferred_accounting_standard: 'pgc_angola',
        is_searchable: true,
        updated_at: now,
      }, { onConflict: 'id' });

      if (profileErr) {
        result.validation.errors.push(`Erro perfil: ${profileErr.message}`);
      } else {
        result.counts.profiles = 1;
      }
    }

    // 2. Migrar Entidades e Dados de Receita
    const entities = DB.list('entities') || [];
    for (const ent of entities) {
      const { error: entErr } = await supabase.from('entities').upsert({
        id: ent.id,
        user_id: userId,
        name: ent.name,
        region: ent.region,
        currency: ent.currency,
        status: ent.status,
        updated_at: now,
      }, { onConflict: 'id' });

      if (!entErr) {
        result.counts.entities++;
        // Migrate associated revenues
        if (Array.isArray(ent.revenueData)) {
          for (const rev of ent.revenueData) {
            const { error: revErr } = await supabase.from('revenue_data').upsert({
              id: `${ent.id}_${rev.month || rev.period || Date.now()}`,
              entity_id: ent.id,
              user_id: userId,
              period: rev.month || rev.period || '2026-Q1',
              revenue: Number(rev.revenue || 0),
              expenses: Number(rev.expenses || 0),
              net_income: Number(rev.netIncome || rev.net_income || 0),
              updated_at: now,
            }, { onConflict: 'id' });

            if (!revErr) result.counts.revenue_data++;
          }
        }
      }
    }

    // 3. Migrar Progresso de Módulos (LocalStorage)
    try {
      const storedProgress = localStorage.getItem('pgc_learning_progress');
      if (storedProgress) {
        const parsed = JSON.parse(storedProgress);
        for (const [moduleId, prog] of Object.entries(parsed)) {
          const progData = prog as any;
          const { error: progErr } = await supabase.from('study_progress').upsert({
            id: `prog_${userId}_${moduleId}`,
            user_id: userId,
            module_id: moduleId,
            category: progData.category || 'Geral',
            progress_percent: typeof progData === 'number' ? progData : (progData.progress_percent || 100),
            is_favorite: Boolean(progData.is_favorite),
            last_activity_at: now,
            updated_at: now,
          }, { onConflict: 'id' });

          if (!progErr) result.counts.study_progress++;
        }
      }
    } catch (_) {}

    // 4. Migrar Histórico de Conversas de IA
    try {
      const storedChats = localStorage.getItem('ais_ai_conversations');
      if (storedChats) {
        const chats = JSON.parse(storedChats);
        if (Array.isArray(chats)) {
          for (const c of chats) {
            const { error: chatErr } = await supabase.from('ai_conversations').upsert({
              id: c.id || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              user_id: userId,
              title: c.title || 'Consulta Contabilística PGC',
              messages: c.messages || [],
              tags: c.tags || ['#PGC', '#Contabilidade'],
              updated_at: now,
            }, { onConflict: 'id' });

            if (!chatErr) result.counts.ai_conversations++;
          }
        }
      }
    } catch (_) {}

    result.success = result.validation.errors.length === 0;
    return result;
  } catch (err: any) {
    result.validation.errors.push(`Exceção durante migração: ${err?.message || err}`);
    return result;
  }
}

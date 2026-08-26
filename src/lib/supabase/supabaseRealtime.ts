import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MessageRecord, FriendshipRecord, StudyProgressRecord, ProfileRecord } from './types';

/**
 * Subscreve a mensagens em tempo real para um utilizador / conversa
 */
export function subscribeToRealtimeMessages(
  userId: string,
  onMessageReceived: (message: MessageRecord) => void,
  onMessageUpdated?: (message: MessageRecord) => void
): () => void {
  if (!isSupabaseConfigured || !userId) {
    return () => {};
  }

  const channel = supabase
    .channel(`messages_user_${userId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onMessageReceived(payload.new as MessageRecord);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && onMessageUpdated) {
          onMessageUpdated(payload.new as MessageRecord);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && onMessageUpdated) {
          onMessageUpdated(payload.new as MessageRecord);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscreve às mensagens em tempo real dentro de uma conversa específica
 */
export function subscribeToConversationRealtime(
  conversationId: string,
  onMessage: (message: MessageRecord) => void,
  onUpdate?: (message: MessageRecord) => void
): () => void {
  if (!isSupabaseConfigured || !conversationId) {
    return () => {};
  }

  const channel = supabase
    .channel(`conv_channel_${conversationId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onMessage(payload.new as MessageRecord);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new && onUpdate) {
          onUpdate(payload.new as MessageRecord);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Marca mensagens de uma conversa como lidas no Supabase
 */
export async function markMessagesAsReadSupabase(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  if (!isSupabaseConfigured || !conversationId || !currentUserId) return;

  try {
    const now = new Date().toISOString();
    await supabase
      .from('messages')
      .update({ read_at: now })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', currentUserId)
      .is('read_at', null);
  } catch (err) {
    console.error('[markMessagesAsReadSupabase] Erro ao marcar mensagens como lidas:', err);
  }
}

/**
 * Subscreve a pedidos de amizade e alterações de estado em tempo real
 */
export function subscribeToRealtimeFriendships(
  userId: string,
  onFriendshipChange: (friendship: FriendshipRecord) => void
): () => void {
  if (!isSupabaseConfigured || !userId) {
    return () => {};
  }

  const channel = supabase
    .channel(`friendships_user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onFriendshipChange(payload.new as FriendshipRecord);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `requester_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onFriendshipChange(payload.new as FriendshipRecord);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscreve ao progresso de estudo em tempo real (multi-aparelho)
 */
export function subscribeToRealtimeStudyProgress(
  userId: string,
  onProgressUpdated: (progress: StudyProgressRecord) => void
): () => void {
  if (!isSupabaseConfigured || !userId) {
    return () => {};
  }

  const channel = supabase
    .channel(`study_progress_user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'study_progress',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onProgressUpdated(payload.new as StudyProgressRecord);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscreve ao perfil em tempo real (mudança de avatar, nome, etc.)
 */
export function subscribeToRealtimeProfile(
  userId: string,
  onProfileUpdated: (profile: ProfileRecord) => void
): () => void {
  if (!isSupabaseConfigured || !userId) {
    return () => {};
  }

  const channel = supabase
    .channel(`profile_user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onProfileUpdated(payload.new as ProfileRecord);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Rastreio de presença (Online/Offline) com Supabase Presence
 */
export function trackUserPresence(
  userId: string,
  userName: string,
  hidePresence: boolean = false,
  onPresenceUpdate?: (onlineUserIds: string[]) => void
): () => void {
  if (!isSupabaseConfigured || !userId || hidePresence) {
    return () => {};
  }

  const presenceChannel = supabase.channel('online_presence', {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const onlineIds = Object.keys(state);
      if (onPresenceUpdate) {
        onPresenceUpdate(onlineIds);
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: userId,
          name: userName,
          online_at: new Date().toISOString(),
        });
      }
    });

  return () => {
    presenceChannel.untrack();
    supabase.removeChannel(presenceChannel);
  };
}

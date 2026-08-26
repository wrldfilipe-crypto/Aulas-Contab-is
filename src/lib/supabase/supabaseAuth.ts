import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DeviceSessionRecord, ProfileRecord } from './types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: string;
  created_at?: string;
}

const LOCAL_DEVICE_KEY = 'ais_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  let deviceId = localStorage.getItem(LOCAL_DEVICE_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem(LOCAL_DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export function getDeviceDetails() {
  if (typeof window === 'undefined') {
    return { name: 'Servidor', browser: 'Node', os: 'Linux' };
  }
  const ua = navigator.userAgent;
  let browser = 'Navegador Web';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Google Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Microsoft Edge';

  let os = 'Dispositivo';
  if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    name: `${os} (${browser})`,
    browser,
    os,
  };
}

/**
 * Autenticação via Email & Palavra-passe
 */
export async function supabaseSignInWithEmail(email: string, password: string):Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    // Fallback gracioso local
    const mockUser: AuthUser = {
      id: 'usr_supabase_local_' + btoa(email).substring(0, 10),
      email,
      name: email.split('@')[0],
      avatar_url: '',
      role: 'Contabilista PGC',
      created_at: new Date().toISOString()
    };
    await registerDeviceSession(mockUser.id);
    return { user: mockUser, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'Utilizador não encontrado.' };

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
      avatar_url: data.user.user_metadata?.avatar_url || '',
      role: data.user.user_metadata?.role || 'Membro',
      created_at: data.user.created_at,
    };

    await registerDeviceSession(user.id);
    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Erro inesperado na autenticação.' };
  }
}

/**
 * Criação de Conta via Supabase Auth
 */
export async function supabaseSignUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  role: string = 'Contabilista'
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    const mockUser: AuthUser = {
      id: 'usr_supabase_' + Math.random().toString(36).substring(2, 9),
      email,
      name: fullName || email.split('@')[0],
      avatar_url: '',
      role,
      created_at: new Date().toISOString()
    };
    await registerDeviceSession(mockUser.id);
    return { user: mockUser, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName,
          full_name: fullName,
          role,
        }
      }
    });

    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'Erro ao criar registo.' };

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: fullName,
      avatar_url: '',
      role,
      created_at: data.user.created_at,
    };

    // Upsert initial profile in profiles table
    await supabase.from('profiles').upsert({
      id: user.id,
      name: fullName,
      username: email.split('@')[0],
      avatar_url: '',
      preferred_accounting_standard: 'pgc_angola',
      is_searchable: true,
      updated_at: new Date().toISOString(),
    });

    await registerDeviceSession(user.id);
    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Erro no registo.' };
  }
}

/**
 * Autenticação via OAuth (Google / Apple)
 */
export async function supabaseSignInWithOAuth(provider: 'google' | 'apple'): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase OAuth não configurado no ambiente atual.' };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err?.message || 'Erro ao iniciar OAuth.' };
  }
}

/**
 * Terminar Sessão no dispositivo atual
 */
export async function supabaseSignOut(userId?: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('[SupabaseAuth] Erro no logout:', err);
    }
  }

  const deviceId = getOrCreateDeviceId();
  if (userId && isSupabaseConfigured) {
    try {
      await supabase
        .from('devices_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('device_id', deviceId);
    } catch (_) {}
  }
}

/**
 * Regista ou atualiza a sessão ativa deste aparelho na tabela `devices_sessions`
 */
export async function registerDeviceSession(userId: string): Promise<void> {
  const deviceId = getOrCreateDeviceId();
  const info = getDeviceDetails();
  const now = new Date().toISOString();

  const record: Partial<DeviceSessionRecord> = {
    user_id: userId,
    device_id: deviceId,
    device_name: info.name,
    browser: info.browser,
    os: info.os,
    is_current: true,
    last_active_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured) {
    // Local storage fallback for connected devices
    try {
      const stored = localStorage.getItem('ais_mock_device_sessions');
      let list: DeviceSessionRecord[] = stored ? JSON.parse(stored) : [];
      list = list.filter(d => d.device_id !== deviceId && d.user_id === userId);
      list.push({
        id: 'sess_' + deviceId,
        user_id: userId,
        device_id: deviceId,
        device_name: info.name,
        browser: info.browser,
        os: info.os,
        is_current: true,
        last_active_at: now,
        created_at: now,
        updated_at: now,
      });
      localStorage.setItem('ais_mock_device_sessions', JSON.stringify(list));
    } catch (_) {}
    return;
  }

  try {
    await supabase.from('devices_sessions').upsert(record, { onConflict: 'user_id,device_id' });
  } catch (err) {
    console.warn('[SupabaseAuth] Erro ao registar sessão de dispositivo:', err);
  }
}

/**
 * Lista todos os dispositivos conectados à conta do utilizador
 */
export async function listConnectedDevices(userId: string): Promise<DeviceSessionRecord[]> {
  const currentDeviceId = getOrCreateDeviceId();

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem('ais_mock_device_sessions');
      let list: DeviceSessionRecord[] = stored ? JSON.parse(stored) : [];
      return list.map(d => ({
        ...d,
        is_current: d.device_id === currentDeviceId,
      }));
    } catch (_) {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('devices_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      ...d,
      is_current: d.device_id === currentDeviceId,
    }));
  } catch (err) {
    console.error('[SupabaseAuth] Erro ao listar dispositivos:', err);
    return [];
  }
}

/**
 * Termina remotamente a sessão de outro dispositivo
 */
export async function terminateRemoteDeviceSession(userId: string, targetDeviceId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem('ais_mock_device_sessions');
      if (stored) {
        let list: DeviceSessionRecord[] = JSON.parse(stored);
        list = list.filter(d => d.device_id !== targetDeviceId);
        localStorage.setItem('ais_mock_device_sessions', JSON.stringify(list));
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  try {
    const { error } = await supabase
      .from('devices_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', targetDeviceId);

    return !error;
  } catch (err) {
    console.error('[SupabaseAuth] Falha ao terminar sessão remota:', err);
    return false;
  }
}

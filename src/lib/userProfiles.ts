import { salvarPerfilNoFirestore, obterPerfilDoFirestore } from './auth/authService';

export type UserProfileRole = 'student' | 'accountant' | 'manager' | 'company' | 'other';
export type UserExperienceMode = 'unified';

export interface UserProfileData {
  userId?: string;
  id?: string;
  name: string;
  email: string;
  roleTitle?: string;
  company?: string;
  country?: string;
  preferredLanguage?: string;
  preferredStandard?: string;
  profile?: UserProfileRole | string;
  bio?: string;
  fotoUrl?: string;
  avatar?: string;
  updatedAt?: number;
  [key: string]: any;
}

export interface UserProfileConfig {
  role: UserProfileRole;
  roleTitle: string;
  description: string;
  badgeLabel: string;
  primaryFocus: string;
  allowedTabs: string[];
}

export const PROFILE_CONFIGS: Record<UserProfileRole, UserProfileConfig> = {
  student: {
    role: 'student',
    roleTitle: 'Estudante / Académico',
    description: 'Acesso a todas as ferramentas com percursos didáticos, simulados e assistente especializado.',
    badgeLabel: 'Académico / Estudante',
    primaryFocus: 'Módulos Didáticos & Exercícios',
    allowedTabs: ['dashboard', 'assistant', 'accounting', 'learning', 'quizzes', 'notes', 'profile']
  },
  accountant: {
    role: 'accountant',
    roleTitle: 'Contabilista / Auditor Certificado',
    description: 'Acesso total a contabilidade PGC Angola, balancetes, lançamentos, demonstrações e auditoria.',
    badgeLabel: 'Contabilista Certificado',
    primaryFocus: 'Produtividade, Lançamentos & Auditoria',
    allowedTabs: ['dashboard', 'assistant', 'accounting', 'learning', 'quizzes', 'notes', 'profile']
  },
  manager: {
    role: 'manager',
    roleTitle: 'Gestor / Diretor Financeiro (CFO)',
    description: 'Visão executiva de desempenho financeiro, balancetes e relatórios para tomada de decisão.',
    badgeLabel: 'Direção Financeira',
    primaryFocus: 'Consolidação & Relatórios Executivos',
    allowedTabs: ['dashboard', 'assistant', 'accounting', 'learning', 'quizzes', 'notes', 'profile']
  },
  company: {
    role: 'company',
    roleTitle: 'Empresa / Corporativo',
    description: 'Gestão institucional multi-entidade, compliance regulatório e colaboração de equipa.',
    badgeLabel: 'Entidade Corporativa',
    primaryFocus: 'Governança & Gestão Institucional',
    allowedTabs: ['dashboard', 'assistant', 'accounting', 'learning', 'quizzes', 'notes', 'profile']
  },
  other: {
    role: 'other',
    roleTitle: 'Utilizador Geral / Consultor',
    description: 'Acesso equilibrado a todas as ferramentas e conteúdos da plataforma.',
    badgeLabel: 'Consultor Geral',
    primaryFocus: 'Acesso Geral',
    allowedTabs: ['dashboard', 'assistant', 'accounting', 'learning', 'quizzes', 'notes', 'profile']
  }
};

/**
 * Cookie Helper
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/**
 * Gravação permanente dos dados do perfil do utilizador (4 CAMADAS):
 * CAMADA 1 — localStorage: 'ga:' + userId + ':profile'
 * CAMADA 2 — sessionStorage: 'ga:' + userId + ':profile'
 * CAMADA 3 — Cookie: 'ga_profile_' + userId (365 dias)
 * CAMADA 4 — Firebase / Firestore na nuvem
 */
export async function saveProfileData(userId: string, profileData: Partial<UserProfileData>): Promise<boolean> {
  if (!userId) return false;
  try {
    const dataString = JSON.stringify({
      ...profileData,
      updatedAt: Date.now()
    });

    // CAMADA 1 — localStorage
    try {
      localStorage.setItem('ga:' + userId + ':profile', dataString);
      const existingSession = localStorage.getItem('ga_session');
      if (existingSession) {
        const parsed = JSON.parse(existingSession);
        localStorage.setItem('ga_session', JSON.stringify({ ...parsed, ...profileData }));
      }
    } catch (err) {
      console.warn('[saveProfileData] localStorage save warning:', err);
    }

    // CAMADA 2 — sessionStorage
    try {
      sessionStorage.setItem('ga:' + userId + ':profile', dataString);
    } catch (err) {
      console.warn('[saveProfileData] sessionStorage save warning:', err);
    }

    // CAMADA 3 — Cookie (validade 365 dias)
    try {
      setCookie('ga_profile_' + userId, dataString, 365);
    } catch (err) {
      console.warn('[saveProfileData] cookie save warning:', err);
    }

    // CAMADA 4 — Firebase / Firestore
    if (userId && userId !== 'anonymous') {
      try {
        const { updatedAt, ...restProfile } = profileData;
        await salvarPerfilNoFirestore(userId, restProfile as any);
      } catch (err) {
        console.warn('[saveProfileData] Firebase Firestore save warning (offline fallback active):', err);
      }
    }

    return true;
  } catch (e) {
    console.error('[saveProfileData] Failed to store profile data:', e);
    return false;
  }
}

/**
 * Função síncrona para compatibilidade com código existente
 */
export function saveUserProfileMultiStore(userId: string, profileData: Partial<UserProfileData>): boolean {
  saveProfileData(userId, profileData).catch(() => {});
  return true;
}

/**
 * Carrega os dados do perfil verificando as 4 fontes por ordem de latência:
 * 1. localStorage ('ga:' + userId + ':profile')
 * 2. sessionStorage ('ga:' + userId + ':profile')
 * 3. cookie ('ga_profile_' + userId)
 * 4. Firebase Firestore (nuvem)
 */
export async function loadProfileData(userId: string): Promise<UserProfileData | null> {
  if (!userId) return null;

  // Fonte 1: localStorage
  try {
    const lsItem = localStorage.getItem('ga:' + userId + ':profile');
    if (lsItem) {
      const parsed = JSON.parse(lsItem);
      if (parsed && (parsed.name || parsed.email || parsed.roleTitle)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Fonte 2: sessionStorage
  try {
    const ssItem = sessionStorage.getItem('ga:' + userId + ':profile');
    if (ssItem) {
      const parsed = JSON.parse(ssItem);
      if (parsed && (parsed.name || parsed.email || parsed.roleTitle)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Fonte 3: Cookie (365 dias)
  try {
    const cookieItem = getCookie('ga_profile_' + userId);
    if (cookieItem) {
      const parsed = JSON.parse(cookieItem);
      if (parsed && (parsed.name || parsed.email || parsed.roleTitle)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Fonte 4: Firebase Firestore
  try {
    const firestoreData = await obterPerfilDoFirestore(userId);
    if (firestoreData && (firestoreData.name || firestoreData.email || (firestoreData as any).roleTitle)) {
      const convertedProfile: UserProfileData = {
        userId,
        name: firestoreData.name || firestoreData.nome || '',
        email: firestoreData.email || '',
        roleTitle: (firestoreData as any).roleTitle || (firestoreData as any).cargo || '',
        company: (firestoreData as any).company || (firestoreData as any).empresa || '',
        country: firestoreData.country || 'Angola',
        profile: (firestoreData.role as any) || 'accountant',
        bio: (firestoreData as any).bio || (firestoreData as any).biografia || '',
        fotoUrl: firestoreData.photoURL || firestoreData.avatar || firestoreData.fotoUrl || '',
        avatar: firestoreData.avatar || firestoreData.photoURL || '',
        updatedAt: firestoreData.updatedAt ? new Date(firestoreData.updatedAt).getTime() : Date.now()
      };
      // Re-popular camadas locais
      saveUserProfileMultiStore(userId, convertedProfile);
      return convertedProfile;
    }
  } catch (err) {
    console.debug('[loadProfileData] Firestore fallback error:', err);
  }

  // Fallback ga_session
  try {
    const fallback = localStorage.getItem('ga_session');
    if (fallback) {
      const parsed = JSON.parse(fallback);
      if (parsed) return parsed;
    }
  } catch (_) {}

  return null;
}

/**
 * Carrega os dados do perfil verificando as fontes síncronas locais (localStorage, sessionStorage, cookie)
 */
export function loadUserProfileMultiStore(userId: string): UserProfileData | null {
  if (!userId) return null;

  // Fonte 1: localStorage
  try {
    const lsItem = localStorage.getItem('ga:' + userId + ':profile');
    if (lsItem) {
      const parsed = JSON.parse(lsItem);
      if (parsed && (parsed.name || parsed.email || parsed.roleTitle)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Fonte 2: sessionStorage
  try {
    const ssItem = sessionStorage.getItem('ga:' + userId + ':profile');
    if (ssItem) {
      const parsed = JSON.parse(ssItem);
      if (parsed && (parsed.name || parsed.email || parsed.roleTitle)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Fonte 3: Cookie (365 dias)
  try {
    const cookieItem = getCookie('ga_profile_' + userId);
    if (cookieItem) {
      const parsed = JSON.parse(cookieItem);
      if (parsed && (parsed.name || parsed.email || parsed.roleTitle)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Fallback ga_session
  try {
    const fallback = localStorage.getItem('ga_session');
    if (fallback) {
      const parsed = JSON.parse(fallback);
      if (parsed) return parsed;
    }
  } catch (_) {}

  return null;
}

export function getStoredUserRole(): UserProfileRole {
  try {
    const sessionStr = localStorage.getItem('ga_session');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed.profile && PROFILE_CONFIGS[parsed.profile as UserProfileRole]) {
        return parsed.profile as UserProfileRole;
      }
    }
  } catch (e) {}
  return 'accountant';
}

export function getProfileConfig(role?: string): UserProfileConfig {
  const r = (role as UserProfileRole) || getStoredUserRole();
  return PROFILE_CONFIGS[r] || PROFILE_CONFIGS.accountant;
}

export function getActiveExperienceMode(): string {
  return 'unified';
}

export function setActiveExperienceMode(_mode?: string): void {
  // No-op: unified mode
}

export function isTabVisibleForMode(_tabId: string, _mode?: string): boolean {
  return true;
}

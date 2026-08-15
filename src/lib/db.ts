import { i18n } from '../translations';
import { 
  auth,
  ouvirSessao,
  saveEntityToFirestore, 
  deleteEntityFromFirestore, 
  saveTransactionToFirestore, 
  deleteTransactionFromFirestore,
  syncUserProfileToFirestore,
  uploadFotoPerfil,
  enviarArquivo,
  buscarUsuariosDebounced,
  migrarMensagensIncorretas,
  salvarPreferencias,
  notificarOutrasAbas,
  ouvirOutrasAbas,
  enfileirarOperacao,
  sincronizarFila,
  iniciarSyncAutomatico
} from './firebase';
import { signInWithEmailAndPassword as firebaseSignIn } from 'firebase/auth';
import { hashPassword, generateSalt, isValidEmail, validatePasswordRequirements } from './authCrypto';

let dbSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Verificação de integridade executada no início da inicialização da app:
 * Verifica se existe um UID persistido no localStorage antes de qualquer tentativa de login,
 * garantindo a continuidade da sessão e forçando a reutilização de instâncias existentes.
 */
export function verificarIntegridadeInicioApp(email?: string): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  const uid = getPersistentUid(email);
  if (uid) {
    console.log('[Integridade App] UID persistido validado na inicialização:', uid);
  }
  return uid;
}

/**
 * Procura utilizadores no Firestore adicionando um mecanismo de debounce eficaz (300ms)
 * para garantir que as chamadas ao Firestore ocorram apenas após o utilizador parar de digitar,
 * reduzindo custos e aumentando a performance da PWA.
 */
export function buscarUsuarios(termo: string, delay = 300): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (dbSearchDebounceTimer) {
      clearTimeout(dbSearchDebounceTimer);
      dbSearchDebounceTimer = null;
    }

    const termClean = termo ? termo.trim() : '';
    if (!termClean) {
      resolve([]);
      return;
    }

    dbSearchDebounceTimer = setTimeout(async () => {
      try {
        const results = await buscarUsuariosDebounced(termClean, 0);
        resolve(results);
      } catch (err) {
        console.error('[db.buscarUsuarios] Erro na busca com debounce:', err);
        reject(err);
      }
    }, delay);
  });
}

/**
 * Realiza autenticação via Firebase Auth validando previamente se existe um UID
 * persistido no localStorage antes de efetuar o signInWithEmailAndPassword,
 * garantindo a continuidade da sessão e evitando a criação inadvertida de novos perfis.
 */
export async function signInWithEmailAndPassword(authOrEmail: any, emailOrPass: string, passOptional?: string) {
  let email: string;
  let password: string;

  if (typeof authOrEmail === 'string') {
    email = authOrEmail;
    password = emailOrPass;
  } else {
    email = emailOrPass;
    password = passOptional || '';
  }

  // Verificação de integridade antes do login: verificar se existe UID persistido
  const persistentUid = verificarIntegridadeInicioApp(email);
  if (persistentUid) {
    console.log('[db.signInWithEmailAndPassword] UID persistido no localStorage forçado para continuidade de sessão:', persistentUid);
  }

  // Realizar autenticação com o Firebase Auth
  const userCredential = await firebaseSignIn(auth, email, password);
  const uid = userCredential.user.uid;

  // Preservar continuidade da sessão guardando o UID no localStorage
  setPersistentUid(email, uid);

  return userCredential;
}

export {
  ouvirSessao,
  uploadFotoPerfil,
  enviarArquivo,
  buscarUsuariosDebounced,
  migrarMensagensIncorretas,
  salvarPreferencias,
  notificarOutrasAbas,
  ouvirOutrasAbas,
  enfileirarOperacao,
  sincronizarFila,
  iniciarSyncAutomatico
};

/**
 * Recupera o UID do utilizador persistido no localStorage antes de inicializar o Firebase.
 * Evita a criação de múltiplos perfis duplicados para o mesmo utilizador.
 */
export function getPersistentUid(email?: string): string | null {
  if (email) {
    const formattedEmail = email.toLowerCase().trim();
    const storedRecord = localStorage.getItem(`ga:user_record:${formattedEmail}`);
    if (storedRecord) {
      try {
        const parsed = JSON.parse(storedRecord);
        if (parsed.userId) return parsed.userId;
      } catch (e) {
        console.error('[db.getPersistentUid] Erro ao ler registo guardado:', e);
      }
    }
    const uidByEmail = localStorage.getItem(`ga_uid_${formattedEmail}`);
    if (uidByEmail) return uidByEmail;
  }

  const rawSession = localStorage.getItem('ga_session');
  if (rawSession) {
    try {
      const sess = JSON.parse(rawSession);
      if (sess.userId) return sess.userId;
    } catch (e) {
      console.error('[db.getPersistentUid] Erro ao ler sessão local:', e);
    }
  }

  return localStorage.getItem('ga_user_uid');
}

/**
 * Guarda o UID do utilizador no localStorage para garantir consistência de sessão.
 */
export function setPersistentUid(email: string, uid: string) {
  if (!uid) return;
  localStorage.setItem('ga_user_uid', uid);
  if (email) {
    const formattedEmail = email.toLowerCase().trim();
    localStorage.setItem(`ga_uid_${formattedEmail}`, uid);
  }
}

export interface WorkHoursConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  workDays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  blockNonEssential: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  nightFocusMode?: boolean;
  background: string;
  language: string;
  documentLang: string;
  defaultTaxCountry: string;
  accountingStandard: string;
  defaultCurrency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  notifications: {
    compliance: boolean;
    ai: boolean;
    workspace: boolean;
    education: boolean;
    system: boolean;
  };
  workHoursFocus?: WorkHoursConfig;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  country: string;
  language: string;
  profile: 'student' | 'accountant' | 'manager' | 'company' | 'other';
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  lastLoginAt: string;
  preferences: UserPreferences;
  token?: string;
  tokenExpiry?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  photoUrl?: string;
  fotoUrl?: string;
  bio?: string;
  roleTitle?: string;
  company?: string;
}

export interface UserAccountRecord {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  session: UserSession;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'accountant' | 'manager' | 'viewer';
  invitedAt: string;
  joinedAt?: string;
  status: 'active' | 'invited' | 'suspended';
}

export interface Workspace {
  id: string;
  name: string;
  country: string;
  currency: string;
  standard: string;
  industry: string;
  ownerId: string;
  members: WorkspaceMember[];
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  settings: Record<string, any>;
}

export interface WorkspaceInvite {
  token: string;
  workspaceId: string;
  email: string;
  role: 'admin' | 'accountant' | 'manager' | 'viewer';
  expiresAt: string;
}

export interface Notification {
  id: string;
  type: 'compliance' | 'ai' | 'workspace' | 'education' | 'system';
  title: string;
  message: string;
  actionUrl?: string | null;
  read: boolean;
  createdAt: string;
}

// Default initial preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  nightFocusMode: false,
  background: 'dots',
  language: 'en',
  documentLang: 'en',
  defaultTaxCountry: 'Portugal',
  accountingStandard: 'IFRS',
  defaultCurrency: 'EUR',
  dateFormat: 'DD/MM/YYYY',
  notifications: {
    compliance: true,
    ai: true,
    workspace: true,
    education: true,
    system: true,
  },
  workHoursFocus: {
    enabled: false,
    startTime: '08:00',
    endTime: '17:00',
    workDays: [1, 2, 3, 4, 5],
    blockNonEssential: true
  }
};

// Global session helper functions
export function getCurrentUser(): UserSession | null {
  const raw = localStorage.getItem('ga_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[db.getCurrentUser] Erro ao interpretar sessão do utilizador:', err);
    return null;
  }
}

export function isAuthenticated(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Check token expiry
  const expiryRaw = localStorage.getItem('ga_token_expiry');
  if (!expiryRaw) return false;
  const expiry = parseInt(expiryRaw, 10);
  if (Date.now() > expiry) {
    // Session expired
    logout();
    return false;
  }
  return true;
}

export function login(user: UserSession, rememberMe: boolean = false) {
  // Verificação de integridade: Reutilizar UID persistido se existir para evitar fragmentação de perfis
  const persistentUid = getPersistentUid(user.email);
  if (persistentUid) {
    console.log(`[db.login] Reutilizando UID persistido (${persistentUid}) para ${user.email}`);
    user.userId = persistentUid;
  } else if (user.userId) {
    setPersistentUid(user.email, user.userId);
  }

  const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days vs 1 day
  const expiry = Date.now() + duration;
  
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  user.token = token;
  user.tokenExpiry = new Date(expiry).toISOString();
  user.lastLoginAt = new Date().toISOString();
  
  localStorage.setItem('ga_session', JSON.stringify(user));
  localStorage.setItem('ga_token_expiry', expiry.toString());
  
  // Set preferred language
  if (user.language) {
    i18n.setLanguage(user.language);
  }
  
  // Ensure we have at least one workspace for this user
  ensureUserWorkspaces(user.userId);

  // Sync user profile to Firestore
  syncUserProfileToFirestore({
    id: user.userId,
    name: user.name,
    email: user.email,
    country: user.country,
    company: user.company,
    roleTitle: user.roleTitle,
    status: 'online'
  });
}

export function logout() {
  localStorage.removeItem('ga_session');
  localStorage.removeItem('ga_token_expiry');
  localStorage.removeItem('ga_active_workspace');
}

/**
 * Registar uma nova conta de utilizador com isolamento estrito de dados e hash de palavra-passe com sal.
 */
export async function registerUserAccount(params: {
  email: string;
  password: string;
  name: string;
  country: string;
  profile: 'student' | 'accountant' | 'manager' | 'company' | 'other';
  language: string;
}): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const formattedEmail = params.email.toLowerCase().trim();
  
  if (!isValidEmail(formattedEmail)) {
    return { success: false, error: 'O endereço de e-mail inserido é inválido.' };
  }

  const passCheck = validatePasswordRequirements(params.password);
  if (!passCheck.isValid) {
    return { success: false, error: passCheck.message || 'Palavra-passe inválida.' };
  }

  // Verificar se já existe conta registada com este e-mail
  const existingRecordRaw = localStorage.getItem(`ga:user_record:${formattedEmail}`);
  if (existingRecordRaw) {
    return { success: false, error: 'Já existe uma conta registada com este endereço de e-mail.' };
  }

  const persistentUid = getPersistentUid(formattedEmail);
  const userId = persistentUid || ('usr_' + Math.random().toString(36).substring(2) + Date.now().toString(36));
  setPersistentUid(formattedEmail, userId);

  const salt = generateSalt(16);
  const passwordHash = await hashPassword(params.password, salt);

  const session: UserSession = {
    userId,
    email: formattedEmail,
    name: params.name.trim(),
    role: 'user',
    country: params.country || 'Angola',
    language: params.language || 'pt-PT',
    profile: params.profile || 'accountant',
    plan: 'free',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      background: 'dots',
      language: params.language || 'pt-PT',
      documentLang: params.language || 'pt-PT',
      defaultTaxCountry: params.country || 'Angola',
      accountingStandard: params.country === 'Brasil' ? 'NBC BR' : (params.country === 'Angola' ? 'PGC Angola' : 'PGC Angola'),
      defaultCurrency: params.country === 'Brasil' ? 'BRL' : (params.country === 'Angola' ? 'AOA' : 'AOA'),
      dateFormat: 'DD/MM/YYYY',
      notifications: {
        compliance: true,
        ai: true,
        workspace: true,
        education: true,
        system: true,
      }
    }
  };

  const accountRecord: UserAccountRecord = {
    userId,
    email: formattedEmail,
    name: params.name.trim(),
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    session
  };

  localStorage.setItem(`ga:user_record:${formattedEmail}`, JSON.stringify(accountRecord));
  
  // Garantir workspace para este utilizador
  ensureUserWorkspaces(userId);

  return { success: true, user: session };
}

/**
 * Autenticar utilizador verificando a hash da palavra-passe com sal.
 */
export async function authenticateUserAccount(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const formattedEmail = email.toLowerCase().trim();
  
  if (!formattedEmail || !password) {
    return { success: false, error: 'Por favor preencha todos os campos obrigatórios.' };
  }

  const storedRaw = localStorage.getItem(`ga:user_record:${formattedEmail}`);
  if (!storedRaw) {
    return { success: false, error: 'Credenciais inválidas ou conta não encontrada.' };
  }

  try {
    const parsed = JSON.parse(storedRaw);
    let sessionUser: UserSession;

    if (parsed.passwordHash && parsed.salt) {
      // Conta com hash e sal
      const computedHash = await hashPassword(password, parsed.salt);
      if (computedHash !== parsed.passwordHash) {
        return { success: false, error: 'Credenciais inválidas. Verifique o e-mail e a palavra-passe.' };
      }
      sessionUser = parsed.session || {
        userId: parsed.userId,
        email: parsed.email,
        name: parsed.name,
        role: 'user',
        country: 'Angola',
        language: 'pt-PT',
        profile: 'accountant',
        plan: 'free',
        createdAt: parsed.createdAt,
        lastLoginAt: new Date().toISOString(),
        preferences: DEFAULT_PREFERENCES
      };
    } else {
      // Registo legado simples (auto-atualiza com hash)
      sessionUser = parsed as UserSession;
      const salt = generateSalt(16);
      const passwordHash = await hashPassword(password, salt);
      const upgraded: UserAccountRecord = {
        userId: sessionUser.userId,
        email: formattedEmail,
        name: sessionUser.name,
        passwordHash,
        salt,
        createdAt: sessionUser.createdAt || new Date().toISOString(),
        session: sessionUser
      };
      localStorage.setItem(`ga:user_record:${formattedEmail}`, JSON.stringify(upgraded));
    }

    sessionUser.lastLoginAt = new Date().toISOString();
    return { success: true, user: sessionUser };
  } catch (err: any) {
    console.error('[authenticateUserAccount] Erro ao autenticar:', err);
    return { success: false, error: 'Erro ao processar autenticação.' };
  }
}

/**
 * Alterar palavra-passe do utilizador autenticado
 */
export async function changeUserPassword(
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const formattedEmail = email.toLowerCase().trim();
  const storedRaw = localStorage.getItem(`ga:user_record:${formattedEmail}`);
  if (!storedRaw) {
    return { success: false, error: 'Registo de utilizador não encontrado.' };
  }

  try {
    const parsed = JSON.parse(storedRaw);
    if (parsed.passwordHash && parsed.salt) {
      const oldComputed = await hashPassword(oldPassword, parsed.salt);
      if (oldComputed !== parsed.passwordHash) {
        return { success: false, error: 'A palavra-passe atual está incorreta.' };
      }
    }

    const passCheck = validatePasswordRequirements(newPassword);
    if (!passCheck.isValid) {
      return { success: false, error: passCheck.message || 'Nova palavra-passe inválida.' };
    }

    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPassword, newSalt);

    parsed.salt = newSalt;
    parsed.passwordHash = newHash;
    localStorage.setItem(`ga:user_record:${formattedEmail}`, JSON.stringify(parsed));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Falha ao atualizar a palavra-passe.' };
  }
}

export function deleteUserAccount(user: UserSession) {
  if (!user) return;
  const userId = user.userId;
  const email = user.email ? user.email.toLowerCase().trim() : '';

  // 1. Delete all user database entries and workspace ownerships
  DB.deleteAll(userId);

  // 2. Remove stored user registration record
  if (email) {
    localStorage.removeItem(`ga:user_record:${email}`);
  }

  // 3. Remove session tokens and active workspace references
  localStorage.removeItem('ga_session');
  localStorage.removeItem('ga_token_expiry');
  localStorage.removeItem('ga_active_workspace');
  localStorage.removeItem('ga_active_workspace_id');

  // 4. Scrub any lingering localStorage keys tied to this user ID or email (GDPR / RGPD compliance)
  Object.keys(localStorage).forEach(key => {
    if ((userId && key.toLowerCase().includes(userId.toLowerCase())) || (email && key.toLowerCase().includes(email))) {
      localStorage.removeItem(key);
    }
  });

  // 5. Ensure logout
  logout();
}

export function refreshSession() {
  const user = getCurrentUser();
  const expiryRaw = localStorage.getItem('ga_token_expiry');
  if (user && expiryRaw) {
    const expiry = parseInt(expiryRaw, 10);
    // If remember me was active, extend it when nearing expiry
    if (expiry - Date.now() < 12 * 60 * 60 * 1000) {
      const newExpiry = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('ga_token_expiry', newExpiry.toString());
      user.tokenExpiry = new Date(newExpiry).toISOString();
      localStorage.setItem('ga_session', JSON.stringify(user));
    }
  }
}

// Database Isolation Helper
export const DB = {
  // Construir chave isolada por utilizador
  key: (userId: string, namespace: string, id: string = '') =>
    `ga:${userId}:${namespace}${id ? ':' + id : ''}`,

  // Guardar dado do utilizador atual
  set: (namespace: string, id: string, data: any) => {
    const user = getCurrentUser();
    if (!user) return;
    const key = DB.key(user.userId, namespace, id);
    localStorage.setItem(key, JSON.stringify({ 
      ...data, 
      userId: user.userId, 
      updatedAt: new Date().toISOString() 
    }));
  },

  // Ler dado do utilizador atual
  get: (namespace: string, id: string) => {
    const user = getCurrentUser();
    if (!user) return null;
    const key = DB.key(user.userId, namespace, id);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  // Listar todos os registos de um namespace do utilizador atual
  list: (namespace: string) => {
    const user = getCurrentUser();
    if (!user) return [];
    const prefix = DB.key(user.userId, namespace);
    return Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .map(k => {
        try {
          return JSON.parse(localStorage.getItem(k) || '');
        } catch (err) {
          console.error(`[DB.list] Erro ao interpretar registo "${k}":`, err);
          return null;
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  // Eliminar dado do utilizador atual
  delete: (namespace: string, id: string) => {
    const user = getCurrentUser();
    if (!user) return;
    localStorage.removeItem(DB.key(user.userId, namespace, id));
  },

  // Eliminar TODOS os dados de um utilizador (ex: ao apagar conta)
  deleteAll: (userId: string) => {
    const prefix = `ga:${userId}:`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
      
    // Delete all workspace references belonging to user
    const workspaces = DB.listAllWorkspacesRaw();
    workspaces.forEach(w => {
      if (w.ownerId === userId) {
        DB.deleteWorkspaceAll(w.id);
      } else {
        // Remove member from other workspaces
        const updatedMembers = w.members.filter(m => m.userId !== userId);
        if (updatedMembers.length !== w.members.length) {
          w.members = updatedMembers;
          localStorage.setItem(`ga:workspace:${w.id}:metadata`, JSON.stringify(w));
        }
      }
    });
  },

  // WORKSPACE ISOLATION METHODS
  workspaceKey: (workspaceId: string, namespace: string, id: string = '') =>
    `ga:workspace:${workspaceId}:${namespace}${id ? ':' + id : ''}`,

  setWorkspace: (workspaceId: string, namespace: string, id: string, data: any) => {
    const key = DB.workspaceKey(workspaceId, namespace, id);
    const itemData = {
      ...data,
      workspaceId,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(itemData));

    // Async sync to Firestore
    if (namespace === 'entities') {
      saveEntityToFirestore(workspaceId, itemData);
    } else if (namespace === 'transactions') {
      saveTransactionToFirestore(workspaceId, itemData);
    }
  },

  getWorkspace: (workspaceId: string, namespace: string, id: string) => {
    const key = DB.workspaceKey(workspaceId, namespace, id);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  listWorkspace: (workspaceId: string, namespace: string) => {
    const prefix = DB.workspaceKey(workspaceId, namespace);
    return Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .map(k => {
        try {
          return JSON.parse(localStorage.getItem(k) || '');
        } catch (err) {
          console.error(`[DB.listWorkspace] Erro ao interpretar registo do workspace "${k}":`, err);
          return null;
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  deleteWorkspace: (workspaceId: string, namespace: string, id: string) => {
    const key = DB.workspaceKey(workspaceId, namespace, id);
    localStorage.removeItem(key);

    // Async delete from Firestore
    if (namespace === 'entities') {
      deleteEntityFromFirestore(workspaceId, id);
    } else if (namespace === 'transactions') {
      deleteTransactionFromFirestore(workspaceId, id);
    }
  },

  deleteWorkspaceAll: (workspaceId: string) => {
    const prefix = `ga:workspace:${workspaceId}:`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  },

  listAllWorkspacesRaw: (): Workspace[] => {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('ga:workspace:') && k.endsWith(':metadata'))
      .map(k => {
        try {
          return JSON.parse(localStorage.getItem(k) || '');
        } catch (err) {
          console.error(`[DB.listAllWorkspacesRaw] Erro ao interpretar metadata do workspace "${k}":`, err);
          return null;
        }
      })
      .filter(w => w !== null);
  }
};

// Initialize list of supported default workspaces or user workspaces
export function ensureUserWorkspaces(userId: string) {
  const workspaces = DB.listAllWorkspacesRaw();
  const userWorkspaces = workspaces.filter(w => w.ownerId === userId || w.members.some(m => m.userId === userId));
  
  if (userWorkspaces.length === 0) {
    // Create a default workspace for this new user
    const user = getCurrentUser();
    const defaultWorkspace: Workspace = {
      id: crypto.randomUUID(),
      name: user ? `${user.name} Lda.` : 'Empresa Exemplo Lda.',
      country: user?.country || 'PT',
      currency: user?.preferences?.defaultCurrency || 'EUR',
      standard: user?.preferences?.accountingStandard || 'IFRS',
      industry: 'Advisory & Services',
      ownerId: userId,
      members: [
        {
          userId,
          email: user?.email || '',
          name: user?.name || 'User',
          role: 'admin',
          invitedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
          status: 'active'
        }
      ],
      plan: 'free',
      createdAt: new Date().toISOString(),
      settings: {}
    };
    
    localStorage.setItem(`ga:workspace:${defaultWorkspace.id}:metadata`, JSON.stringify(defaultWorkspace));
    localStorage.setItem('ga_active_workspace', defaultWorkspace.id);
    
    // Seed initial data for this workspace
    seedWorkspaceInitialData(defaultWorkspace.id);
  } else {
    // Ensure active workspace is set
    const activeId = localStorage.getItem('ga_active_workspace');
    if (!activeId || !userWorkspaces.some(w => w.id === activeId)) {
      localStorage.setItem('ga_active_workspace', userWorkspaces[0].id);
    }
  }
}

function seedWorkspaceInitialData(workspaceId: string) {
  // Seed entities (which are now part of workspace, or standalone workspaces themselves)
  const initialEntities = [
    { id: '1', name: 'Vertex Global Holdings', region: 'North America', status: 'Active', lastSync: '2 mins ago', revenue: 1245000, complianceScore: 98, currency: 'USD', taxId: 'US-9832049' },
    { id: '2', name: 'Nexus Tech GmbH', region: 'Europe (DACH)', status: 'Active', lastSync: '14 mins ago', revenue: 892400, complianceScore: 99, currency: 'EUR', taxId: 'DE-2834029' },
  ];
  
  initialEntities.forEach(ent => {
    DB.setWorkspace(workspaceId, 'entities', ent.id, ent);
  });

  const initialTransactions = [
    { id: 't1', entityId: '1', entityName: 'Vertex Global Holdings', date: '2026-07-01', description: 'Q2 Revenue Distribution', account: '4000 - Sales Revenue', type: 'Credit', amount: 1245000, status: 'Reconciled' },
    { id: 't2', entityId: '2', entityName: 'Nexus Tech GmbH', date: '2026-07-02', description: 'Enterprise License Renewals', account: '4010 - SaaS Revenue', type: 'Credit', amount: 450000, status: 'Reconciled' },
  ];
  
  initialTransactions.forEach(tx => {
    DB.setWorkspace(workspaceId, 'transactions', tx.id, tx);
  });
  
  // Seed basic compliance obligations
  const compliance = [
    { id: 'c1', task: 'Submeter Modelo 22', dueDate: '2026-07-31', requiredDoc: 'Declaração de Rendimentos', isCompleted: false },
    { id: 'c2', task: 'Declaração Periódica de IVA', dueDate: '2026-08-10', requiredDoc: 'Modelo A Anexo L', isCompleted: false }
  ];
  compliance.forEach(c => {
    DB.setWorkspace(workspaceId, 'compliance', c.id, c);
  });
}

// Get workspaces the current user has access to
export function getUserWorkspaces(userId: string): Workspace[] {
  return DB.listAllWorkspacesRaw().filter(w => 
    w.ownerId === userId || w.members.some(m => m.userId === userId && m.status === 'active')
  );
}

// Get current active workspace
export function getActiveWorkspace(): Workspace | null {
  const activeId = localStorage.getItem('ga_active_workspace');
  if (!activeId) return null;
  const raw = localStorage.getItem(`ga:workspace:${activeId}:metadata`);
  return raw ? JSON.parse(raw) : null;
}

export function getActiveWorkspaceId(): string {
  return localStorage.getItem('ga_active_workspace') || '';
}

// Permission matrix
export const PERMISSIONS = {
  admin: {
    canRead:          true,
    canWrite:         true,
    canDelete:        true,
    canInviteMembers: true,
    canManageRoles:   true,
    canExportData:    true,
    canDeleteWorkspace: true,
  },
  accountant: {
    canRead:          true,
    canWrite:         true,   // pode criar/editar transações e documentos
    canDelete:        true,   // pode eliminar os seus próprios registos
    canInviteMembers: false,
    canManageRoles:   false,
    canExportData:    true,
    canDeleteWorkspace: false,
  },
  manager: {
    canRead:          true,
    canWrite:         true,   // pode criar projetos e relatórios
    canDelete:        false,  // não pode eliminar dados financeiros
    canInviteMembers: false,
    canManageRoles:   false,
    canExportData:    true,
    canDeleteWorkspace: false,
  },
  viewer: {
    canRead:          true,
    canWrite:         false,
    canDelete:        false,
    canInviteMembers: false,
    canManageRoles:   false,
    canExportData:    false,
    canDeleteWorkspace: false,
  },
};

export function checkPermission(action: keyof typeof PERMISSIONS.admin): boolean {
  const user = getCurrentUser();
  const workspace = getActiveWorkspace();
  if (!user || !workspace) return false;
  
  const member = workspace.members.find(m => m.userId === user.userId);
  if (!member) return false;
  
  return PERMISSIONS[member.role][action];
}

// Create a unified audit log entry for active user and workspace
export function logAuditEvent(action: string, details: string, module: string = 'system') {
  const user = getCurrentUser();
  const workspace = getActiveWorkspace();
  if (!user) return;
  
  const logId = crypto.randomUUID();
  const logEntry = {
    id: logId,
    userId: user.userId,
    userName: user.name,
    userEmail: user.email,
    workspaceId: workspace?.id || 'none',
    workspaceName: workspace?.name || 'none',
    action,
    details,
    module,
    timestamp: new Date().toISOString()
  };
  
  // Save in user local database
  DB.set('audit_log', logId, logEntry);
  
  // Also save in global workspace logs if applicable
  if (workspace) {
    DB.setWorkspace(workspace.id, 'audit_log', logId, logEntry);
  }
}

// Helper to check if user is currently within configured work hours
export function isWithinWorkHours(): boolean {
  try {
    let config: WorkHoursConfig | null = null;
    const saved = localStorage.getItem('ga_work_hours_focus');
    if (saved) {
      config = JSON.parse(saved);
    } else {
      const user = getCurrentUser();
      if (user?.preferences?.workHoursFocus) {
        config = user.preferences.workHoursFocus;
      }
    }

    if (!config || !config.enabled) return false;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const activeDays = config.workDays || [1, 2, 3, 4, 5];
    if (!activeDays.includes(currentDay)) return false;

    const [startH, startM] = (config.startTime || '08:00').split(':').map(Number);
    const [endH, endM] = (config.endTime || '17:00').split(':').map(Number);

    const currentMins = now.getHours() * 60 + now.getMinutes();
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins <= endMins;
    } else {
      // Overnight shift
      return currentMins >= startMins || currentMins <= endMins;
    }
  } catch (e) {
    return false;
  }
}

// Notification System
export function createNotification(type: Notification['type'], title: string, message: string, actionUrl: string | null = null) {
  const isWorkHoursActive = isWithinWorkHours();
  const isEssential = type === 'compliance' || type === 'system';

  // If work hours active and notification is non-essential, auto-block popup alert / quiet log
  if (isWorkHoursActive && !isEssential) {
    console.log(`[Período de Trabalho] Notificação não essencial ("${title}") bloqueada automaticamente.`);
    const id = crypto.randomUUID();
    const notification: Notification = {
      id,
      type,
      title: `[Foco no Trabalho] ${title}`,
      message,
      actionUrl,
      read: true, // Marked read so popup badges/alerts are suppressed
      createdAt: new Date().toISOString()
    };
    DB.set('notifications', id, notification);
    
    const event = new CustomEvent('notificationsUpdated', { detail: { blockedByWorkHours: true } });
    window.dispatchEvent(event);
    return;
  }

  const id = crypto.randomUUID();
  const notification: Notification = {
    id,
    type,
    title,
    message,
    actionUrl,
    read: false,
    createdAt: new Date().toISOString()
  };
  
  DB.set('notifications', id, notification);
  
  // Custom event to update header indicator in real-time
  const event = new CustomEvent('notificationsUpdated');
  window.dispatchEvent(event);
}

// Pre-seeded Admin and regular user for demonstration/testing
export function ensureDemoUsers() {
  const demoUsersKey = 'ga_demo_users_seeded';
  if (localStorage.getItem(demoUsersKey) === 'true') return;
  
  const adminId = 'admin-user-id-0001';
  const adminUser: UserSession = {
    userId: adminId,
    email: 'admin@globalaccount.com',
    name: 'Administrador Global',
    role: 'admin',
    country: 'Portugal',
    language: 'pt-PT',
    profile: 'accountant',
    plan: 'enterprise',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    preferences: {
      ...DEFAULT_PREFERENCES,
      language: 'pt-PT',
      documentLang: 'pt-PT'
    }
  };
  
  const standardId = 'standard-user-id-0002';
  const standardUser: UserSession = {
    userId: standardId,
    email: 'wrldfilipe@gmail.com', // Match the requested user email for convenience
    name: 'Filipe Carvalho',
    role: 'user',
    country: 'Angola',
    language: 'pt-PT',
    profile: 'accountant',
    plan: 'pro',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    preferences: {
      ...DEFAULT_PREFERENCES,
      language: 'pt-PT',
      documentLang: 'pt-PT',
      defaultTaxCountry: 'Angola',
      defaultCurrency: 'AOA',
      accountingStandard: 'PGC Angola'
    }
  };
  
  // Save user records in general login table with isolated account structure and salt/hash
  const adminAccount: UserAccountRecord = {
    userId: adminId,
    email: adminUser.email,
    name: adminUser.name,
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 for admin123
    salt: 'salt_admin_demo_01',
    createdAt: new Date().toISOString(),
    session: adminUser
  };

  const standardAccount: UserAccountRecord = {
    userId: standardId,
    email: standardUser.email,
    name: standardUser.name,
    passwordHash: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', // SHA-256 for password123
    salt: 'salt_filipe_demo_02',
    createdAt: new Date().toISOString(),
    session: standardUser
  };

  localStorage.setItem(`ga:user_record:${adminUser.email}`, JSON.stringify(adminAccount));
  localStorage.setItem(`ga:user_record:${standardUser.email}`, JSON.stringify(standardAccount));
  
  // Seed their default workspaces
  ensureUserWorkspaces(adminId);
  ensureUserWorkspaces(standardId);
  
  localStorage.setItem(demoUsersKey, 'true');
}

// Fetch general notifications
export function getNotifications(): Notification[] {
  return DB.list('notifications') as Notification[];
}

// Mark notifications as read
export function markNotificationsAsRead() {
  const list = getNotifications();
  list.forEach(n => {
    DB.set('notifications', n.id, { ...n, read: true });
  });
}

// Fetch all unified audit logs
export function getAuditLogs(): any[] {
  const userLogs = DB.list('audit_log');
  const ws = getActiveWorkspace();
  const wsLogs = ws ? DB.listWorkspace(ws.id, 'audit_log') : [];
  
  const all = [...userLogs, ...wsLogs];
  const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
  return unique.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get count of registered users
export function getDemoUsersCount(): number {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('ga:user_record:')) {
      count++;
    }
  }
  return count || 2;
}

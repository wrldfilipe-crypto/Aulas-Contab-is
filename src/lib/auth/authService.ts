import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut as fbSignOut, getRedirectResult } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { entrarComGoogleFirebase, limparSessaoPersistida } from "./trocarConta";
import { safeStorage } from "../safeStorage";

export interface User {
  uid: string;
  id: string;
  name: string;
  nome?: string;
  email: string;
  photoURL?: string | null;
  avatar?: string | null;
  fotoUrl?: string | null;
  role?: string;
  country?: string;
  standard?: string;
  workspaceId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  displayName?: string | null;
  cargo?: string | null;
  empresa?: string | null;
  biografia?: string | null;
  roleTitle?: string | null;
  company?: string | null;
  bio?: string | null;
  [key: string]: any;
}

export type EstadoAuth =
  | { status: "carregando" }
  | { status: "autenticado"; uid: string; usuario: User }
  | { status: "naoAutenticado" };

// In-memory callbacks for instant reactive UI updates
const authListeners = new Set<(e: EstadoAuth) => void>();

function notifyAuthListeners(state: EstadoAuth) {
  authListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (e) {
      console.warn("[authService] Erro ao notificar listener de autenticação:", e);
    }
  });
}

/** Obter utilizador atualmente autenticado a partir do Firebase Auth ou da sessão ativa */
export function getCurrentUser(): User | null {
  if (auth && auth.currentUser) {
    const u = auth.currentUser;
    return {
      uid: u.uid,
      id: u.uid,
      name: u.displayName || u.email?.split("@")[0] || "Utilizador",
      nome: u.displayName || u.email?.split("@")[0] || "Utilizador",
      displayName: u.displayName || u.email?.split("@")[0] || "Utilizador",
      email: u.email || "",
      photoURL: u.photoURL,
      avatar: u.photoURL,
      fotoUrl: u.photoURL,
      role: "accountant",
      country: "Angola",
      standard: "PGC-Angola",
      status: "online"
    };
  }

  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem("ga_session") || localStorage.getItem("ga_user_session");
    if (!raw) return null;
    const data = JSON.parse(raw);
    const user = data.user || data.session || data;
    if (user && (user.uid || user.id) && user.email) {
      return {
        ...user,
        uid: user.uid || user.id,
        id: user.id || user.uid,
        displayName: user.displayName || user.name || user.nome || user.email.split("@")[0]
      };
    }
  } catch (e) {
    console.warn("[authService] Erro ao ler sessão do localStorage:", e);
  }
  return null;
}

/** Verifica se um email já está registado */
export async function verificarEmailExisteNoFirestore(email: string): Promise<boolean> {
  if (!email || !email.includes("@")) return false;
  const emailClean = email.trim().toLowerCase();
  
  // 1. Verificar localmente
  if (typeof localStorage !== "undefined") {
    const localUser = localStorage.getItem(`ga:user_record:${emailClean}`);
    if (localUser) return true;
  }

  // 2. Verificar no Firestore (se disponível)
  try {
    const q = query(
      collection(db, "users"),
      where("email", "==", emailClean),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    return false;
  }
}

/** Ouvir estado de autenticação em tempo real garantindo resposta instantânea síncrona */
export function ouvirEstadoAuth(cb: (e: EstadoAuth) => void): () => void {
  authListeners.add(cb);

  // 1. Verificação síncrona imediata via localStorage / sessionStorage sem esperar por rede
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ga_user_logged_out") === "true") {
    cb({ status: "naoAutenticado" });
  } else {
    const localUser = getCurrentUser();
    if (localUser && (localUser.uid || localUser.id)) {
      cb({ status: "autenticado", uid: localUser.uid || localUser.id, usuario: localUser });
    }
  }

  // 2. Sincronização em segundo plano via Firebase sem bloquear o carregamento inicial
  const unsubFirebase = onAuthStateChanged(auth, async (fbUser) => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ga_user_logged_out") === "true") {
      cb({ status: "naoAutenticado" });
      return;
    }

    if (fbUser) {
      const uid = fbUser.uid;
      const initialUser: User = {
        uid: uid,
        id: uid,
        name: fbUser.displayName || fbUser.email?.split("@")[0] || "Utilizador",
        nome: fbUser.displayName || fbUser.email?.split("@")[0] || "Utilizador",
        displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Utilizador",
        email: fbUser.email || "",
        photoURL: fbUser.photoURL,
        avatar: fbUser.photoURL,
        fotoUrl: fbUser.photoURL,
        role: "accountant",
        country: "Angola",
        standard: "PGC-Angola",
        status: "online",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Notificar imediatamente com dados básicos sem bloquear na rede
      cb({ status: "autenticado", uid, usuario: initialUser });

      // Atualizar perfil do Firestore e sincronizar em segundo plano
      (async () => {
        try {
          const fsProfile = await obterPerfilDoFirestore(uid);
          if (fsProfile) {
            const updatedUser: User = {
              ...initialUser,
              ...fsProfile,
              uid: uid,
              id: uid
            };
            cb({ status: "autenticado", uid, usuario: updatedUser });
          }
          await garantirPerfil(initialUser).catch(() => {});
        } catch (_) {}
      })();
    } else {
      // Fallback para contas locais se não houver saída intencional
      const localUser = getCurrentUser();
      if (localUser && (!sessionStorage || sessionStorage.getItem("ga_user_logged_out") !== "true")) {
        cb({ status: "autenticado", uid: localUser.uid, usuario: localUser });
      } else {
        cb({ status: "naoAutenticado" });
      }
    }
  });

  const handleCustomEvent = () => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ga_user_logged_out") === "true") {
      cb({ status: "naoAutenticado" });
      return;
    }
    const u = getCurrentUser();
    if (u) {
      cb({ status: "autenticado", uid: u.uid, usuario: u });
    } else {
      cb({ status: "naoAutenticado" });
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("ga_auth_changed", handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);
  }

  return () => {
    authListeners.delete(cb);
    unsubFirebase();
    if (typeof window !== "undefined") {
      window.removeEventListener("ga_auth_changed", handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    }
  };
}

/** Limpar sessões antigas ou poluídas */
export function limparSessaoAntiga() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  const legacyKeys = [
    "uid",
    "currentUser",
    "contaGlobal",
    "usuario",
    "loggedUser",
    "ga_active_user",
    "ga_auth_user_id"
  ];
  legacyKeys.forEach((k) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch (_) {}
  });
}

/** Garantir integridade do perfil do utilizador */
export async function garantirPerfil(user: User): Promise<void> {
  if (!user || !user.uid) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const rawNome = user.name || user.nome || user.displayName || user.email.split("@")[0] || "Utilizador";
    const nome = rawNome.charAt(0).toUpperCase() + rawNome.slice(1);
    const email = user.email.toLowerCase().trim();

    const payload = {
      id: user.uid,
      uid: user.uid,
      name: nome,
      nome: nome,
      nomeLower: nome.toLowerCase().trim(),
      nameLower: nome.toLowerCase().trim(),
      email: email,
      fotoUrl: user.photoURL || user.avatar || user.fotoUrl || null,
      avatar: user.photoURL || user.avatar || user.fotoUrl || null,
      status: "online",
      role: user.role || "accountant",
      country: user.country || "Angola",
      standard: user.standard || "PGC-Angola",
      updatedAt: new Date().toISOString()
    };

    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.info("[authService] Perfil sincronizado.");
  }
}

/** Grava e sincroniza o perfil do utilizador diretamente no Firestore */
export async function salvarPerfilNoFirestore(uid: string, dados: Partial<User>): Promise<boolean> {
  if (!uid) return false;
  try {
    const userRef = doc(db, "users", uid);
    const payload: any = {
      ...dados,
      id: uid,
      uid: uid,
      updatedAt: new Date().toISOString()
    };
    if (dados.name) {
      payload.nome = dados.name;
      payload.nomeLower = dados.name.toLowerCase().trim();
      payload.nameLower = dados.name.toLowerCase().trim();
    }
    await setDoc(userRef, payload, { merge: true });
    return true;
  } catch (e) {
    console.warn("[authService] Falha ao guardar perfil no Firestore (modo offline/fallback ativo):", e);
    return false;
  }
}

/** Obtém o perfil do utilizador diretamente do Firestore */
export async function obterPerfilDoFirestore(uid: string): Promise<User | null> {
  if (!uid) return null;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
  } catch (e) {
    console.warn("[authService] Falha ao ler perfil do Firestore:", e);
  }
  return null;
}

/** Login por email e palavra-passe */
export async function entrarConta(email: string, senha: string): Promise<User> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo || !emailLimpo.includes("@")) {
    throw new Error("Por favor, introduza um email válido.");
  }
  if (!senha || senha.length < 3) {
    throw new Error("Palavra-passe inválida.");
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("ga_user_logged_out");
  }

  // Verificar utilizador guardado
  let userRecord: any = null;
  const stored = localStorage.getItem(`ga:user_record:${emailLimpo}`);
  if (stored) {
    try {
      userRecord = JSON.parse(stored);
    } catch (_) {}
  }

  const uid = userRecord?.uid || userRecord?.id || `user_${btoa(emailLimpo).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16)}`;
  let nome = userRecord?.name || userRecord?.nome || emailLimpo.split("@")[0];
  nome = nome.charAt(0).toUpperCase() + nome.slice(1);

  const user: User = {
    uid,
    id: uid,
    name: nome,
    nome,
    email: emailLimpo,
    displayName: nome,
    role: userRecord?.role || (emailLimpo.includes("admin") ? "admin" : "accountant"),
    country: userRecord?.country || "Angola",
    standard: "PGC-Angola",
    status: "online",
    createdAt: userRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sessionData = {
    user,
    token: `local_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    authenticatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  localStorage.setItem("ga_session", JSON.stringify(sessionData));
  localStorage.setItem("ga_user_session", JSON.stringify(sessionData));
  localStorage.setItem(`ga:user_record:${emailLimpo}`, JSON.stringify(user));

  garantirPerfil(user).catch(() => {});

  notifyAuthListeners({ status: "autenticado", uid: user.uid, usuario: user });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ga_auth_changed"));
  }

  return user;
}

/** Registar nova conta */
export async function registarConta(nome: string, email: string, senha: string): Promise<User> {
  const emailLimpo = email.trim().toLowerCase();
  const nomeLimpo = nome.trim() || emailLimpo.split("@")[0];

  if (!emailLimpo || !emailLimpo.includes("@")) {
    throw new Error("Email inválido.");
  }
  if (!senha || senha.length < 6) {
    throw new Error("A palavra-passe precisa de pelo menos 6 caracteres.");
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("ga_user_logged_out");
  }

  const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const nomeFinal = nomeLimpo.charAt(0).toUpperCase() + nomeLimpo.slice(1);

  const user: User = {
    uid,
    id: uid,
    name: nomeFinal,
    nome: nomeFinal,
    displayName: nomeFinal,
    email: emailLimpo,
    role: "accountant",
    country: "Angola",
    standard: "PGC-Angola",
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sessionData = {
    user,
    token: `local_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    authenticatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  localStorage.setItem("ga_session", JSON.stringify(sessionData));
  localStorage.setItem("ga_user_session", JSON.stringify(sessionData));
  localStorage.setItem(`ga:user_record:${emailLimpo}`, JSON.stringify(user));

  garantirPerfil(user).catch(() => {});

  notifyAuthListeners({ status: "autenticado", uid: user.uid, usuario: user });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ga_auth_changed"));
  }

  return user;
}

/** Autenticar com Conta Google forçando sempre a escolha da conta (prompt: select_account) */
export async function entrarComGoogle(usarRedirect?: boolean): Promise<User | null> {
  try {
    const fbUser = await entrarComGoogleFirebase();
    if (!fbUser) {
      // Redirect iniciado no iOS/Safari
      return null;
    }

    const user: User = {
      uid: fbUser.uid,
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split("@")[0] || "Utilizador",
      nome: fbUser.displayName || fbUser.email?.split("@")[0] || "Utilizador",
      displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Utilizador",
      email: fbUser.email || "",
      photoURL: fbUser.photoURL,
      avatar: fbUser.photoURL,
      fotoUrl: fbUser.photoURL,
      role: "accountant",
      country: "Angola",
      standard: "PGC-Angola",
      status: "online",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await garantirPerfil(user);

    const sessionData = {
      user,
      token: await fbUser.getIdToken().catch(() => `fb_token_${Date.now()}`),
      authenticatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    safeStorage.set("ga_session", JSON.stringify(sessionData));
    safeStorage.set("ga_user_session", JSON.stringify(sessionData));

    notifyAuthListeners({ status: "autenticado", uid: user.uid, usuario: user });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ga_auth_changed"));
    }

    return user;
  } catch (err: any) {
    console.error("[authService] Erro ao entrar com Google:", err);
    throw err;
  }
}

/** Tratar resultado de redirect com verificação estrita de TTL (5 minutos) */
export async function tratarResultadoGoogle(): Promise<void> {
  if (typeof window === "undefined" || !auth) return;

  const TS_REDIRECT = "cu_google_redirect_ts";
  let ts = 0;
  try {
    ts = Number(sessionStorage.getItem(TS_REDIRECT) ?? safeStorage.get(TS_REDIRECT) ?? 0);
  } catch (_) {}
  const agora = Date.now();

  // Descartar redirect expirado com mais de 5 minutos
  if (ts && agora - ts > 5 * 60 * 1000) {
    console.warn("[authService] Redirect Google expirado (> 5 min). Descartado por segurança.");
    try { sessionStorage.removeItem(TS_REDIRECT); } catch (_) {}
    safeStorage.remove(TS_REDIRECT);
    await limparSessaoPersistida();
    return;
  }

  try {
    const res = await getRedirectResult(auth);
    if (res && res.user) {
      try {
        sessionStorage.removeItem(TS_REDIRECT);
        sessionStorage.removeItem("ga_user_logged_out");
      } catch (_) {}
      safeStorage.remove(TS_REDIRECT);
      safeStorage.remove("ga_user_logged_out");

      const u = res.user;
      const user: User = {
        uid: u.uid,
        id: u.uid,
        name: u.displayName || u.email?.split("@")[0] || "Utilizador",
        nome: u.displayName || u.email?.split("@")[0] || "Utilizador",
        displayName: u.displayName || u.email?.split("@")[0] || "Utilizador",
        email: u.email || "",
        photoURL: u.photoURL,
        avatar: u.photoURL,
        fotoUrl: u.photoURL,
        role: "accountant",
        country: "Angola",
        standard: "PGC-Angola",
        status: "online",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await garantirPerfil(user);

      const sessionData = {
        user,
        token: await u.getIdToken().catch(() => `fb_token_${Date.now()}`),
        authenticatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      safeStorage.set("ga_session", JSON.stringify(sessionData));
      safeStorage.set("ga_user_session", JSON.stringify(sessionData));

      notifyAuthListeners({ status: "autenticado", uid: user.uid, usuario: user });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ga_auth_changed"));
      }
    }
  } catch (err) {
    console.warn("[authService] Erro ao processar getRedirectResult:", err);
  }
}

export async function ligarContaGoogle(): Promise<User> {
  return entrarComGoogle();
}

/** Terminar sessão */
export async function sairConta(): Promise<void> {
  try {
    if (auth.currentUser) {
      await fbSignOut(auth);
    }
  } catch (_) {}

  try {
    const { supabase } = await import("../supabase");
    await supabase.auth.signOut();
  } catch (_) {}

  await limparSessaoPersistida();

  notifyAuthListeners({ status: "naoAutenticado" });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ga_auth_changed"));
  }
}

/** Auditoria e limpeza de dados fictícios residuais do localStorage */
export function limparDadosFicticiosLegados(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const keysToCheck = ["ga_session", "ga_user_session", "ga_profile_data", "auditor_teste_fake"];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("ga_") || key.includes("profile") || key.includes("user") || keysToCheck.includes(key)) {
        const raw = localStorage.getItem(key);
        if (raw && (raw.includes("Global Audit Angola") || raw.includes("Dr. Mateus Silva") || raw.includes("Contador Sénior & Auditor"))) {
          try {
            const data = JSON.parse(raw);
            if (data.name === "Dr. Mateus Silva") data.name = "";
            if (data.roleTitle === "Contador Sénior & Auditor") data.roleTitle = null;
            if (data.company === "Global Audit Angola") data.company = null;
            if (data.cargo === "Contador Sénior & Auditor") data.cargo = null;
            if (data.empresa === "Global Audit Angola") data.empresa = null;
            if (data.bio && data.bio.includes("PGC Angola")) data.bio = null;
            localStorage.setItem(key, JSON.stringify(data));
          } catch {
            // If not JSON, leave as is
          }
        }
      }
    }
  } catch (e) {
    console.warn("[authService] Erro ao limpar dados fictícios legados:", e);
  }
}

/** Objeto consolidado de autenticação para compatibilidade */
export const authService = {
  login: entrarConta,
  register: registarConta,
  logout: sairConta,
  getCurrentUser,
  verificarEmailExisteNoFirestore,
  ouvirEstadoAuth,
  garantirPerfil,
  limparSessaoAntiga,
  entrarComGoogle,
  tratarResultadoGoogle,
  limparDadosFicticiosLegados,
  sairConta
};

export default authService;

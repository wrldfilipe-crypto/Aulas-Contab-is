import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  updateProfile,
  linkWithPopup,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, serverTimestamp } from "firebase/firestore";

const providerGoogle = new GoogleAuthProvider();
providerGoogle.setCustomParameters({
  prompt: 'select_account'
});

export type EstadoAuth =
  | { status: "carregando" }
  | { status: "autenticado"; uid: string; usuario: User }
  | { status: "naoAutenticado" };

/** Verifica se um email já está registado na base de dados Firestore */
export async function verificarEmailExisteNoFirestore(email: string): Promise<boolean> {
  if (!email || !email.includes("@")) return false;
  try {
    const q = query(
      collection(db, "users"),
      where("email", "==", email.trim().toLowerCase()),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    console.warn("[authService] Erro ao verificar existência de email:", e);
    return false;
  }
}

export function ouvirEstadoAuth(cb: (e: EstadoAuth) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await garantirPerfil(user);
      } catch (e) {
        console.warn("[authService:ouvirEstadoAuth] Erro ao garantir perfil:", e);
      }
      cb({ status: "autenticado", uid: user.uid, usuario: user });
    } else {
      cb({ status: "naoAutenticado" });
    }
  });
}

/* ---------- Limpeza de estado antigo envenenado (bug das 3 contas) ---------- */
export function limparSessaoAntiga() {
  if (typeof window === "undefined") return;
  const legacyKeys = [
    "uid",
    "currentUser",
    "contaGlobal",
    "usuario",
    "loggedUser",
    "ga_user_session",
    "ga_active_user",
    "ga_auth_user_id"
  ];
  legacyKeys.forEach((k) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch (_) {}
  });

  // Limpeza de registos antigos hardcoded de demo por email
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("ga:user_record:") || key.startsWith("ga:persistent_uid:"))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}

  // Se o app antigo usava IndexedDB com chave fixa, apaga-a também:
  try {
    if (typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase("conta-global-sessao");
    }
  } catch (_) {}
}

/* ---------- Perfil idempotente (multi-dispositivo) ---------- */
export async function garantirPerfil(user: User) {
  if (!user || !user.uid) return;
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const rawNome = user.displayName?.trim() || (user.email ?? "").split("@")[0] || "Utilizador";
      const nome = rawNome.charAt(0).toUpperCase() + rawNome.slice(1);
      const email = (user.email ?? "").toLowerCase().trim();
      const payload = {
        id: user.uid,
        uid: user.uid,
        name: nome,
        nome: nome,
        nomeLower: nome.toLowerCase().trim(),
        nameLower: nome.toLowerCase().trim(),
        email: email,
        fotoUrl: user.photoURL ?? null,
        avatar: user.photoURL ?? null,
        status: "online",
        criadoEm: serverTimestamp(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(ref, payload, { merge: true });
      console.log(`[authService] Novo perfil criado em users/${user.uid} para ${nome}`);
    } else {
      // Se já existe, apenas atualiza foto se a do Google for mais recente e status online
      const existingData = snap.data();
      const updates: any = {
        id: user.uid,
        uid: user.uid,
        status: "online",
        updatedAt: new Date().toISOString()
      };
      if (user.photoURL && !existingData.fotoUrl && !existingData.avatar) {
        updates.fotoUrl = user.photoURL;
        updates.avatar = user.photoURL;
      }
      if (!existingData.nomeLower && existingData.nome) {
        updates.nomeLower = existingData.nome.toLowerCase().trim();
      }
      await setDoc(ref, updates, { merge: true });
    }
  } catch (err) {
    console.warn("[authService:garantirPerfil] Aviso ao sincronizar perfil:", err);
  }
}

/* ---------- Email / palavra-passe ---------- */
export async function registarConta(nome: string, email: string, senha: string): Promise<User> {
  const emailLimpo = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
  await updateProfile(cred.user, { displayName: nome.trim() });
  await garantirPerfil(cred.user);
  return cred.user;
}

export async function entrarConta(email: string, senha: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
  await garantirPerfil(cred.user);
  return cred.user;
}

/* ---------- Conta Google ---------- */

/** Desktop: popup. Mobile PWA: redirect (popups costumam ser bloqueados). */
export async function entrarComGoogle(usarRedirect: boolean = false): Promise<User> {
  const ehMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (usarRedirect || ehMobile) {
    await signInWithRedirect(auth, providerGoogle);
    // o fluxo volta por tratarResultadoGoogle() no arranque do app
    throw new Error("redirect-pendente");
  }
  const resultado = await signInWithPopup(auth, providerGoogle);
  await garantirPerfil(resultado.user);
  return resultado.user;
}

/** Chamar UMA vez no arranque do app (fluxo redirect em mobile). */
export async function tratarResultadoGoogle(): Promise<void> {
  try {
    const resultado = await getRedirectResult(auth);
    if (resultado?.user) {
      await garantirPerfil(resultado.user);
      console.log("[authService] Login com Google via redirect recuperado com sucesso.");
    }
  } catch (e: any) {
    if (e?.code !== "auth/null-user") {
      console.warn("[authService:tratarResultadoGoogle] Info redirect:", e);
    }
  }
}

/* Ligar conta Google a uma conta email/password já existente */
export async function ligarContaGoogle(): Promise<User> {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error("Sem sessão para ligar.");
  const resultado = await linkWithPopup(usuario, providerGoogle);
  await garantirPerfil(resultado.user);
  return resultado.user;
}

export async function sairConta() {
  await signOut(auth);
}

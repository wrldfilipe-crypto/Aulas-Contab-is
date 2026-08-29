/* Procedimento completo de saída + limpeza de sessão persistida.
   Resolve: "entra com a conta do outro usuário" em aparelhos partilhados. */

import { GoogleAuthProvider, signInWithPopup, getAuth, signOut } from "firebase/auth";
import { auth } from "../../firebase";

export async function limparSessaoPersistida(): Promise<void> {
  // 1. localStorage: chaves de sessão conhecidas (Firebase, Supabase e locais)
  if (typeof localStorage !== "undefined") {
    const chavesParaRemover: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith("firebase:authUser") ||
          k.startsWith("firebase:host") ||
          /^sb-.*-auth-token/.test(k) ||
          k.startsWith("cu-auth") ||
          k === "ga_session" ||
          k === "ga_user_session" ||
          k === "ga_user_uid" ||
          k.startsWith("ga_uid_") ||
          k === "currentUser" ||
          k === "loggedUser" ||
          k === "ga_active_user")
      ) {
        chavesParaRemover.push(k);
      }
    }
    chavesParaRemover.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  }

  // 2. IndexedDB do Firebase Auth (guarda a sessão em alguns navegadores)
  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve) => {
      try {
        const req = indexedDB.deleteDatabase("firebaseLocalStorageDb");
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      } catch (_) {
        resolve();
      }
    });
  }

  // 3. sessionStorage (estado transitório do app antigo)
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear();
    // Marca saída intencional para evitar reautenticação silenciosa
    sessionStorage.setItem("ga_user_logged_out", "true");
  }
}

export async function trocarDeConta(): Promise<void> {
  // signOut no provedor activo — falha silenciosa se já não há sessão
  try {
    const fbAuth = auth || getAuth();
    if (fbAuth.currentUser) {
      await signOut(fbAuth);
    }
  } catch {
    /* sem Firebase activo */
  }

  try {
    const { supabase } = await import("../supabase");
    await supabase.auth.signOut();
  } catch {
    /* sem Supabase activo */
  }

  await limparSessaoPersistida();

  // Redireciona limpo para a raiz
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

export async function entrarComGoogleFirebase(): Promise<any> {
  const fbAuth = auth || getAuth();

  // Sessão antiga presente? limpa ANTES de abrir o popup
  if (fbAuth.currentUser) {
    try {
      await signOut(fbAuth);
    } catch (_) {}
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" }); // ← OBRIGATÓRIO: Força sempre o seletor de contas do Google

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("ga_user_logged_out");
  }

  const resultado = await signInWithPopup(fbAuth, provider);
  return resultado.user;
}

export async function entrarComGoogleSupabase(): Promise<void> {
  try {
    const { supabase } = await import("../supabase");
    await supabase.auth.signOut().catch(() => {});
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("ga_user_logged_out");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : "/",
        queryParams: { prompt: "select_account" }, // ← OBRIGATÓRIO
      },
    });
    if (error) throw error;
  } catch (err) {
    console.error("[trocarConta] Erro ao entrar com Google Supabase:", err);
    throw err;
  }
}

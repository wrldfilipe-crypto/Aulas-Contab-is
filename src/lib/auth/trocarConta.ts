/* Procedimento completo de saída + limpeza de sessão persistida.
   Resolve: "entra com a conta do outro usuário" em aparelhos partilhados. */

import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getAuth, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { safeStorage } from "../safeStorage";

export async function limparSessaoPersistida(): Promise<void> {
  // 1. localStorage: chaves de sessão conhecidas (Firebase, Supabase e locais)
  if (typeof window !== "undefined") {
    const chavesParaRemover = [
      "ga_session",
      "ga_user_session",
      "ga_user_uid",
      "currentUser",
      "loggedUser",
      "ga_active_user",
      "cu_google_redirect_ts"
    ];
    
    try {
      if (typeof localStorage !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (
            k &&
            (k.startsWith("firebase:authUser") ||
              k.startsWith("firebase:host") ||
              /^sb-.*-auth-token/.test(k) ||
              k.startsWith("cu-auth") ||
              k.startsWith("ga_uid_"))
          ) {
            chavesParaRemover.push(k);
          }
        }
      }
    } catch (_) {}

    chavesParaRemover.forEach((k) => {
      safeStorage.remove(k);
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
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
      // Marca saída intencional para evitar reautenticação silenciosa
      sessionStorage.setItem("ga_user_logged_out", "true");
    }
  } catch (_) {}
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

  // Sessão antiga presente? limpa ANTES de abrir o popup ou redirect
  if (fbAuth.currentUser) {
    try {
      await signOut(fbAuth);
    } catch (_) {}
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" }); // ← OBRIGATÓRIO: Força sempre o seletor de contas do Google

  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("ga_user_logged_out");
    }
  } catch (_) {}

  const isIOS = typeof navigator !== "undefined" && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );

  const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isIOS || isSafari) {
    // iOS e Safari: usar redirect em vez de popup para evitar bloqueio do browser
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("cu_google_redirect_ts", Date.now().toString());
      }
    } catch (_) {}
    await signInWithRedirect(fbAuth, provider);
    return null;
  } else {
    // Outros browsers: usar popup
    const resultado = await signInWithPopup(fbAuth, provider);
    return resultado.user;
  }
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

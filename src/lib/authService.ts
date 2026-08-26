import { supabase, isSupabaseConfigured } from "./supabase";
import type { User } from "@supabase/supabase-js";

export type EstadoAuth =
  | { status: "carregando" }
  | { status: "autenticado"; uid: string; user: User }
  | { status: "naoAutenticado" };

export function ouvirEstadoAuth(cb: (e: EstadoAuth) => void) {
  if (!isSupabaseConfigured) {
    // Check if there is local session fallback
    try {
      const local = localStorage.getItem('ga_session');
      if (local) {
        const u = JSON.parse(local);
        if (u?.userId || u?.uid || u?.id) {
          cb({ 
            status: "autenticado", 
            uid: u.userId || u.uid || u.id, 
            user: { id: u.userId || u.uid || u.id, email: u.email, user_metadata: { full_name: u.name } } as any 
          });
          return () => {};
        }
      }
    } catch (_) {}
  }

  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await garantirPerfil(session.user);
      cb({ status: "autenticado", uid: session.user.id, user: session.user });
    } else {
      cb({ status: "naoAutenticado" });
    }
  });

  // Estado inicial
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      await garantirPerfil(session.user);
      cb({ status: "autenticado", uid: session.user.id, user: session.user });
    } else {
      cb({ status: "naoAutenticado" });
    }
  }).catch(() => {
    cb({ status: "naoAutenticado" });
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

/* ---------- Garantir perfil (idempotente) ---------- */
export async function garantirPerfil(user: User) {
  if (!isSupabaseConfigured || !user?.id) return;
  try {
    const { data } = await supabase.from("profiles").select("uid").eq("uid", user.id).maybeSingle();
    if (!data) {
      const nome = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Utilizador";
      await supabase.from("profiles").insert({
        uid: user.id,
        nome,
        email: user.email?.toLowerCase() ?? "",
        foto_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      });
    }
  } catch (e) {
    console.warn("[Supabase Auth] Aviso ao garantir perfil:", e);
  }
}

/* ---------- Email / Password ---------- */
export async function registarConta(nome: string, email: string, senha: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: senha,
    options: { data: { full_name: nome.trim() } },
  });
  if (error) throw error;
  if (data.user) await garantirPerfil(data.user);
  return data;
}

export async function entrarConta(email: string, senha: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });
  if (error) throw error;
  if (data.user) await garantirPerfil(data.user);
  return data;
}

/* ---------- Conta Google ---------- */
export async function entrarComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function sairConta() {
  await supabase.auth.signOut();
}

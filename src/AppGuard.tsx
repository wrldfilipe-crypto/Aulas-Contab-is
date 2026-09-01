import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ouvirEstadoAuth, EstadoAuth, limparSessaoAntiga, tratarResultadoGoogle, getCurrentUser } from "./lib/auth/authService";
import { LoginPage } from "./pages/Login/LoginPage";
import { Loader2, Building2, ShieldCheck } from "lucide-react";

export interface AppGuardProps {
  children: React.ReactNode | ((authInfo: { uid: string; usuario: any }) => React.ReactNode);
}

export function AppGuard({ children }: AppGuardProps) {
  // Verificação síncrona imediata sem bloquear no arranque
  const [estado, setEstado] = useState<EstadoAuth>(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ga_user_logged_out") === "true") {
      return { status: "naoAutenticado" };
    }
    const u = getCurrentUser();
    if (u && (u.uid || u.id)) {
      return { status: "autenticado", uid: u.uid || u.id, usuario: u };
    }
    return { status: "carregando" };
  });

  useEffect(() => {
    // Operações em segundo plano não bloqueantes
    limparSessaoAntiga();
    tratarResultadoGoogle().catch(() => {});

    // Suporte dinâmico para teclado virtual no Safari iOS (evita quebrar inputs fixos)
    if (typeof window !== "undefined" && window.visualViewport) {
      const handleResize = () => {
        const vv = window.visualViewport;
        if (!vv) return;
        const keyboardHeight = window.innerHeight - vv.height;
        document.documentElement.style.setProperty(
          "--keyboard-height",
          `${Math.max(0, keyboardHeight)}px`
        );
      };

      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }

    // Timeout de segurança ultra-rápido (500ms max) para o ecrã de carregamento
    // Se a sessão não for resolvida em 500ms, avança imediatamente para login sem bloquear o utilizador
    const timeoutId = setTimeout(() => {
      setEstado((atual) => (atual.status === "carregando" ? { status: "naoAutenticado" } : atual));
    }, 500);

    const unsub = ouvirEstadoAuth((e) => {
      setEstado(e);
    });

    return () => {
      clearTimeout(timeoutId);
      unsub();
      if (typeof window !== "undefined" && window.visualViewport) {
        // cleanup listeners
      }
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {estado.status === "carregando" && (
        <motion.div
          key="guard-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="min-h-[100dvh] w-full bg-[#F0F4FA] dark:bg-[#070D18] flex flex-col items-center justify-center p-4 text-center"
          id="app-guard-loading"
        >
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1B3A6B] to-[#2E5FA3] text-white flex items-center justify-center shadow-xl shadow-blue-900/20">
              <Building2 className="w-8 h-8 text-blue-100" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-[#070D18] flex items-center justify-center text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200 font-bold text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-[#1B3A6B] dark:text-blue-400" />
            <span>A carregar sessão segura…</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
            A sincronizar ambiente multi-utilizador e integridade do PGC Angola
          </p>
        </motion.div>
      )}

      {estado.status === "naoAutenticado" && (
        <motion.div
          key="guard-login"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="min-h-[100dvh] w-full"
        >
          <LoginPage />
        </motion.div>
      )}

      {estado.status === "autenticado" && (
        <motion.div
          key="guard-dashboard"
          initial={{ opacity: 0, scale: 0.995 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-h-screen w-full"
        >
          {typeof children === "function" ? children({ uid: estado.uid, usuario: estado.usuario }) : children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppGuard;

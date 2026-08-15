import React, { useState } from "react";
import {
  registarConta,
  entrarConta,
  entrarComGoogle,
  verificarEmailExisteNoFirestore,
} from "../../lib/auth/authService";
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Link2,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "registar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [sugestaoLink, setSugestaoLink] = useState<{ email: string } | null>(null);

  const submeter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErro("");
    setSugestaoLink(null);

    if (modo === "registar") {
      if (!nome.trim()) {
        setErro("Por favor, introduza o seu nome completo.");
        return;
      }
      if (senha !== confirma) {
        setErro("As palavras-passe não coincidem.");
        return;
      }
    }

    if (!email.trim() || !email.includes("@")) {
      setErro("Por favor, introduza um endereço de email válido.");
      return;
    }

    if (senha.length < 6) {
      setErro("A palavra-passe precisa de pelo menos 6 caracteres.");
      return;
    }

    setAEnviar(true);
    try {
      if (modo === "registar") {
        await registarConta(nome, email, senha);
      } else {
        await entrarConta(email, senha);
      }
      // onAuthStateChanged (AppGuard) trata da navegação automaticamente
    } catch (e: any) {
      const c = e?.code ?? "";
      if (c === "auth/email-already-in-use") {
        setErro("Já existe uma conta com esse email. Usa “Entrar”.");
      } else if (c === "auth/invalid-credential" || c === "auth/user-not-found" || c === "auth/wrong-password") {
        setErro("Email ou palavra-passe incorretos.");
      } else if (c === "auth/weak-password") {
        setErro("Palavra-passe demasiado fraca (mínimo 6 caracteres).");
      } else if (c === "auth/network-request-failed") {
        setErro("Erro de ligação à rede. Verifique a sua ligação à Internet.");
      } else {
        setErro(`Erro: ${e?.message ?? "desconhecido"}`);
      }
    } finally {
      setAEnviar(false);
    }
  };

  const entrarGoogle = async () => {
    setErro("");
    setSugestaoLink(null);
    setAEnviar(true);
    try {
      await entrarComGoogle(false);
    } catch (e: any) {
      if (e?.code === "auth/popup-closed-by-user") {
        // silencioso
        return;
      }
      if (e?.code === "auth/account-exists-with-different-credential") {
        const emailAlvo = e?.customData?.email || email;
        setSugestaoLink({ email: emailAlvo });
        setErro(`Já existe uma conta registada com o email "${emailAlvo}". Inicie sessão com a sua palavra-passe para associar a conta Google.`);
        setModo("entrar");
        if (emailAlvo) setEmail(emailAlvo);
      } else if (e?.message === "redirect-pendente") {
        return; // vai voltar por tratarResultadoGoogle()
      } else {
        setErro(`Erro no Google: ${e?.message ?? "desconhecido"}`);
      }
    } finally {
      setAEnviar(false);
    }
  };

  const handleEmailBlur = async () => {
    if (email && email.includes("@") && modo === "registar") {
      const existe = await verificarEmailExisteNoFirestore(email);
      if (existe) {
        setSugestaoLink({ email });
        setErro(`O email "${email}" já tem uma conta registada. Sugerimos que use "Entrar" com a sua palavra-passe ou Google.`);
      }
    }
  };

  return (
    <div 
      className="min-h-screen w-full bg-[#F0F4FA] dark:bg-[#070D18] flex items-center justify-center p-4 sm:p-6"
      id="login-page-container"
    >
      <div className="w-full max-w-[440px] bg-white dark:bg-[#0A1628] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 relative">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-900 dark:bg-[#1B3A6B] text-white shadow-md mb-3">
            <Building2 className="w-6 h-6 text-blue-200" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Contabilidade Unificada
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global Account — cada utilizador tem a sua conta protegida
          </p>
        </div>

        {/* Suggestion / Link Account Banner */}
        {sugestaoLink && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200"
          >
            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Conta Existente Detetada</p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                O email <strong>{sugestaoLink.email}</strong> já está registado. Introduza a sua palavra-passe para iniciar sessão e consolidar o acesso de forma segura.
              </p>
            </div>
          </motion.div>
        )}

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={entrarGoogle}
          disabled={aEnviar}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          id="btn-google-login"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar com Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white dark:bg-[#0A1628] px-3 text-slate-400 font-semibold">
              ou com email
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setModo("entrar");
              setErro("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              modo === "entrar"
                ? "bg-white dark:bg-[#1B3A6B] text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
            id="tab-modo-entrar"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("registar");
              setErro("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              modo === "registar"
                ? "bg-white dark:bg-[#1B3A6B] text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
            id="tab-modo-registar"
          >
            Criar conta
          </button>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={submeter} className="space-y-3">
          {modo === "registar" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Ana Silva"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 transition-all"
                  id="input-nome-registro"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Endereço de email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                type="email"
                placeholder="seu.email@empresa.com"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 transition-all"
                id="input-email"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Palavra-passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 transition-all"
                id="input-senha"
              />
            </div>
          </div>

          {modo === "registar" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirmar palavra-passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                  type="password"
                  placeholder="Repita a palavra-passe"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 transition-all"
                  id="input-confirma-senha"
                />
              </div>
            </div>
          )}

          {/* Error display */}
          {erro && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={aEnviar}
            className="w-full mt-2 py-3 px-4 bg-blue-900 dark:bg-[#1B3A6B] hover:bg-blue-800 dark:hover:bg-[#254d8c] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-submeter-auth"
          >
            {aEnviar ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>A processar…</span>
              </>
            ) : (
              <>
                <span>{modo === "registar" ? "Criar conta" : "Entrar"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & Multi-User Notice */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 text-center justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Cada utilizador entra na sua própria conta. Dados isolados e protegidos.</span>
        </div>
      </div>
    </div>
  );
}

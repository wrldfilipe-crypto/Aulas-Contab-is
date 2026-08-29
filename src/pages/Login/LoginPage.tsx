import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import AppLogo from "../../components/AppLogo";
import {
  entrarComGoogle,
  entrarConta,
  registarConta,
  verificarEmailExisteNoFirestore,
} from "../../lib/auth/authService";

type AuthMode = "entrar" | "registar";

export function LoginPage() {
  const [modo, setModo] = useState<AuthMode>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [sugestaoLink, setSugestaoLink] = useState<{ email: string } | null>(null);

  const alterarModo = (novoModo: AuthMode) => {
    setModo(novoModo);
    setErro("");
    setSugestaoLink(null);
  };

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
    } catch (e: any) {
      const c = e?.code ?? "";
      if (c === "auth/email-already-in-use") {
        setErro("Já existe uma conta com esse email. Use “Entrar”.");
      } else if (
        c === "auth/invalid-credential" ||
        c === "auth/user-not-found" ||
        c === "auth/wrong-password"
      ) {
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
      if (e?.code === "auth/popup-closed-by-user" || e?.message === "redirect-pendente") {
        return;
      }
      if (e?.code === "auth/account-exists-with-different-credential") {
        const emailAlvo = e?.customData?.email || email;
        setSugestaoLink({ email: emailAlvo });
        setErro(
          `Já existe uma conta registada com o email "${emailAlvo}". Inicie sessão com a sua palavra-passe para associar a conta Google.`,
        );
        alterarModo("entrar");
        if (emailAlvo) setEmail(emailAlvo);
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
        setErro(
          `O email "${email}" já tem uma conta registada. Sugerimos que use "Entrar" com a sua palavra-passe ou Google.`,
        );
      }
    }
  };

  return (
    <main id="login-page-container" className="relative min-h-[100dvh] w-full overflow-hidden bg-[#050914] text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center justify-center p-3 sm:p-6 lg:p-10">
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr]"
        >
          <div className="relative hidden min-h-[650px] overflow-hidden border-r border-white/10 bg-gradient-to-br from-[#102858] via-[#0b1730] to-[#070b17] p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 top-24 h-64 w-64 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border border-violet-300/10 bg-violet-500/10 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-10">
                <AppLogo isExpanded={true} size="lg" />
              </div>
              <div className="max-w-sm">
                <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                  <Sparkles className="h-4 w-4" /> A sua conta, em qualquer lugar
                </p>
                <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white xl:text-5xl">
                  Organize o seu conhecimento financeiro.
                </h1>
                <p className="mt-5 max-w-xs text-sm leading-6 text-slate-300/80">
                  Um espaço seguro para aprender, registar ideias e acompanhar o seu trabalho contabilístico.
                </p>
              </div>
            </div>
            <div className="relative z-10 rounded-2xl border border-white/10 bg-black/15 p-4 text-xs text-slate-300/75">
              <div className="mb-3 flex items-center gap-2 text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <span className="font-bold">Dados protegidos e sincronizados</span>
              </div>
              <p>O seu perfil e as suas notas acompanham-no entre dispositivos.</p>
            </div>
          </div>

          <div className="relative bg-[#091426]/95 p-5 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <AppLogo isExpanded={true} size="md" />
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Seguro</span>
            </div>

            <div className="mx-auto max-w-md">
              <div className="mb-7">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Bem-vindo</p>
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {modo === "entrar" ? "Entre na sua conta" : "Crie a sua conta"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {modo === "entrar" ? "Continue exatamente de onde ficou." : "Comece a construir o seu espaço pessoal."}
                </p>
              </div>

              {sugestaoLink && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-start gap-2.5 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3.5 text-xs text-blue-100"
                >
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                  <div>
                    <p className="font-bold">Conta existente detetada</p>
                    <p className="mt-1 text-blue-100/70">Use “Entrar” para aceder à sua conta e manter os dados sincronizados.</p>
                  </div>
                </motion.div>
              )}

              <button
                type="button"
                onClick={entrarGoogle}
                disabled={aEnviar}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                id="btn-google-login"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-blue-600">G</span>
                Continuar com Google
              </button>

              <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <span className="h-px flex-1 bg-white/10" /> ou continue com email <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="relative mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                <motion.div
                  layoutId="auth-mode-pill"
                  className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20"
                  animate={{ left: modo === "entrar" ? 4 : "50%" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
                <button type="button" onClick={() => alterarModo("entrar")} className="relative z-10 rounded-xl py-2.5 text-xs font-black text-white cursor-pointer" id="tab-modo-entrar">Entrar</button>
                <button type="button" onClick={() => alterarModo("registar")} className="relative z-10 rounded-xl py-2.5 text-xs font-black text-white/70 cursor-pointer" id="tab-modo-registar">Criar conta</button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.form
                  key={modo}
                  initial={{ opacity: 0, x: modo === "entrar" ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: modo === "entrar" ? 12 : -12 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={submeter}
                  className="space-y-4"
                >
                  {modo === "registar" && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-slate-300">Nome completo</span>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Ana Silva" className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:bg-white/[0.09] focus:ring-2 focus:ring-blue-400/10" id="input-nome-registro" />
                      </div>
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-slate-300">Endereço de email</span>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={handleEmailBlur} type="email" placeholder="seu.email@empresa.com" required className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:bg-white/[0.09] focus:ring-2 focus:ring-blue-400/10" id="input-email" />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-slate-300">Palavra-passe</span>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input value={senha} onChange={(e) => setSenha(e.target.value)} type={mostrarSenha ? "text" : "password"} placeholder="Mínimo 6 caracteres" required className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:bg-white/[0.09] focus:ring-2 focus:ring-blue-400/10" id="input-senha" />
                      <button type="button" onClick={() => setMostrarSenha((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white" aria-label={mostrarSenha ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}>
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  {modo === "registar" && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-slate-300">Confirmar palavra-passe</span>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input value={confirma} onChange={(e) => setConfirma(e.target.value)} type={mostrarConfirmacao ? "text" : "password"} placeholder="Repita a palavra-passe" required className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/70 focus:bg-white/[0.09] focus:ring-2 focus:ring-blue-400/10" id="input-confirma-senha" />
                        <button type="button" onClick={() => setMostrarConfirmacao((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white" aria-label={mostrarConfirmacao ? "Ocultar confirmação" : "Mostrar confirmação"}>
                          {mostrarConfirmacao ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>
                  )}

                  {erro && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{erro}</span>
                    </motion.div>
                  )}

                  <button type="submit" disabled={aEnviar} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer" id="btn-submeter-auth">
                    {aEnviar ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{modo === "registar" ? "Criar conta" : "Entrar"}</span>}
                    {!aEnviar && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}
                  </button>
                </motion.form>
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-center text-[11px] text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Conta protegida e sincronizada entre dispositivos</span>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

export default LoginPage;

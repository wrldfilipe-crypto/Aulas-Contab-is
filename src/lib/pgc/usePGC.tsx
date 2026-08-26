import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { carregarPlano, ingestarDocumentoOficial } from "./pgcRag";
import { validarConta, pesquisarConta } from "./pgcValidator";
import type { PlanoContas, NormaSelecionada } from "./types";

interface PGCCtx {
  plano: PlanoContas | null;
  norma: NormaSelecionada;
  setNorma: (n: NormaSelecionada) => void;
  validarConta: (codigo: string) => ReturnType<typeof validarConta>;
  pesquisarConta: (termo: string, limite?: number) => ReturnType<typeof pesquisarConta>;
  ingestar: (file: File) => Promise<{ plano: PlanoContas; segmentos: number }>;
}

const Ctx = createContext<PGCCtx | null>(null);

export function PGCProvider({ children }: { children: ReactNode }) {
  const [plano, setPlano] = useState<PlanoContas | null>(null);
  const [norma, setNorma] = useState<NormaSelecionada>("PGC_ANGOLA_82_2001");

  useEffect(() => {
    carregarPlano().then(setPlano).catch((err) => {
      console.warn("Plano local carregado por fallback:", err?.message || err);
    });
  }, []);

  const ingestar = async (file: File) => {
    const r = await ingestarDocumentoOficial(file);
    setPlano(r.plano); // atualiza em memória sem recompilar o app
    return r;
  };

  return (
    <Ctx.Provider value={{
      plano,
      norma,
      setNorma,
      validarConta: (c: string) => validarConta(plano, c),
      pesquisarConta: (t: string, limite?: number) => pesquisarConta(plano, t, limite),
      ingestar,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePGC(): PGCCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePGC deve ser usado dentro de <PGCProvider>");
  return ctx;
}

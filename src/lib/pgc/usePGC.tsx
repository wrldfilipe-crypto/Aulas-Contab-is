import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { carregarPlano, ingestarDocumentoOficial } from './pgcRag';
import { validarConta, pesquisarConta } from './pgcValidator';
import type { PlanoContas, NormaSelecionada } from './types';

interface PGCCtx {
  plano: PlanoContas | null;
  norma: NormaSelecionada;
  setNorma: (n: NormaSelecionada) => void;
  validarConta: (codigo: string) => ReturnType<typeof validarConta>;
  pesquisarConta: (termo: string, limite?: number) => ReturnType<typeof pesquisarConta>;
  ingestar: (file: File) => Promise<{ plano: PlanoContas; segmentos: number }>;
}

const defaultCtx: PGCCtx = {
  plano: null,
  norma: 'PGC_ANGOLA_82_2001',
  setNorma: () => {},
  validarConta: (codigo: string) => validarConta(null, codigo),
  pesquisarConta: (termo: string, limite?: number) => pesquisarConta(null, termo, limite),
  ingestar: async () => ({ plano: null as any, segmentos: 0 }),
};

const Ctx = createContext<PGCCtx>(defaultCtx);

export function PGCProvider({ children }: { children: ReactNode }) {
  const [plano, setPlano] = useState<PlanoContas | null>(null);
  const [norma, setNorma] = useState<NormaSelecionada>('PGC_ANGOLA_82_2001');

  useEffect(() => {
    let isMounted = true;
    carregarPlano().then((p) => {
      if (isMounted) setPlano(p);
    }).catch((err) => {
      console.warn('Plano local carregado por fallback:', err?.message || err);
    });
    return () => {
      isMounted = false;
    };
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
  return ctx || defaultCtx;
}


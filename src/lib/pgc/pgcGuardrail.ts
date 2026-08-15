import type { PlanoContas } from "./types";
import { validarConta } from "./pgcValidator";

export const CLASSE_9_RESPOSTA_TEMPLATE = `O Decreto n.º 82/2001 (PGC Angola) define apenas as Classes 0 a 8, não existindo uma Classe 9 oficial no plano de contas. O decreto permite o uso facultativo de Contabilidade Analítica... Posso ajudar-te a desenhar uma estrutura de centros de custo personalizada... só não seria parte do plano de contas oficial.`;

export const DISCLAIMER_ESTRUTURA_INTERNA = `Esta estrutura é uma sugestão de organização interna de gestão, não faz parte do quadro oficial de contas do Decreto n.º 82/2001.`;

export interface Auditoria {
  codigosEncontrados: { codigo: string; contexto: string }[];
  invalidos: { codigo: string; sugestao?: string }[];
  avisos: string[];
  mencionaClasse9?: boolean;
}

/** Verifica se um texto menciona ou consulta Classe 9 ou planos estrangeiros como oficial PGC Angola */
export function verificarClasse9(texto: string): boolean {
  const t = (texto || "").toLowerCase();
  return (
    /\bclasse\s*9\b/i.test(t) ||
    /\bconta[s]?\s*9\d*/i.test(t) ||
    /\bquadro\s+da\s+classe\s+9\b/i.test(t) ||
    /\bcontabilidade\s+anal[ií]tica\s+classe\s+9\b/i.test(t)
  );
}

/** Extrai candidatos a código de conta do texto (para fins analíticos). */
export function extrairCodigos(texto: string): { codigo: string; contexto: string }[] {
  const matches: { codigo: string; contexto: string }[] = [];
  const regex = /\b(?:conta|subconta)?\s*([0-8](?:\.\d+)+|\b[0-8]\b)\b/gi;
  let match;
  while ((match = regex.exec(texto)) !== null) {
    matches.push({
      codigo: match[1],
      contexto: texto.substring(Math.max(0, match.index - 20), Math.min(texto.length, match.index + 40)),
    });
  }
  return matches;
}

/** Retorna auditoria verificando contas e detetando referências à inexistente Classe 9 */
export function auditarResposta(plano: PlanoContas, resposta: string): Auditoria {
  const invalidos: { codigo: string; sugestao?: string }[] = [];
  const avisos: string[] = [];
  const codigos = extrairCodigos(resposta);
  const menciona9 = verificarClasse9(resposta);

  if (menciona9) {
    avisos.push("Referência a 'Classe 9': O PGC Angola (Decreto 82/2001) define apenas Classes 0 a 8.");
  }

  for (const c of codigos) {
    const res = validarConta(plano, c.codigo);
    if (!res.existe) {
      invalidos.push({ codigo: c.codigo, sugestao: res.sugestao });
    }
  }

  return { codigosEncontrados: codigos, invalidos, avisos, mencionaClasse9: menciona9 };
}

/** Retorna a resposta garantindo que a regra da Classe 9 e conformidade PGC Angola são respeitadas */
export function rejeitarSeInvalida(plano: PlanoContas, resposta: string, perguntaOriginal?: string): {
  resposta: string; bloqueada: boolean; avisos: string[];
} {
  const perguntaClasse9 = perguntaOriginal ? verificarClasse9(perguntaOriginal) : false;
  
  if (perguntaClasse9) {
    return {
      bloqueada: false,
      avisos: ["Consulta sobre Classe 9 tratada com o template oficial do Decreto 82/2001."],
      resposta: CLASSE_9_RESPOSTA_TEMPLATE
    };
  }

  const auditoria = auditarResposta(plano, resposta);
  
  return { 
    bloqueada: false, 
    avisos: auditoria.avisos, 
    resposta 
  };
}

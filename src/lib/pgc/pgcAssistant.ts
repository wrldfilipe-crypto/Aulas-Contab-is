import { construirPlano } from "./chartSeed";
import { carregarPlano, buscarContexto } from "./pgcRag";
import { construirPromptSistema, mensagemRestricao, NORMA_PGC } from "./pgcPrompt";
import { rejeitarSeInvalida } from "./pgcGuardrail";
import { validarLancamento } from "./pgcValidator";
import type { NormaSelecionada, PlanoContas } from "./types";

export interface ConfigAssistant {
  /** Função que chama o Gemini — aponta para o proxy já existente no teu app. */
  chamarModelo: (messages: { role: "system" | "user" | "assistant"; content: string }[]) => Promise<string>;
  /** Modo "rejeitar" (true) ou "sinalizar" (false) para respostas com contas inválidas. */
  modo: "rejeitar" | "sinalizar";
  usarRag?: boolean;
}

let planoCache: PlanoContas | null = null;

async function obterPlano(): Promise<PlanoContas> {
  if (!planoCache) planoCache = await carregarPlano();
  return planoCache;
}

/** Força recarga (chamar após ingestão de novo documento). */
export function invalidarPlanoCache() {
  planoCache = null;
}

/**
 * Resposta única com escopo PGC Angola:
 * prompt de sistema com o plano embutido + contexto RAG + guardrail na saída.
 */
export async function responderComPGC(
  pergunta: string,
  norma: NormaSelecionada,
  config: ConfigAssistant
): Promise<{ resposta: string; avisos: string[]; bloqueada: boolean }> {
  const plano = await obterPlano();

  // Se o seletor não estiver em PGC Angola, bloqueia perguntas contabilísticas
  if (norma !== NORMA_PGC) {
    return { resposta: mensagemRestricao(), avisos: [], bloqueada: true };
  }

  const contexto = config.usarRag !== false
    ? await buscarContexto(pergunta, 5)
    : [];

  const messages = [
    { role: "system" as const, content: construirPromptSistema(plano, norma) },
    ...(contexto.length ? [{
      role: "user" as const,
      content: `Contexto extraído do documento oficial do PGC Angola (use como referência, mas valide sempre contra o plano de contas):\n\n${contexto.join("\n\n")}`,
    }] : []),
    { role: "user" as const, content: pergunta },
  ];

  const bruto = await config.chamarModelo(messages);
  const validado = rejeitarSeInvalida(plano, bruto, pergunta);

  return {
    resposta: validado.resposta,
    avisos: validado.avisos,
    bloqueada: validado.bloqueada,
  };
}

/** Validação de lançamentos antes de enviar ao modelo (camada extra). */
export function validarLancamentoPGC(
  lancamento: { debito: { conta: string; valor: number }[]; credito: { conta: string; valor: number }[] }
) {
  return validarLancamento(planoCache ?? construirPlano(), lancamento);
}

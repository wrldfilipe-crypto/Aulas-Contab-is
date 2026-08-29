import { GoogleGenAI, Type } from "@google/genai";

export interface CartaoGerado {
  frente: string;
  verso: string;
  dificuldade: "facil" | "medio" | "dificil";
  tema: string;
  referencia?: string;
}

export interface Cartao extends CartaoGerado {
  id: string;
  baralhoId: string;
  caixa: 1 | 2 | 3;
  proximaRevisao: string; // ISO string
  acertos: number;
  erros: number;
  criadoEm?: string;
  ultimaRevisaoEm?: string;
}

export interface Baralho {
  id: string;
  userId: string;
  titulo: string;
  documentoNome: string;
  foco?: string;
  criadoEm: string;
  atualizadoEm?: string;
  cartoes: Cartao[];
}

export interface SessaoEstudo {
  id: string;
  userId: string;
  baralhoId: string;
  baralhoTitulo: string;
  dataConclusao: string;
  totalCartoes: number;
  acertos: number;
  erros: number;
  quase?: number;
  tempoSegundos: number;
  taxaPrecisao: number;
}

function obterApiKey(): string {
  const key =
    (typeof process !== "undefined" && (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) ||
    (typeof import.meta !== "undefined" && (import.meta.env?.VITE_GEMINI_API_KEY || (import.meta.env as any)?.GEMINI_API_KEY)) ||
    "";
  return key;
}

const MODELO = "gemini-2.5-flash";

const SYSTEM = `
És um criador de flashcards de estudo para contabilidade em Angola (PGC,
Decreto n.º 82/01, actualizado pelo Decreto Presidencial n.º 180/19 — contas
do IVA 34.5.x). A partir do texto fornecido, gera cartões que testem:
conceitos, códigos de contas, classificações, cálculos simples e mini-casos
práticos. PROIBIDO: perguntas de sim/não, triviais ou repetitivas.
Formato de frente: pergunta curta e precisa. Verso: resposta completa mas
concisa (2-4 linhas), com o código da conta quando aplicável.
`.trim();

const schemaFlashcards = {
  type: Type.OBJECT,
  properties: {
    cartoes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          frente: { type: Type.STRING },
          verso: { type: Type.STRING },
          dificuldade: { type: Type.STRING, enum: ["facil", "medio", "dificil"] },
          tema: { type: Type.STRING },
          referencia: { type: Type.STRING },
        },
        required: ["frente", "verso", "dificuldade", "tema"],
      },
    },
  },
  required: ["cartoes"],
};

export function normalizar(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gera flashcards didáticos com o modelo Gemini a partir do texto do documento.
 */
export async function gerarFlashcards(
  texto: string,
  quantidade: number,
  foco?: string
): Promise<CartaoGerado[]> {
  if (!texto || texto.trim().length === 0) {
    throw new Error("O texto do documento fornecido para gerar flashcards está vazio.");
  }

  const clientApiKey = obterApiKey();

  // Tentar primeiro via SDK cliente caso haja API key no ambiente
  if (clientApiKey && clientApiKey !== "MOCK_KEY") {
    try {
      const ai = new GoogleGenAI({ apiKey: clientApiKey });
      const resp = await ai.models.generateContent({
        model: MODELO,
        contents: [{
          role: "user",
          parts: [{
            text:
              `TEXTO DE ESTUDO:\n"""\n${texto.slice(0, 12000)}\n"""\n\n` +
              `Gera ${quantidade + 5} flashcards a partir deste texto` +
              (foco ? `, com foco em: ${foco}` : "") + `.`,
          }],
        }],
        config: {
          systemInstruction: SYSTEM,
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: schemaFlashcards,
        },
      });

      const rawJson = resp.text?.trim();
      if (!rawJson) {
        throw new Error("A resposta do modelo Gemini veio vazia.");
      }

      const dados = JSON.parse(rawJson) as { cartoes: CartaoGerado[] };
      if (!dados.cartoes || !Array.isArray(dados.cartoes)) {
        throw new Error("Formato de resposta inválido retornado pelo assistente.");
      }

      // Deduplicação por frente normalizada
      const vistos = new Set<string>();
      const filtrados = dados.cartoes.filter((c) => {
        const k = normalizar(c.frente);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      }).slice(0, quantidade);

      if (filtrados.length > 0) {
        return filtrados;
      }
    } catch (err: any) {
      console.warn("[flashcardService] Chamada direta ao SDK falhou, tentando rota proxy de backend:", err?.message);
    }
  }

  // Fallback para rota proxy do backend /api/ai/flashcards
  const response = await fetch("/api/ai/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texto: texto.slice(0, 12000),
      quantidade: quantidade + 5,
      foco,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error || errData?.message || `Erro ${response.status}: Falha ao gerar flashcards no servidor.`;
    throw new Error(msg);
  }

  const resData = await response.json();
  const cartoes: CartaoGerado[] = resData.cartoes || resData.data || [];

  if (!Array.isArray(cartoes) || cartoes.length === 0) {
    throw new Error("Nenhum cartão foi gerado a partir do documento.");
  }

  // Deduplicação por frente normalizada
  const vistos = new Set<string>();
  return cartoes
    .filter((c) => {
      const k = normalizar(c.frente);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, quantidade);
}

/* Repetição espaçada Leitner (caixas 1-3 → intervalos 1 / 3 / 7 dias) */
const INTERVALOS_DIAS = [1, 3, 7];

export function calcularProximaRevisao(
  caixa: number,
  resultado: "errar" | "quase" | "acertar"
): { caixa: 1 | 2 | 3; proximaRevisao: string } {
  if (resultado === "errar") {
    // Rever hoje/amanhã
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return { caixa: 1, proximaRevisao: d.toISOString() };
  }

  if (resultado === "quase") {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const c = (Math.max(1, Math.min(3, caixa)) as 1 | 2 | 3);
    return { caixa: c, proximaRevisao: d.toISOString() };
  }

  // Acertar: sobe de caixa até ao máximo de 3
  const novaCaixa = Math.min(3, Math.max(1, caixa) + 1) as 1 | 2 | 3;
  const d = new Date();
  d.setDate(d.getDate() + INTERVALOS_DIAS[novaCaixa - 1]);
  return { caixa: novaCaixa, proximaRevisao: d.toISOString() };
}

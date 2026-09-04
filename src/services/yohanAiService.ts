import { GoogleGenAI, Type } from '@google/genai';

export const SYSTEM_INSTRUCTION_YOHAN = `Você é Yohan AI, consultor e auditor contabilístico sénior humano, especialista de topo no Plano Geral de Contabilidade de Angola (PGC - Decreto n.º 82/01, atualizado pelo Decreto Presidencial n.º 180/19 — contas do IVA 34.5.x) e na legislação fiscal da AGT (Código do IVA - Lei n.º 7/19 e DP 180/19, Código do Imposto Industrial, Código do IRT e RITI).

IDENTIDADE E VOZ:
- Profissional experiente, didático, caloroso, paciente e prático. Comunica diretamente como um auditor ou professor de contabilidade a orientar um colega de profissão ou estudante.
- Rigor técnico absoluto na terminologia do PGC Angola: usa "Proveito" (nunca "Receita"), "Custo" (nunca "Despesa"), "Capital Próprio" (nunca "Patrimônio Líquido"), "Activo", "Imobilizações Corpóreas/Incorpóreas", "Amortizações".
- Estrutura obrigatória de Lançamentos Contabilísticos PGC:
  [D] Débito  : código — nome da conta — valor AOA
  [C] Crédito : código — nome da conta — valor AOA
  Histórico   : descrição sucinta da operação
- Subcontas oficiais do IVA segundo o DP n.º 180/19:
  * 34.5.1 IVA Suportado
  * 34.5.2 IVA Dedutível
  * 34.5.3 IVA Liquidado
  * 34.5.5 IVA Apuramento
  * 34.5.6 IVA a Pagar
  * 34.5.7 IVA a Recuperar / Crédito de IVA
- Regras fiscais angolanas fundamentais:
  * Retenção na fonte de 6,5% a título de Imposto Industrial sobre prestação de serviços (incide estritamente sobre o valor base do serviço sem IVA).
  * Prazo de submissão do Modelo 7 (Declaração Periódica do IVA): último dia do mês seguinte ao período a que respeita.
  * Imposto Industrial: taxa geral de 25% (ou 35% no setor financeiro/telecomunicações; 10% agricultura).`;

/**
 * Obtém a chave da API Gemini do ambiente ou lança um erro explicativo.
 */
export function getGeminiApiKey(): string {
  const envKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
                 (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
                 '';
  return envKey.trim();
}

/**
 * Instancia o cliente GoogleGenAI.
 */
function getGenAIClient(): GoogleGenAI {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error('Chave da API Gemini não configurada (GEMINI_API_KEY ou VITE_GEMINI_API_KEY ausente).');
  }
  return new GoogleGenAI({ apiKey: key });
}

export interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface DocumentSectionOutline {
  numero: number;
  titulo: string;
  objetivo: string;
}

export interface DocumentOutlineResult {
  tituloDocumento: string;
  secoes: DocumentSectionOutline[];
}

/**
 * Envia uma pergunta ao Yohan AI com streaming em tempo real.
 * Utiliza o modelo gemini-2.5-flash com thinkingConfig: { thinkingBudget: 0 }.
 * Se a API direta não estiver acessível no cliente (ou sem chave no browser),
 * utiliza fallback transparente para a rota de streaming do servidor /api/chat.
 */
export async function perguntarYohanStreaming(
  prompt: string,
  historico: HistoryItem[] = [],
  onChunk: (parcial: string) => void
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // Se tivermos a chave configurada no frontend, chamamos o SDK @google/genai diretamente com streaming
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const contents = [
        ...historico.slice(-8).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_YOHAN,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      let textoCompleto = '';
      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        if (chunkText) {
          textoCompleto += chunkText;
          onChunk(textoCompleto);
        }
      }

      if (textoCompleto.trim()) {
        return textoCompleto;
      }
    } catch (err: any) {
      console.warn('[YohanAiService] Direct SDK stream failed, falling back to server /api/chat:', err);
      // Se for erro de quota (429) ou chave inválida direta, lançar se relevante
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('⚠️ Limite de quota da API Gemini atingido (429). Aguarde alguns instantes antes de tentar novamente.');
      }
      // Se falhar por CORS ou outro motivo de browser, recorre ao proxy backend abaixo
    }
  }

  // Fallback: Streaming via backend /api/chat (utiliza o GEMINI_API_KEY do servidor)
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: prompt,
      history: historico.slice(-8),
      stream: true,
      systemContext: SYSTEM_INSTRUCTION_YOHAN
    })
  });

  if (!res.ok) {
    const status = res.status;
    let errDetail = '';
    try {
      const errJson = await res.json();
      errDetail = errJson.error || '';
    } catch (_) {
      errDetail = await res.text().catch(() => '');
    }
    if (status === 429) {
      throw new Error(`⚠️ Limite de quota da API atingido (429): ${errDetail || 'Muitos pedidos simultâneos.'}`);
    } else if (status === 401 || status === 403) {
      throw new Error(`❌ Chave de API não autorizada (${status}): ${errDetail || 'Verifique a configuração de GEMINI_API_KEY.'}`);
    } else if (status >= 500) {
      throw new Error(`❌ Erro interno no servidor (${status}): ${errDetail || 'Tente novamente em instantes.'}`);
    } else {
      throw new Error(`❌ Erro na comunicação (${status}): ${errDetail || res.statusText}`);
    }
  }

  let textoAcumulado = '';
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.text) {
              textoAcumulado += parsed.text;
              onChunk(textoAcumulado);
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e: any) {
            if (e.message && e.message.includes('Quota')) throw e;
            textoAcumulado += trimmed.slice(6);
            onChunk(textoAcumulado);
          }
        } else {
          textoAcumulado += trimmed;
          onChunk(textoAcumulado);
        }
      }
    }
  } else {
    const json = await res.json();
    textoAcumulado = json.text || json.reply || '';
    onChunk(textoAcumulado);
  }

  return textoAcumulado;
}

/**
 * Geração de documentos longos sem cortes em DUAS FASES:
 * Fase A: Estrutura do índice (8 a 15 seções) via JSON schema.
 * Fase B: Geração profunda seção por seção (mínimo 400 palavras cada) com maxOutputTokens: 8192.
 * Chama onSecao(feitas, total, tituloSecao, textoAcumulado) a cada etapa.
 */
export async function gerarDocumentoGrande(
  pedido: string,
  onSecao: (feitas: number, total: number, tituloSecao: string, textoAcumulado: string) => void
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // Se tivermos a chave no client, executamos as duas fases diretamente com o SDK Gemini
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // FASE A: Gerar a estrutura do índice com 8 a 15 secções
      onSecao(0, 10, 'A definir estrutura e índice do documento...', '');

      const outlinePrompt = `Você é Yohan AI, contabilista sénior e auditor do PGC Angola.
Crie a estrutura detalhada de um documento técnico ou manual aprofundado para o seguinte pedido:
"${pedido}"

Exigência obrigatória:
- Gere de 8 a 15 secções bem delimitadas, cobrindo o tema do enquadramento legal à prática de lançamentos e checklists.
- Nenhuma secção deve ser superficial. Cada uma deve ter um propósito claro.`;

      const outlineResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: outlinePrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_YOHAN,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tituloDocumento: { type: Type.STRING },
              secoes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    numero: { type: Type.INTEGER },
                    titulo: { type: Type.STRING },
                    objetivo: { type: Type.STRING }
                  },
                  required: ['numero', 'titulo', 'objetivo']
                }
              }
            },
            required: ['tituloDocumento', 'secoes']
          }
        }
      });

      let outline: DocumentOutlineResult;
      try {
        outline = JSON.parse(outlineResponse.text || '{}');
      } catch (parseErr) {
        throw new Error('Falha ao processar o índice do documento gerado pela IA.');
      }

      if (!outline.secoes || outline.secoes.length === 0) {
        throw new Error('A IA não gerou secções suficientes para o documento.');
      }

      const total = outline.secoes.length;
      let textoAcumulado = `# ${outline.tituloDocumento || pedido}\n\n`;
      textoAcumulado += `> **Documento Técnico Elaborado por Yohan AI**\n`;
      textoAcumulado += `> *Referencial Normativo: PGC Angola (Decreto n.º 82/01, DP n.º 180/19) & AGT*\n\n`;
      textoAcumulado += `## Índice Sistemático\n\n`;
      outline.secoes.forEach(s => {
        textoAcumulado += `${s.numero}. **${s.titulo}** — ${s.objetivo}\n`;
      });
      textoAcumulado += `\n---\n\n`;

      onSecao(0, total, `Índice criado com ${total} secções. A iniciar desenvolvimento...`, textoAcumulado);

      // FASE B: Gerar cada secção individualmente com profundidade
      const indiceResumo = outline.secoes.map(s => `${s.numero}. ${s.titulo} (${s.objetivo})`).join('\n');

      for (let i = 0; i < outline.secoes.length; i++) {
        const sec = outline.secoes[i];
        const feitas = i + 1;
        onSecao(i, total, `A redigir Secção ${sec.numero}/${total}: ${sec.titulo}...`, textoAcumulado);

        const sectionPrompt = `Você é Yohan AI. Estamos a redigir o documento formal intitulado: "${outline.tituloDocumento}".

ÍNDICE GERAL DO DOCUMENTO:
${indiceResumo}

TAREFA ESPECÍFICA:
Escreva AGORA a SECÇÃO ${sec.numero}: "${sec.titulo}".
Objetivo desta secção: ${sec.objetivo}.

REQUISITOS OBRIGATÓRIOS:
1. Desenvolvimento profundo e substancial: no mínimo 400 a 600 palavras para esta secção.
2. Fundamentação legal explícita no PGC Angola (Decreto n.º 82/01, Decreto Presidencial n.º 180/19 para IVA) e normas da AGT.
3. Se aplicável ao tema, inclua exemplo prático numérico com lançamentos contabilísticos formais:
   [D] Conta Débito — Nome — Valor AOA
   [C] Conta Crédito — Nome — Valor AOA
   Histórico: descrição
4. Inclua uma tabela markdown informativa ou quadro comparativo onde for pedagogicamente útil.
5. Termine a secção com uma nota de atenção ou erro comum de auditoria.

Não repita o título geral do documento. Comece diretamente com a explicação desenvolvida da Secção ${sec.numero}.`;

        const secRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: sectionPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_YOHAN,
            maxOutputTokens: 8192,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        });

        const secText = secRes.text || '';
        textoAcumulado += `## Secção ${sec.numero}: ${sec.titulo}\n\n`;
        textoAcumulado += `${secText.trim()}\n\n---\n\n`;

        onSecao(feitas, total, `Secção ${sec.numero} concluída!`, textoAcumulado);
      }

      return textoAcumulado;
    } catch (directErr: any) {
      console.warn('[YohanAiService] Direct SDK document generation failed, trying server endpoint:', directErr);
      const msg = directErr?.message || String(directErr);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('⚠️ Limite de quota excedido (429) durante a geração do documento. Tente novamente em alguns minutos.');
      }
    }
  }

  // Fallback: Chamada ao endpoint do servidor `/api/yohan/document-large`
  onSecao(0, 1, 'A gerar documento estruturado no servidor...', '');
  const res = await fetch('/api/yohan/document-large', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: pedido })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Falha na geração do documento pelo servidor (Status ${res.status}).`);
  }

  const data = await res.json();
  const fullText = data.text || data.documentContent || '';
  onSecao(1, 1, 'Documento completo gerado!', fullText);
  return fullText;
}

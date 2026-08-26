/**
 * Local AI & Rule-Based Assistant for Accounting Notes & Studies (PGC Angola)
 * Provides offline-resilient smart assistance when offline or when network latency occurs.
 */

export interface NotesAiProcessOptions {
  text: string;
  action: 'summarize' | 'correct' | 'expand';
  category?: string;
  context?: string;
}

export interface NotesAiProcessResult {
  result: string;
  action: 'summarize' | 'correct' | 'expand';
  source: 'cloud' | 'local';
}

const PGC_TERMINOLOGY_MAP: Record<string, string> = {
  'debito': 'Débito',
  'credito': 'Crédito',
  'debitos': 'Débitos',
  'creditos': 'Créditos',
  'balanço': 'Balanço Patrimonial',
  'balanco': 'Balanço Patrimonial',
  'balancete': 'Balancete de Verificação',
  'pgc': 'PGC Angola (Decreto n.º 82/01)',
  'pgca': 'PGC Angola',
  'iva': 'IVA (Lei n.º 7/19)',
  'irt': 'IRT (Código do Imposto sobre o Rendimento do Trabalho)',
  'imposto industrial': 'Imposto Industrial (Lei n.º 19/14)',
  'agt': 'AGT (Administração Geral Tributária)',
  'saft': 'SAF-T (AO)',
  'saf-t': 'SAF-T (AO)',
  'partidas dobradas': 'Método das Partidas Dobradas',
  'partida dobrada': 'Partida Dobrada',
  'demonstracao de resultados': 'Demonstração dos Resultados',
  'demonstração de resultados': 'Demonstração dos Resultados',
  'amortizacao': 'Depreciação / Amortização Acumulada',
  'amortizacoes': 'Depreciações e Amortizações',
  'amortização': 'Depreciação / Amortização',
  'amortizações': 'Depreciações e Amortizações',
  'provisao': 'Perda por Imparidade / Provisão',
  'provisoes': 'Perdas por Imparidade / Provisões',
  'provisão': 'Perda por Imparidade / Provisão',
  'provisões': 'Perdas por Imparidade / Provisões',
  'fornecedores': 'Fornecedores (Conta 32)',
  'clientes': 'Clientes (Conta 31)',
  'bancos': 'Depósitos à Ordem (Conta 43)',
  'caixa': 'Caixa (Conta 45)',
  'mercadorias': 'Mercadorias (Conta 21)',
  'meios fixos': 'Imobilizações / Meios Fixos (Classe 1)',
  'retencao na fonte': 'Retenção na Fonte (6,5% / 15%)',
  'retenção na fonte': 'Retenção na Fonte (6,5% / 15%)',
  'exercicio economico': 'Exercício Económico',
  'exercício económico': 'Exercício Económico'
};

const CLASS_DETAILS: Record<string, string> = {
  '1': 'Classe 1 — Meios Fixos e Investimentos (Ativo Não Corrente: Imobilizações Corpóreas, Incorpóreas e Financeiras)',
  '2': 'Classe 2 — Existências (Ativo Corrente: Mercadorias, Matérias-Primas, Produtos Acabados)',
  '3': 'Classe 3 — Terceiros (Clientes 31, Fornecedores 32, Estado 34, Pessoal 36, Outros Devedores/Credores)',
  '4': 'Classe 4 — Meios Financeiros Líquidos (Caixa 45, Bancos 43, Aplicações de Tesouraria)',
  '5': 'Classe 5 — Capital e Reservas (Capital Social 51, Reservas Legais 55, Resultados Transitados 56)',
  '6': 'Classe 6 — Proveitos e Ganhos por Natureza (Vendas 61, Prestações de Serviços 62, Proveitos Financeiros 66)',
  '7': 'Classe 7 — Custos e Perdas por Natureza (CMVMC 71, Custos com o Pessoal 72, FSE 75, Amortizações 78)',
  '8': 'Classe 8 — Resultados (Resultados Operacionais 81, Financeiros 82, Extraordinários 83, Líquido do Exercício 88)'
};

/**
 * Executes a high-precision local fallback for accounting notes
 */
export function generateLocalNotesAssist(
  text: string, 
  action: 'summarize' | 'correct' | 'expand', 
  category = 'Geral',
  context = ''
): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (action === 'summarize') {
    return generateLocalSummary(trimmed, category);
  } else if (action === 'correct') {
    return generateLocalCorrection(trimmed);
  } else if (action === 'expand') {
    return generateLocalExpansion(trimmed, category, context);
  }

  return trimmed;
}

function generateLocalSummary(text: string, category: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);

  let keyPoints: string[] = [];

  if (lines.length > 1) {
    keyPoints = lines.map(l => l.replace(/^[-*•0-9.)\s]+/, ''));
  } else if (sentences.length > 1) {
    keyPoints = sentences;
  } else {
    keyPoints = [text];
  }

  const distinctPoints = Array.from(new Set(keyPoints)).slice(0, 5);

  let summary = `**Resumo Executivo (${category}):**\n\n`;
  distinctPoints.forEach(p => {
    summary += `• ${p}\n`;
  });

  summary += `\n*Síntese Técnica:* Apontamento focado no cumprimento das normas vigentes do PGC Angola e rigor dos lançamentos contabilísticos.`;
  return summary;
}

function generateLocalCorrection(text: string): string {
  let corrected = text;

  // Replace common accounting words with proper capitalisation and standard abbreviations
  Object.keys(PGC_TERMINOLOGY_MAP).forEach(term => {
    const replacement = PGC_TERMINOLOGY_MAP[term];
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    corrected = corrected.replace(regex, replacement);
  });

  // Capitalize first letter of sentences
  corrected = corrected.replace(/(^\s*|\.\s+)([a-zà-ú])/g, (match, separator, char) => {
    return separator + char.toUpperCase();
  });

  // Ensure trailing period if not present and ends with alphanumeric
  if (/[a-zA-Z0-9]$/.test(corrected)) {
    corrected += '.';
  }

  return corrected;
}

function generateLocalExpansion(text: string, category: string, context: string): string {
  let expansion = `${text}\n\n`;
  expansion += `### 📌 Enquadramento & Fundamentação Técnica (PGC Angola)\n\n`;

  // Detect matching accounting classes or topics
  const lower = (text + ' ' + context).toLowerCase();
  let matchedClasses: string[] = [];

  if (lower.includes('imobilizad') || lower.includes('ativo fixo') || lower.includes('meios fixos') || lower.includes('deprecia') || lower.includes('amortiza')) {
    matchedClasses.push(CLASS_DETAILS['1']);
  }
  if (lower.includes('stock') || lower.includes('existên') || lower.includes('existenc') || lower.includes('mercadoria') || lower.includes('inventário') || lower.includes('inventario')) {
    matchedClasses.push(CLASS_DETAILS['2']);
  }
  if (lower.includes('cliente') || lower.includes('fornecedor') || lower.includes('estado') || lower.includes('nif') || lower.includes('agt') || lower.includes('iva') || lower.includes('irt') || lower.includes('imposto')) {
    matchedClasses.push(CLASS_DETAILS['3']);
  }
  if (lower.includes('caixa') || lower.includes('banco') || lower.includes('bna') || lower.includes('depósito') || lower.includes('liquidez') || lower.includes('tesouraria')) {
    matchedClasses.push(CLASS_DETAILS['4']);
  }
  if (lower.includes('capital') || lower.includes('reserva') || lower.includes('património') || lower.includes('lucro') || lower.includes('prejuízo') || lower.includes('dividendo')) {
    matchedClasses.push(CLASS_DETAILS['5']);
  }
  if (lower.includes('venda') || lower.includes('prestação') || lower.includes('prestacao') || lower.includes('fatura') || lower.includes('factura') || lower.includes('proveito') || lower.includes('receita')) {
    matchedClasses.push(CLASS_DETAILS['6']);
  }
  if (lower.includes('custo') || lower.includes('despesa') || lower.includes('pessoal') || lower.includes('fse') || lower.includes('combustível') || lower.includes('água') || lower.includes('energia')) {
    matchedClasses.push(CLASS_DETAILS['7']);
  }

  if (matchedClasses.length > 0) {
    expansion += `**Contas & Classes PGC Aplicáveis:**\n`;
    matchedClasses.forEach(mc => {
      expansion += `- ${mc}\n`;
    });
    expansion += `\n`;
  }

  expansion += `**Princípios Contabilísticos Fundamentais:**\n`;
  expansion += `1. **Princípio da Continuidade**: Presume-se que a entidade opera continuamente com horizonte indefinido.\n`;
  expansion += `2. **Princípio da Especialização dos Exercícios**: Os proveitos e os custos são reconhecidos quando gerados, independentemente do recebimento ou pagamento.\n`;
  expansion += `3. **Princípio da Prudência**: Não sobreavaliar ativos e proveitos, nem subavaliar passivos e custos.\n\n`;

  expansion += `**Exemplo de Aplicação Prática / Lançamento:**\n`;
  expansion += `\`\`\`text\n`;
  expansion += `[D] Débito  : Conta de Destino / Aplicação (Aumento de Ativo ou Gasto)\n`;
  expansion += `[C] Crédito : Conta de Origem / Meio de Pagamento (Diminuição de Ativo ou Passivo/Proveito)\n`;
  expansion += `Histórico   : Registo e regularização em conformidade com o Decreto n.º 82/01 e suporte documental.\n`;
  expansion += `\`\`\``;

  return expansion;
}

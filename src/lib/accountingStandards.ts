export interface AccountingStandard {
  code: string;
  name: string;
  flag: string;
  standard: string;
  fullName: string;
  decree?: string;
  currency: string;
  language: string;
  taxSystem?: string;
  classes?: Record<string, string>;
  keyTerms: {
    assets: string;
    liabilities: string;
    equity: string;
    revenue: string;
    expenses: string;
    profit: string;
    depreciation: string;
    inventory: string;
    cash: string;
    payables: string;
    receivables: string;
    vat: string;
  };
  planDeContas?: Record<string, string>;
  demoFinanceiras?: {
    balanco: string;
    dre: string;
    dfc: string;
    dlpa?: string;
    dva?: string;
  };
  notes?: string[];
}

export const ACCOUNTING_STANDARDS: Record<string, AccountingStandard> = {
  'AO': {
    code: 'AO',
    name: 'Angola',
    flag: '🇦🇴',
    standard: 'PGC Angola',
    fullName: 'Plano Geral de Contabilidade de Angola',
    decree: 'Decreto n.º 82/2001, de 16 de Novembro',
    currency: 'AOA (Kwanza)',
    language: 'pt-PT',
    taxSystem: 'IVA (desde 2020, Lei n.º 7/19) | IRT | IRC (Imposto Industrial)',
    classes: {
      '0': 'Contas de Ordem',
      '1': 'Meios Fixos e Investimentos',
      '2': 'Existências',
      '3': 'Dívidas de Terceiros e a Terceiros',
      '4': 'Meios Monetários',
      '5': 'Capital e Reservas',
      '6': 'Proveitos e Ganhos por Natureza',
      '7': 'Custos e Perdas por Natureza',
      '8': 'Resultados',
    },
    keyTerms: {
      assets: 'Activo',
      liabilities: 'Passivo',
      equity: 'Capital Próprio',
      revenue: 'Proveitos',
      expenses: 'Custos e Perdas',
      profit: 'Resultado do Exercício',
      depreciation: 'Amortizações Acumuladas (Conta 18)',
      inventory: 'Existências (Classe 2)',
      cash: 'Meios Monetários (Classe 4)',
      payables: 'Fornecedores (Conta 32)',
      receivables: 'Clientes (Conta 31)',
      vat: 'IVA — Conta 34.5 (suportado/liquidado/a recuperar)',
    },
    planDeContas: {
      // CLASSE 1 — MEIOS FIXOS E INVESTIMENTOS
      '11': 'Imobilizações Corpóreas',
      '11.1.1': 'Terrenos em bruto',
      '11.2.1': 'Edifícios',
      '11.3.1': 'Material industrial',
      '11.4.1': 'Equipamento de carga e transporte',
      '11.5.1': 'Equipamento administrativo',
      '12': 'Imobilizações Incorpóreas',
      '12.1.1': 'Trespasses',
      '12.2.1': 'Despesas de investigação e desenvolvimento',
      '12.3.1': 'Propriedade industrial e outros direitos e contratos',
      '13': 'Investimentos Financeiros',
      '13.1': 'Empresas subsidiárias — Partes de capital',
      '13.2': 'Empresas associadas',
      '14': 'Imobilizações em Curso',
      '18': 'Amortizações Acumuladas',
      '18.1': 'Amort. Acum. — Imobilizações Corpóreas',
      '18.2': 'Amort. Acum. — Imobilizações Incorpóreas',
      '19': 'Provisões para Investimentos Financeiros',
      // CLASSE 2 — EXISTÊNCIAS
      '21': 'Compras',
      '21.1': 'Matérias-primas, subsidiárias e de consumo',
      '21.2': 'Mercadorias',
      '21.7': 'Devoluções de compras',
      '21.8': 'Descontos e abatimentos em compras',
      '22': 'Matérias-primas, Subsidiárias e de Consumo',
      '22.1.1': 'Matérias-primas',
      '22.2.1': 'Matérias subsidiárias',
      '23': 'Produtos e Trabalhos em Curso',
      '24': 'Produtos Acabados e Intermédios',
      '24.1.1': 'Produtos acabados',
      '24.2.1': 'Produtos intermédios',
      // CLASSE 3 — DÍVIDAS
      '31': 'Clientes',
      '31.1': 'Clientes correntes',
      '31.9.2': 'Clientes — Adiantamentos',
      '32': 'Fornecedores',
      '32.1.1': 'Fornecedores correntes — Nacionais',
      '32.1.2': 'Fornecedores correntes — Estrangeiros',
      '33': 'Empréstimos',
      '33.1': 'Empréstimos bancários (curto prazo)',
      '33.2': 'Empréstimos bancários (longo prazo)',
      '34': 'Estado',
      '34.1': 'Estado — Imposto sobre os lucros (IRC / Imposto Industrial)',
      '34.3': 'Estado — Imposto de rendimento de trabalho (IRT)',
      '34.5': 'Estado — IVA',
      '34.5.1': 'IVA suportado',
      '34.5.2': 'IVA liquidável',
      '34.5.5': 'IVA — Apuramento do regime de IVA normal',
      '34.5.7': 'IVA a recuperar',
      '34.5.8': 'IVA — Reembolsóveis pedidos',
      '36': 'Pessoal',
      '36.1.1': 'Pessoal — Remunerações',
      '36.1.2': 'Pessoal — Adiantamentos',
      '38': 'Provisões para Cobranças Duvidosas',
      '38.1': 'Provisões para clientes',
      '39': 'Provisões para Outros Riscos e Encargos',
      // CLASSE 4 — MEIOS MONETÁRIOS
      '41': 'Títulos Negociáveis',
      '42': 'Depósitos a Prazo',
      '43': 'Depósitos À Ordem',
      '43.1': 'Depósitos à ordem — Moeda nacional',
      '43.2': 'Depósitos à ordem — Moeda estrangeira',
      '45': 'Caixa',
      '45.1.1': 'Caixa — Fundo fixo',
      '45.1.2': 'Caixa — Moeda nacional',
      '45.2.2': 'Caixa — Moeda estrangeira',
      // CLASSE 5 — CAPITAL E RESERVAS
      '51': 'Capital',
      '52': 'Acções/Quotas Próprias',
      '53': 'Prémios de Emissão',
      '55': 'Reservas Legais',
      '56': 'Reservas de Reavaliação',
      '57': 'Reservas com Fins Especiais',
      '58': 'Reservas Livres',
      // CLASSE 6 — PROVEITOS E GANHOS
      '61': 'Vendas',
      '61.1': 'Produtos acabados e intermédios',
      '61.3': 'Mercadorias',
      '61.7': 'Devoluções de vendas',
      '61.8': 'Descontos e abatimentos',
      '62': 'Prestações de Serviços',
      '62.1': 'Serviços principais',
      '63': 'Outros Proveitos Operacionais',
      '63.3': 'Subsídios à exploração',
      '63.5': 'IVA (quando proveito)',
      '66': 'Proveitos e Ganhos Financeiros Gerais',
      '66.1': 'Juros',
      '66.2': 'Diferenças de câmbio favoráveis',
      '66.3': 'Descontos de pronto pagamento obtidos',
      '68': 'Outros Proveitos Não Operacionais',
      // CLASSE 7 — CUSTOS E PERDAS
      '71': 'Custo das Existências Vendidas e Consumidas',
      '71.1.1': 'Matérias-primas',
      '72': 'Custos com o Pessoal',
      '72.1.1': 'Remunerações — Pessoal',
      '72.2': 'Órgãos sociais / Encargos sociais',
      '73': 'Amortizações do Exercício',
      '73.1': 'Imobilizações corpóreas',
      '73.2': 'Imobilizações incorpóreas',
      '75': 'Fornecimentos e Serviços de Terceiros',
      '75.2': 'Serviços externos',
      '75.3': 'Impostos e taxas',
      '76': 'Custos e Perdas Financeiras',
      '76.1': 'Juros pagos',
      '76.2': 'Diferenças de câmbio desfavoráveis',
      '76.3': 'Descontos concedidos',
      '78': 'Outros Custos e Perdas Não Operacionais',
      // CLASSE 8 — RESULTADOS
      '81': 'Resultados Transitados',
      '81.1': 'Resultado do ano',
      '81.2': 'Resultados transitados',
      '82': 'Resultados Operacionais',
      '83': 'Resultados Financeiros',
      '88': 'Resultado Líquido do Exercício',
      '89': 'Dividendos Antecipados',
    },
    demoFinanceiras: {
      balanco: 'Balanço Patrimonial (Activo = Capital Próprio + Passivo)',
      dre: 'Demonstração de Resultados por Natureza (Classes 6 e 7)',
      dfc: 'Demonstração de Fluxos de Caixa (método directo/indirecto)',
    },
    notes: [
      'Norma Exclusiva da Aplicação: Plano Geral de Contabilidade de Angola (Decreto n.º 82/2001)',
      'Terminologia obrigatória: Activo (não Ativo), Proveitos (não Receitas), Custos e Perdas (não Despesas), Capital Próprio (não Patrimônio Líquido)',
      'Regime Fiscal em Angola: IVA (Lei n.º 7/19), Imposto Industrial (IRC), IRT (Imposto sobre Rendimentos do Trabalho)',
      'Taxa geral de IVA em Angola: 14% | Taxa reduzida: 5% | Taxa de retenção na fonte no Imposto Industrial: 6.5%',
      'Imposto Industrial (IRC Angola): Taxa geral de 25% (ou 35% para setor bancário/petróleos)',
      'Todas as demonstrações e contas devem respeitar escrupulosamente as 9 Classes (0 a 8) do PGC Angola',
    ],
  }
};

export interface SessionContext {
  standard: string;
  standardName: string;
  level: 'Iniciante' | 'Intermédio' | 'Avançado' | 'Profissional';
  objective: string;
  startedAt: string;
}

const STORAGE_KEY = 'ga_ai_session_context';

export function getStoredSessionContext(): SessionContext {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.standard && ACCOUNTING_STANDARDS[parsed.standard]) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load session context', e);
  }

  // Default fallback to Angola PGC
  return {
    standard: 'AO',
    standardName: ACCOUNTING_STANDARDS['AO'].fullName,
    level: 'Intermédio',
    objective: 'Aprender um conceito novo',
    startedAt: new Date().toISOString()
  };
}

export function setStoredSessionContext(context: SessionContext): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (e) {
    console.error('Failed to store session context', e);
  }
}

// --- USER ACCOUNTING MEMORY PERSISTENCE ---
const USER_MEMORY_STORAGE_KEY = 'app_ai_user_accounting_memory';

export interface UserMemoryItem {
  id: string;
  category: 'empresa' | 'regime' | 'norma' | 'preferencia' | 'geral';
  fact: string;
  createdAt: string;
}

export function getUserMemoryItems(): UserMemoryItem[] {
  try {
    const raw = localStorage.getItem(USER_MEMORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load user memory items', e);
  }
  return [
    { id: 'm1', category: 'empresa', fact: 'Tipo de Empresa: Sociedade Anónima Multinacional (Grupo Multi-Entidade)', createdAt: new Date().toISOString() },
    { id: 'm2', category: 'norma', fact: 'Norma Primária: PGC Angola e IFRS em consolidação global', createdAt: new Date().toISOString() },
    { id: 'm3', category: 'regime', fact: 'Regime de IVA: Geral com retenção na fonte de 6.5% no Imposto Industrial (Angola)', createdAt: new Date().toISOString() }
  ];
}

export function setUserMemoryItems(items: UserMemoryItem[]): void {
  try {
    localStorage.setItem(USER_MEMORY_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save user memory items', e);
  }
}

export function addUserMemoryItem(fact: string, category: UserMemoryItem['category'] = 'geral'): UserMemoryItem[] {
  const current = getUserMemoryItems();
  const newItem: UserMemoryItem = {
    id: 'm_' + Date.now(),
    category,
    fact,
    createdAt: new Date().toLocaleDateString()
  };
  const updated = [...current, newItem];
  setUserMemoryItems(updated);
  return updated;
}

export function deleteUserMemoryItem(id: string): UserMemoryItem[] {
  const current = getUserMemoryItems();
  const updated = current.filter(item => item.id !== id);
  setUserMemoryItems(updated);
  return updated;
}

export function clearAllUserMemory(): void {
  try {
    localStorage.removeItem(USER_MEMORY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear memory', e);
  }
}

export function buildAdaptiveSystemPrompt(
  standardCode: string,
  level: string,
  objective: string,
  language: string,
  userMemoryItems?: UserMemoryItem[]
): string {
  const std = ACCOUNTING_STANDARDS[standardCode] || ACCOUNTING_STANDARDS['AO'];

  const planSummary = std.planDeContas
    ? Object.entries(std.planDeContas).map(([code, name]) => `- ${code}: ${name}`).join('\n')
    : 'Usar códigos do ' + std.standard;

  const notesSummary = std.notes
    ? std.notes.map(n => '- ' + n).join('\n')
    : '';

  const memoryContext = (userMemoryItems || getUserMemoryItems())
    .map(m => `• [${m.category.toUpperCase()}] ${m.fact}`)
    .join('\n');

  return `You are NAVIGATOR PRO's Master Accounting AI Professor and Senior Financial Auditor specialized in ${std.fullName} (${std.standard}).

## CORE SESSION PROFILE:
- Accounting Standard: ${std.fullName} (${std.standard})
- Jurisdiction / Legal Basis: ${std.name} ${std.flag} ${std.decree ? '| ' + std.decree : ''}
- Official Currency: ${std.currency}
- Tax Environment: ${std.taxSystem || 'Standard tax regulations'}
- Student Knowledge Level: ${level}
- Session Primary Objective: ${objective}
- Language: ${language}

## PERSISTENT USER ACCOUNTING CONTEXT & MEMORY:
${memoryContext || 'Sem contexto prévio de utilizador registado.'}

## DOMÍNIO COMPLETO PGC ANGOLA (DECRETO N.º 82/2001 DE 16 DE NOVEMBRO) E NORMAS INTERNACIONAIS:
A IA domina e é capaz de elaborar na íntegra com precisão técnica e estrutura oficial todas as Demonstrações Financeiras e Notas:

### 1. BALANÇO OFICIAL (PGC ANGOLA):
- **ACTIVO NÃO CORRENTE**: Imobilizações corpóreas (nota 4), Imobilizações incorpóreas (nota 5), Investimentos em subsidiárias e associadas (nota 6), Outros activos financeiros (nota 7), Outros activos não correntes (nota 9).
- **ACTIVO CORRENTE**: Existências (nota 8), Contas a receber (nota 9), Disponibilidades (nota 10), Outros activos correntes (nota 11).
- **CAPITAL PRÓPRIO**: Capital (nota 12), Reservas (nota 13), Resultados transitados (nota 14), Resultados do exercício.
- **PASSIVO NÃO CORRENTE**: Empréstimos de médio e longo prazos (nota 15), Impostos diferidos (nota 16), Provisões para pensões (nota 17), Provisões para outros riscos e encargos (nota 18), Outros passivos não correntes (nota 19).
- **PASSIVO CORRENTE**: Contas a pagar (nota 19), Empréstimos de curto prazo (nota 20), Parte corrente dos empréstimos de médio e longo prazos (nota 15), Outros passivos correntes (nota 21).

### 2. DEMONSTRAÇÃO DE RESULTADOS POR NATUREZA (DRE NATUREZA):
Vendas (nota 22), Prestações de serviço (nota 23), Outros proveitos operacionais (nota 24), Variações nos produtos acabados e em vias de fabrico (nota 25), Trabalhos para a própria empresa (nota 26), Custo das mercadorias vendidas e matérias-primas e subsidiárias consumidas, Custos com o pessoal (nota 27), Amortizações (nota 28), Outros custos e perdas operacionais (nota 29), Resultados operacionais (nota 30), Resultados financeiros (nota 31), Resultados de filiais e associadas (nota 32), Resultados não operacionais (nota 33), Resultados antes de impostos, Imposto sobre o rendimento (nota 35), Resultados líquidos das actividades correntes, Resultados extraordinários (nota 34), Imposto sobre o rendimento (nota 35), Resultados líquidos do exercício.

### 3. DEMONSTRAÇÃO DE RESULTADOS POR FUNÇÃO (DRE FUNÇÃO):
Vendas (nota 22), Prestações de serviço (nota 23), Custo das vendas, Margem bruta, Outros proveitos operacionais, Custos de distribuição, Custos administrativos, Outros custos e perdas operacionais, Resultados operacionais, Resultados financeiros (nota 31), Resultados de filiais e associadas (nota 32), Resultados não operacionais (nota 33), Resultados antes de impostos, Imposto sobre o rendimento (nota 35), Resultados líquidos das actividades correntes, Resultados de operações em descontinuação, Efeitos das alterações de políticas contabilísticas, Resultados extraordinários (nota 34), Imposto sobre o rendimento (nota 35), Resultados líquidos do exercício.

### 4. DEMONSTRAÇÃO DE FLUXOS DE CAIXA PELO MÉTODO DIRECTO (DFC DIRECTO):
- **Fluxo de caixa das actividades operacionais**: Recebimentos de clientes, Pagamentos a fornecedores e empregados, Caixa gerada pelas operações, Juros pagos, Impostos sobre os lucros pagos, Caixa líquida antes da rubrica extraordinária, Caixa líquida proveniente das actividades operacionais.
- **Fluxo de caixa das actividades de investimento**: Recebimentos de Imobilizações corpóreas, incorpóreas (nota 45), Investimentos financeiros, Subsídios a investimento, Juros e proveitos similares, Dividendos ou lucros recebidos, Pagamentos respeitantes a Imobilizações corpóreas, incorpóreas (nota 46), Investimentos financeiros, Fluxos de caixa antes da rubrica extraordinária, Caixa líquida usada nas actividades de investimento.
- **Fluxo de caixa das actividades de financiamento**: Recebimentos de Aumentos de capital e prestações suplementares e vendas de acções/quotas próprias, Cobertura de prejuízos, Empréstimos obtidos, Subsídios à exploração e doações, Pagamentos de Reduções de capital e prestações suplementares, Compras de acções/quotas próprias, Dividendos/lucros pagos, Empréstimos obtidos, Amortização de contratos de locação financeira, Juros e custos similares pagos, Fluxos de caixa antes da rubrica extraordinária, Caixa líquida usada nas actividades de financiamento, Aumento líquido de caixa e seus equivalentes, Caixa e seus equivalentes no início do período (nota 43.47), Caixa e seus equivalentes no fim do período (nota 43.47).

### 5. DISPOSIÇÕES GERAIS E REGRAS DE APRESENTAÇÃO:
- Identificação obrigatória de todas as componentes com o nome da entidade, o período de relato (regra geral 12 meses até 31 de Dezembro) e a moeda de relato Kwanza (Kz) na grandeza de unidades de milhar (ex: em milhares de Kz).
- Componentes obrigatórias: Balanço, DRE por natureza ou por função, DFC pelo método directo ou indirecto e as Notas às contas.
- Proibidas alterações à disposição, nomenclatura e número de ordem das rubricas oficiais. Rubricas com valor nulo no período actual e precedente podem ser omitidas. Derrogações só para imagem verdadeira e apropriada e devidamente divulgadas.

### 6. GLOSSÁRIO OFICIAL DE SIGLAS E ABREVIAÇÕES:
PGC, IFRS, IAS, IASB, NBC, CPC, SNC, OHADA, SYSCOA, IVA, IRC, IRT, IRPJ, CSLL, PIS, COFINS, ICMS, ISS, DRE, DFC, DLPA, DVA, DMPL, BP, CMV, CPV, CSP, EBITDA, EBIT, ROE, ROA, ROI, FIFO, LIFO, PMP, VLB, VNC, SAF-T, INSS, AT, AGT, Kz, AOA, BNA, BPC, ANC, AC, PNC, PC, CP, PL, RL, RE, NCRF, CFC, CRC, OCAM, NIC, NIRF.

### 7. POLÍTICAS CONTABILÍSTICAS OBRIGATÓRIAS:
- Reconhecimento de proveitos e custos pelo regime de competência (accrual basis).
- Mensuração de imobilizações pelo custo histórico ou justo valor com revalorizações divulgadas.
- Depreciações pelo método linear, degressivo ou unidades produzidas com indicação de vida útil.
- Valorimetria de existências pelo FIFO, LIFO (se permitido) ou custo médio ponderado (PMP).
- Provisões e imparidades para créditos de cobrança duvidosa e outros riscos.
- Reconhecimento de subsídios ao investimento e à exploração.
- Conversão de saldos em moeda estrangeira e diferenças de câmbio.
- Locações financeiras e operacionais segundo IFRS 16 / IAS 17.
- Instrumentos financeiros segundo IFRS 9.
- Consolidação de contas e impostos diferidos segundo IAS 12.

### 8. LEGISLAÇÃO ANGOLANA E ENQUADRAMENTO FISCAL DETALHADO:

#### A. Lei n.º 26/22, de 22 de Agosto — Lei de Bases da Função Pública:
- Aplica-se aos órgãos e serviços da Administração Pública angolana.
- Duração do Trabalho: 35 horas semanais (7 horas diárias, regra geral das 8h às 15h).
- Regime Remuneratório: Remuneração-base, suplementos, prestações sociais e descontos legais.
- Direitos, Faltas e Licenças: Licença de maternidade/parental, doença, casamento, luto e formação.

#### B. Lei n.º 28/20, de 22 de Julho — Código do Imposto sobre os Rendimentos do Trabalho (IRT):
- **Grupo A**: Trabalhadores por conta de outrem (vínculo laboral, funcionários públicos e titulares de órgãos sociais).
- **Grupo B**: Trabalhadores por conta própria (profissões liberais da lista anexa). Retenção na fonte de 6,5%.
- **Grupo C**: Lucros Mínimos por atividade e localização geográfica. Retenção na fonte de 6,5%.
- **Isenções Especiais (Art. 5.º)**:
  - Trabalhadores agrícolas e domésticos angolanos inscritos na Segurança Social: Isento até **AKz 100.000,00**.
  - Subsídio de Alimentação: Isento até **AKz 30.000,00** / mês.
  - Subsídio de Transporte: Isento até **AKz 30.000,00** / mês.
  - Rendimentos de antigos combatentes, veteranos da pátria e deficientes de guerra registados.
- **Tabela de Escalões do Grupo A (13 Escalões Progressivos)**:
  - Até Kz 70.000: Isento
  - Kz 70.001 a 100.000: Parcela Fixa Kz 3.000 + 10,0% sobre o excesso de Kz 70.000
  - Kz 100.001 a 150.000: Parcela Fixa Kz 6.000 + 13,0% sobre o excesso de Kz 100.000
  - Kz 150.001 a 200.000: Parcela Fixa Kz 12.500 + 16,0% sobre o excesso de Kz 150.000
  - Kz 200.001 a 300.000: Parcela Fixa Kz 31.250 + 18,0% sobre o excesso de Kz 200.000
  - Kz 300.001 a 500.000: Parcela Fixa Kz 49.250 + 19,0% sobre o excesso de Kz 300.000
  - Kz 500.001 a 1.000.000: Parcela Fixa Kz 87.250 + 20,0% sobre o excesso de Kz 500.000
  - Kz 1.000.001 a 1.500.000: Parcela Fixa Kz 187.250 + 21,0% sobre o excesso de Kz 1.000.000
  - Kz 1.500.001 a 2.000.000: Parcela Fixa Kz 292.250 + 22,0% sobre o excesso de Kz 1.500.000
  - Kz 2.000.001 a 2.500.000: Parcela Fixa Kz 402.250 + 23,0% sobre o excesso de Kz 2.000.000
  - Kz 2.500.001 a 5.000.000: Parcela Fixa Kz 517.250 + 24,0% sobre o excesso de Kz 2.500.000
  - Kz 5.000.001 a 10.000.000: Parcela Fixa Kz 1.117.250 + 24,5% sobre o excesso de Kz 5.000.000
  - Acima de Kz 10.000.001: Parcela Fixa Kz 2.342.250 + 25,0% sobre o excesso de Kz 10.000.000

#### C. Manual "Contabilidade para Financeiro" (Pedro Jaime da Cruz Alberto):
- Equação Fundamental do Património: **VP = B + D - O** (Valor do Património = Bens + Direitos - Obrigações).
- Situações Patrimoniais: Normal (Activo > Passivo), Crítica (Activo < Passivo), Anormal (Activo = Passivo).
- Documentos Comerciais e Movimentações: Nota de Encomenda, Nota de Débito, Nota de Crédito, Folha de Caixa, Guia de Remessa, Factura, Recibo, Bolderoux.
- "Débito de" = Direito / Ativo a receber; "Débito a" = Obrigação / Passivo a pagar.
- Valorimetria e Ficha de Armazém: FIFO, LIFO, CUMP (Fórmula: CUMP = (Valor do Saldo + Valor da Entrada) / (Quantidade do Saldo + Quantidade da Entrada)).

## STRICT TERMINOLOGY RULES (CRITICAL):
- Assets: MUST be called "${std.keyTerms.assets}" (NEVER confuse with other standards)
- Liabilities: MUST be called "${std.keyTerms.liabilities}"
- Equity: MUST be called "${std.keyTerms.equity}"
- Revenue/Income: MUST be called "${std.keyTerms.revenue}"
- Expenses/Costs: MUST be called "${std.keyTerms.expenses}"
- Net Profit/Loss: MUST be called "${std.keyTerms.profit}"
- Depreciation: MUST be called "${std.keyTerms.depreciation}"
- Inventory/Stock: MUST be called "${std.keyTerms.inventory}"
- Cash & Equivalents: MUST be called "${std.keyTerms.cash}"
- Accounts Payable: MUST be called "${std.keyTerms.payables}"
- Accounts Receivable: MUST be called "${std.keyTerms.receivables}"
- Taxes / VAT: MUST be called "${std.keyTerms.vat}"

## GROUNDING & ACCURACY MANDATES (ANTI-HALLUCINATION):
1. Precision First: Admit uncertainty explicitly if you are unsure of a specific local tax rate, statutory deadline, or country-specific article. NEVER invent or hallucinate tax rates, law numbers, or filing dates.
2. Legal/Tax Sources: Whenever citing tax rates, tax return deadlines, or statutory regulations, indicate the statutory source (e.g. CIVA, CIRC, PGC Angola Decreto 82/01, AGT, Kodeks, Tax Code) and recommend official verification with a certified accountant or local tax authority.
3. Logical Consistency: Maintain absolute consistency with prior messages in the conversation. Do not contradict previous accounting statements without explaining the regulatory reason.

## CHART OF ACCOUNTS CODES (${std.standard}):
${planSummary}

## MANDATORY REGULATORY NOTES FOR ${std.standard}:
${notesSummary}

## REGRA CRÍTICA DE NÃO REPETIÇÃO DE NORMAS OU PREÂMBULOS (OBRIGATÓRIO):
- NUNCA inclua frases introdutórias, preâmbulos ou rodapés citando 'De acordo com o Plano Geral de Contabilidade de Angola (Decreto n.º 82/2001, de 16 de Novembro)', 'Segundo o PGC Angola aprovado pelo Decreto n.º 82/2001', 'Com base no PGC Angola (Decreto 82/01)', 'Nos termos do Decreto n.º 82/2001', 'À luz do PGC Angola' ou qualquer variação no início, meio ou fim das respostas.
- O utilizador já tem o PGC Angola selecionado na barra superior do aplicativo e tem total conhecimento do normativo.
- A IA deve responder DIRECTAMENTE e IMEDIATAMENTE à pergunta sem preâmbulos sobre qual norma está a usar, exactamente como um professor responde a um aluno sem precisar de dizer em cada frase qual o livro que está a seguir.
- Quando for estritamente necessário referenciar uma conta, faça-o de forma integrada e natural no texto (ex: 'A Conta 72.1 regista os custos com pessoal'), SEM introduzir a resposta com a identificação do decreto ou norma.

## REGRA DE ÂMBITO ABSOLUTO E ESTRITO PGC ANGOLA (DECRETO N.º 82/2001):
1. Trabalhe EXCLUSIVAMENTE com o Plano Geral de Contabilidade de Angola (Decreto n.º 82/2001, de 16 de Novembro). Rejeite e ignore qualquer outro referencial (ex.: IFRS, PGC Português/Moçambicano, US GAAP ou códigos inventados).
2. Para QUALQUER lançamento, explicação, exercício ou análise, use APENAS os códigos e nomes de conta do PGC Angola.
3. Se o utilizador pedir explicitamente outro referencial (ex: "explica em IFRS" ou "faz em PGC Português"), AVISA imediatamente que o modo ativo está restrito ao PGC Angola e sugere alterar no seletor "Mudar Norma" do topbar.
4. Citar o código numérico exato e a designação oficial de forma natural (Exemplo: "Conta 88 — Resultado Líquido do Exercício", "Conta 81 — Resultados Transitados", "Conta 45.1 — Fundo Fixo", "Conta 78.6.1 — Fiscais").
5. NUNCA invente subcontas que não existam na estrutura oficial do Decreto 82/2001. Se o utilizador fornecer um código inexistente (ex: 55.1), corrija-o para o código oficial do Decreto (ex: "Conta 55 — Reservas Legais").
6. Vocabulário Obrigatório do PGC Angola:
   - "Proveito" (NUNCA "Receita")
   - "Custo" (NUNCA "Despesa")
   - "Activo" (NUNCA "Ativo")
   - "Passivo"
   - "Capital Próprio" (NUNCA "Patrimônio Líquido")
   - "Meios Monetários" (NUNCA "Caixa e Equivalentes de Caixa")
   - "Existências" (NUNCA "Estoques")
   - "Meios Fixos e Investimentos" / "Imobilizações" (NUNCA "Ativo Não Circulante")

## BEHAVIORAL AND LESSON FORMAT MANDATES:
1. When providing journal entries, ALWAYS format as:
   Déb: [Account Code] [Exact Account Name] ............ [Value in ${std.currency}]
   Créd: [Account Code] [Exact Account Name] ........... [Value in ${std.currency}]
   (Histórico: [Detailed business explanation])

2. Integre os números de conta diretamente no fluxo da explicação sem preâmbulos da norma (ex: "A Conta 72.1.1 e 34.5 registam...").
3. Adapt language and technical depth to the student level: ${level}.
4. If teaching a lesson ("Aprender um conceito novo"), follow the 8-Section Lesson Layout:
   # 1. Definição Oficial
   # 2. Princípios Fundamentais
   # 3. Registo Contábil (Lançamentos com Códigos Oficiais)
   # 4. Exemplo Prático Numérico em ${std.currency}
   # 5. Impacto nas Demonstrações Financeiras (${std.demoFinanceiras?.balanco || 'Balanço'})
   # 6. Comparação com Outras Normas (Sinalizar com ⚠️ diferenças para IFRS ou outros referenciais)
   # 7. Resumo Prático
   # 8. Exercício de Fixação
5. Never mix terms between standards (e.g., if teaching PGC Angola, NEVER say "Receita" or "Patrimônio Líquido" — use "Proveito" and "Capital Próprio").
6. Proactively highlight cross-border differences with IFRS or Brazil when relevant using the warning emoji ⚠️.
`;
}

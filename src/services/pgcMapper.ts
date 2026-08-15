import { TrialBalanceAccount, PgcBalanceSheet, PgcLineItem, formatKwanza } from './pgcMappingService';

export type ForeignStandard = 
  | 'SNC_PORTUGAL' 
  | 'PCG_FRANCE' 
  | 'SYSCOHADA' 
  | 'IFRS_GLOBAL' 
  | 'PGC_SPAIN' 
  | 'COSIF_BRAZIL' 
  | 'GENERIC_CUSTOM';

export interface PgcRubricDefinition {
  pgcCode: string;
  designation: string;
  noteNumber: number | string;
  classNumber: number;
  category: 'ANC' | 'AC' | 'CP' | 'PNC' | 'PC' | 'PROVEITOS' | 'CUSTOS' | 'RESULTADOS';
  keywords: string[];
}

/**
 * Official PGC Angola (Decreto n.º 82/2001) Rubrics Dictionary
 */
export const OFFICIAL_PGC_ANGOLA_RUBRICS: PgcRubricDefinition[] = [
  // Class 1 - Meios Fixos e Investimentos
  {
    pgcCode: '11',
    designation: 'Imobilizações corpóreas',
    noteNumber: 4,
    classNumber: 1,
    category: 'ANC',
    keywords: ['corpóreas', 'imobilizado corpóreo', 'terrenos', 'edifícios', 'construções', 'equipamento', 'viaturas', 'tangible', 'property plant equipment', 'immobilisations corporelles', 'activo imobilizado']
  },
  {
    pgcCode: '12',
    designation: 'Imobilizações incorpóreas',
    noteNumber: 5,
    classNumber: 1,
    category: 'ANC',
    keywords: ['incorpóreas', 'imobilizado incorpóreo', 'trespasses', 'marcas', 'patentes', 'licenças', 'programas informáticos', 'intangible', 'goodwill', 'immobilisations incorporelles']
  },
  {
    pgcCode: '13',
    designation: 'Investimentos em subsidiárias e associadas',
    noteNumber: 6,
    classNumber: 1,
    category: 'ANC',
    keywords: ['subsidiárias', 'associadas', 'participações', 'investimentos financeiros', 'partiçoes de capital', 'subsidiaries', 'associates', 'participations']
  },
  {
    pgcCode: '14, 15',
    designation: 'Outros activos financeiros',
    noteNumber: 7,
    classNumber: 1,
    category: 'ANC',
    keywords: ['outros activos financeiros', 'títulos de investimento', 'outros investimentos', 'financial assets', 'outros creditos mlp']
  },
  {
    pgcCode: '16, 17',
    designation: 'Outros activos não correntes',
    noteNumber: 9,
    classNumber: 1,
    category: 'ANC',
    keywords: ['outros activos não correntes', 'cauções mlp', 'imobilizações em curso', 'non-current assets']
  },

  // Class 2 - Existências
  {
    pgcCode: 'Classe 2',
    designation: 'Existências',
    noteNumber: 8,
    classNumber: 2,
    category: 'AC',
    keywords: ['existências', 'inventários', 'compras', 'matérias-primas', 'produtos acabados', 'mercadorias', 'inventory', 'stocks', 'inventarios']
  },

  // Class 3 - Terceiros
  {
    pgcCode: '31, 38',
    designation: 'Contas a receber',
    noteNumber: 9,
    classNumber: 3,
    category: 'AC',
    keywords: ['clientes', 'contas a receber', 'devedores', 'accounts receivable', 'trade receivables', 'créances clients', 'clientes correntes']
  },
  {
    pgcCode: '32, 34, 36',
    designation: 'Contas a pagar',
    noteNumber: 19,
    classNumber: 3,
    category: 'PC',
    keywords: ['fornecedores', 'contas a pagar', 'credores', 'estado', 'pessoal', 'salários a pagar', 'iva a pagar', 'accounts payable', 'trade payables', 'dettes fournisseurs']
  },
  {
    pgcCode: '33.1',
    designation: 'Empréstimos de curto prazo',
    noteNumber: 20,
    classNumber: 3,
    category: 'PC',
    keywords: ['empréstimos curto prazo', 'financiamentos cp', 'bancos cp', 'short term loans', 'short-term debt']
  },
  {
    pgcCode: '33.2',
    designation: 'Empréstimos de médio e longo prazos',
    noteNumber: 15,
    classNumber: 3,
    category: 'PNC',
    keywords: ['empréstimos longo prazo', 'financiamentos mlp', 'bancos mlp', 'long term loans', 'emprunt a long terme']
  },

  // Class 4 - Meios Monetários
  {
    pgcCode: 'Classe 4',
    designation: 'Disponibilidades',
    noteNumber: 10,
    classNumber: 4,
    category: 'AC',
    keywords: ['disponibilidades', 'caixa', 'depósitos à ordem', 'depósitos a prazo', 'meios monetários', 'cash and cash equivalents', 'bancos', 'trésorerie']
  },

  // Class 5 & 8 - Capital Próprio e Resultados
  {
    pgcCode: '51, 52',
    designation: 'Capital',
    noteNumber: 12,
    classNumber: 5,
    category: 'CP',
    keywords: ['capital social', 'capital subscrito', 'capital social realizado', 'share capital', 'capital social']
  },
  {
    pgcCode: '53-58',
    designation: 'Reservas',
    noteNumber: 13,
    classNumber: 5,
    category: 'CP',
    keywords: ['reservas', 'reserva legal', 'reservas estatutárias', 'prémios de emissão', 'reserves', 'retained earnings reserves']
  },
  {
    pgcCode: '81',
    designation: 'Resultados transitados',
    noteNumber: 14,
    classNumber: 8,
    category: 'CP',
    keywords: ['resultados transitados', 'lucros retidos', 'prejuízos acumulados', 'retained earnings', 'report a nouveau']
  },
  {
    pgcCode: '88',
    designation: 'Resultados do exercício',
    noteNumber: '—',
    classNumber: 8,
    category: 'CP',
    keywords: ['resultado do exercício', 'resultado líquido', 'lucro líquido', 'prejuízo líquido', 'net profit', 'net income', 'bénéfice net']
  }
];

export interface PgcAuditResult {
  totalRubrics: number;
  mappedRubricsCount: number;
  unmappedOrZeroRubricsCount: number;
  missingMandatoryRubrics: {
    id: string;
    designation: string;
    pgcCode: string;
    category: string;
    status: 'SEM_SALDO' | 'NAO_MAPEADA';
    recommendation: string;
  }[];
  unmappedAccountsCount: number;
  unmappedAccountsList: TrialBalanceAccount[];
  compliancePercentage: number;
  overallStatus: 'CONFORME' | 'ATENCAO_NECESSARIA' | 'INCOMPLETO';
  auditSummaryMessage: string;
}

/**
 * Intelligent mapping algorithm to convert foreign account code/name to official PGC Angola Account
 */
export function mapForeignAccountToPgc(
  code: string,
  name: string,
  standard: ForeignStandard = 'GENERIC_CUSTOM'
): { pgcCode: string; pgcRubric: string; category: string } {
  const cleanCode = code.trim();
  const lowerName = name.toLowerCase();

  // Direct PGC Code prefix match if already formatted in PGC Angola / Portugal SNC
  if (cleanCode.startsWith('11')) return { pgcCode: '11', pgcRubric: 'Imobilizações corpóreas', category: 'ANC' };
  if (cleanCode.startsWith('12')) return { pgcCode: '12', pgcRubric: 'Imobilizações incorpóreas', category: 'ANC' };
  if (cleanCode.startsWith('13')) return { pgcCode: '13', pgcRubric: 'Investimentos em subsidiárias e associadas', category: 'ANC' };
  if (cleanCode.startsWith('14') || cleanCode.startsWith('15')) return { pgcCode: '14, 15', pgcRubric: 'Outros activos financeiros', category: 'ANC' };
  if (cleanCode.startsWith('2')) return { pgcCode: 'Classe 2', pgcRubric: 'Existências', category: 'AC' };
  if (cleanCode.startsWith('31') || cleanCode.startsWith('38')) return { pgcCode: '31, 38', pgcRubric: 'Contas a receber', category: 'AC' };
  if (cleanCode.startsWith('32') || cleanCode.startsWith('34') || cleanCode.startsWith('36')) return { pgcCode: '32, 34, 36', pgcRubric: 'Contas a pagar', category: 'PC' };
  if (cleanCode.startsWith('33.1')) return { pgcCode: '33.1', pgcRubric: 'Empréstimos de curto prazo', category: 'PC' };
  if (cleanCode.startsWith('33.2')) return { pgcCode: '33.2', pgcRubric: 'Empréstimos de médio e longo prazos', category: 'PNC' };
  if (cleanCode.startsWith('4')) return { pgcCode: 'Classe 4', pgcRubric: 'Disponibilidades', category: 'AC' };
  if (cleanCode.startsWith('51') || cleanCode.startsWith('52')) return { pgcCode: '51, 52', pgcRubric: 'Capital', category: 'CP' };
  if (cleanCode.startsWith('53') || cleanCode.startsWith('55') || cleanCode.startsWith('56') || cleanCode.startsWith('57') || cleanCode.startsWith('58')) return { pgcCode: '53-58', pgcRubric: 'Reservas', category: 'CP' };
  if (cleanCode.startsWith('81')) return { pgcCode: '81', pgcRubric: 'Resultados transitados', category: 'CP' };
  if (cleanCode.startsWith('88')) return { pgcCode: '88', pgcRubric: 'Resultados do exercício', category: 'CP' };

  // Advanced Keyword Fuzzy Matching for IFRS / French PCG / SYSCOHADA / Spanish PGC / Brazilian COSIF
  for (const rubric of OFFICIAL_PGC_ANGOLA_RUBRICS) {
    if (rubric.keywords.some(kw => lowerName.includes(kw))) {
      return {
        pgcCode: rubric.pgcCode,
        pgcRubric: rubric.designation,
        category: rubric.category
      };
    }
  }

  // Generic fallback based on numeric code range
  const firstDigit = cleanCode.charAt(0);
  switch (firstDigit) {
    case '1': return { pgcCode: '11-19', pgcRubric: 'Imobilizações e Activos Não Correntes', category: 'ANC' };
    case '2': return { pgcCode: 'Classe 2', pgcRubric: 'Existências', category: 'AC' };
    case '3': return { pgcCode: 'Classe 3', pgcRubric: 'Terceiros / Contas Correntes', category: 'AC' };
    case '4': return { pgcCode: 'Classe 4', pgcRubric: 'Disponibilidades / Meios Monetários', category: 'AC' };
    case '5': return { pgcCode: 'Classe 5', pgcRubric: 'Capital e Reservas', category: 'CP' };
    case '6': return { pgcCode: 'Classe 6', pgcRubric: 'Proveitos por Natureza', category: 'PROVEITOS' };
    case '7': return { pgcCode: 'Classe 7', pgcRubric: 'Custos por Natureza', category: 'CUSTOS' };
    case '8': return { pgcCode: 'Classe 8', pgcRubric: 'Resultados', category: 'RESULTADOS' };
    default: return { pgcCode: 'OUTRAS', pgcRubric: 'Rubrica Personalizada / A Mapear', category: 'AC' };
  }
}

/**
 * Runs an in-depth PGC audit on a generated PgcBalanceSheet
 * Lists specific rubrics (e.g. 'Imobilizações corpóreas') with zero values or missing mappings.
 */
export function auditPgcMapping(
  pgcBalanceSheet: PgcBalanceSheet
): PgcAuditResult {
  const mandatoryRubrics = [
    { id: 'anc_1', designation: 'Imobilizações corpóreas', pgcCode: '11', category: 'Activo Não Corrente', list: pgcBalanceSheet.activeNonCurrent },
    { id: 'anc_2', designation: 'Imobilizações incorpóreas', pgcCode: '12', category: 'Activo Não Corrente', list: pgcBalanceSheet.activeNonCurrent },
    { id: 'ac_1', designation: 'Existências', pgcCode: 'Classe 2', category: 'Activo Corrente', list: pgcBalanceSheet.activeCurrent },
    { id: 'ac_2', designation: 'Contas a receber', pgcCode: '31, 38', category: 'Activo Corrente', list: pgcBalanceSheet.activeCurrent },
    { id: 'ac_3', designation: 'Disponibilidades', pgcCode: 'Classe 4', category: 'Activo Corrente', list: pgcBalanceSheet.activeCurrent },
    { id: 'cp_1', designation: 'Capital', pgcCode: '51, 52', category: 'Capital Próprio', list: pgcBalanceSheet.equity },
    { id: 'cp_2', designation: 'Reservas', pgcCode: '53-58', category: 'Capital Próprio', list: pgcBalanceSheet.equity },
    { id: 'cp_3', designation: 'Resultados transitados', pgcCode: '81', category: 'Capital Próprio', list: pgcBalanceSheet.equity },
    { id: 'cp_4', designation: 'Resultados do exercício', pgcCode: '88', category: 'Capital Próprio', list: pgcBalanceSheet.equity },
    { id: 'pc_1', designation: 'Contas a pagar', pgcCode: '32, 34, 36', category: 'Passivo Corrente', list: pgcBalanceSheet.passiveCurrent },
    { id: 'pnc_1', designation: 'Empréstimos de médio e longo prazos', pgcCode: '33.2', category: 'Passivo Não Corrente', list: pgcBalanceSheet.passiveNonCurrent },
  ];

  const totalRubrics = mandatoryRubrics.length;
  let mappedRubricsCount = 0;
  const missingMandatory: PgcAuditResult['missingMandatoryRubrics'] = [];

  mandatoryRubrics.forEach(rubric => {
    const foundItem = rubric.list.find(i => i.designation === rubric.designation || i.id === rubric.id);
    const hasValue = foundItem && foundItem.currentYear > 0;

    if (hasValue) {
      mappedRubricsCount++;
    } else {
      missingMandatory.push({
        id: rubric.id,
        designation: rubric.designation,
        pgcCode: rubric.pgcCode,
        category: rubric.category,
        status: !foundItem ? 'NAO_MAPEADA' : 'SEM_SALDO',
        recommendation: !foundItem 
          ? `Adicionar conta de origem com prefixo PGC ${rubric.pgcCode} ou associar ao grupo ${rubric.category}.`
          : `A rubrica '${rubric.designation}' está no mapa mas tem saldo nulo (0,00 Kz). Confirmar com o balancete de verificação.`
      });
    }
  });

  const unmappedAccountsList = pgcBalanceSheet.unmappedAccounts || [];
  const unmappedAccountsCount = unmappedAccountsList.length;
  const unmappedOrZeroRubricsCount = missingMandatory.length;

  const compliancePercentage = Math.round((mappedRubricsCount / totalRubrics) * 100);

  let overallStatus: PgcAuditResult['overallStatus'] = 'CONFORME';
  if (unmappedOrZeroRubricsCount > 4 || !pgcBalanceSheet.isBalanced || unmappedAccountsCount > 0) {
    overallStatus = 'ATENCAO_NECESSARIA';
  }
  if (unmappedOrZeroRubricsCount > 7 || compliancePercentage < 40) {
    overallStatus = 'INCOMPLETO';
  }

  let auditSummaryMessage = `Balanço verificado com ${compliancePercentage}% de preenchimento de rubricas oficiais do PGC Angola.`;
  if (missingMandatory.length > 0) {
    auditSummaryMessage += ` Identificadas ${missingMandatory.length} rubrica(s) sem saldo ou pendentes de revisão.`;
  }
  if (unmappedAccountsCount > 0) {
    auditSummaryMessage += ` Encontradas ${unmappedAccountsCount} conta(s) não mapeadas no balancete de origem.`;
  }

  return {
    totalRubrics,
    mappedRubricsCount,
    unmappedOrZeroRubricsCount,
    missingMandatoryRubrics: missingMandatory,
    unmappedAccountsCount,
    unmappedAccountsList,
    compliancePercentage,
    overallStatus,
    auditSummaryMessage
  };
}

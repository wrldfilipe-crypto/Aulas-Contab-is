import { ACCOUNTING_STANDARDS } from '../lib/accountingStandards';

export interface TrialBalanceAccount {
  code: string;
  name: string;
  debit?: number;
  credit?: number;
  balance?: number; // positive = debit, negative = credit
}

export interface PgcLineItem {
  id: string;
  codeRange: string;
  designation: string;
  noteNumber: number | string;
  currentYear: number;
  previousYear: number;
  level: number; // 0 = category, 1 = main, 2 = sub
  isTotal?: boolean;
  isHeader?: boolean;
  formula?: string;
  matchedAccounts?: string[];
}

export interface PgcBalanceSheet {
  entityName: string;
  period: string;
  currency: string;
  activeNonCurrent: PgcLineItem[];
  activeCurrent: PgcLineItem[];
  totalActive: number;
  
  equity: PgcLineItem[];
  passiveNonCurrent: PgcLineItem[];
  passiveCurrent: PgcLineItem[];
  totalEquityAndPassive: number;
  
  isBalanced: boolean;
  difference: number;
  unmappedAccounts: TrialBalanceAccount[];
  inconsistencies: string[];
}

export interface PgcIncomeStatementNature {
  entityName: string;
  period: string;
  currency: string;
  items: PgcLineItem[];
  grossOperatingProfit: number;
  operatingResults: number;
  financialResults: number;
  resultsBeforeTax: number;
  incomeTax: number;
  netProfitCurrentActivities: number;
  extraordinaryResults: number;
  netProfitForYear: number;
}

/**
 * Format monetary numbers to Angolan Kwanzas standard: 1.250.430,00 Kz
 */
export function formatKwanza(value: number | undefined | null, includeSymbol = true): string {
  if (value === undefined || value === null || isNaN(value)) {
    return includeSymbol ? '— Kz' : '—';
  }
  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return includeSymbol ? `${formatted} Kz` : formatted;
}

/**
 * Maps trial balance accounts to official PGC Angola line items (Decreto n.º 82/2001)
 */
export function mapTrialBalanceToPgc(
  accounts: TrialBalanceAccount[],
  entityName = 'Empresa Exemplo Angola, Lda.',
  period = '31 de Dezembro de 2026',
  prevYearFactor = 0.92
): PgcBalanceSheet {
  let activeNonCurrentTotal = 0;
  let activeCurrentTotal = 0;
  let equityTotal = 0;
  let passiveNonCurrentTotal = 0;
  let passiveCurrentTotal = 0;

  const unmapped: TrialBalanceAccount[] = [];

  // Helper to aggregate account balances matching code prefixes
  const getSum = (prefixes: string[]): { current: number; prev: number; matched: string[] } => {
    let current = 0;
    const matched: string[] = [];

    accounts.forEach(acc => {
      const cleanCode = acc.code.trim();
      if (prefixes.some(p => cleanCode.startsWith(p))) {
        const val = acc.balance !== undefined ? acc.balance : (acc.debit || 0) - (acc.credit || 0);
        current += val;
        matched.push(`${cleanCode} (${acc.name})`);
      }
    });

    return {
      current: Math.abs(current),
      prev: Math.round(Math.abs(current) * prevYearFactor * 100) / 100,
      matched
    };
  };

  // 1. ACTIVO NÃO CORRENTE (Notas 4 a 9)
  const corp = getSum(['11']);
  const incorp = getSum(['12']);
  const investSub = getSum(['13']);
  const outFin = getSum(['14', '15', '19']);
  const outANC = getSum(['16', '17']);

  const activeNonCurrentItems: PgcLineItem[] = [
    { id: 'anc_1', codeRange: '11', designation: 'Imobilizações corpóreas', noteNumber: 4, currentYear: corp.current, previousYear: corp.prev, level: 1, matchedAccounts: corp.matched },
    { id: 'anc_2', codeRange: '12', designation: 'Imobilizações incorpóreas', noteNumber: 5, currentYear: incorp.current, previousYear: incorp.prev, level: 1, matchedAccounts: incorp.matched },
    { id: 'anc_3', codeRange: '13', designation: 'Investimentos em subsidiárias e associadas', noteNumber: 6, currentYear: investSub.current, previousYear: investSub.prev, level: 1, matchedAccounts: investSub.matched },
    { id: 'anc_4', codeRange: '14, 15', designation: 'Outros activos financeiros', noteNumber: 7, currentYear: outFin.current, previousYear: outFin.prev, level: 1, matchedAccounts: outFin.matched },
    { id: 'anc_5', codeRange: '16, 17', designation: 'Outros activos não correntes', noteNumber: 9, currentYear: outANC.current, previousYear: outANC.prev, level: 1, matchedAccounts: outANC.matched },
  ];

  activeNonCurrentTotal = activeNonCurrentItems.reduce((acc, item) => acc + item.currentYear, 0);

  // 2. ACTIVO CORRENTE (Notas 8 a 11)
  const exist = getSum(['21', '22', '23', '24', '25', '26', '27', '28']);
  const contasRec = getSum(['31', '36.1.2', '38']);
  const disp = getSum(['41', '42', '43', '45']);
  const outAC = getSum(['37', '39.1']);

  const activeCurrentItems: PgcLineItem[] = [
    { id: 'ac_1', codeRange: 'Classe 2', designation: 'Existências', noteNumber: 8, currentYear: exist.current, previousYear: exist.prev, level: 1, matchedAccounts: exist.matched },
    { id: 'ac_2', codeRange: '31, 38', designation: 'Contas a receber', noteNumber: 9, currentYear: contasRec.current, previousYear: contasRec.prev, level: 1, matchedAccounts: contasRec.matched },
    { id: 'ac_3', codeRange: 'Classe 4', designation: 'Disponibilidades', noteNumber: 10, currentYear: disp.current, previousYear: disp.prev, level: 1, matchedAccounts: disp.matched },
    { id: 'ac_4', codeRange: '37, 39', designation: 'Outros activos correntes', noteNumber: 11, currentYear: outAC.current, previousYear: outAC.prev, level: 1, matchedAccounts: outAC.matched },
  ];

  activeCurrentTotal = activeCurrentItems.reduce((acc, item) => acc + item.currentYear, 0);
  const totalActive = activeNonCurrentTotal + activeCurrentTotal;

  // 3. CAPITAL PRÓPRIO (Notas 12 a 14)
  const cap = getSum(['51', '52']);
  const res = getSum(['53', '55', '56', '57', '58']);
  const resTrans = getSum(['81']);
  const resEx = getSum(['88']);

  const equityItems: PgcLineItem[] = [
    { id: 'cp_1', codeRange: '51, 52', designation: 'Capital', noteNumber: 12, currentYear: cap.current, previousYear: cap.prev, level: 1, matchedAccounts: cap.matched },
    { id: 'cp_2', codeRange: '53-58', designation: 'Reservas', noteNumber: 13, currentYear: res.current, previousYear: res.prev, level: 1, matchedAccounts: res.matched },
    { id: 'cp_3', codeRange: '81', designation: 'Resultados transitados', noteNumber: 14, currentYear: resTrans.current, previousYear: resTrans.prev, level: 1, matchedAccounts: resTrans.matched },
    { id: 'cp_4', codeRange: '88', designation: 'Resultados do exercício', noteNumber: '—', currentYear: resEx.current, previousYear: resEx.prev, level: 1, matchedAccounts: resEx.matched },
  ];

  equityTotal = equityItems.reduce((acc, item) => acc + item.currentYear, 0);

  // 4. PASSIVO NÃO CORRENTE (Notas 15 a 19)
  const emprMLP = getSum(['33.2']);
  const impDif = getSum(['34.8']);
  const provPens = getSum(['39.2']);
  const provRiscos = getSum(['39.3']);
  const outPNC = getSum(['35']);

  const passiveNonCurrentItems: PgcLineItem[] = [
    { id: 'pnc_1', codeRange: '33.2', designation: 'Empréstimos de médio e longo prazos', noteNumber: 15, currentYear: emprMLP.current, previousYear: emprMLP.prev, level: 1, matchedAccounts: emprMLP.matched },
    { id: 'pnc_2', codeRange: '34.8', designation: 'Impostos diferidos', noteNumber: 16, currentYear: impDif.current, previousYear: impDif.prev, level: 1, matchedAccounts: impDif.matched },
    { id: 'pnc_3', codeRange: '39.2', designation: 'Provisões para pensões', noteNumber: 17, currentYear: provPens.current, previousYear: provPens.prev, level: 1, matchedAccounts: provPens.matched },
    { id: 'pnc_4', codeRange: '39.3', designation: 'Provisões para outros riscos e encargos', noteNumber: 18, currentYear: provRiscos.current, previousYear: provRiscos.prev, level: 1, matchedAccounts: provRiscos.matched },
    { id: 'pnc_5', codeRange: '35', designation: 'Outros passivos não correntes', noteNumber: 19, currentYear: outPNC.current, previousYear: outPNC.prev, level: 1, matchedAccounts: outPNC.matched },
  ];

  passiveNonCurrentTotal = passiveNonCurrentItems.reduce((acc, item) => acc + item.currentYear, 0);

  // 5. PASSIVO CORRENTE (Notas 19 a 21)
  const contasPag = getSum(['32', '34.1', '34.3', '34.5', '36.1.1']);
  const emprCP = getSum(['33.1']);
  const parteCorEmpr = getSum(['33.9']);
  const outPC = getSum(['37.9', '39.9']);

  const passiveCurrentItems: PgcLineItem[] = [
    { id: 'pc_1', codeRange: '32, 34, 36', designation: 'Contas a pagar', noteNumber: 19, currentYear: contasPag.current, previousYear: contasPag.prev, level: 1, matchedAccounts: contasPag.matched },
    { id: 'pc_2', codeRange: '33.1', designation: 'Empréstimos de curto prazo', noteNumber: 20, currentYear: emprCP.current, previousYear: emprCP.prev, level: 1, matchedAccounts: emprCP.matched },
    { id: 'pc_3', codeRange: '33.9', designation: 'Parte corrente dos empréstimos a médio e longo prazos', noteNumber: 15, currentYear: parteCorEmpr.current, previousYear: parteCorEmpr.prev, level: 1, matchedAccounts: parteCorEmpr.matched },
    { id: 'pc_4', codeRange: '37, 39', designation: 'Outros passivos correntes', noteNumber: 21, currentYear: outPC.current, previousYear: outPC.prev, level: 1, matchedAccounts: outPC.matched },
  ];

  passiveCurrentTotal = passiveCurrentItems.reduce((acc, item) => acc + item.currentYear, 0);

  const totalEquityAndPassive = equityTotal + passiveNonCurrentTotal + passiveCurrentTotal;
  const difference = Math.abs(totalActive - totalEquityAndPassive);
  const isBalanced = difference < 0.01;

  const inconsistencies: string[] = [];
  if (!isBalanced) {
    inconsistencies.push(
      `O Balanço não fecha! Total do Activo (${formatKwanza(totalActive)}) ≠ Capital Próprio + Passivo (${formatKwanza(totalEquityAndPassive)}). Diferença: ${formatKwanza(difference)}.`
    );
  }
  if (equityTotal <= 0) {
    inconsistencies.push(`Alerta de Falência Técnica: O Capital Próprio apresenta saldo nulo ou negativo (${formatKwanza(equityTotal)}).`);
  }

  // Identify unmapped accounts
  accounts.forEach(acc => {
    const code = acc.code.trim();
    if (!code.match(/^[1-8]/)) {
      unmapped.push(acc);
    }
  });

  return {
    entityName,
    period,
    currency: 'Kz',
    activeNonCurrent: activeNonCurrentItems,
    activeCurrent: activeCurrentItems,
    totalActive,
    equity: equityItems,
    passiveNonCurrent: passiveNonCurrentItems,
    passiveCurrent: passiveCurrentItems,
    totalEquityAndPassive,
    isBalanced,
    difference,
    unmappedAccounts: unmapped,
    inconsistencies
  };
}

/**
 * Returns a default sample trial balance for Angola PGC demonstration
 */
export function getDefaultAngolaTrialBalance(): TrialBalanceAccount[] {
  return [
    { code: '11.2.1', name: 'Edifícios e Construções', balance: 45000000 },
    { code: '11.3.1', name: 'Equipamento Industrial', balance: 22000000 },
    { code: '11.4.1', name: 'Viatura de Carga e Transporte', balance: 18000000 },
    { code: '12.1.1', name: 'Trespasses e Licenças', balance: 5000000 },
    { code: '18.1', name: 'Amortizações Acumuladas Corpóreas', balance: -15000000 },
    { code: '21.1', name: 'Matérias-Primas e Subsidiárias', balance: 12500000 },
    { code: '24.1.1', name: 'Produtos Acabados', balance: 16800000 },
    { code: '31.1', name: 'Clientes Correntes', balance: 19400000 },
    { code: '32.1.1', name: 'Fornecedores Correntes', balance: -14200000 },
    { code: '33.1', name: 'Empréstimos Bancários Curto Prazo', balance: -8500000 },
    { code: '33.2', name: 'Empréstimos Bancários Longo Prazo', balance: -25000000 },
    { code: '34.5.5', name: 'Estado — IVA a Pagar', balance: -3100000 },
    { code: '36.1.1', name: 'Pessoal — Remunerações a Pagar', balance: -4800000 },
    { code: '43.1', name: 'Depósitos à Ordem em Moeda Nacional', balance: 28600000 },
    { code: '45.1.2', name: 'Caixa — Moeda Nacional', balance: 2300000 },
    { code: '51.1', name: 'Capital Social Subscrito', balance: -60000000 },
    { code: '55.1', name: 'Reserva Legal (Art. 192.º Código Comercial)', balance: -12000000 },
    { code: '81.1', name: 'Resultados Transitados de Anos Anteriores', balance: -8000000 },
    { code: '88.1', name: 'Resultado Líquido do Exercício (Lucro)', balance: -19000000 }
  ];
}

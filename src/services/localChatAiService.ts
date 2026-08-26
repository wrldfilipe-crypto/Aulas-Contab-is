/**
 * Local AI & Accounting Intelligence Service (PGC Angola, IFRS, SNC, NBC)
 * Provides offline-first, instant, high-precision responses when network or cloud AI is unreachable.
 */

export interface LocalChatResponse {
  text: string;
  isVisual?: boolean;
  diagramSvg?: string;
  modelUsed: string;
  offline: boolean;
}

const PGC_ACCOUNT_EXPLANATIONS: Record<string, { title: string; desc: string; debito: string; credito: string }> = {
  '11': {
    title: 'Conta 11 — Imobilizações Corpóreas',
    desc: 'Bens tangíveis, móveis ou imóveis, que a empresa utiliza na sua atividade operacional e que se espera utilizar durante mais de um período.',
    debito: 'Aquisições, benfeitorias, reavaliações positivas ou entradas de sócios.',
    credito: 'Abates, alienações, sinistros ou transferências.'
  },
  '12': {
    title: 'Conta 12 — Imobilizações Incorpóreas',
    desc: 'Ativos não monetários identificáveis, sem substância física (trespasse, patentes, software, licenças de exploração).',
    debito: 'Aquisições ou desenvolvimento interno capitalizável.',
    credito: 'Abates, alienações ou amortização total.'
  },
  '21': {
    title: 'Conta 21 — Mercadorias',
    desc: 'Bens adquiridos pela empresa com destino a revenda sem transformação.',
    debito: 'Compras a fornecedores, devoluções de vendas, entradas por regularização.',
    credito: 'Custo das mercadorias vendidas (CMVMC), quebras, devoluções a fornecedores.'
  },
  '24': {
    title: 'Conta 24 — Matérias-Primas',
    desc: 'Bens a incorporar no processo de produção/fabricação de produtos acabados.',
    debito: 'Compras, fretes de compras e encargos adicionais de receção.',
    credito: 'Consumos no processo de fabrico (transferência para Classe 7/Produtos).'
  },
  '31': {
    title: 'Conta 31 — Clientes',
    desc: 'Direitos a receber de terceiros resultantes de vendas ou prestações de serviços normais da entidade.',
    debito: 'Faturação emitida a crédito (aumento do crédito a receber).',
    credito: 'Recebimentos efetuados por Caixa/Banco, descontos de pronto pagamento, devoluções.'
  },
  '32': {
    title: 'Conta 32 — Fornecedores',
    desc: 'Obrigações a pagar a entidades externas pela compra de existências ou serviços operacionais.',
    debito: 'Pagamentos efetuados (Caixa/Banco), adiantamentos regularizados, notas de crédito.',
    credito: 'Faturas recebidas de compras a prazo (aumento da dívida).'
  },
  '34': {
    title: 'Conta 34 — Estado e Outros Entes Públicos',
    desc: 'Dívidas fiscais e parafiscais (IVA, IRT, Imposto Industrial, Segurança Social 3%, Retenções na Fonte).',
    debito: 'Pagamentos das guias à AGT/INSS, IVA dedutível / a recuperar, retenções sofridas.',
    credito: 'IVA liquidado, impostos retidos na fonte a terceiros, imposto industrial apurado, segurança social devida.'
  },
  '36': {
    title: 'Conta 36 — Pessoal',
    desc: 'Relações da empresa com os seus colaboradores (remunerações a pagar, adiantamentos, cauções).',
    debito: 'Pagamento de salários líquidos, concessão de adiantamentos/vales.',
    credito: 'Processamento de salários brutos (por contrapartida da Conta 72).'
  },
  '43': {
    title: 'Conta 43 — Depósitos à Ordem (Bancos)',
    desc: 'Meios financeiros líquidos depositados em instituições bancárias movimentáveis por cheque ou transferência.',
    debito: 'Depósitos de numerário, transferências recebidas, cobranças bancárias.',
    credito: 'Pagamentos a fornecedores, transferências efetuadas, levantamentos, comissões bancárias.'
  },
  '45': {
    title: 'Conta 45 — Caixa',
    desc: 'Meios monetários em moeda com curso legal existentes fisicamente na tesouraria da empresa.',
    debito: 'Recebimentos de clientes em numerário, levantamentos do banco para tesouraria.',
    credito: 'Pagamentos a pronto em numerário, depósitos efetuados no banco.'
  },
  '51': {
    title: 'Conta 51 — Capital Social',
    desc: 'Valor nominal das participações subscritas e realizadas pelos sócios ou acionistas.',
    debito: 'Reduções de capital por amortização ou cobertura de prejuízos.',
    credito: 'Constituição da sociedade e aumentos de capital realizados.'
  },
  '61': {
    title: 'Conta 61 — Vendas',
    desc: 'Rendimentos provenientes da venda de mercadorias ou produtos acabados.',
    debito: 'Transferência para a Conta 88 no encerramento de contas do exercício.',
    credito: 'Faturação bruta de vendas emitida a clientes.'
  },
  '62': {
    title: 'Conta 62 — Prestações de Serviços',
    desc: 'Rendimentos auferidos pela prestação de serviços a terceiros no âmbito da atividade normal.',
    debito: 'Transferência para a Conta 88 no fecho do exercício.',
    credito: 'Faturação de serviços executados.'
  },
  '71': {
    title: 'Conta 71 — Custo das Mercadorias Vendidas e Matérias Consumidas (CMVMC)',
    desc: 'Custo de aquisição das existências que foram vendidas ou consumidas no período.',
    debito: 'Reconhecimento do custo de saída das mercadorias vendidas.',
    credito: 'Fecho do exercício para a Conta 81/88.'
  },
  '72': {
    title: 'Conta 72 — Custos com o Pessoal',
    desc: 'Encargos da empresa com remunerações, subsídios, indemnizações e Segurança Social (8% patronal).',
    debito: 'Processamento mensal de salários brutos e encargos sociais patronais.',
    credito: 'Encerramento de contas para a Conta 81/88.'
  },
  '75': {
    title: 'Conta 75 — Fornecimentos e Serviços Externos (FSE)',
    desc: 'Gastos com serviços contratados (eletricidade, água, comunicação, rendas, honorários, combustíveis, seguros).',
    debito: 'Faturas recebidas de prestadores de serviços de apoio operacional.',
    credito: 'Encerramento de contas no fecho do exercício.'
  },
  '78': {
    title: 'Conta 78 — Amortizações e Provisões do Exercício',
    desc: 'Depreciações sistemáticas do imobilizado corpóreo/incorpóreo e perdas por imparidade estimadas.',
    debito: 'Registo anual ou mensal das quotas de amortização e dotações a provisões.',
    credito: 'Encerramento de contas no final do exercício.'
  },
  '88': {
    title: 'Conta 88 — Resultado Líquido do Exercício',
    desc: 'Apuramento do lucro ou prejuízo final após consideração de todos os proveitos, custos e imposto sobre o rendimento.',
    debito: 'Se o exercício apurar prejuízo líquido ou na aplicação de resultados (dividendos/reservas).',
    credito: 'Se o exercício apurar lucro líquido após Imposto Industrial.'
  }
};

/**
 * Generates an intelligent, context-aware local accounting answer
 */
export function generateLocalChatAnswer(
  prompt: string,
  standard = 'PGC Angola (Decreto n.º 82/01)',
  language = 'pt-PT'
): LocalChatResponse {
  const query = (prompt || '').toLowerCase().trim();

  // 1. Check for specific account number mentions (e.g., conta 31, conta 32, conta 43, conta 72)
  const accountMatch = query.match(/\bconta\s*([0-9]{2})\b/i);
  if (accountMatch && accountMatch[1] && PGC_ACCOUNT_EXPLANATIONS[accountMatch[1]]) {
    const acc = PGC_ACCOUNT_EXPLANATIONS[accountMatch[1]];
    const text = `### 📘 ${acc.title}\n\n**Definição e Enquadramento Técnico:**\n${acc.desc}\n\n**Regras de Movimentação Contabilística:**\n• **A Débito [D]:** ${acc.debito}\n• **A Crédito [C]:** ${acc.credito}\n\n**Lançamento Tipo no Diário:**\n\`\`\`text\n[D] ${acc.title.split('—')[0].trim()} — ${acc.title.split('—')[1]?.trim() || ''}\n[C] Conta de Contrapartida (Caixa, Bancos ou Terceiros)\nHistórico: Registo documental em conformidade com o normativo contabilístico.\n\`\`\``;
    return {
      text,
      modelUsed: 'local-knowledge-engine',
      offline: true
    };
  }

  // 2. Questions about IVA (Imposto sobre o Valor Acrescentado)
  if (query.includes('iva') || query.includes('imposto sobre o valor acrescentado') || query.includes('7/19')) {
    const text = `### 🏛️ IVA — Imposto sobre o Valor Acrescentado (Lei n.º 7/19)\n\n**Taxas e Regimes em Vigor:**\n1. **Taxa Geral:** 14% aplicável à generalidade das transmissões de bens e prestações de serviços.\n2. **Taxa Reduzida:** 5% e 7% para produtos da cesta básica e bens essenciais.\n3. **Regimes:** Regime Geral (obrigatório para faturação anual superior a 25.000.000 Kz) e Regime Simplificado (7% sobre recebimentos efetivos).\n\n**Contabilização do IVA (PGC Angola — Subcontas 34.5):**\n• **34.5.1 IVA Suportado (Operações Correntes / Imobilizado)**: Débito [D] na compra de bens e serviços.\n• **34.5.2 IVA Dedutível**: Débito [D] pelo montante que confere direito a dedução perante a AGT.\n• **34.5.3 IVA Liquidado**: Crédito [C] cobrado aos clientes nas faturas de vendas/serviços.\n• **34.5.4 IVA a Pagar / a Recuperar**: Saldo resultante do apuramento mensal (declaração periódica até ao último dia do mês seguinte).\n\n\`\`\`text\nExemplo de Venda com IVA (100.000 Kz + 14% IVA):\n[D] 31.1 Clientes ................... 114.000 Kz\n  [C] 61.1 Vendas de Mercadorias .... 100.000 Kz\n  [C] 34.5.3 IVA Liquidado .......... 14.000 Kz\n\`\`\``;
    return {
      text,
      modelUsed: 'local-knowledge-engine',
      offline: true
    };
  }

  // 3. Questions about IRT (Imposto sobre o Rendimento do Trabalho) / Salários
  if (query.includes('irt') || query.includes('salário') || query.includes('salario') || query.includes('folha de vencimento') || query.includes('segurança social')) {
    const text = `### 💼 Processamento Salarial, IRT e Segurança Social (INSS)\n\n**Estrutura Legal das Deduções em Angola:**\n1. **Segurança Social (INSS):**\n   • **Trabalhador:** 3% sobre a remuneração base e subsídios tributáveis.\n   • **Entidade Empregadora (Patronal):** 8% a cargo da empresa (Conta 72.8).\n2. **IRT (Código do IRT — Lei n.º 18/20):**\n   • Tabela de taxas progressivas (Grupo A) isentando até 100.000 Kz, com escalões até 25%.\n\n**Lançamento Contabilístico das Remunerações:**\n\`\`\`text\n1. Pelo Processamento (Reconhecimento do Custo Bruto):\n[D] 72.1 Remunerações dos Corpos Sociais / Pessoal ... (Salário Bruto)\n[D] 72.8 Encargos Sociais Patronais (8% INSS) ......... (Parte da Empresa)\n  [C] 36.1 Pessoal — Remunerações a Pagar ............ (Salário Líquido)\n  [C] 34.2 Estado — IRT Retido na Fonte .............. (IRT Apurado)\n  [C] 34.3 Estado — Segurança Social (11% Total) ...... (3% trab. + 8% emp.)\n\n2. Pelo Pagamento Efetivo ao Colaborador:\n[D] 36.1 Pessoal — Remunerações a Pagar\n  [C] 43 Depósitos à Ordem (Banco)\n\`\`\``;
    return {
      text,
      modelUsed: 'local-knowledge-engine',
      offline: true
    };
  }

  // 4. Questions about Imposto Industrial
  if (query.includes('imposto industrial') || query.includes('lucro tributável') || query.includes('modelo 1') || query.includes('lei 19/14')) {
    const text = `### 🏢 Imposto Industrial (Código do Imposto Industrial — Lei n.º 19/14 e alterações)\n\n**Incidência e Taxas:**\n• **Taxa Geral:** 25% sobre o Lucro Tributável (regime geral).\n• **Setor Agrícola / Aquicultura:** 10%.\n• **Setor Bancário e Segurador:** 35%.\n• **Retenção na Fonte na Prestação de Serviços:** 6,5% (dedutível na liquidação final).\n\n**Apuramento do Lucro Tributável (Modelo 1):**\n\`\`\`text\nResultado Contabilístico Antes de Impostos (RAI - Conta 88)\n(+) Variações Patrimoniais Negativas não dedutíveis (Multas, 50% custos sem fatura válida)\n(-) Proveitos não tributáveis ou com tributação autónoma\n(=) Matéria Coletável (Lucro Tributável)\n(x) Taxa do Imposto (25%)\n(=) Imposto Industrial do Exercício\n(-) Retenções na Fonte e Pagamentos Provisórios (Liquidação Provisória de Agosto)\n(=) Imposto Industrial a Pagar / a Recuperar (Conta 34.1)\n\`\`\``;
    return {
      text,
      modelUsed: 'local-knowledge-engine',
      offline: true
    };
  }

  // 5. Questions about Balanço / Demonstração de Resultados / Fecho de Contas
  if (query.includes('balanço') || query.includes('balanco') || query.includes('demonstração de resultados') || query.includes('fecho') || query.includes('encerramento')) {
    const text = `### 📊 Demonstrações Financeiras e Encerramento de Contas (PGC Angola)\n\n**Peças Contabilísticas Obrigatórias:**\n1. **Balanço**: Evidencia a situação patrimonial à data de encerramento (Ativo = Passivo + Capital Próprio).\n2. **Demonstração dos Resultados por Natureza**: Confronta os Proveitos (Classe 6) com os Custos (Classe 7) para apurar o Resultado Operacional (Conta 81), Financeiro (82), Extraordinário (83) e Líquido (88).\n3. **Balancete de Verificação Final**: Demonstra a igualdade fundamental entre Débitos e Créditos de todas as contas.\n4. **Mapa de Amortizações e Provisões**: Resumo das quotas aplicadas ao imobilizado.\n5. **Notas às Contas (Anexo ao Balanço)**: Notas explicativas dos critérios valorimétricos adotados.\n\n**Sequência de Lançamentos de Fecho:**\n\`\`\`text\n1. Transferência dos Custos da Classe 7 para a Conta 81/88:\n   [D] 88 Resultado Líquido do Exercício\n     [C] 71 CMVMC / 72 Pessoal / 75 FSE / 78 Amortizações\n\n2. Transferência dos Proveitos da Classe 6 para a Conta 88:\n   [D] 61 Vendas / 62 Serviços / 66 Proveitos Financeiros\n     [C] 88 Resultado Líquido do Exercício\n\n3. Apuramento do Imposto Industrial (25%):\n   [D] 88 Resultado Líquido (ou 89 Imposto sobre o Rendimento)\n     [C] 34.1 Estado — Imposto Industrial Estimado\n\`\`\``;
    return {
      text,
      modelUsed: 'local-knowledge-engine',
      offline: true
    };
  }

  // 6. Generic Professional Accounting Consultation response
  const text = `### 💡 Consulta Contabilística e Fiscal (${standard})\n\n**Análise do Pedido:**\nCom base nas normas contabilísticas e fiscais em vigor, os lançamentos e tratamentos devem observar o método das **partidas dobradas**, a evidência documental idónea (faturas conformes com as exigências da AGT) e os princípios da **continuidade**, **especialização dos exercícios** e **prudência**.\n\n**Diretrizes Práticas:**\n1. **Classificação das Operações:** Identifique a natureza da transação (Investimento — Classe 1, Existências — Classe 2, Obrigações/Direitos — Classe 3, Tesouraria — Classe 4, Proveitos — Classe 6, Gastos — Classe 7).\n2. **Conferência Fiscal:** Verifique o enquadramento em sede de IVA (14%/7%), Retenção na Fonte (6,5% em serviços) e IRT no processamento salarial.\n3. **Registo Contabilístico Padrão:**\n\`\`\`text\n[D] Débito  : Conta recetora do fluxo económico / Aumento de Ativo ou Despesa\n[C] Crédito : Conta originadora do recurso / Meios Financeiros Líquidos ou Passivo\nHistórico   : Descrição clara da operação com menção ao documento de suporte.\n\`\`\`\n\n*Nota: Resposta gerada pelo assistente local de conformidade contabilística.*`;

  return {
    text,
    modelUsed: 'local-knowledge-engine',
    offline: true
  };
}

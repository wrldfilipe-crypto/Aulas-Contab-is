/**
 * BASE DE CONHECIMENTO OFICIAL DO PLANO GERAL DE CONTABILIDADE DE ANGOLA (PGC)
 * Base legal: Decreto n.º 82/2001, de 16 de Novembro
 * Atualização do IVA: Decreto Presidencial n.º 180/19, de 24 de Maio (Código do IVA)
 */

export interface PGCAccount {
  codigo: string;
  nome: string;
  classe: number;
  tipo?: 'sintetica' | 'subconta' | 'razao';
  descricao?: string;
}

export interface PGCMovementRule {
  codigo: string;
  nome: string;
  debito: string;
  credito: string;
  observacoes: string;
}

export interface PGCFinancialStatementItem {
  rubrica: string;
  codigoOuNota?: string;
  contasRelacionadas?: string[];
  descricao?: string;
}

export interface PGCFinancialStatementNote {
  numero: number;
  titulo: string;
  categoria: 'introducao' | 'balanco' | 'resultados' | 'fluxos_caixa' | 'outras';
  estrutura: string[];
  descricao: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. QUADRO DE CONTAS COMPLETO (PGC ANGOLA - DECRETO N.º 82/2001)
// ─────────────────────────────────────────────────────────────────────────────

export const PGC_CHART_OF_ACCOUNTS: PGCAccount[] = [
  // CLASSE 0 - CONTAS DE ORDEM
  { codigo: '0', nome: 'Contas de ordem', classe: 0, tipo: 'sintetica' },
  { codigo: '01', nome: 'Garantias e avales prestados', classe: 0 },
  { codigo: '02', nome: 'Garantias e avales recebidos', classe: 0 },
  { codigo: '03', nome: 'Compromissos assumidos', classe: 0 },
  { codigo: '04', nome: 'Valores e bens de terceiros em poder da empresa', classe: 0 },
  { codigo: '09', nome: 'Outras contas de ordem', classe: 0 },

  // CLASSE 1 - MEIOS FIXOS E INVESTIMENTOS
  { codigo: '11', nome: 'Imobilizações corpóreas', classe: 1, tipo: 'sintetica' },
  { codigo: '11.1', nome: 'Terrenos e recursos naturais', classe: 1 },
  { codigo: '11.1.1', nome: 'Terrenos em bruto', classe: 1 },
  { codigo: '11.1.2', nome: 'Terrenos com arranjos', classe: 1 },
  { codigo: '11.1.3', nome: 'Subsolos', classe: 1 },
  { codigo: '11.1.4', nome: 'Terrenos com edifícios', classe: 1 },
  { codigo: '11.1.4.1', nome: 'Relativos a edifícios industriais', classe: 1 },
  { codigo: '11.1.4.2', nome: 'Relativos a edifícios administrativos e comerciais', classe: 1 },
  { codigo: '11.1.4.3', nome: 'Relativos a outros edifícios', classe: 1 },
  { codigo: '11.2', nome: 'Edifícios e outras construções', classe: 1 },
  { codigo: '11.2.1', nome: 'Edifícios', classe: 1 },
  { codigo: '11.2.1.1', nome: 'Integrados em conjuntos industriais', classe: 1 },
  { codigo: '11.2.1.2', nome: 'Integrados em conjuntos administrativos e comerciais', classe: 1 },
  { codigo: '11.2.1.3', nome: 'Outros conjuntos industriais', classe: 1 },
  { codigo: '11.2.1.4', nome: 'Implantados em propriedade alheia', classe: 1 },
  { codigo: '11.2.2', nome: 'Outras construções', classe: 1 },
  { codigo: '11.2.3', nome: 'Instalações', classe: 1 },
  { codigo: '11.3', nome: 'Equipamento básico', classe: 1 },
  { codigo: '11.3.1', nome: 'Material industrial', classe: 1 },
  { codigo: '11.3.2', nome: 'Ferramentas industriais', classe: 1 },
  { codigo: '11.3.3', nome: 'Melhoramentos em equipamentos básicos', classe: 1 },
  { codigo: '11.4', nome: 'Equipamento de carga e transporte', classe: 1 },
  { codigo: '11.4.1', nome: 'Equipamento de carga e transporte', classe: 1 },
  { codigo: '11.5', nome: 'Equipamento administrativo', classe: 1 },
  { codigo: '11.5.1', nome: 'Equipamento administrativo', classe: 1 },
  { codigo: '11.6', nome: 'Taras e vasilhame', classe: 1 },
  { codigo: '11.6.1', nome: 'Taras e vasilhame', classe: 1 },
  { codigo: '11.9', nome: 'Outras imobilizações corpóreas', classe: 1 },
  { codigo: '11.9.1', nome: 'Outras imobilizações corpóreas', classe: 1 },

  { codigo: '12', nome: 'Imobilizações incorpóreas', classe: 1, tipo: 'sintetica' },
  { codigo: '12.1', nome: 'Trespasses', classe: 1 },
  { codigo: '12.1.1', nome: 'Trespasses', classe: 1 },
  { codigo: '12.2', nome: 'Despesas de investigação e desenvolvimento', classe: 1 },
  { codigo: '12.2.1', nome: 'Despesas de investigação e desenvolvimento', classe: 1 },
  { codigo: '12.3', nome: 'Propriedade industrial e outros direitos e contratos', classe: 1 },
  { codigo: '12.3.1', nome: 'Propriedade industrial e outros direitos e contratos', classe: 1 },
  { codigo: '12.4', nome: 'Despesas de constituição', classe: 1 },
  { codigo: '12.4.1', nome: 'Despesas de constituição', classe: 1 },
  { codigo: '12.9', nome: 'Outras imobilizações incorpóreas', classe: 1 },
  { codigo: '12.9.1', nome: 'Outras imobilizações incorpóreas', classe: 1 },

  { codigo: '13', nome: 'Investimentos financeiros', classe: 1, tipo: 'sintetica' },
  { codigo: '13.1', nome: 'Empresas subsidiárias', classe: 1 },
  { codigo: '13.1.1', nome: 'Partes de capital', classe: 1 },
  { codigo: '13.1.2', nome: 'Obrigações e títulos de participação', classe: 1 },
  { codigo: '13.1.3', nome: 'Empréstimos', classe: 1 },
  { codigo: '13.2', nome: 'Empresas associadas', classe: 1 },
  { codigo: '13.2.1', nome: 'Partes de capital', classe: 1 },
  { codigo: '13.2.2', nome: 'Obrigações e títulos de participação', classe: 1 },
  { codigo: '13.2.3', nome: 'Empréstimos', classe: 1 },
  { codigo: '13.3', nome: 'Outras empresas', classe: 1 },
  { codigo: '13.3.1', nome: 'Partes de capital', classe: 1 },
  { codigo: '13.3.2', nome: 'Obrigações e títulos de participação', classe: 1 },
  { codigo: '13.3.3', nome: 'Empréstimos', classe: 1 },
  { codigo: '13.4', nome: 'Investimentos em imóveis', classe: 1 },
  { codigo: '13.4.1', nome: 'Investimentos em imóveis', classe: 1 },
  { codigo: '13.5', nome: 'Fundos', classe: 1 },
  { codigo: '13.5.1', nome: 'Fundos', classe: 1 },
  { codigo: '13.9', nome: 'Outros investimentos financeiros', classe: 1 },
  { codigo: '13.9.1', nome: 'Diamantes', classe: 1 },
  { codigo: '13.9.2', nome: 'Ouro', classe: 1 },
  { codigo: '13.9.3', nome: 'Depósitos bancários', classe: 1 },

  { codigo: '14', nome: 'Imobilizações em curso', classe: 1, tipo: 'sintetica' },
  { codigo: '14.1', nome: 'Obra em curso', classe: 1 },
  { codigo: '14.2', nome: 'Obra em curso', classe: 1 },
  { codigo: '14.7', nome: 'Adiantamentos por conta de imobilizado corpóreo', classe: 1 },
  { codigo: '14.7.1', nome: 'Adiantamentos por conta de imobilizado corpóreo', classe: 1 },
  { codigo: '14.8', nome: 'Adiantamentos por conta de imobilizado incorpóreo', classe: 1 },
  { codigo: '14.8.1', nome: 'Adiantamentos por conta de imobilizado incorpóreo', classe: 1 },
  { codigo: '14.9', nome: 'Adiantamentos por conta de investimentos financeiros', classe: 1 },
  { codigo: '14.9.1', nome: 'Adiantamentos por conta de investimentos financeiros', classe: 1 },

  { codigo: '18', nome: 'Amortizações acumuladas', classe: 1, tipo: 'sintetica' },
  { codigo: '18.1', nome: 'Imobilizações corpóreas', classe: 1 },
  { codigo: '18.1.1', nome: 'Terrenos e recursos naturais', classe: 1 },
  { codigo: '18.1.2', nome: 'Edifícios e outras construções', classe: 1 },
  { codigo: '18.1.3', nome: 'Equipamento básico', classe: 1 },
  { codigo: '18.1.4', nome: 'Equipamento de carga e transporte', classe: 1 },
  { codigo: '18.1.5', nome: 'Equipamento administrativo', classe: 1 },
  { codigo: '18.1.6', nome: 'Taras e vasilhame', classe: 1 },
  { codigo: '18.1.9', nome: 'Outras imobilizações corpóreas', classe: 1 },
  { codigo: '18.2', nome: 'Imobilizações incorpóreas', classe: 1 },
  { codigo: '18.2.1', nome: 'Trespasses', classe: 1 },
  { codigo: '18.2.2', nome: 'Despesas de investigação e desenvolvimento', classe: 1 },
  { codigo: '18.2.3', nome: 'Propriedade industrial e outros direitos e contratos', classe: 1 },
  { codigo: '18.2.4', nome: 'Despesas de constituição', classe: 1 },
  { codigo: '18.2.9', nome: 'Outras imobilizações incorpóreas', classe: 1 },
  { codigo: '18.3', nome: 'Investimentos financeiros em imóveis', classe: 1 },
  { codigo: '18.3.1', nome: 'Terrenos e recursos naturais', classe: 1 },
  { codigo: '18.3.2', nome: 'Edifícios e outras construções', classe: 1 },

  { codigo: '19', nome: 'Provisões para investimentos financeiros', classe: 1, tipo: 'sintetica' },
  { codigo: '19.1', nome: 'Empresas subsidiárias', classe: 1 },
  { codigo: '19.1.1', nome: 'Partes de capital', classe: 1 },
  { codigo: '19.1.2', nome: 'Obrigações e títulos de participação', classe: 1 },
  { codigo: '19.1.3', nome: 'Empréstimos', classe: 1 },
  { codigo: '19.2', nome: 'Empresas associadas', classe: 1 },
  { codigo: '19.2.1', nome: 'Partes de capital', classe: 1 },
  { codigo: '19.2.2', nome: 'Obrigações e títulos de participação', classe: 1 },
  { codigo: '19.2.3', nome: 'Empréstimos', classe: 1 },
  { codigo: '19.3', nome: 'Outras empresas', classe: 1 },
  { codigo: '19.3.1', nome: 'Partes de capital', classe: 1 },
  { codigo: '19.3.2', nome: 'Obrigações e títulos de participação', classe: 1 },
  { codigo: '19.3.3', nome: 'Empréstimos', classe: 1 },
  { codigo: '19.4', nome: 'Fundos', classe: 1 },
  { codigo: '19.4.1', nome: 'Partes de capital', classe: 1 },
  { codigo: '19.9', nome: 'Outros investimentos financeiros', classe: 1 },
  { codigo: '19.9.1', nome: 'Diamantes', classe: 1 },
  { codigo: '19.9.2', nome: 'Ouro', classe: 1 },
  { codigo: '19.9.3', nome: 'Depósitos bancários', classe: 1 },

  // CLASSE 2 - EXISTÊNCIAS
  { codigo: '21', nome: 'Compras', classe: 2, tipo: 'sintetica' },
  { codigo: '21.1', nome: 'Matérias-primas, subsidiárias e de consumo', classe: 2 },
  { codigo: '21.1.1', nome: 'Matérias-primas, subsidiárias e de consumo', classe: 2 },
  { codigo: '21.2', nome: 'Mercadorias', classe: 2 },
  { codigo: '21.2.1', nome: 'Mercadorias', classe: 2 },
  { codigo: '21.7', nome: 'Devoluções de compras', classe: 2 },
  { codigo: '21.7.1', nome: 'Devoluções de compras', classe: 2 },
  { codigo: '21.8', nome: 'Descontos e abatimentos em compras', classe: 2 },
  { codigo: '21.8.1', nome: 'Descontos e abatimentos em compras', classe: 2 },
  { codigo: '21.9', nome: 'Compras em trânsito', classe: 2 },
  { codigo: '21.9.1', nome: 'Compras em trânsito', classe: 2 },

  { codigo: '22', nome: 'Matérias-primas, subsidiárias e de consumo', classe: 2, tipo: 'sintetica' },
  { codigo: '22.1', nome: 'Matérias-primas', classe: 2 },
  { codigo: '22.1.1', nome: 'Matérias-primas', classe: 2 },
  { codigo: '22.2', nome: 'Matérias subsidiárias', classe: 2 },
  { codigo: '22.2.1', nome: 'Matérias subsidiárias', classe: 2 },
  { codigo: '22.3', nome: 'Materiais diversos', classe: 2 },
  { codigo: '22.3.1', nome: 'Materiais diversos', classe: 2 },
  { codigo: '22.4', nome: 'Embalagens de consumo', classe: 2 },
  { codigo: '22.4.1', nome: 'Embalagens de consumo', classe: 2 },
  { codigo: '22.5', nome: 'Outros materiais', classe: 2 },
  { codigo: '22.5.1', nome: 'Outros materiais', classe: 2 },

  { codigo: '23', nome: 'Produtos e trabalhos em curso', classe: 2, tipo: 'sintetica' },
  { codigo: '23.1', nome: 'Produtos em curso', classe: 2 },
  { codigo: '23.2', nome: 'Trabalhos em curso', classe: 2 },

  { codigo: '24', nome: 'Produtos acabados e intermédios', classe: 2, tipo: 'sintetica' },
  { codigo: '24.1', nome: 'Produtos acabados', classe: 2 },
  { codigo: '24.1.1', nome: 'Produtos acabados', classe: 2 },
  { codigo: '24.2', nome: 'Produtos intermédios', classe: 2 },
  { codigo: '24.2.1', nome: 'Produtos intermédios', classe: 2 },
  { codigo: '24.9', nome: 'Em poder de terceiros', classe: 2 },
  { codigo: '24.9.1', nome: 'Em poder de terceiros', classe: 2 },

  { codigo: '25', nome: 'Subprodutos, desperdícios, resíduos e refugos', classe: 2, tipo: 'sintetica' },
  { codigo: '25.1', nome: 'Subprodutos', classe: 2 },
  { codigo: '25.1.1', nome: 'Subprodutos', classe: 2 },
  { codigo: '25.2', nome: 'Desperdícios, resíduos e refugos', classe: 2 },
  { codigo: '25.2.1', nome: 'Desperdícios, resíduos e refugos', classe: 2 },

  { codigo: '26', nome: 'Mercadorias', classe: 2, tipo: 'sintetica' },
  { codigo: '26.1', nome: 'Mercadorias A', classe: 2 },
  { codigo: '26.2', nome: 'Mercadorias B', classe: 2 },
  { codigo: '26.9', nome: 'Em poder de terceiros', classe: 2 },
  { codigo: '26.9.1', nome: 'Em poder de terceiros', classe: 2 },

  { codigo: '27', nome: 'Matérias-primas, mercadorias e outros materiais em trânsito', classe: 2, tipo: 'sintetica' },
  { codigo: '27.1', nome: 'Matérias-primas', classe: 2 },
  { codigo: '27.1.1', nome: 'Matérias-primas', classe: 2 },
  { codigo: '27.2', nome: 'Outros materiais', classe: 2 },
  { codigo: '27.3', nome: 'Mercadorias', classe: 2 },
  { codigo: '27.3.1', nome: 'Mercadorias', classe: 2 },

  { codigo: '28', nome: 'Adiantamentos por conta de compras', classe: 2, tipo: 'sintetica' },
  { codigo: '28.1', nome: 'Matérias-primas e outros materiais', classe: 2 },
  { codigo: '28.1.1', nome: 'Matérias-primas e outros materiais', classe: 2 },
  { codigo: '28.2', nome: 'Mercadorias', classe: 2 },
  { codigo: '28.2.1', nome: 'Mercadorias', classe: 2 },

  { codigo: '29', nome: 'Provisão para depreciação de existências', classe: 2, tipo: 'sintetica' },
  { codigo: '29.1', nome: 'Provisão geral', classe: 2 },
  { codigo: '29.2', nome: 'Matérias-primas, subsidiárias e de consumo', classe: 2 },
  { codigo: '29.2.1', nome: 'Matérias-primas, subsidiárias e de consumo', classe: 2 },
  { codigo: '29.3', nome: 'Produtos e trabalhos em curso', classe: 2 },
  { codigo: '29.3.1', nome: 'Produtos e trabalhos em curso', classe: 2 },
  { codigo: '29.4', nome: 'Produtos acabados e intermédios', classe: 2 },
  { codigo: '29.4.1', nome: 'Produtos acabados e intermédios', classe: 2 },
  { codigo: '29.5', nome: 'Subprodutos, desperdícios, resíduos e refugos', classe: 2 },
  { codigo: '29.5.1', nome: 'Subprodutos, desperdícios, resíduos e refugos', classe: 2 },
  { codigo: '29.6', nome: 'Mercadorias', classe: 2 },
  { codigo: '29.6.1', nome: 'Mercadorias', classe: 2 },

  // CLASSE 3 - TERCEIROS
  { codigo: '31', nome: 'Clientes', classe: 3, tipo: 'sintetica' },
  { codigo: '31.1', nome: 'Clientes - correntes', classe: 3 },
  { codigo: '31.1.1', nome: 'Grupo', classe: 3 },
  { codigo: '31.1.1.1', nome: 'Subsidiárias', classe: 3 },
  { codigo: '31.1.1.2', nome: 'Associadas', classe: 3 },
  { codigo: '31.1.2', nome: 'Não grupo', classe: 3 },
  { codigo: '31.1.2.1', nome: 'Nacionais', classe: 3 },
  { codigo: '31.1.2.2', nome: 'Estrangeiros', classe: 3 },
  { codigo: '31.2', nome: 'Clientes - títulos a receber', classe: 3 },
  { codigo: '31.2.1', nome: 'Grupo', classe: 3 },
  { codigo: '31.2.1.1', nome: 'Subsidiárias', classe: 3 },
  { codigo: '31.2.1.2', nome: 'Associadas', classe: 3 },
  { codigo: '31.2.2', nome: 'Não grupo', classe: 3 },
  { codigo: '31.2.2.1', nome: 'Nacionais', classe: 3 },
  { codigo: '31.2.2.2', nome: 'Estrangeiros', classe: 3 },
  { codigo: '31.3', nome: 'Clientes - títulos descontados', classe: 3 },
  { codigo: '31.3.1', nome: 'Grupo', classe: 3 },
  { codigo: '31.3.1.1', nome: 'Subsidiárias', classe: 3 },
  { codigo: '31.3.1.2', nome: 'Associadas', classe: 3 },
  { codigo: '31.3.2', nome: 'Não grupo', classe: 3 },
  { codigo: '31.3.2.1', nome: 'Nacionais', classe: 3 },
  { codigo: '31.3.2.2', nome: 'Estrangeiros', classe: 3 },
  { codigo: '31.8', nome: 'Clientes de cobrança duvidosa', classe: 3 },
  { codigo: '31.8.1', nome: 'Clientes - correntes', classe: 3 },
  { codigo: '31.8.2', nome: 'Clientes - títulos', classe: 3 },
  { codigo: '31.9', nome: 'Clientes - saldos credores', classe: 3 },
  { codigo: '31.9.1', nome: 'Adiantamentos', classe: 3 },
  { codigo: '31.9.2', nome: 'Embalagens a devolver', classe: 3 },
  { codigo: '31.9.3', nome: 'Material à consignação', classe: 3 },

  { codigo: '32', nome: 'Fornecedores', classe: 3, tipo: 'sintetica' },
  { codigo: '32.1', nome: 'Fornecedores - correntes', classe: 3 },
  { codigo: '32.1.1', nome: 'Grupo', classe: 3 },
  { codigo: '32.1.1.1', nome: 'Subsidiárias', classe: 3 },
  { codigo: '32.1.1.2', nome: 'Associadas', classe: 3 },
  { codigo: '32.1.2', nome: 'Não grupo', classe: 3 },
  { codigo: '32.1.2.1', nome: 'Nacionais', classe: 3 },
  { codigo: '32.1.2.2', nome: 'Estrangeiros', classe: 3 },
  { codigo: '32.2', nome: 'Fornecedores - títulos a pagar', classe: 3 },
  { codigo: '32.2.1', nome: 'Grupo', classe: 3 },
  { codigo: '32.2.1.1', nome: 'Subsidiárias', classe: 3 },
  { codigo: '32.2.1.2', nome: 'Associadas', classe: 3 },
  { codigo: '32.2.2', nome: 'Não grupo', classe: 3 },
  { codigo: '32.2.2.1', nome: 'Nacionais', classe: 3 },
  { codigo: '32.2.2.2', nome: 'Estrangeiros', classe: 3 },
  { codigo: '32.8', nome: 'Fornecedores - facturas em recepção e conferência', classe: 3 },
  { codigo: '32.8.1', nome: 'Fornecedores - facturas em recepção e conferência', classe: 3 },
  { codigo: '32.9', nome: 'Fornecedores - saldos devedores', classe: 3 },
  { codigo: '32.9.1', nome: 'Adiantamentos', classe: 3 },
  { codigo: '32.9.2', nome: 'Embalagens a devolver', classe: 3 },
  { codigo: '32.9.3', nome: 'Material à consignação', classe: 3 },

  { codigo: '33', nome: 'Empréstimos', classe: 3, tipo: 'sintetica' },
  { codigo: '33.1', nome: 'Empréstimos bancários', classe: 3 },
  { codigo: '33.1.1', nome: 'Moeda nacional', classe: 3 },
  { codigo: '33.1.1.1', nome: 'Banco', classe: 3 },
  { codigo: '33.1.2', nome: 'Moeda estrangeira', classe: 3 },
  { codigo: '33.1.2.1', nome: 'Banco', classe: 3 },
  { codigo: '33.2', nome: 'Empréstimos por obrigações', classe: 3 },
  { codigo: '33.2.1', nome: 'Convertíveis', classe: 3 },
  { codigo: '33.2.1.1', nome: 'Entidade', classe: 3 },
  { codigo: '33.2.2', nome: 'Não convertíveis', classe: 3 },
  { codigo: '33.2.2.1', nome: 'Entidade', classe: 3 },
  { codigo: '33.3', nome: 'Empréstimos por títulos de participação', classe: 3 },
  { codigo: '33.3.1', nome: 'Entidade', classe: 3 },
  { codigo: '33.9', nome: 'Outros empréstimos obtidos', classe: 3 },
  { codigo: '33.9.1', nome: 'Entidade', classe: 3 },

  { codigo: '34', nome: 'Estado', classe: 3, tipo: 'sintetica' },
  { codigo: '34.1', nome: 'Imposto sobre os lucros (Imposto Industrial)', classe: 3 },
  { codigo: '34.1.1', nome: 'Imposto sobre os lucros', classe: 3 },
  { codigo: '34.2', nome: 'Imposto de produção e consumo', classe: 3 },
  { codigo: '34.2.1', nome: 'Imposto de produção e consumo', classe: 3 },
  { codigo: '34.3', nome: 'Imposto de rendimento de trabalho (IRT)', classe: 3 },
  { codigo: '34.3.1', nome: 'Imposto de rendimento de trabalho', classe: 3 },
  { codigo: '34.4', nome: 'Imposto de circulação', classe: 3 },
  { codigo: '34.4.1', nome: 'Imposto de circulação', classe: 3 },

  // CONTA 34.5 IVA - ESTRUTURA COMPLETA OFICIAL (Decreto Presidencial n.º 180/19)
  { codigo: '34.5', nome: 'IVA (Imposto sobre o Valor Acrescentado)', classe: 3, tipo: 'sintetica' },
  { codigo: '34.5.1', nome: 'IVA suportado', classe: 3 },
  { codigo: '34.5.1.1', nome: 'Existências', classe: 3 },
  { codigo: '34.5.1.2', nome: 'Meios fixos e investimentos', classe: 3 },
  { codigo: '34.5.1.3', nome: 'Outros bens e serviços', classe: 3 },
  { codigo: '34.5.2', nome: 'IVA dedutível', classe: 3 },
  { codigo: '34.5.2.1', nome: 'Existências', classe: 3 },
  { codigo: '34.5.2.2', nome: 'Meios fixos e investimentos', classe: 3 },
  { codigo: '34.5.2.3', nome: 'Outros bens e serviços', classe: 3 },
  { codigo: '34.5.3', nome: 'IVA liquidado', classe: 3 },
  { codigo: '34.5.3.1', nome: 'Operações gerais', classe: 3 },
  { codigo: '34.5.3.2', nome: 'Operações abrangidas pelo regime de IVA de caixa', classe: 3 },
  { codigo: '34.5.3.3', nome: 'Autoconsumo e operações gratuitas', classe: 3 },
  { codigo: '34.5.3.4', nome: 'Operações especiais', classe: 3 },
  { codigo: '34.5.4', nome: 'IVA regularizações', classe: 3 },
  { codigo: '34.5.4.1', nome: 'Mensais a favor do sujeito passivo', classe: 3 },
  { codigo: '34.5.4.2', nome: 'Mensais a favor do Estado', classe: 3 },
  { codigo: '34.5.4.3', nome: 'Anual por cálculo do pró rata definitivo', classe: 3 },
  { codigo: '34.5.4.4', nome: 'Outras regularizações anuais', classe: 3 },
  { codigo: '34.5.5', nome: 'IVA apuramento', classe: 3 },
  { codigo: '34.5.5.1', nome: 'Apuramento do regime de IVA normal', classe: 3 },
  { codigo: '34.5.5.2', nome: 'Apuramento do regime de IVA de caixa', classe: 3 },
  { codigo: '34.5.6', nome: 'IVA a pagar', classe: 3 },
  { codigo: '34.5.6.1', nome: 'IVA a pagar de apuramento', classe: 3 },
  { codigo: '34.5.6.2', nome: 'IVA a pagar de cativo', classe: 3 },
  { codigo: '34.5.6.3', nome: 'IVA a pagar liquidações oficiosas', classe: 3 },
  { codigo: '34.5.7', nome: 'IVA a recuperar', classe: 3 },
  { codigo: '34.5.7.1', nome: 'IVA a recuperar de apuramentos', classe: 3 },
  { codigo: '34.5.7.2', nome: 'IVA a recuperar de cativo', classe: 3 },
  { codigo: '34.5.8', nome: 'IVA reembolsos pedidos', classe: 3 },
  { codigo: '34.5.8.1', nome: 'Reembolsos pedidos', classe: 3 },
  { codigo: '34.5.8.2', nome: 'Reembolsos deferidos', classe: 3 },
  { codigo: '34.5.8.3', nome: 'Reembolsos indeferidos', classe: 3 },
  { codigo: '34.5.8.4', nome: 'Reembolsos reclamados, recorridos ou impugnados', classe: 3 },
  { codigo: '34.5.9', nome: 'IVA liquidações oficiosas', classe: 3 },
  { codigo: '34.6', nome: 'Certificado de crédito fiscal a compensar', classe: 3 },
  { codigo: '34.8', nome: 'Subsídios a preços', classe: 3 },
  { codigo: '34.8.1', nome: 'Subsídios a preços', classe: 3 },
  { codigo: '34.9', nome: 'Outros impostos (Retenções na fonte, Imposto do Selo, etc.)', classe: 3 },
  { codigo: '34.9.1', nome: 'Outros impostos', classe: 3 },

  { codigo: '35', nome: 'Entidades participantes e participadas', classe: 3, tipo: 'sintetica' },
  { codigo: '35.1', nome: 'Entidades participantes', classe: 3 },
  { codigo: '35.1.1', nome: 'Estado', classe: 3 },
  { codigo: '35.1.1.1', nome: 'c/subscrição', classe: 3 },
  { codigo: '35.1.1.2', nome: 'c/adiantamentos sobre lucros', classe: 3 },
  { codigo: '35.1.1.3', nome: 'c/lucros', classe: 3 },
  { codigo: '35.1.1.4', nome: 'Empréstimos', classe: 3 },
  { codigo: '35.1.2', nome: 'Empresas do grupo - subsidiárias', classe: 3 },
  { codigo: '35.1.2.1', nome: 'c/subscrição', classe: 3 },
  { codigo: '35.1.2.2', nome: 'c/adiantamentos sobre lucros', classe: 3 },
  { codigo: '35.1.2.3', nome: 'c/lucros', classe: 3 },
  { codigo: '35.1.2.4', nome: 'Empréstimos', classe: 3 },
  { codigo: '35.1.3', nome: 'Empresas do grupo - associadas', classe: 3 },
  { codigo: '35.1.4', nome: 'Outros', classe: 3 },
  { codigo: '35.2', nome: 'Entidades participadas', classe: 3 },
  { codigo: '35.2.1', nome: 'Estado', classe: 3 },
  { codigo: '35.2.2', nome: 'Empresas do grupo - subsidiárias', classe: 3 },
  { codigo: '35.2.3', nome: 'Empresas do grupo - associadas', classe: 3 },
  { codigo: '35.2.4', nome: 'Outros', classe: 3 },

  { codigo: '36', nome: 'Pessoal', classe: 3, tipo: 'sintetica' },
  { codigo: '36.1', nome: 'Pessoal - remunerações', classe: 3 },
  { codigo: '36.1.1', nome: 'Órgãos sociais', classe: 3 },
  { codigo: '36.1.1.1', nome: 'Órgãos sociais', classe: 3 },
  { codigo: '36.1.2', nome: 'Empregados', classe: 3 },
  { codigo: '36.1.2.1', nome: 'Empregados', classe: 3 },
  { codigo: '36.2', nome: 'Pessoal - participação nos resultados', classe: 3 },
  { codigo: '36.2.1', nome: 'Órgãos sociais', classe: 3 },
  { codigo: '36.2.2', nome: 'Empregados', classe: 3 },
  { codigo: '36.3', nome: 'Pessoal - adiantamentos', classe: 3 },
  { codigo: '36.3.1', nome: 'Pessoal - adiantamentos', classe: 3 },
  { codigo: '36.9', nome: 'Pessoal - outros', classe: 3 },
  { codigo: '36.9.1', nome: 'Pessoal - outros', classe: 3 },

  { codigo: '37', nome: 'Outros valores a receber e a pagar', classe: 3, tipo: 'sintetica' },
  { codigo: '37.1', nome: 'Compras de imobilizado', classe: 3 },
  { codigo: '37.1.1', nome: 'Corpóreo', classe: 3 },
  { codigo: '37.1.2', nome: 'Incorpóreo', classe: 3 },
  { codigo: '37.1.3', nome: 'Financeiro', classe: 3 },
  { codigo: '37.2', nome: 'Vendas de imobilizado', classe: 3 },
  { codigo: '37.2.1', nome: 'Corpóreo', classe: 3 },
  { codigo: '37.2.2', nome: 'Incorpóreo', classe: 3 },
  { codigo: '37.2.3', nome: 'Financeiro', classe: 3 },
  { codigo: '37.3', nome: 'Proveitos a facturar', classe: 3 },
  { codigo: '37.3.1', nome: 'Vendas', classe: 3 },
  { codigo: '37.3.2', nome: 'Prestações de serviços', classe: 3 },
  { codigo: '37.3.3', nome: 'Juros', classe: 3 },
  { codigo: '37.4', nome: 'Encargos a repartir por períodos futuros', classe: 3 },
  { codigo: '37.4.1', nome: 'Descontos de emissão de obrigações', classe: 3 },
  { codigo: '37.4.2', nome: 'Descontos de emissão de títulos de participação', classe: 3 },
  { codigo: '37.5', nome: 'Encargos a pagar', classe: 3 },
  { codigo: '37.5.1', nome: 'Remunerações', classe: 3 },
  { codigo: '37.5.2', nome: 'Juros', classe: 3 },
  { codigo: '37.6', nome: 'Proveitos a repartir por períodos futuros', classe: 3 },
  { codigo: '37.6.1', nome: 'Prémios de emissão de obrigações', classe: 3 },
  { codigo: '37.6.2', nome: 'Prémios de emissão de títulos de participação', classe: 3 },
  { codigo: '37.6.3', nome: 'Subsídios para investimento', classe: 3 },
  { codigo: '37.6.4', nome: 'Diferenças de câmbio favoráveis reversíveis', classe: 3 },
  { codigo: '37.7', nome: 'Contas transitórias', classe: 3 },
  { codigo: '37.7.1', nome: 'Transacções entre a sede e as dependências da empresa', classe: 3 },
  { codigo: '37.9', nome: 'Outros valores a receber e a pagar', classe: 3 },
  { codigo: '37.9.1', nome: 'Outros valores a receber e a pagar', classe: 3 },

  { codigo: '38', nome: 'Provisões para cobranças duvidosas', classe: 3, tipo: 'sintetica' },
  { codigo: '38.1', nome: 'Provisões para clientes', classe: 3 },
  { codigo: '38.1.1', nome: 'Clientes - correntes (38.1.1.1 Grupo, 38.1.1.2 Não grupo)', classe: 3 },
  { codigo: '38.1.2', nome: 'Clientes - títulos a receber (38.1.2.1 Grupo, 38.1.2.2 Não grupo)', classe: 3 },
  { codigo: '38.1.3', nome: 'Clientes - cobrança duvidosa (38.1.3.1 Grupo, 38.1.3.2 Não grupo)', classe: 3 },
  { codigo: '38.2', nome: 'Provisões para saldos devedores de fornecedores', classe: 3 },
  { codigo: '38.3', nome: 'Provisões p/participantes e participadas', classe: 3 },
  { codigo: '38.4', nome: 'Provisões p/dívidas do pessoal', classe: 3 },
  { codigo: '38.9', nome: 'Provisões para outros saldos a receber', classe: 3 },

  { codigo: '39', nome: 'Provisões para outros riscos e encargos', classe: 3, tipo: 'sintetica' },
  { codigo: '39.1', nome: 'Provisões para pensões', classe: 3 },
  { codigo: '39.2', nome: 'Provisões para processos judiciais em curso', classe: 3 },
  { codigo: '39.3', nome: 'Provisões para acidentes de trabalho', classe: 3 },
  { codigo: '39.4', nome: 'Provisões para garantias dadas a clientes', classe: 3 },
  { codigo: '39.9', nome: 'Provisões para outros riscos e encargos', classe: 3 },

  // CLASSE 4 - MEIOS MONETÁRIOS
  { codigo: '41', nome: 'Títulos negociáveis', classe: 4, tipo: 'sintetica' },
  { codigo: '41.1', nome: 'Acções', classe: 4 },
  { codigo: '41.1.1', nome: 'Empresas do grupo', classe: 4 },
  { codigo: '41.1.2', nome: 'Associadas', classe: 4 },
  { codigo: '41.1.3', nome: 'Outras empresas', classe: 4 },
  { codigo: '41.2', nome: 'Obrigações', classe: 4 },
  { codigo: '41.2.1', nome: 'Empresas do grupo', classe: 4 },
  { codigo: '41.2.2', nome: 'Associadas', classe: 4 },
  { codigo: '41.2.3', nome: 'Outras empresas', classe: 4 },
  { codigo: '41.3', nome: 'Títulos da dívida pública', classe: 4 },
  { codigo: '41.3.1', nome: 'Títulos da dívida pública', classe: 4 },

  { codigo: '42', nome: 'Depósitos a prazo', classe: 4, tipo: 'sintetica' },
  { codigo: '42.1', nome: 'Moeda nacional', classe: 4 },
  { codigo: '42.1.1', nome: 'Banco', classe: 4 },
  { codigo: '42.2', nome: 'Moeda estrangeira', classe: 4 },
  { codigo: '42.2.1', nome: 'Banco', classe: 4 },

  { codigo: '43', nome: 'Depósitos à ordem', classe: 4, tipo: 'sintetica' },
  { codigo: '43.1', nome: 'Moeda nacional', classe: 4 },
  { codigo: '43.1.1', nome: 'Banco', classe: 4 },
  { codigo: '43.2', nome: 'Moeda estrangeira', classe: 4 },
  { codigo: '43.2.1', nome: 'Banco', classe: 4 },

  { codigo: '44', nome: 'Outros depósitos', classe: 4, tipo: 'sintetica' },
  { codigo: '44.1', nome: 'Moeda nacional', classe: 4 },
  { codigo: '44.2', nome: 'Moeda estrangeira', classe: 4 },

  { codigo: '45', nome: 'Caixa', classe: 4, tipo: 'sintetica' },
  { codigo: '45.1', nome: 'Fundo fixo', classe: 4 },
  { codigo: '45.1.1', nome: 'Caixa', classe: 4 },
  { codigo: '45.2', nome: 'Valores para depositar', classe: 4 },
  { codigo: '45.3', nome: 'Valores destinados a pagamentos específicos', classe: 4 },
  { codigo: '45.3.1', nome: 'Salários', classe: 4 },

  { codigo: '48', nome: 'Conta transitória', classe: 4, tipo: 'sintetica' },
  { codigo: '48.1', nome: 'Banco', classe: 4 },

  { codigo: '49', nome: 'Provisões para aplicações de tesouraria', classe: 4, tipo: 'sintetica' },
  { codigo: '49.1', nome: 'Títulos negociáveis (49.1.1 Acções, 49.1.2 Obrigações, 49.1.3 Títulos da dívida pública)', classe: 4 },
  { codigo: '49.2', nome: 'Outras aplicações de tesouraria', classe: 4 },

  // CLASSE 5 - CAPITAL E RESERVAS
  { codigo: '51', nome: 'Capital', classe: 5, tipo: 'sintetica' },
  { codigo: '52', nome: 'Acções/quotas próprias', classe: 5, tipo: 'sintetica' },
  { codigo: '52.1', nome: 'Valor nominal', classe: 5 },
  { codigo: '52.2', nome: 'Descontos', classe: 5 },
  { codigo: '52.3', nome: 'Prémios', classe: 5 },

  { codigo: '53', nome: 'Prémios de emissão', classe: 5, tipo: 'sintetica' },
  { codigo: '54', nome: 'Prestações suplementares', classe: 5, tipo: 'sintetica' },
  { codigo: '55', nome: 'Reservas legais', classe: 5, tipo: 'sintetica' },
  { codigo: '56', nome: 'Reservas de reavaliação', classe: 5, tipo: 'sintetica' },
  { codigo: '56.1', nome: 'Legais', classe: 5 },
  { codigo: '56.2', nome: 'Autónomas (56.2.1 Avaliação, 56.2.2 Realização)', classe: 5 },
  { codigo: '57', nome: 'Reservas com fins especiais', classe: 5, tipo: 'sintetica' },
  { codigo: '58', nome: 'Reservas livres', classe: 5, tipo: 'sintetica' },

  // CLASSE 6 - PROVEITOS E GANHOS POR NATUREZA
  { codigo: '61', nome: 'Vendas', classe: 6, tipo: 'sintetica' },
  { codigo: '61.1', nome: 'Produtos acabados e intermédios (61.1.1 Mercado nacional, 61.1.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '61.2', nome: 'Subprodutos, desperdícios, resíduos e refugos (61.2.1 Mercado nacional, 61.2.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '61.3', nome: 'Mercadorias (61.3.1 Mercado nacional, 61.3.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '61.4', nome: 'Embalagens de consumo (61.4.1 Mercado nacional, 61.4.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '61.5', nome: 'Subsídios a preços', classe: 6 },
  { codigo: '61.7', nome: 'Devoluções (61.7.1 Mercado nacional, 61.7.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '61.8', nome: 'Descontos e abatimentos (61.8.1 Mercado nacional, 61.8.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '61.9', nome: 'Transferência para resultados operacionais', classe: 6 },

  { codigo: '62', nome: 'Prestações de serviços', classe: 6, tipo: 'sintetica' },
  { codigo: '62.1', nome: 'Serviços principais (62.1.1 Mercado nacional, 62.1.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '62.2', nome: 'Serviços secundários (62.2.1 Mercado nacional, 62.2.2 Mercado estrangeiro)', classe: 6 },
  { codigo: '62.8', nome: 'Descontos e abatimentos', classe: 6 },
  { codigo: '62.9', nome: 'Transferência para resultados operacionais', classe: 6 },

  { codigo: '63', nome: 'Outros proveitos operacionais', classe: 6, tipo: 'sintetica' },
  { codigo: '63.1', nome: 'Serviços suplementares (63.1.1 Aluguer, 63.1.2 Pessoal, 63.1.3 Energia, 63.1.4 Estudos)', classe: 6 },
  { codigo: '63.2', nome: 'Royalties', classe: 6 },
  { codigo: '63.3', nome: 'Subsídios à exploração', classe: 6 },
  { codigo: '63.4', nome: 'Subsídios a investimento', classe: 6 },
  { codigo: '63.5', nome: 'IVA', classe: 6 },
  { codigo: '63.8', nome: 'Outros proveitos e ganhos operacionais', classe: 6 },
  { codigo: '63.9', nome: 'Transferência para resultados operacionais', classe: 6 },

  { codigo: '64', nome: 'Variação nos inventários de produtos acabados e de produção em curso', classe: 6, tipo: 'sintetica' },
  { codigo: '64.1', nome: 'Produtos e trabalhos em curso', classe: 6 },
  { codigo: '64.2', nome: 'Produtos acabados', classe: 6 },
  { codigo: '64.3', nome: 'Produtos intermédios', classe: 6 },
  { codigo: '64.9', nome: 'Transferência para resultados operacionais', classe: 6 },

  { codigo: '65', nome: 'Trabalhos para a própria empresa', classe: 6, tipo: 'sintetica' },
  { codigo: '65.1', nome: 'Para imobilizado (65.1.1 Corpóreo, 65.1.2 Incorpóreo, 65.1.3 Financeiro, 65.1.4 Em curso)', classe: 6 },
  { codigo: '65.2', nome: 'Para encargos a repartir por exercícios futuros', classe: 6 },
  { codigo: '65.9', nome: 'Transferência para resultados operacionais', classe: 6 },

  { codigo: '66', nome: 'Proveitos e ganhos financeiros gerais', classe: 6, tipo: 'sintetica' },
  { codigo: '66.1', nome: 'Juros (66.1.1 De investimentos financeiros, 66.1.2 De mora, 66.1.4 De aplicações de tesouraria, 66.1.5 Desconto de títulos)', classe: 6 },
  { codigo: '66.2', nome: 'Diferenças de câmbio favoráveis (66.2.1 Realizadas, 66.2.2 Não realizadas)', classe: 6 },
  { codigo: '66.3', nome: 'Descontos de pronto pagamento obtidos', classe: 6 },
  { codigo: '66.4', nome: 'Rendimentos de investimentos em imóveis', classe: 6 },
  { codigo: '66.5', nome: 'Rendimento de participações de capital', classe: 6 },
  { codigo: '66.6', nome: 'Ganhos na alienação de aplicações financeiras', classe: 6 },
  { codigo: '66.7', nome: 'Redução de provisões (66.7.1 Investimentos financeiros, 66.7.2 Aplicações de tesouraria)', classe: 6 },

  { codigo: '67', nome: 'Proveitos e ganhos financeiros em subsidiárias e associadas', classe: 6, tipo: 'sintetica' },
  { codigo: '67.1', nome: 'Rendimento de participações de capital (67.1.1 Subsidiárias, 67.1.2 Associadas)', classe: 6 },
  { codigo: '67.9', nome: 'Transferência para resultados em filiais e associadas', classe: 6 },

  { codigo: '68', nome: 'Outros proveitos e ganhos não operacionais', classe: 6, tipo: 'sintetica' },
  { codigo: '68.1', nome: 'Redução de provisões (68.1.1 Existências, 68.1.2 Cobranças duvidosas, 68.1.3 Riscos e encargos)', classe: 6 },
  { codigo: '68.2', nome: 'Anulação de amortizações extraordinárias', classe: 6 },
  { codigo: '68.3', nome: 'Ganhos em imobilizações (68.3.1 Venda de corpóreas, 68.3.2 Venda de incorpóreas)', classe: 6 },
  { codigo: '68.4', nome: 'Ganhos em existências (68.4.1 Sobras)', classe: 6 },
  { codigo: '68.5', nome: 'Recuperação de dívidas', classe: 6 },
  { codigo: '68.6', nome: 'Benefícios de penalidades contratuais', classe: 6 },
  { codigo: '68.8', nome: 'Descontinuidade de operações', classe: 6 },
  { codigo: '68.9', nome: 'Alterações de políticas contabilísticas', classe: 6 },
  { codigo: '68.10', nome: 'Correcções relativas a exercícios anteriores (68.10.1 Estimativa impostos, 68.10.2 Restituição impostos)', classe: 6 },
  { codigo: '68.11', nome: 'Outros ganhos e perdas não operacionais (68.11.1 Donativos)', classe: 6 },

  { codigo: '69', nome: 'Proveitos e ganhos extraordinários', classe: 6, tipo: 'sintetica' },
  { codigo: '69.1', nome: 'Ganhos resultantes de catástrofes naturais', classe: 6 },
  { codigo: '69.2', nome: 'Ganhos resultantes de convulsões políticas', classe: 6 },
  { codigo: '69.3', nome: 'Ganhos resultantes de expropriações', classe: 6 },
  { codigo: '69.4', nome: 'Ganhos resultantes de sinistros', classe: 6 },
  { codigo: '69.5', nome: 'Subsídios', classe: 6 },
  { codigo: '69.6', nome: 'Anulação de passivos não exigíveis', classe: 6 },
  { codigo: '69.9', nome: 'Transferência para resultados extraordinários', classe: 6 },

  // CLASSE 7 - CUSTOS E PERDAS POR NATUREZA
  { codigo: '71', nome: 'Custo das existências vendidas e matérias consumidas', classe: 7, tipo: 'sintetica' },
  { codigo: '71.1', nome: 'Matérias-primas', classe: 7 },
  { codigo: '71.2', nome: 'Matérias subsidiárias', classe: 7 },
  { codigo: '71.3', nome: 'Materiais diversos', classe: 7 },
  { codigo: '71.4', nome: 'Embalagens de consumo', classe: 7 },
  { codigo: '71.5', nome: 'Outros materiais', classe: 7 },
  { codigo: '71.9', nome: 'Transferência para resultados operacionais', classe: 7 },

  { codigo: '72', nome: 'Custos com o pessoal', classe: 7, tipo: 'sintetica' },
  { codigo: '72.1', nome: 'Remunerações - Órgãos sociais', classe: 7 },
  { codigo: '72.2', nome: 'Remunerações - Pessoal', classe: 7 },
  { codigo: '72.3', nome: 'Pensões (72.3.1 Órgãos sociais, 72.3.2 Pessoal)', classe: 7 },
  { codigo: '72.4', nome: 'Prémios para pensões', classe: 7 },
  { codigo: '72.9', nome: 'Transferência para resultados operacionais', classe: 7 },

  { codigo: '73', nome: 'Amortizações do exercício', classe: 7, tipo: 'sintetica' },
  { codigo: '73.1', nome: 'Imobilizações corpóreas (73.1.2 Edifícios, 73.1.3 Equipamento básico, 73.1.4 Carga/transporte, 73.1.5 Administrativo, 73.1.6 Taras)', classe: 7 },
  { codigo: '73.2', nome: 'Imobilizações incorpóreas (73.2.1 Trespasses, 73.2.2 Investigação/desenvolvimento, 73.2.3 Propriedade industrial, 73.2.4 Constituição)', classe: 7 },
  { codigo: '73.9', nome: 'Transferência para resultados operacionais', classe: 7 },

  { codigo: '75', nome: 'Outros custos e perdas operacionais', classe: 7, tipo: 'sintetica' },
  { codigo: '75.1', nome: 'Subcontratos', classe: 7 },
  { codigo: '75.2', nome: 'Fornecimentos e serviços de terceiros (FST)', classe: 7 },
  { codigo: '75.2.11', nome: 'Água', classe: 7 },
  { codigo: '75.2.12', nome: 'Electricidade', classe: 7 },
  { codigo: '75.2.13', nome: 'Combustíveis e outros fluídos', classe: 7 },
  { codigo: '75.2.14', nome: 'Conservação e reparação', classe: 7 },
  { codigo: '75.2.15', nome: 'Material de protecção, segurança e conforto', classe: 7 },
  { codigo: '75.2.16', nome: 'Ferramentas e utensílios de desgaste rápido', classe: 7 },
  { codigo: '75.2.17', nome: 'Material de escritório', classe: 7 },
  { codigo: '75.2.18', nome: 'Livros e documentação técnica', classe: 7 },
  { codigo: '75.2.20', nome: 'Comunicação', classe: 7 },
  { codigo: '75.2.21', nome: 'Rendas e alugueres', classe: 7 },
  { codigo: '75.2.22', nome: 'Seguros', classe: 7 },
  { codigo: '75.2.23', nome: 'Deslocações e estadas', classe: 7 },
  { codigo: '75.2.24', nome: 'Despesas de representação', classe: 7 },
  { codigo: '75.2.26', nome: 'Conservação e reparação', classe: 7 },
  { codigo: '75.2.27', nome: 'Vigilância e segurança', classe: 7 },
  { codigo: '75.2.28', nome: 'Limpeza, higiene e conforto', classe: 7 },
  { codigo: '75.2.29', nome: 'Publicidade e propaganda', classe: 7 },
  { codigo: '75.2.30', nome: 'Contencioso e notariado', classe: 7 },
  { codigo: '75.2.31', nome: 'Comissões a intermediários', classe: 7 },
  { codigo: '75.2.32', nome: 'Assistência técnica (75.2.32.1 Estrangeira, 75.2.32.2 Nacional)', classe: 7 },
  { codigo: '75.2.33', nome: 'Trabalhos executados no exterior', classe: 7 },
  { codigo: '75.2.34', nome: 'Honorários e avenças', classe: 7 },
  { codigo: '75.2.35', nome: 'Royalties', classe: 7 },
  { codigo: '75.2.39', nome: 'Outros serviços', classe: 7 },
  { codigo: '75.3', nome: 'Impostos', classe: 7 },
  { codigo: '75.3.1', nome: 'Indirectos (75.3.1.1 Imposto de selo, 75.3.1.2 IVA)', classe: 7 },
  { codigo: '75.3.2', nome: 'Directos (75.3.2.1 Imposto de capitais, 75.3.2.2 Contribuição predial)', classe: 7 },
  { codigo: '75.4', nome: 'Despesas confidenciais', classe: 7 },
  { codigo: '75.5', nome: 'Quotizações', classe: 7 },
  { codigo: '75.6', nome: 'Ofertas e amostras de existências', classe: 7 },
  { codigo: '75.8', nome: 'Outros custos e perdas operacionais', classe: 7 },
  { codigo: '75.9', nome: 'Transferência para resultados operacionais', classe: 7 },

  { codigo: '76', nome: 'Custos e perdas financeiras gerais', classe: 7, tipo: 'sintetica' },
  { codigo: '76.1', nome: 'Juros (76.1.1 De empréstimos bancários/obrigações, 76.1.2 Descobertos bancários, 76.1.3 De mora, 76.1.4 Desconto de títulos)', classe: 7 },
  { codigo: '76.2', nome: 'Diferenças de câmbio desfavoráveis (76.2.1 Realizadas, 76.2.2 Não realizadas)', classe: 7 },
  { codigo: '76.3', nome: 'Descontos de pronto pagamento concedidos', classe: 7 },
  { codigo: '76.4', nome: 'Amortizações de investimentos em imóveis', classe: 7 },
  { codigo: '76.5', nome: 'Provisões para aplicações financeiras', classe: 7 },
  { codigo: '76.6', nome: 'Perdas na alienação de aplicações financeiras', classe: 7 },
  { codigo: '76.7', nome: 'Serviços bancários', classe: 7 },
  { codigo: '76.9', nome: 'Transferência para resultados financeiros', classe: 7 },

  { codigo: '77', nome: 'Custos e perdas financeiras em filiais e associadas', classe: 7, tipo: 'sintetica' },
  { codigo: '77.9', nome: 'Transferência para resultados financeiros', classe: 7 },

  { codigo: '78', nome: 'Outros custos e perdas não operacionais', classe: 7, tipo: 'sintetica' },
  { codigo: '78.1', nome: 'Provisões do exercício (78.1.1 Existências, 78.1.2 Cobranças duvidosas, 78.1.3 Riscos e encargos)', classe: 7 },
  { codigo: '78.2', nome: 'Amortizações extraordinárias', classe: 7 },
  { codigo: '78.3', nome: 'Perdas em imobilizações (78.3.1 Venda corpóreas, 78.3.2 Venda incorpóreas, 78.3.3 Abates)', classe: 7 },
  { codigo: '78.4', nome: 'Perdas em existências (78.4.1 Quebras)', classe: 7 },
  { codigo: '78.5', nome: 'Dívidas incobráveis', classe: 7 },
  { codigo: '78.6', nome: 'Multas e penalidades contratuais (78.6.1 Fiscais, 78.6.2 Não fiscais)', classe: 7 },
  { codigo: '78.7', nome: 'Custos de reestruturação', classe: 7 },
  { codigo: '78.8', nome: 'Descontinuidade de operações', classe: 7 },
  { codigo: '78.9', nome: 'Alterações de políticas contabilísticas', classe: 7 },
  { codigo: '78.10', nome: 'Correcções relativas a exercícios anteriores (78.10.1 Estimativa impostos)', classe: 7 },
  { codigo: '78.11', nome: 'Outros custos e perdas não operacionais (78.11.1 Donativos, 78.11.2 Reembolso subsídios exploração)', classe: 7 },

  { codigo: '79', nome: 'Custos e perdas extraordinários', classe: 7, tipo: 'sintetica' },
  { codigo: '79.1', nome: 'Perdas resultantes de catástrofes naturais', classe: 7 },
  { codigo: '79.2', nome: 'Perdas resultantes de convulsões políticas', classe: 7 },
  { codigo: '79.3', nome: 'Perdas resultantes de expropriações', classe: 7 },
  { codigo: '79.4', nome: 'Perdas resultantes de sinistros', classe: 7 },
  { codigo: '79.9', nome: 'Transferência para resultados extraordinários', classe: 7 },

  // CLASSE 8 - RESULTADOS
  { codigo: '81', nome: 'Resultados transitados', classe: 8, tipo: 'sintetica' },
  { codigo: '81.1', nome: 'Ano anterior (81.1.1 Resultado do ano, 81.1.2 Aplicação de resultados, 81.1.3 Correcção erros fundamentais)', classe: 8 },
  { codigo: '81.2', nome: 'Ano N-2 (81.2.1 Resultado do ano, 81.2.2 Aplicação de resultados, 81.2.3 Correcção erros fundamentais)', classe: 8 },

  { codigo: '82', nome: 'Resultados operacionais', classe: 8, tipo: 'sintetica' },
  { codigo: '82.1', nome: 'Vendas (crédito por contrapartida de 61.9)', classe: 8 },
  { codigo: '82.2', nome: 'Prestações de serviços (crédito por contrapartida de 62.9)', classe: 8 },
  { codigo: '82.3', nome: 'Outros proveitos operacionais (crédito de 63.9)', classe: 8 },
  { codigo: '82.4', nome: 'Variação nos inventários de produtos acabados (64.9)', classe: 8 },
  { codigo: '82.5', nome: 'Trabalhos para a própria empresa (65.9)', classe: 8 },
  { codigo: '82.6', nome: 'Custo das mercadorias vendidas e das matérias consumidas (débito de 71.9)', classe: 8 },
  { codigo: '82.7', nome: 'Custos com o pessoal (débito de 72.9)', classe: 8 },
  { codigo: '82.8', nome: 'Amortizações do exercício (débito de 73.9)', classe: 8 },
  { codigo: '82.9', nome: 'Outros custos operacionais (débito de 75.9)', classe: 8 },
  { codigo: '82.19', nome: 'Transferência para resultados líquidos', classe: 8 },

  { codigo: '83', nome: 'Resultados financeiros', classe: 8, tipo: 'sintetica' },
  { codigo: '83.1', nome: 'Proveitos e ganhos financeiros gerais (crédito de 66.9)', classe: 8 },
  { codigo: '83.2', nome: 'Custos e perdas financeiras gerais (débito de 76.9)', classe: 8 },
  { codigo: '83.9', nome: 'Transferência para resultados líquidos', classe: 8 },

  { codigo: '84', nome: 'Resultados financeiros em filiais e associadas', classe: 8, tipo: 'sintetica' },
  { codigo: '84.1', nome: 'Proveitos e ganhos em filiais e associadas', classe: 8 },
  { codigo: '84.2', nome: 'Custos e perdas em filiais e associadas', classe: 8 },
  { codigo: '84.9', nome: 'Transferência para resultados líquidos', classe: 8 },

  { codigo: '85', nome: 'Resultados não operacionais', classe: 8, tipo: 'sintetica' },
  { codigo: '85.1', nome: 'Proveitos e ganhos não operacionais (crédito de 68.19)', classe: 8 },
  { codigo: '85.2', nome: 'Custos e perdas não operacionais (débito de 78.19)', classe: 8 },
  { codigo: '85.9', nome: 'Transferência para resultados líquidos', classe: 8 },

  { codigo: '86', nome: 'Resultados extraordinários', classe: 8, tipo: 'sintetica' },
  { codigo: '86.1', nome: 'Proveitos e ganhos extraordinários (crédito de 69.9)', classe: 8 },
  { codigo: '86.2', nome: 'Custos e perdas extraordinários (débito de 79.9)', classe: 8 },
  { codigo: '86.9', nome: 'Transferência para resultados líquidos', classe: 8 },

  { codigo: '87', nome: 'Impostos sobre os lucros', classe: 8, tipo: 'sintetica' },
  { codigo: '87.1', nome: 'Imposto sobre os resultados correntes (Imposto Industrial)', classe: 8 },
  { codigo: '87.2', nome: 'Imposto sobre os resultados extraordinários', classe: 8 },
  { codigo: '87.9', nome: 'Transferência para resultados líquidos', classe: 8 },

  { codigo: '88', nome: 'Resultado líquido do exercício', classe: 8, tipo: 'sintetica' },
  { codigo: '88.1', nome: 'Resultados operacionais (saldo de 82.19)', classe: 8 },
  { codigo: '88.2', nome: 'Resultados financeiros gerais (saldo de 83.9)', classe: 8 },
  { codigo: '88.3', nome: 'Resultados em filiais e associadas (saldo de 84.9)', classe: 8 },
  { codigo: '88.4', nome: 'Resultados não operacionais (saldo de 85.9)', classe: 8 },
  { codigo: '88.5', nome: 'Imposto sobre os resultados correntes (saldo de 87.1)', classe: 8 },
  { codigo: '88.6', nome: 'Resultados extraordinários (saldo de 86.9)', classe: 8 },
  { codigo: '88.7', nome: 'Imposto sobre os resultados extraordinários (saldo de 87.2)', classe: 8 },
  { codigo: '88.9', nome: 'Transferência para resultados transitados', classe: 8 },

  { codigo: '89', nome: 'Dividendos antecipados', classe: 8, tipo: 'sintetica' },
  { codigo: '89.9', nome: 'Transferência para resultados transitados', classe: 8 }
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. REGRAS DE MOVIMENTAÇÃO DE CONTAS (PGC ANGOLA)
// ─────────────────────────────────────────────────────────────────────────────

export const PGC_MOVEMENT_RULES: PGCMovementRule[] = [
  {
    codigo: '11',
    nome: 'Imobilizações Corpóreas',
    debito: 'Debita-se pelo custo de aquisição ou de produção dos bens (terrenos, edifícios, viaturas, equipamentos) por contrapartida de 37.1 (Compras de imobilizado), 14 (Imobilizações em curso) ou 65.1 (Trabalhos para a própria empresa), ou por reavaliação legal (56).',
    credito: 'Credita-se pelo valor do custo inicial dos bens abatidos, desmantelados ou alienados por contrapartida de 78.3 (Perdas em imobilizações) ou 68.3 (Ganhos em imobilizações), transferindo em simultâneo as amortizações acumuladas (18.1).',
    observacoes: 'Os bens devem ser registados ao custo de aquisição incluindo direitos alfandegários e despesas de montagem e transporte. IVA suportado dedutível NÃO integra o custo (vai para 34.5.2.2).'
  },
  {
    codigo: '18',
    nome: 'Amortizações Acumuladas',
    debito: 'Debita-se pela anulação das amortizações dos bens quando estes são abatidos, alienados ou desmantelados, por contrapartida da respetiva conta da Classe 1 (11.x ou 12.x).',
    credito: 'Credita-se no final de cada exercício pelas quotas de amortização calculadas com base nas taxas fiscais em vigor, por contrapartida de 73 (Amortizações do exercício).',
    observacoes: 'Conta de regularização de ativo com saldo credor, figurando no Balanço a deduzir ao valor bruto das imobilizações.'
  },
  {
    codigo: '21',
    nome: 'Compras',
    debito: 'Debita-se pelas compras de matérias-primas e mercadorias a preço de factura (sem IVA dedutível) mais custos adicionais de transporte/alfândega, por contrapartida de 32 (Fornecedores) ou 43/45.',
    credito: 'Credita-se no final do período pela transferência para as contas de existências 22 (Matérias) ou 26 (Mercadorias) pelo método de inventário intermitente, ou nas devoluções (21.7) e descontos (21.8).',
    observacoes: 'No sistema de inventário permanente, as compras são imediatamente transferidas para as contas 22/26 através de lançamentos auxiliares.'
  },
  {
    codigo: '31.1',
    nome: 'Clientes - Correntes',
    debito: 'Debita-se pelo valor total das facturas de vendas e serviços prestados (incluindo IVA liquidado) emitidas a clientes, por contrapartida de 61 (Vendas), 62 (Prestações de serviços) e 34.5.3 (IVA liquidado).',
    credito: 'Credita-se pelo recebimento dos valores por contrapartida de 43 (Depósitos) ou 45 (Caixa), pelas notas de crédito emitidas (devoluções/descontos) ou por transferência para 31.8 (Cobrança duvidosa).',
    observacoes: 'Subdivide-se em Grupo (31.1.1) e Não Grupo (31.1.2 - Nacionais e Estrangeiros).'
  },
  {
    codigo: '32.1',
    nome: 'Fornecedores - Correntes',
    debito: 'Debita-se pelos pagamentos efetuados a fornecedores por contrapartida de 43 (Depósitos à ordem) ou 45 (Caixa), retenções na fonte efetuadas (34.9 / 34.5.6.2) e devoluções/descontos obtidos.',
    credito: 'Credita-se pelo valor total das facturas recebidas por compras de bens e serviços (incluindo IVA suportado) por contrapartida de 21 (Compras), 75.2 (FST) e 34.5.1 (IVA suportado).',
    observacoes: 'Representa as dívidas a curto prazo a fornecedores de existências e serviços correntes.'
  },
  {
    codigo: '34.3',
    nome: 'Imposto sobre o Rendimento do Trabalho (IRT)',
    debito: 'Debita-se pela entrega do imposto retido nos cofres do Estado (AGT) até ao final do mês seguinte ao da retenção, por contrapartida de 43.1 (Depósitos à ordem).',
    credito: 'Credita-se pelo valor do IRT retido aos trabalhadores na folha de salário ou aos prestadores de serviços no ato do pagamento, por contrapartida de 36.1 (Pessoal - remunerações) ou 72 (Custos com o pessoal).',
    observacoes: 'Regime de retenção na fonte conforme Código do IRT Angolano (Tabela de taxas progressivas do Grupo A ou taxa liberatória de 6.5% para serviços independentes Grupo B).'
  },
  {
    codigo: '34.5.1',
    nome: 'IVA Suportado',
    debito: 'Debita-se pelo IVA mencionado nas facturas de aquisição de bens e serviços emitidas por fornecedores sujeitos passivos de IVA, por contrapartida de 32 (Fornecedores) ou 37.1 (Compras de imobilizado).',
    credito: 'Credita-se no apuramento mensal pela transferência da parcela dedutível para a conta 34.5.2 (IVA dedutível) ou, caso não seja dedutível, para o custo dos bens ou 75.3.1.2.',
    observacoes: 'Subdivide-se em 34.5.1.1 (Existências), 34.5.1.2 (Meios Fixos) e 34.5.1.3 (Outros bens e serviços).'
  },
  {
    codigo: '34.5.2',
    nome: 'IVA Dedutível',
    debito: 'Debita-se pelo montante do IVA suportado que legalmente confere direito a dedução, por contrapartida de 34.5.1 (IVA suportado).',
    credito: 'Credita-se no final do período de imposto (mensal) pela transferência do saldo para a conta 34.5.5 (IVA apuramento).',
    observacoes: 'Subdivide-se em 34.5.2.1 (Existências), 34.5.2.2 (Meios Fixos) e 34.5.2.3 (Outros bens e serviços).'
  },
  {
    codigo: '34.5.3',
    nome: 'IVA Liquidado',
    debito: 'Debita-se no final do período de imposto (mensal) pela transferência do saldo acumulado para a conta 34.5.5 (IVA apuramento).',
    credito: 'Credita-se pelo montante do IVA liquidado nas facturas de venda de bens e prestações de serviços (taxa geral de 14% ou regimes especiais), por contrapartida de 31 (Clientes) ou 43/45.',
    observacoes: 'Subdivide-se em 34.5.3.1 (Operações gerais), 34.5.3.2 (Regime de caixa), 34.5.3.3 (Autoconsumos) e 34.5.3.4 (Operações especiais).'
  },
  {
    codigo: '34.5.4',
    nome: 'IVA Regularizações',
    debito: 'Debita-se pelas regularizações a favor do sujeito passivo (ex: notas de crédito de fornecedores com IVA, créditos incobráveis justificados), por contrapartida de 34.5.5.',
    credito: 'Credita-se pelas regularizações a favor do Estado (ex: notas de crédito a clientes com IVA devolvido, anulação de deduções indevidas), por contrapartida de 34.5.5.',
    observacoes: 'Inclui 34.5.4.1 (Mensais a favor SP), 34.5.4.2 (Mensais a favor Estado) e 34.5.4.3 (Pró-rata anual).'
  },
  {
    codigo: '34.5.5',
    nome: 'IVA Apuramento',
    debito: 'Debita-se pela transferência do saldo de 34.5.2 (IVA dedutível) e de 34.5.4.1 (Regularizações a favor do sujeito passivo).',
    credito: 'Credita-se pela transferência do saldo de 34.5.3 (IVA liquidado) e de 34.5.4.2 (Regularizações a favor do Estado).',
    observacoes: 'Se o saldo final for credor, transfere-se a débito para crédito de 34.5.6.1 (IVA a pagar). Se o saldo for devedor, transfere-se a crédito para débito de 34.5.7.1 (IVA a recuperar).'
  },
  {
    codigo: '34.5.6',
    nome: 'IVA a Pagar',
    debito: 'Debita-se pelo pagamento da guia de liquidação de IVA à AGT através do DUC (Documento Único de Cobrança), por contrapartida de 43.1 (Depósitos à ordem).',
    credito: 'Credita-se pelo apuramento mensal com saldo credor transferido de 34.5.5.1, ou pela retenção na fonte de IVA cativo (34.5.6.2).',
    observacoes: 'O pagamento deve ser efetuado até ao último dia útil do mês seguinte àquele a que respeitam as operações.'
  },
  {
    codigo: '34.5.7',
    nome: 'IVA a Recuperar',
    debito: 'Debita-se no fecho do apuramento mensal quando o IVA dedutível é superior ao IVA liquidado, por contrapartida de 34.5.5.1.',
    credito: 'Credita-se pela dedução nos apuramentos dos períodos seguintes (34.5.5) ou pelo pedido formal de reembolso transferido para 34.5.8.1.',
    observacoes: 'Representa crédito de imposto da empresa perante o Estado (AGT).'
  },
  {
    codigo: '36.1',
    nome: 'Pessoal - Remunerações',
    debito: 'Debita-se pelo pagamento líquido aos trabalhadores (43.1/45), pelos descontos efetuados de IRT (34.3), Segurança Social INSS 3% (34.9/37.9) e adiantamentos (36.3).',
    credito: 'Credita-se no processamento mensal dos salários pelo valor bruto das remunerações (salário base + subsídios sujeitos), por contrapartida de 72.2 (Remunerações - pessoal).',
    observacoes: 'Controlo estrito das folhas de vencimento e retenções legais obrigatórias.'
  },
  {
    codigo: '43.1',
    nome: 'Depósitos à Ordem - Moeda Nacional',
    debito: 'Debita-se por todos os recebimentos de clientes, transferências bancárias recebidas, depósitos em numerário e juros creditados, por contrapartida de 31 (Clientes), 45 (Caixa) ou 66.1 (Juros).',
    credito: 'Credita-se por todos os pagamentos efetuados por transferência bancária, cheques, débitos diretos e pagamento de impostos à AGT, por contrapartida de 32 (Fornecedores), 34 (Estado), 36 (Pessoal) ou 75 (FST).',
    observacoes: 'Conta de disponibilidades sujeita a reconciliação bancária mensal obrigatória.'
  },
  {
    codigo: '61.1',
    nome: 'Vendas - Produtos Acabados',
    debito: 'Debita-se no fim do exercício pela transferência do saldo para a conta 82.1 (Resultados operacionais - vendas).',
    credito: 'Credita-se pelo valor líquido de facturação (sem IVA) de produtos acabados vendidos a clientes, por contrapartida de 31 (Clientes) ou 43/45.',
    observacoes: 'Não inclui o IVA liquidado, que é creditado na conta 34.5.3.'
  },
  {
    codigo: '71.1',
    nome: 'Custo das Existências Vendidas e Matérias Consumidas',
    debito: 'Debita-se pelo custo das matérias-primas consumidas no processo produtivo durante o exercício (pelo inventário permanente ou intermitente), por contrapartida de 22.1.',
    credito: 'Credita-se no final do exercício pelo encerramento de contas, por transferência do saldo para 82.6 (Resultados operacionais).',
    observacoes: 'Determina a margem bruta de produção e comercialização.'
  },
  {
    codigo: '72.2',
    nome: 'Custos com o Pessoal - Remunerações',
    debito: 'Debita-se pelo valor ilíquido dos salários, subsídios de férias e de Natal devidos aos trabalhadores, por contrapartida de 36.1 (Pessoal - remunerações).',
    credito: 'Credita-se no final do exercício pelo encerramento de contas, transferindo o total para a conta 82.7 (Resultados operacionais).',
    observacoes: 'Despesa operacional dedutível em sede de Imposto Industrial desde que comprovada.'
  },
  {
    codigo: '75.2',
    nome: 'Fornecimentos e Serviços de Terceiros (FST)',
    debito: 'Debita-se pelo valor das facturas de serviços prestados por terceiros (água, luz, telecomunicações, rendas, honorários, segurança), por contrapartida de 32 (Fornecedores) ou 43/45.',
    credito: 'Credita-se no encerramento do exercício pela transferência do saldo acumulado para a conta 82.9 (Resultados operacionais).',
    observacoes: 'Subdivisão detalhada de 75.2.11 a 75.2.39 essencial para análise de custos e preenchimento da Nota 30/31 às contas.'
  },
  {
    codigo: '88',
    nome: 'Resultado Líquido do Exercício',
    debito: 'Debita-se pela transferência dos saldos negativos de resultados (82.19 se prejuízo, 83.9 se perdas, 85.9, 86.9) e pelo Imposto Industrial (87.1 e 87.2).',
    credito: 'Credita-se pela transferência dos saldos positivos de resultados (82.19 se lucro operacional, 83.9 ganhos, 85.9, 86.9).',
    observacoes: 'O saldo final credor representa Lucro Líquido; saldo devedor representa Prejuízo do Exercício. No início do ano seguinte, o saldo é transferido para a conta 81.1 (Resultados transitados).'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. ESTRUTURA OFICIAL DAS DEMONSTRAÇÕES FINANCEIRAS E NOTAS (PGC ANGOLA)
// ─────────────────────────────────────────────────────────────────────────────

export const PGC_FINANCIAL_STATEMENTS_STRUCTURE = {
  balanco: {
    conceito: 'O Balanço reflete a posição patrimonial e financeira da entidade numa determinada data, estruturado segundo a equação fundamental do PGC: Ativo = Passivo + Capital Próprio.',
    ativo: [
      { rubrica: 'ACTIVO NÃO CORRENTE', itens: [
        'Imobilizações corpóreas (Bruto - Amortizações acum. 18.1)',
        'Imobilizações incorpóreas (Bruto - Amortizações acum. 18.2)',
        'Investimentos financeiros (Bruto - Provisões 19)',
        'Imobilizações em curso (14)'
      ]},
      { rubrica: 'ACTIVO CORRENTE', itens: [
        'Existências (21 a 28 - Provisões 29)',
        'Clientes (31 - Provisões 38.1)',
        'Outros devedores (34 a 37 - Provisões)',
        'Títulos negociáveis (41 - Provisões 49)',
        'Disponibilidades (Depósitos 42, 43, 44 e Caixa 45)'
      ]}
    ],
    passivoCapitalProprio: [
      { rubrica: 'CAPITAL PRÓPRIO', itens: [
        'Capital social (51)',
        'Acções / quotas próprias (52)',
        'Prémios de emissão (53)',
        'Prestações suplementares (54)',
        'Reservas legais (55)',
        'Reservas de reavaliação (56)',
        'Reservas livres e outras reservas (57, 58)',
        'Resultados transitados (81)',
        'Resultado líquido do exercício (88)',
        'Dividendos antecipados (89 - a deduzir)'
      ]},
      { rubrica: 'PASSIVO NÃO CORRENTE', itens: [
        'Empréstimos bancários a médio e longo prazo (33.1)',
        'Empréstimos por obrigações (33.2)',
        'Outros credores a médio e longo prazo (35, 37)',
        'Provisões para outros riscos e encargos (39)'
      ]},
      { rubrica: 'PASSIVO CORRENTE', itens: [
        'Fornecedores (32)',
        'Empréstimos bancários a curto prazo (33.1)',
        'Estado e outros entes públicos (34 - IVA a pagar 34.5.6, IRT 34.3, Imposto Industrial 34.1)',
        'Pessoal - remunerações a pagar (36.1, 37.5)',
        'Outros credores a curto prazo (35, 37)'
      ]}
    ]
  },
  demonstracaoResultadosNatureza: [
    'Vendas e prestações de serviços (61 + 62)',
    'Variação da produção e trabalhos em curso (64)',
    'Trabalhos para a própria empresa (65)',
    'Outros proveitos operacionais (63)',
    '(=) Total de Proveitos Operacionais',
    '(-) Custo das existências vendidas e matérias consumidas (71)',
    '(-) Custos com o pessoal (72)',
    '(-) Amortizações do exercício (73)',
    '(-) Outros custos e perdas operacionais (75)',
    '(=) RESULTADO OPERACIONAL (82)',
    '(+) Proveitos e ganhos financeiros gerais (66)',
    '(-) Custos e perdas financeiras gerais (76)',
    '(+) Resultados em filiais e associadas (67 - 77)',
    '(=) RESULTADO FINANCEIRO (83 + 84)',
    '(+) Proveitos e ganhos não operacionais (68)',
    '(-) Custos e perdas não operacionais (78)',
    '(=) RESULTADO CORRENTE ANTES DE IMPOSTOS',
    '(-) Imposto sobre os lucros correntes (87.1)',
    '(=) RESULTADO CORRENTE APÓS IMPOSTOS',
    '(+) Proveitos e ganhos extraordinários (69)',
    '(-) Custos e perdas extraordinários (79)',
    '(-) Imposto sobre resultados extraordinários (87.2)',
    '(=) RESULTADO LÍQUIDO DO EXERCÍCIO (88)'
  ],
  notasAsContas: [
    { numero: 1, titulo: 'Atividade da Empresa', categoria: 'introducao', estrutura: ['Identificação, sede, NIF e objeto social', 'Legislação aplicável e enquadramento'], descricao: 'Caracterização geral da entidade e regime fiscal.' },
    { numero: 2, titulo: 'Bases de Apresentação e Políticas Contabilísticas', categoria: 'introducao', estrutura: ['Princípios contabilísticos adotados (continuidade, especialização, custo histórico)', 'Moeda funcional e critérios valorimétricos'], descricao: 'Referencial PGC Angola (Decreto 82/2001).' },
    { numero: 3, titulo: 'Imobilizações Corpóreas', categoria: 'balanco', estrutura: ['3.1 Composição do valor bruto', '3.2 Movimentos no valor bruto (aquisições, abates, transferências)', '3.3 Movimentos nas amortizações acumuladas', '3.4 Taxas de amortização aplicadas por grupo de bens'], descricao: 'Detalhamento das contas da Classe 11 e 18.1.' },
    { numero: 4, titulo: 'Imobilizações Incorpóreas', categoria: 'balanco', estrutura: ['4.1 Composição e movimentos', '4.2 Amortizações acumuladas (18.2)'], descricao: 'Trespasses, despesas I&D e licenças (Classe 12).' },
    { numero: 5, titulo: 'Investimentos Financeiros', categoria: 'balanco', estrutura: ['5.1 Participações de capital em subsidiárias e associadas', '5.2 Provisões constituídas (19)'], descricao: 'Detalhamento da Classe 13 e 19.' },
    { numero: 6, titulo: 'Existências', categoria: 'balanco', estrutura: ['6.1 Discriminação por categorias (mercadorias, matérias, produtos acabados)', '6.2 Critério de valorimetria das saídas (FIFO, Custo Médio Ponderado)', '6.3 Provisões para depreciação de existências (29)'], descricao: 'Detalhamento das contas da Classe 2.' },
    { numero: 7, titulo: 'Clientes e Outros Devedores', categoria: 'balanco', estrutura: ['7.1 Antiguidade de saldos correntes e títulos', '7.2 Clientes de cobrança duvidosa (31.8)', '7.3 Provisões para cobranças duvidosas (38.1)'], descricao: 'Detalhamento da conta 31 e 38.' },
    { numero: 8, titulo: 'Estado e Outros Entes Públicos (Devedores)', categoria: 'balanco', estrutura: ['8.1 IVA a recuperar (34.5.7)', '8.2 Reembolsos de IVA pedidos (34.5.8)', '8.3 Pagamentos por conta e retenções a compensar'], descricao: 'Créditos fiscais perante a AGT.' },
    { numero: 9, titulo: 'Disponibilidades e Aplicações de Tesouraria', categoria: 'balanco', estrutura: ['9.1 Caixa e Depósitos Bancários por instituição', '9.2 Saldos em moeda estrangeira e taxa de câmbio de fecho (BNA)'], descricao: 'Detalhamento da Classe 4.' },
    { numero: 10, titulo: 'Capital Próprio', categoria: 'balanco', estrutura: ['10.1 Estrutura do capital social e participações', '10.2 Movimentação das reservas e aplicação de resultados'], descricao: 'Detalhamento da Classe 5 e 81.' },
    { numero: 11, titulo: 'Empréstimos Obtidos', categoria: 'balanco', estrutura: ['11.1 Dívidas bancárias discriminadas por prazo (curto vs médio/longo prazo)', '11.2 Taxas de juro e garantias prestadas'], descricao: 'Detalhamento da conta 33.' },
    { numero: 12, titulo: 'Fornecedores e Outros Credores', categoria: 'balanco', estrutura: ['12.1 Fornecedores correntes e faturas em receção', '12.2 Dívidas ao pessoal e encargos a pagar'], descricao: 'Detalhamento da conta 32 e 37.' },
    { numero: 13, titulo: 'Estado e Outros Entes Públicos (Credores)', categoria: 'balanco', estrutura: ['13.1 IVA a pagar (34.5.6)', '13.2 Imposto Industrial a pagar (34.1)', '13.3 Retenções na fonte (IRT 34.3, Imposto do Selo, 6.5%)', '13.4 Segurança Social INSS a entregar'], descricao: 'Passivo fiscal e parafiscal perante a AGT e INSS.' },
    { numero: 14, titulo: 'Provisões para Riscos e Encargos', categoria: 'balanco', estrutura: ['14.1 Processos judiciais em curso (39.2)', '14.2 Outros riscos operacionais (39.9)'], descricao: 'Detalhamento da conta 39.' },
    { numero: 22, titulo: 'Vendas e Prestações de Serviços', categoria: 'resultados', estrutura: ['22.1 Segmentação por mercado (Nacional vs Estrangeiro)', '22.2 Devoluções e descontos concedidos'], descricao: 'Detalhamento das contas 61 e 62.' },
    { numero: 23, titulo: 'Custo das Existências Vendidas e Matérias Consumidas', categoria: 'resultados', estrutura: ['Fórmula: Existências Iniciais + Compras Líquidas - Existências Finais = Consumos (71)'], descricao: 'Cálculo analítico do CMVMC.' },
    { numero: 24, titulo: 'Custos com o Pessoal', categoria: 'resultados', estrutura: ['24.1 Remunerações dos Órgãos Sociais (72.1)', '24.2 Remunerações do Pessoal e encargos sociais (72.2)', '24.3 Número médio de trabalhadores por categoria'], descricao: 'Detalhamento da conta 72.' },
    { numero: 25, titulo: 'Fornecimentos e Serviços de Terceiros (FST)', categoria: 'resultados', estrutura: ['Detalhamento das rubricas mais relevantes da conta 75.2 (água, luz, rendas, honorários, segurança)'], descricao: 'Detalhamento da conta 75.2.' },
    { numero: 26, titulo: 'Resultados Financeiros', categoria: 'resultados', estrutura: ['26.1 Juros suportados vs juros obtidos', '26.2 Diferenças de câmbio favoráveis e desfavoráveis (realizadas e não realizadas)'], descricao: 'Detalhamento das contas 66 e 76.' },
    { numero: 27, titulo: 'Imposto sobre os Lucros', categoria: 'resultados', estrutura: ['27.1 Conciliação entre o Resultado Contabilístico e a Matéria Coletável fiscal', '27.2 Cálculo do Imposto Industrial (taxa geral 25%) e modelo 1 AGT'], descricao: 'Detalhamento da conta 87.' }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. FUNÇÃO AUXILIAR DE EXTRAÇÃO DE CONHECIMENTO PGC DIRECIONADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna apenas as seções e contas relevantes do PGC para anexar ao prompt da IA,
 * evitando sobrecarga de tokens e mantendo máxima precisão e conformidade com o Decreto 82/2001.
 */
export function getRelevantPGCKnowledge(query: string): string {
  if (!query) return '';
  const q = query.toLowerCase();

  const sections: string[] = [];

  // 1. Procurar contas correspondentes
  const matchedAccounts = PGC_CHART_OF_ACCOUNTS.filter(acc => {
    const codeMatch = q.includes(acc.codigo.toLowerCase()) || (acc.codigo.length >= 2 && q.includes(acc.codigo.replace('.', '')));
    const nameMatch = acc.nome.toLowerCase().split(' ').some(word => word.length > 3 && q.includes(word));
    return codeMatch || nameMatch;
  }).slice(0, 15);

  if (matchedAccounts.length > 0) {
    sections.push(`### CONTAS DO PGC IDENTIFICADAS NO PEDIDO (Decreto n.º 82/2001):\n` +
      matchedAccounts.map(a => `- **${a.codigo}** ${a.nome} (Classe ${a.classe})`).join('\n')
    );
  }

  // 2. Procurar regras de movimentação correspondentes
  const matchedRules = PGC_MOVEMENT_RULES.filter(rule => {
    const codeMatch = q.includes(rule.codigo) || q.includes(rule.codigo.replace('.', ''));
    const nameWords = rule.nome.toLowerCase().split(' ').filter(w => w.length > 4);
    const textMatch = nameWords.some(w => q.includes(w));
    return codeMatch || textMatch;
  }).slice(0, 5);

  if (matchedRules.length > 0) {
    sections.push(`### REGRAS OFICIAIS DE MOVIMENTAÇÃO DE CONTAS (PGC ANGOLA):\n` +
      matchedRules.map(r => 
        `**Conta ${r.codigo} - ${r.nome}**\n- *Débito:* ${r.debito}\n- *Crédito:* ${r.credito}\n- *Observações:* ${r.observacoes}`
      ).join('\n\n')
    );
  }

  // 3. IVA Especial
  if (q.includes('iva') || q.includes('34.5') || q.includes('14%') || q.includes('cativo') || q.includes('imposto')) {
    const ivaAccounts = PGC_CHART_OF_ACCOUNTS.filter(a => a.codigo.startsWith('34.5'));
    sections.push(`### REGIME DE IVA NO PGC (Decreto Presidencial n.º 180/19):\n` +
      ivaAccounts.map(a => `- ${a.codigo} ${a.nome}`).join('\n') +
      `\n*Mecanismo de Apuramento:* Débito de 34.5.5 por 34.5.2 (dedutível) e crédito de 34.5.5 por 34.5.3 (liquidado). Se Saldo Credor -> 34.5.6.1 (IVA a pagar). Se Saldo Devedor -> 34.5.7.1 (IVA a recuperar).`
    );
  }

  // 4. Balanço ou Demonstrações
  if (q.includes('balanço') || q.includes('balanco') || q.includes('demonstraç') || q.includes('demonstrac') || q.includes('mapa') || q.includes('ativo') || q.includes('passivo')) {
    sections.push(`### ESTRUTURA OFICIAL DO BALANÇO (PGC ANGOLA):\n- **Activo Não Corrente:** Imobilizações Corpóreas (11-18.1), Incorpóreas (12-18.2), Investimentos Financeiros (13-19), Em Curso (14).\n- **Activo Corrente:** Existências (21..28 - 29), Clientes (31 - 38.1), Outros Devedores (34..37), Títulos (41), Disponibilidades (42..45).\n- **Capital Próprio:** Capital Social (51), Reservas (55..58), Resultados Transitados (81), Resultado Líquido (88).\n- **Passivo Não Corrente:** Empréstimos M/L Prazo (33), Provisões Riscos (39).\n- **Passivo Corrente:** Fornecedores (32), Estado e Impostos (34), Pessoal (36), Empréstimos C/P (33).`);
  }

  // 5. Notas às Contas
  if (q.includes('nota') || q.includes('anexo') || q.includes('notas às contas')) {
    const relevantNotes = PGC_FINANCIAL_STATEMENTS_STRUCTURE.notasAsContas.filter(n => 
      q.includes(`nota ${n.numero}`) || q.includes(n.titulo.toLowerCase()) || n.numero <= 13
    ).slice(0, 8);

    if (relevantNotes.length > 0) {
      sections.push(`### ESTRUTURA OFICIAL DE NOTAS ÀS CONTAS DO PGC:\n` +
        relevantNotes.map(n => `**Nota ${n.numero} - ${n.titulo}**\n- Estrutura: ${n.estrutura.join('; ')}\n- Âmbito: ${n.descricao}`).join('\n\n')
      );
    }
  }

  return sections.join('\n\n');
}

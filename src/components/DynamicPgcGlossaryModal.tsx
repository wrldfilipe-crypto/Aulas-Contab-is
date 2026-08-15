import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Search, Sparkles, Filter, X, ArrowRight, Zap, 
  HelpCircle, CheckCircle2, FileText, ChevronRight, MessageSquare,
  Bookmark, BookmarkCheck, Globe, Scale, TrendingUp, DollarSign
} from 'lucide-react';

export interface PgcTerm {
  id: string;
  term: string;
  accountCode?: string;
  category: 'contabilidade' | 'fiscalidade' | 'ifrs' | 'economia' | 'demonstracoes' | 'legislacao';
  definition: string;
  legalBasis?: string;
  practicalExample?: string;
  keywords: string[];
}

export const PGC_ANGOLA_GLOSSARY: PgcTerm[] = [
  // --- A ---
  {
    id: 'activo_corrente',
    term: 'Activo Corrente',
    accountCode: 'Classes 2, 3 e 4',
    category: 'contabilidade',
    definition: 'Conjunto de bens e direitos que se espera realizar, vender ou consumir no decurso do ciclo operacional normal da empresa (normalmente até 12 meses), incluindo existências, clientes e disponibilidades.',
    legalBasis: 'PGC Angola (Decreto n.º 82/01) / IAS 1',
    practicalExample: 'Caixa e depósitos bancários (Classe 4), contas a receber de clientes (31) e mercadorias em armazém (21/22).',
    keywords: ['activo corrente', 'ativo corrente', 'disponibilidades', 'liquidez', 'curto prazo']
  },
  {
    id: 'activo_nao_corrente',
    term: 'Activo Não Corrente (Imobilizado)',
    accountCode: 'Classe 1 - Imobilizações',
    category: 'contabilidade',
    definition: 'Bens e direitos tangíveis, intangíveis e financeiros destinados a permanecer na empresa de forma duradoura (mais de 1 ano), gerando benefícios económicos futuros.',
    legalBasis: 'PGC Angola (Decreto n.º 82/01, Classe 1)',
    practicalExample: 'Edifícios e instalações (11.2), viaturas (11.4), software (12.2) e participações de capital (13.1).',
    keywords: ['imobilizado', 'activo fixo', 'tangivel', 'intangivel', 'depreciação', 'classe 1']
  },
  {
    id: 'amortizacoes_acumuladas',
    term: 'Amortizações e Depreciações Acumuladas',
    accountCode: 'Conta 19 (Redutora do Activo)',
    category: 'contabilidade',
    definition: 'Conta de compensação que acumula as quotas periódicas de depreciação imputadas aos ativos imobilizados ao longo da sua vida útil, deduzindo o valor bruto no Balanço.',
    legalBasis: 'Decreto Executivo n.º 2/10 e PGC Angola',
    practicalExample: 'Viatura adquirida por Kz 10.000.000 com depreciação acumulada de Kz 4.000.000 resulta num valor líquido contabilístico de Kz 6.000.000.',
    keywords: ['19', 'amortizacao acumulada', 'depreciacao acumulada', 'quota de amortizacao', 'valor liquido']
  },
  {
    id: 'autonomia_financeira',
    term: 'Autonomia Financeira',
    accountCode: 'Rácio: Capital Próprio / Activo Total',
    category: 'economia',
    definition: 'Indicador financeiro que mede a percentagem do ativo total que é financiada por fundos próprios da empresa. Considera-se equilibrado quando é superior a 33%.',
    legalBasis: 'Análise Financeira e Gestão de Risco',
    practicalExample: 'Capital Próprio de Kz 40M sobre Activo de Kz 100M = Autonomia Financeira de 40% (estrutura sólida).',
    keywords: ['autonomia financeira', 'racio', 'solvabilidade', 'estrutura de capital']
  },

  // --- B ---
  {
    id: 'balancete',
    term: 'Balancete de Verificação',
    accountCode: 'Classes 1 a 8',
    category: 'demonstracoes',
    definition: 'Demonstração contabilística periódica que reúne todas as contas com movimentos a débito e crédito e os respetivos saldos, confirmando o equilíbrio das partidas dobradas.',
    legalBasis: 'PGC Angola (Decreto n.º 82/01)',
    practicalExample: 'Balancete de 6 ou 8 colunas com total de débitos igual ao total de créditos do período e acumulado.',
    keywords: ['balancete', 'partidas dobradas', 'verificação', 'razao', 'saldos']
  },
  {
    id: 'balanco_patrimonial',
    term: 'Balanço Patrimonial Vertical',
    accountCode: 'Demonstração Oficial',
    category: 'demonstracoes',
    definition: 'Demonstração financeira estática que apresenta a situação patrimonial e financeira da empresa numa data determinada, garantindo a equação: Activo = Capital Próprio + Passivo.',
    legalBasis: 'PGC Angola (Decreto n.º 82/01, Anexo 1)',
    practicalExample: 'Apresentação vertical dividida em Activo Não Corrente, Activo Corrente, Capital Próprio, Passivo Não Corrente e Passivo Corrente.',
    keywords: ['balanco', 'balanço', 'patrimonio', 'activo', 'passivo', 'capital proprio']
  },

  // --- C ---
  {
    id: 'capital_social',
    term: 'Capital Social / Capital Próprio',
    accountCode: 'Classe 5 - Conta 51 / 52',
    category: 'contabilidade',
    definition: 'Valor nominal das entradas realizadas ou prometidas pelos sócios ou acionistas para a constituição ou aumento do capital da sociedade comercial.',
    legalBasis: 'Lei das Sociedades Comerciais (Lei n.º 1/04)',
    practicalExample: 'Quotas de sócios em sociedades por quotas (51.1) ou ações subscritas em sociedades anónimas (51.2).',
    keywords: ['capital social', 'classe 5', '51', 'socios', 'acoes', 'quotas']
  },
  {
    id: 'cmvmc',
    term: 'CMVMC - Custo das Mercadorias Vendidas e Matérias Consumidas',
    accountCode: 'Conta 71 (Custos por Natureza)',
    category: 'contabilidade',
    definition: 'Expressa o custo de aquisição ou de produção dos bens vendidos durante o período: CMVMC = Existências Iniciais + Compras Líquidas - Existências Finais.',
    legalBasis: 'PGC Angola (Decreto n.º 82/01, Conta 71)',
    practicalExample: 'Inventário inicial Kz 2M + Compras Kz 8M - Inventário final Kz 3M = CMVMC de Kz 7M debitado na conta 71.',
    keywords: ['cmvmc', '71', 'custo de mercadorias', 'inventario', 'existencias']
  },

  // --- D ---
  {
    id: 'dar_agt',
    term: 'DAR - Documento de Arrecadação de Receitas',
    accountCode: 'Guia de Pagamento Fiscal',
    category: 'fiscalidade',
    definition: 'Documento oficial gerado no portal da AGT para recolha de tributos aos cofres do Estado Angolano, via referência bancária ou RUPE.',
    legalBasis: 'Código Geral Tributário de Angola',
    practicalExample: 'Pagamento mensal de IRT e IVA até ao dia 20 do mês seguinte à liquidação.',
    keywords: ['dar', 'rupe', 'agt', 'guia', 'pagamento de impostos', 'arrecadacao']
  },
  {
    id: 'decreto_82_01',
    term: 'Decreto n.º 82/01 (PGC Angola)',
    accountCode: 'Legislação Base Nacional',
    category: 'legislacao',
    definition: 'Decreto do Conselho de Ministros de 16 de Novembro de 2001 que aprovou o Plano Geral de Contabilidade de Angola, obrigatório para todas as entidades sujeitas à legislação comercial angolana.',
    legalBasis: 'Diário da República I Série - N.º 53 de 16/11/2001',
    practicalExample: 'Define a codificação de 8 classes de contas e os modelos obrigatórios de Balanço, Demonstração de Resultados e Notas.',
    keywords: ['decreto 82/01', '82/2001', 'pgc', 'plano geral de contabilidade', 'quadro legal']
  },
  {
    id: 'demonstracao_fluxos_caixa',
    term: 'Demonstração de Fluxos de Caixa (DFC)',
    accountCode: 'Demonstração Financeira',
    category: 'demonstracoes',
    definition: 'Demonstração que evidencia as entradas e saídas de caixa e equivalentes durante o exercício, distribuídas pelas atividades operacionais, de investimento e de financiamento.',
    legalBasis: 'PGC Angola e IAS 7',
    practicalExample: 'Conciliação do Resultado Líquido com o acréscimo real nos meios monetários através do método indireto.',
    keywords: ['fluxos de caixa', 'dfc', 'cash flow', 'operacional', 'investimento', 'financiamento', 'ias 7']
  },

  // --- E ---
  {
    id: 'ebitda',
    term: 'EBITDA (Resultados antes de Juros, Impostos e Amortizações)',
    accountCode: 'Indicador de Rentabilidade Operacional',
    category: 'economia',
    definition: 'Métrica financeira que avalia o potencial de geração de caixa operacional puro da empresa, antes dos impactos de financiamento, impostos e políticas de depreciação.',
    legalBasis: 'Normas Internacionais de Análise Financeira',
    practicalExample: 'Proveitos Operacionais (Kz 50M) - Custos Operacionais sem amortizações (Kz 35M) = EBITDA de Kz 15M.',
    keywords: ['ebitda', 'cash flow operacional', 'margem', 'rentabilidade', 'financas']
  },

  // --- F ---
  {
    id: 'fst_62',
    term: 'Fornecimentos e Serviços de Terceiros (FST - Conta 62)',
    accountCode: 'Conta 62',
    category: 'contabilidade',
    definition: 'Custos com bens não duradouros e serviços prestados por terceiros para a exploração da empresa (eletricidade, água, comunicações, rendas, honorários e transportes).',
    legalBasis: 'PGC Angola (Decreto n.º 82/01, Conta 62)',
    practicalExample: 'Lançamento de fatura de prestação de serviços de consultoria: Débito 62.2, Crédito 34.6 (6,5% Retenção) e Crédito 32.1 (Fornecedores).',
    keywords: ['62', 'fst', 'servicos de terceiros', 'rendas', 'honorarios', 'eletricidade']
  },
  {
    id: 'fundo_de_maneio',
    term: 'Fundo de Maneio Líquido (FML)',
    accountCode: 'Activo Corrente - Passivo Corrente',
    category: 'economia',
    definition: 'Margem de segurança financeira que representa a parcela dos capitais permanentes (Capital Próprio + Passivo Não Corrente) que financia os ativos correntes.',
    legalBasis: 'Gestão de Tesouraria e Finanças Corporativas',
    practicalExample: 'Activo Corrente de Kz 30M e Passivo Corrente de Kz 20M = Fundo de Maneio positivo de Kz 10M.',
    keywords: ['fundo de maneio', 'working capital', 'tesouraria', 'equilibrio financeiro']
  },

  // --- I ---
  {
    id: 'ias_16',
    term: 'IAS 16 / NCRF - Activos Fixos Tangíveis',
    accountCode: 'Norma Contabilística Internacional',
    category: 'ifrs',
    definition: 'Norma que prescreve o tratamento contabilístico para ativos fixos tangíveis, incluindo reconhecimento inicial pelo custo, depreciação sistemática e testes de imparidade.',
    legalBasis: 'IFRS Foundation / IAS 16',
    practicalExample: 'Reavaliação de imóveis ou determinação do valor residual no termo da vida útil.',
    keywords: ['ias 16', 'ifrs', 'imobilizado corporeo', 'tangivel', 'reavaliacao']
  },
  {
    id: 'ifrs_16_locacoes',
    term: 'IFRS 16 - Locações e Arrendamentos',
    accountCode: 'Norma Internacional',
    category: 'ifrs',
    definition: 'Norma que elimina a distinção entre locação operacional e financeira para o locatário, exigindo o reconhecimento de um direito de uso no ativo e uma obrigação de locação no passivo.',
    legalBasis: 'IFRS 16 (International Accounting Standards Board)',
    practicalExample: 'Contrato de arrendamento de instalações por 5 anos reconhecido no Balanço pelo valor presente das rendas futuras.',
    keywords: ['ifrs 16', 'leasing', 'locacao', 'direito de uso', 'arrendamento']
  },
  {
    id: 'imposto_industrial',
    term: 'Imposto Industrial (Regime Geral e Simplificado)',
    accountCode: 'Conta 34.5 / Conta 87',
    category: 'fiscalidade',
    definition: 'Imposto sobre os lucros das empresas em Angola. A taxa geral é de 25% para atividade geral e 10% para o setor agrícola e pecuário.',
    legalBasis: 'Código do Imposto Industrial (Lei n.º 19/14 e Lei n.º 26/20)',
    practicalExample: 'Apuramento do lucro tributável através da Declaração Modelo 22 entregue até ao último dia útil de Maio.',
    keywords: ['imposto industrial', 'modelo 22', '34.5', '87', 'taxa 25%', 'lucro tributavel', 'agt']
  },
  {
    id: 'imposto_selo',
    term: 'Imposto de Selo',
    accountCode: 'Conta 34.8 / Conta 64',
    category: 'fiscalidade',
    definition: 'Imposto que incide sobre operações bancárias, contratos, recibos de quitação e atos notariais em território angolano (1% na generalidade das quitações).',
    legalBasis: 'Código do Imposto de Selo (Decreto Legislativo Presidencial n.º 3/14)',
    practicalExample: 'Cobrança de 1% sobre recibos emitidos e 0,5% sobre utilização de crédito bancário.',
    keywords: ['selo', 'imposto de selo', '34.8', 'quitacao', 'contratos', 'recibos']
  },
  {
    id: 'irt_angola',
    term: 'IRT - Imposto sobre o Rendimento do Trabalho',
    accountCode: 'Conta 34.1',
    category: 'fiscalidade',
    definition: 'Imposto progressivo direto sobre os rendimentos auferidos pelos trabalhadores por conta de outrem (Grupo A), conta própria (Grupo B) e atividades comerciais por singulares (Grupo C).',
    legalBasis: 'Código do IRT (Lei n.º 18/14 e Lei n.º 28/20)',
    practicalExample: 'Retenção na fonte mensal sobre a remuneração bruta deduzida do INSS (3%), com isenção até Kz 100.000 e taxas progressivas até 25%.',
    keywords: ['irt', 'salario', '34.1', 'inss', 'grupo a', 'grupo b', 'tabela progressiva']
  },
  {
    id: 'iva_angola',
    term: 'IVA - Imposto sobre o Valor Acrescentado (14%)',
    accountCode: 'Conta 34.2 (IVA Suportado / Liquidado / Dedutível)',
    category: 'fiscalidade',
    definition: 'Imposto indireto geral sobre o consumo aplicado nas transmissões de bens e prestações de serviços em Angola. Taxa normal: 14%; Taxas reduzidas: 5% e 7%.',
    legalBasis: 'Código do IVA (Lei n.º 7/19 e Lei n.º 42/20)',
    practicalExample: 'Empresa cobra 14% aos clientes (34.2.3) e deduz o IVA suportado nas faturas de fornecedores certificados (34.2.2).',
    keywords: ['iva', '34.2', '14%', 'liquidado', 'suportado', 'declaracao periodica', 'agt']
  },

  // --- L ---
  {
    id: 'liquidez_geral',
    term: 'Liquidez Geral',
    accountCode: 'Rácio: Activo Corrente / Passivo Corrente',
    category: 'economia',
    definition: 'Rácio financeiro que indica a capacidade da empresa de solver as suas dívidas de curto prazo com os ativos realizáveis a curto prazo. Valor ideal ≥ 1,2.',
    legalBasis: 'Análise Financeira Corporativa',
    practicalExample: 'Activo Corrente de Kz 15M e Passivo Corrente de Kz 10M = Liquidez Geral de 1,50x (margem de segurança confortável).',
    keywords: ['liquidez geral', 'liquidez reduzida', 'solvabilidade', 'curto prazo']
  },

  // --- M ---
  {
    id: 'modelo_22',
    term: 'Modelo 22 (Declaração Anual de Rendimentos)',
    accountCode: 'Obrigação Declarativa Fiscal',
    category: 'fiscalidade',
    definition: 'Declaração fiscal anual submetida eletronicamente no portal da AGT até 31 de Maio, com os mapas contabilísticos e as correções ao lucro tributável.',
    legalBasis: 'Código do Imposto Industrial, Artigos 65.º e seguintes',
    practicalExample: 'Anexo de Demonstrações Financeiras assinadas por Contabilista / Perito Contabilista certificado pela OCPCA.',
    keywords: ['modelo 22', 'agt', 'declaracao anual', 'maio', 'imposto industrial']
  },

  // --- R ---
  {
    id: 'retencao_fonte_65',
    term: 'Retenção na Fonte de Imposto Industrial (6,5%)',
    accountCode: 'Conta 34.6 / 32',
    category: 'fiscalidade',
    definition: 'Mecanismo de retenção na fonte obrigatório sobre o valor ilíquido das faturas de prestação de serviços por entidades residentes ou não residentes.',
    legalBasis: 'Código do Imposto Industrial (Lei n.º 19/14)',
    practicalExample: 'Fatura de serviços de Kz 1.000.000 -> Retenção de Kz 65.000 entregue à AGT via DAR; Fornecedor recebe Kz 935.000.',
    keywords: ['retencao na fonte', '6.5', '6,5%', '34.6', 'dar', 'prestacao de servicos']
  },
  {
    id: 'rle',
    term: 'Resultado Líquido do Exercício (RLE)',
    accountCode: 'Conta 88 (Resultados)',
    category: 'contabilidade',
    definition: 'Saldo final apurado na Demonstração de Resultados e transportado para o Balanço no Capital Próprio, correspondente ao lucro ou prejuízo após dedução de impostos.',
    legalBasis: 'PGC Angola (Decreto n.º 82/01, Conta 88)',
    practicalExample: 'Resultados Antes de Impostos Kz 10M - Imposto Industrial Kz 2.5M = RLE de Kz 7.5M creditado na conta 88.',
    keywords: ['rle', '88', 'resultado liquido', 'lucro', 'prejuizo', 'saldo final']
  },

  // --- S ---
  {
    id: 'saft_ao',
    term: 'Ficheiro SAF-T (AO) - Faturação e Contabilidade',
    accountCode: 'Obrigação Digital AGT',
    category: 'legislacao',
    definition: 'Standard Audit File for Tax Purpose adaptado a Angola em formato XML. Permite a extração padronizada de faturas e lançamentos contabilísticos para a AGT.',
    legalBasis: 'Decreto Executivo n.º 383/19 e Decreto Presidencial n.º 292/18',
    practicalExample: 'Submissão mensal do SAF-T de faturação até ao dia 15 do mês subsequente no portal da AGT.',
    keywords: ['saft', 'saf-t', 'xml', 'faturacao certificada', 'agt', 'auditoria']
  },
  {
    id: 'solvabilidade_total',
    term: 'Solvabilidade Total',
    accountCode: 'Rácio: Activo Total / Passivo Total',
    category: 'economia',
    definition: 'Mede a capacidade global da empresa de cumprir todas as suas obrigações de dívida com recurso à totalidade dos seus ativos em caso de liquidação.',
    legalBasis: 'Análise de Solvabilidade e Risco de Crédito',
    practicalExample: 'Activo de Kz 200M sobre Passivo de Kz 120M = Solvabilidade de 1,67 (a empresa cobre integralmente o passivo).',
    keywords: ['solvabilidade', 'passivo total', 'ativo total', 'falencia', 'risco']
  },

  // --- T ---
  {
    id: 'tributacao_autonoma',
    term: 'Tributação Autónoma',
    accountCode: 'Taxas Adicionais AGT',
    category: 'fiscalidade',
    definition: 'Incidência de tributação especial que não depende do apuramento de lucro: 50% sobre despesas não documentadas e 2% a 10% sobre despesas com viaturas ligeiras.',
    legalBasis: 'Código do Imposto Industrial, Artigo 67.º',
    practicalExample: 'Despesa de Kz 500.000 sem fatura fiscal válida sujeita a 50% de tributação autónoma = Kz 250.000 pagos ao Estado.',
    keywords: ['tributacao autonoma', 'despesas nao documentadas', 'modelo 22', 'imposto industrial']
  }
];

const STORAGE_BOOKMARKS_KEY = 'ga_glossary_bookmarked_ids';

interface DynamicPgcGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatContextText?: string;
  onSelectTermForChat: (termPrompt: string) => void;
}

export const DynamicPgcGlossaryModal: React.FC<DynamicPgcGlossaryModalProps> = ({
  isOpen,
  onClose,
  chatContextText = '',
  onSelectTermForChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'detected' | 'bookmarks'>('all');
  const [viewMode, setViewMode] = useState<'panel' | 'modal'>('modal');
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // Carregar favoritos
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOOKMARKS_KEY);
      if (saved) {
        setBookmarks(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  const toggleBookmark = (id: string) => {
    const next = bookmarks.includes(id) ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
    setBookmarks(next);
    try {
      localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(next));
    } catch (_) {}
  };

  // Detectar termos presentes no chat
  const detectedTerms = useMemo(() => {
    if (!chatContextText) return [];
    const lowerContext = chatContextText.toLowerCase();

    return PGC_ANGOLA_GLOSSARY.filter(item => {
      return item.keywords.some(kw => lowerContext.includes(kw.toLowerCase()));
    });
  }, [chatContextText]);

  // Lista de Letras para o índice A-Z
  const alfabeto = useMemo(() => {
    const letters = new Set<string>();
    PGC_ANGOLA_GLOSSARY.forEach(t => {
      const first = t.term.charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) letters.add(first);
    });
    return Array.from(letters).sort();
  }, []);

  // Filtragem combinada
  const filteredTerms = useMemo(() => {
    let sourceList = PGC_ANGOLA_GLOSSARY;

    if (activeTab === 'detected') {
      sourceList = detectedTerms;
    } else if (activeTab === 'bookmarks') {
      sourceList = PGC_ANGOLA_GLOSSARY.filter(t => bookmarks.includes(t.id));
    }

    return sourceList.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesLetter = selectedLetter === 'ALL' || item.term.toUpperCase().startsWith(selectedLetter);
      const matchesSearch = searchTerm === '' || 
        item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.accountCode && item.accountCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesCat && matchesLetter && matchesSearch;
    });
  }, [activeTab, detectedTerms, bookmarks, selectedCategory, selectedLetter, searchTerm]);

  if (!isOpen) return null;

  const isPanel = viewMode === 'panel';

  return (
    <AnimatePresence>
      <div 
        className={`fixed inset-0 z-50 font-sans ${
          isPanel 
            ? 'bg-slate-950/40 backdrop-blur-xs flex justify-end' 
            : 'bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4'
        }`}
      >
        <motion.div 
          initial={isPanel ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
          animate={isPanel ? { x: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isPanel ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`bg-white shadow-2xl flex flex-col overflow-hidden text-slate-800 ${
            isPanel 
              ? 'w-full max-w-md sm:max-w-xl h-full border-l border-slate-200' 
              : 'w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-200'
          }`}
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0A2140] via-[#1B3A6B] to-[#0A2140] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black text-amber-300 tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    PGC Angola · IFRS · Fiscalidade AGT
                  </span>
                  {detectedTerms.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {detectedTerms.length} no chat
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Glossário Técnico de Contabilidade, Fiscalidade & Economia
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(prev => prev === 'panel' ? 'modal' : 'panel')}
                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition cursor-pointer flex items-center gap-1 border border-white/10"
              >
                <span>{isPanel ? "Modo Centrado" : "Painel Lateral"}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                title="Fechar Glossário"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls & Search Toolbar */}
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Main Tabs */}
              <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl">
                <button
                  onClick={() => { setActiveTab('all'); setSelectedLetter('ALL'); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-white text-[#1B3A6B] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Todos ({PGC_ANGOLA_GLOSSARY.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('detected')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'detected'
                      ? 'bg-white text-[#1B3A6B] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>No Chat ({detectedTerms.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('bookmarks')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'bookmarks'
                      ? 'bg-white text-[#1B3A6B] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                  <span>Guardados ({bookmarks.length})</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'contabilidade', label: 'Contabilidade PGC' },
                  { id: 'fiscalidade', label: 'Fiscalidade AGT' },
                  { id: 'ifrs', label: 'IFRS / IAS' },
                  { id: 'economia', label: 'Economia & Rácios' },
                  { id: 'demonstracoes', label: 'Demonstrações' },
                  { id: 'legislacao', label: 'Legislação' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-[#1B3A6B] text-white shadow-xs'
                        : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* A-Z Alphabet Filter Bar */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 border-t border-slate-200/60 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 shrink-0">Índice A-Z:</span>
              <button
                onClick={() => setSelectedLetter('ALL')}
                className={`px-2 py-0.5 text-[10px] font-black rounded transition cursor-pointer shrink-0 ${
                  selectedLetter === 'ALL' ? 'bg-[#0A2140] text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                TODOS
              </button>
              {alfabeto.map((letra) => (
                <button
                  key={letra}
                  onClick={() => setSelectedLetter(letra)}
                  className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded transition cursor-pointer shrink-0 ${
                    selectedLetter === letra
                      ? 'bg-[#1B3A6B] text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  {letra}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar termo, código de conta (ex: 34.6, 62, 71), diploma legal, IFRS ou rácio financeiro..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Terms List Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
            {filteredTerms.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-600 font-bold">Nenhum termo técnico encontrado para esta pesquisa ou filtro.</p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setSelectedLetter('ALL'); setActiveTab('all'); }}
                  className="text-xs font-bold text-[#1B3A6B] hover:underline cursor-pointer"
                >
                  Ver todos os termos do Glossário
                </button>
              </div>
            ) : (
              filteredTerms.map((t) => {
                const isBookmarked = bookmarks.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-blue-300 hover:shadow-md transition-all space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => toggleBookmark(t.id)}
                            className="p-1 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                            title={isBookmarked ? "Remover dos guardados" : "Guardar termo"}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                          <span className="text-sm font-black text-slate-900">
                            {t.term}
                          </span>
                          {t.accountCode && (
                            <span className="text-[11px] font-mono font-bold bg-blue-50 text-[#1B3A6B] px-2 py-0.5 rounded border border-blue-200">
                              {t.accountCode}
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {t.category}
                          </span>
                        </div>
                        {t.legalBasis && (
                          <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                            <span>⚖️ Enquadramento:</span>
                            <span>{t.legalBasis}</span>
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const promptText = `Explique detalhadamente o enquadramento contabilístico e fiscal do conceito "${t.term}" (${t.accountCode || ''}) no PGC Angola (Decreto n.º 82/01) e nas regras da AGT, indicando lançamentos de débito/crédito exemplificativos.`;
                          onSelectTermForChat(promptText);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-[#0A2140] hover:bg-[#1B3A6B] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                        title="Enviar pergunta temática diretamente à IA Contabilística"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Perguntar à IA</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {t.definition}
                    </p>

                    {t.practicalExample && (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                        <div className="font-bold text-emerald-800 flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Exemplo Prático / Aplicação Contabilística:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-emerald-950 font-sans">
                          {t.practicalExample}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="p-3.5 bg-slate-900 text-slate-300 text-xs flex items-center justify-between border-t border-slate-800 shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Conformidade PGC Angola (Decreto n.º 82/2001), IFRS & AGT</span>
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

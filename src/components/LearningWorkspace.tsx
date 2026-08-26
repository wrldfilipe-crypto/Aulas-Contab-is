import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OfflineLimitedBanner from './OfflineLimitedBanner';
import OfflineStatusBanner from './OfflineStatusBanner';
import { FlashcardWorkspace } from './FlashcardWorkspace';
import { saveModuleForOffline, removeModuleOffline } from '../services/offlineQueue';
import { ModuleCompletionChart } from './ModuleCompletionChart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  Layers, 
  Search, 
  Trash2, 
  ArrowRight, 
  HelpCircle, 
  Check, 
  X, 
  RefreshCw, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  Share2, 
  GraduationCap, 
  Award,
  Trophy,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Calendar,
  Zap,
  Tag,
  Globe,
  Languages,
  Calculator,
  FlaskConical,
  Compass,
  Star,
  Printer,
  Loader2,
  Maximize2,
  Minimize2,
  Filter,
  Eye,
  MoreVertical,
  Pencil,
  BookMarked
} from 'lucide-react';
import { DB, getCurrentUser } from '../lib/db';
import { enqueueOfflineAction, syncOfflineDataWithServer } from '../services/dashboardCache';

export interface PracticalExample {
  scenario: string;
  stepByStep: string;
  conclusion: string;
}

export interface SectionItem {
  id: string;
  title: string;
  explanation: string;
  practicalExample?: PracticalExample;
}

export interface StudyExercise {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface VisualDiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  type?: 'start' | 'process' | 'decision' | 'output';
}

export interface VisualDiagramConnection {
  from: string;
  to: string;
  label?: string;
}

export interface VisualTableData {
  headers: string[];
  rows: string[][];
}

export interface VisualDiagram {
  type: string;
  title: string;
  nodes?: VisualDiagramNode[];
  connections?: VisualDiagramConnection[];
  tableData?: VisualTableData;
}

export interface LearningItem {
  id: string;
  userId: string;
  title: string;
  category: string;
  userLevel: string;
  language?: string;
  fileType?: string;
  fileName?: string;
  rawContent?: string;
  summary: string;
  keyTakeaways: string[];
  sections: SectionItem[];
  exercises: StudyExercise[];
  visualDiagram?: VisualDiagram;
  isFavorite?: boolean;
  isOfflineAvailable?: boolean;
  savedOfflineAt?: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: 'Auto-Detetar', label: '✨ Auto-Detetar Área com IA (Qualquer Matéria)', color: 'purple' },
  { id: 'Matemática', label: '📐 Matemática, Física & Estatística', color: 'emerald' },
  { id: 'Línguas', label: '🗣️ Língua Portuguesa, Inglês, Francês, Alemão, Espanhol & Russo', color: 'blue' },
  { id: 'Ciências Humanas', label: '🌍 História, Geografia, Filosofia & Sociologia', color: 'indigo' },
  { id: 'Ciências Naturais', label: '🔬 Química, Biologia & Saúde', color: 'amber' },
  { id: 'Informática', label: '💻 Informática, Programação & Engenharia', color: 'cyan' },
  { id: 'Direito', label: '⚖️ Direito, Legislação & Normas', color: 'rose' },
  { id: 'Economia', label: '📈 Economia & Finanças Corporativas', color: 'violet' },
  { id: 'Gestão', label: '⚙️ Gestão, Operações & Estratégia', color: 'orange' },
  { id: 'Contabilidade', label: '📊 Contabilidade & Relato Financeiro', color: 'teal' },
  { id: 'Fiscalidade', label: '🏛️ Fiscalidade & Impostos', color: 'lime' },
  { id: 'Geral', label: '💡 Qualquer Outra Área Académica ou Profissional', color: 'slate' },
];

const INITIAL_SAMPLE_LEARNINGS: LearningItem[] = [
  {
    id: 'sample-math-1',
    userId: 'system',
    title: 'Cálculo de Juros Compostos e Séries Financeiras (Fórmulas e Resolução)',
    category: 'Matemática',
    userLevel: 'Intermédio',
    language: 'Português',
    fileType: 'text',
    fileName: 'Formulas_Matematica_Financeira.txt',
    isFavorite: true,
    progress: 75,
    summary: 'Este guia didático demonstra passo a passo o cálculo do Valor Futuro (VF) e Valor Presente (VP) em séries de capitais com taxa de juro composta, aplicando fórmulas visuais e exemplos de investimentos.',
    keyTakeaways: [
      'Fórmula fundamental do Valor Futuro: VF = VP × (1 + i)^n',
      'Diferença prática entre Juros Simples (crescimento linear) e Juros Compostos (exponencial)',
      'Identificação da Taxa Nominal vs Taxa Efetiva de rentabilidade'
    ],
    sections: [
      {
        id: 'sec-m1',
        title: '1. Dedução Didática da Fórmula do Valor Futuro',
        explanation: 'Nos juros compostos, os juros de cada período são capitalizados e adicionados ao principal. A fórmula matemática VF = VP × (1 + i)^n reflete o fator de acumulação exponencial ao longo de n períodos.',
        practicalExample: {
          scenario: 'Aplicação de 1.000.000 AOA a uma taxa de 5% ao mês durante 3 meses.',
          stepByStep: '1. Mês 1: 1.000.000 × 1.05 = 1.050.000 AOA\n2. Mês 2: 1.050.000 × 1.05 = 1.102.500 AOA\n3. Mês 3: 1.102.500 × 1.05 = 1.157.625 AOA\n4. Pela fórmula direta: 1.000.000 × (1.05)^3 = 1.157.625 AOA.',
          conclusion: 'O efeito composto gera 157.625 AOA de juros totais, superando os 150.000 AOA do regime simples.'
        }
      }
    ],
    exercises: [
      {
        id: 'ex-m1',
        question: 'Se investir 500.000 AOA a 10% ao ano em juros compostos durante 2 anos, qual o Valor Futuro?',
        options: [
          '605.000 AOA',
          '600.000 AOA',
          '550.000 AOA',
          '650.000 AOA'
        ],
        correctOptionIndex: 0,
        explanation: 'VF = 500.000 × (1.10)^2 = 500.000 × 1.21 = 605.000 AOA.'
      }
    ],
    visualDiagram: {
      type: 'formula_card',
      title: 'Fórmula Matemática e Parâmetros de Juros Compostos',
      nodes: [
        { id: '1', label: 'VP (Valor Presente)', sublabel: 'Capital Inicial Aplicado', type: 'start' },
        { id: '2', label: 'Fator (1 + i)^n', sublabel: 'Taxa (i) & Períodos (n)', type: 'process' },
        { id: '3', label: 'VF (Valor Futuro)', sublabel: 'Capital Final Capitalizado', type: 'output' }
      ],
      tableData: {
        headers: ['Variável Matemática', 'Denominação', 'Exemplo de Aplicação'],
        rows: [
          ['VF', 'Valor Futuro', 'Montante a resgatar no final do prazo'],
          ['VP', 'Valor Presente / Principal', 'Valor investido no momento zero (t=0)'],
          ['i', 'Taxa de Juro Efetiva', 'Percentual por período (ex: 0,05 para 5%)'],
          ['n', 'Número de Períodos', 'Duração do investimento em meses ou anos']
        ]
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-lang-1',
    userId: 'system',
    title: 'English Syntax & Grammar: Present Perfect vs Past Simple',
    category: 'Línguas',
    userLevel: 'Intermédio',
    language: 'Inglês',
    fileType: 'text',
    fileName: 'English_Grammar_Mastery.txt',
    summary: 'Didactic guide analyzing the distinction between Present Perfect (have/has + past participle) for unfinished time/experiences and Past Simple for completed past actions with specific time references.',
    keyTakeaways: [
      'Present Perfect connects past actions to the present moment without specifying an exact past time.',
      'Past Simple requires a finished time marker (e.g. yesterday, in 2022, last week).',
      'Auxiliary verb structure: Subject + have/has + V3 vs Subject + V2.'
    ],
    sections: [
      {
        id: 'sec-l1',
        title: '1. Comparative Analysis of Verb Tenses',
        explanation: 'Use Present Perfect when the focus is on experience or recent event with present effect: "I have visited Luanda twice." Use Past Simple when the time frame is finished: "I visited Luanda in 2024."',
        practicalExample: {
          scenario: 'Talking about career milestones in professional English.',
          stepByStep: '1. "I have managed financial audits for 5 years." (Still managing / ongoing relevance)\n2. "I managed financial audits in 2023." (Finished action in the past)',
          conclusion: 'Mastering time markers (ever, never, since vs ago, yesterday) avoids grammatical ambiguity.'
        }
      }
    ],
    exercises: [
      {
        id: 'ex-l1',
        question: 'Which sentence is grammatically correct for a completed action yesterday?',
        options: [
          'I submitted the tax report yesterday.',
          'I have submitted the tax report yesterday.',
          'I submit the tax report yesterday.',
          'I am submitting the tax report yesterday.'
        ],
        correctOptionIndex: 0,
        explanation: '"Yesterday" is a finished time marker, requiring Past Simple ("submitted"), not Present Perfect.'
      }
    ],
    visualDiagram: {
      type: 'grammar_matrix',
      title: 'Grammar Matrix: Present Perfect vs Past Simple',
      tableData: {
        headers: ['Tense Structure', 'Time Signal Words', 'Usage Context', 'Example Sentence'],
        rows: [
          ['Present Perfect (have/has + V3)', 'already, yet, since, for, ever, never', 'Unfinished time / Lifetime experience', 'She has lived in Benguela since 2020.'],
          ['Past Simple (V2 / -ed)', 'yesterday, last month, in 2019, ago', 'Finished time marker in the past', 'She moved to Benguela in 2020.']
        ]
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-tax-1',
    userId: 'system',
    title: 'Guia Didático do IVA e Retenção na Fonte em Angola (Lei n.º 7/19)',
    category: 'Fiscalidade',
    userLevel: 'Intermédio',
    language: 'Português',
    fileType: 'pdf',
    fileName: 'Manual_IVA_Angola_2025.pdf',
    summary: 'Este guia explica em pormenor a incidência do Imposto sobre o Valor Acrescentado (IVA) a 14% nas prestações de serviços e operações comerciais em Angola, o mecanismo de dedução na Conta 34.5 e o procedimento de retenção na fonte do Imposto Industrial a 6.5%.',
    keyTakeaways: [
      'Identificar o IVA Liquidado (34.5.2) vs IVA Dedutível (34.5.1)',
      'Regra de retenção de 6.5% de Imposto Industrial em serviços prestados por nacionais',
      'Prazos legais de liquidação e submissão da declaração periódica'
    ],
    sections: [
      {
        id: 'sec-1',
        title: '1. Mecanismo de Funcionamento do IVA no PGC Angola',
        explanation: 'O IVA é um imposto indireto sobre o consumo. A empresa atua como fiel depositária do Estado: cobra IVA aos clientes nas vendas (IVA Liquidado), deduz o IVA pago aos fornecedores (IVA Suportado) e entrega a diferença líquida à AGT.',
        practicalExample: {
          scenario: 'Venda de serviços no valor de 10.000.000 AOA com IVA de 14%.',
          stepByStep: '1. Valor base: 10.000.000 AOA.\n2. IVA (14%): 1.400.000 AOA.\n3. Total a faturar ao cliente: 11.400.000 AOA.\n4. Lançamento: Débito Conta 31 (Clientes) 11.400.000 | Crédito Conta 61 (Vendas) 10.000.000 | Crédito Conta 34.5.2 (IVA Liquidável) 1.400.000.',
          conclusion: 'O IVA de 1.400.000 AOA não é proveito da empresa, mas sim uma dívida ao Estado.'
        }
      }
    ],
    exercises: [
      {
        id: 'ex-1',
        question: 'Qual a conta do PGC Angola onde é registado o IVA debitado nas faturas aos clientes?',
        options: [
          'Conta 34.5.2 — IVA Liquidável',
          'Conta 34.5.1 — IVA Suportado',
          'Conta 61.1 — Vendas de Produtos',
          'Conta 38.1 — Amortizações'
        ],
        correctOptionIndex: 0,
        explanation: 'No PGC Angola, o IVA cobrado aos clientes é creditado na Conta 34.5.2 (IVA Liquidável).'
      }
    ],
    visualDiagram: {
      type: 'flowchart',
      title: 'Fluxo Didático do IVA e Retenção na Fonte',
      nodes: [
        { id: '1', label: 'Emissão da Fatura', sublabel: 'Valor Base + 14% IVA', type: 'start' },
        { id: '2', label: 'Cálculo da Retenção (6,5%)', sublabel: 'Apuramento do Imposto Industrial', type: 'process' },
        { id: '3', label: 'Pagamento ao Fornecedor', sublabel: 'Valor Líquido de Caixa', type: 'process' },
        { id: '4', label: 'Entrega à AGT', sublabel: 'Até ao dia 20 do mês seguinte', type: 'output' }
      ],
      tableData: {
        headers: ['Operação', 'Conta PGC Angola', 'Efeito no Caixa'],
        rows: [
          ['Prestação de Serviços (Base)', '61.1 — Vendas / Proveitos', 'Entrada de Receita'],
          ['IVA Cobrado (14%)', '34.5.2 — IVA Liquidável', 'Passivo Corrente Estado'],
          ['Retenção Imposto Industrial (6,5%)', '34.1 — Estado II', 'Pagamento Direto AGT']
        ]
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const PGC_DICTIONARY: Record<string, { term: string; definition: string; category?: string }> = {
  'balancete': {
    term: 'Balancete de Verificação',
    definition: 'Demonstração contabilística contendo a lista de todas as contas do Razão com os respetivos débitos, créditos e saldos. Essencial no PGC Angola para assegurar a igualdade numérica antes do fecho.',
    category: 'PGC Angola'
  },
  'amortização': {
    term: 'Amortização / Depreciação',
    definition: 'Imputação sistemática da perda de valor de um ativo imobilizado (Classe 1 no PGC) devido a uso, obsolescência ou tempo.',
    category: 'Contabilidade'
  },
  'amortizações': {
    term: 'Amortizações / Depreciações',
    definition: 'Imputação sistemática da perda de valor de ativos imobilizados (Classe 1 no PGC) devido a uso, obsolescência ou tempo.',
    category: 'Contabilidade'
  },
  'iva': {
    term: 'Imposto sobre o Valor Acrescentado (IVA)',
    definition: 'Imposto indireto angolano (taxa geral de 14%) incidente sobre o consumo de bens e serviços. Permite dedução entre IVA suportado e liquidado.',
    category: 'Fiscalidade'
  },
  'ifrs': {
    term: 'Normas IFRS / NIRF',
    definition: 'International Financial Reporting Standards - Normas Internacionais de Relato Financeiro para transparência global.',
    category: 'Normas'
  },
  'demonstração de resultados': {
    term: 'Demonstração de Resultados (DR)',
    definition: 'Demonstração financeira obrigatória no PGC Angola que sintetiza proveitos e custos para apurar o Resultado Líquido.',
    category: 'Demonstrações'
  },
  'passivo não corrente': {
    term: 'Passivo Não Corrente',
    definition: 'Dívidas e obrigações da empresa com prazo de vencimento superior a 12 meses (ex: empréstimos de longo prazo).',
    category: 'Balanço'
  },
  'passivo corrente': {
    term: 'Passivo Corrente',
    definition: 'Obrigações operacionais a liquidar no curto prazo (até 12 meses, ex: fornecedores, Estado, encargos com pessoal).',
    category: 'Balanço'
  },
  'ativo corrente': {
    term: 'Ativo Corrente',
    definition: 'Bens e direitos convertíveis em meios monetários dentro de um ano ou no ciclo operacional normal da entidade.',
    category: 'Balanço'
  },
  'imobilizações': {
    term: 'Imobilizações Corpóreas / Incorpóreas',
    definition: 'Bens físicos e intangíveis duradouros afetos à atividade da empresa (Classe 1 do PGC Angola).',
    category: 'PGC Angola'
  },
  'provisões': {
    term: 'Provisões',
    definition: 'Passivos de valor ou data incertos reconhecidos para cobrir obrigações prováveis resultantes do passado.',
    category: 'PGC Angola'
  },
  'margem de lucro': {
    term: 'Margem de Lucro',
    definition: 'Rácio financeiro expressando a proporção entre o lucro gerado e o total de vendas ou receitas obtidas.',
    category: 'Análise Financeira'
  },
  'retenção na fonte': {
    term: 'Retenção na Fonte',
    definition: 'Dedução direta de imposto efetuada pela entidade pagadora no momento do pagamento de rendimentos (ex: II, Imposto de Selo).',
    category: 'Fiscalidade'
  },
  'pgc angola': {
    term: 'Plano Geral de Contabilidade de Angola',
    definition: 'Sistema contabilístico oficial aprovado pelo Decreto n.º 82/01, que define a estrutura de contas e regras para empresas em Angola.',
    category: 'Legislação'
  },
  'capital próprio': {
    term: 'Capital Próprio',
    definition: 'Valor residual dos ativos da empresa após dedução de todos os passivos. Composta por capital social, reservas e resultados transitados.',
    category: 'PGC Angola'
  },
  'existências': {
    term: 'Existências / Inventários',
    definition: 'Bens de consumo ou matérias-primas mantidos para venda, produção ou prestação de serviços (Classe 2 no PGC).',
    category: 'PGC Angola'
  },
  'juros compostos': {
    term: 'Juros Compostos',
    definition: 'Regime de capitalização em que os juros de cada período são adicionados ao capital inicial para render novos juros.',
    category: 'Matemática Financeira'
  }
};

const HighlightAccountingTerms: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const dictionaryKeys = Object.keys(PGC_DICTIONARY).sort((a, b) => b.length - a.length);
  const regexPattern = new RegExp(`\\b(${dictionaryKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regexPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), isTerm: false });
    }
    parts.push({ text: match[0], isTerm: true, termKey: match[0].toLowerCase() });
    lastIndex = regexPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isTerm: false });
  }

  return (
    <span>
      {parts.map((part, i) => {
        if (!part.isTerm || !part.termKey || !PGC_DICTIONARY[part.termKey]) {
          return <span key={i}>{part.text}</span>;
        }

        const info = PGC_DICTIONARY[part.termKey];

        return (
          <span key={i} className="relative inline-block group/term">
            <span className="border-b border-dashed border-indigo-400 font-semibold cursor-help text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 px-0.5 rounded transition-colors">
              {part.text}
            </span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded-2xl shadow-xl border border-slate-700 opacity-0 group-hover/term:opacity-100 transition-all duration-200 pointer-events-none z-50 space-y-1">
              <span className="font-extrabold text-amber-300 flex items-center justify-between text-[11px]">
                <span>{info.term}</span>
                <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono">{info.category}</span>
              </span>
              <span className="block text-slate-300 font-normal leading-relaxed text-[10px]">
                {info.definition}
              </span>
              <span className="block text-[9px] text-indigo-400 font-bold pt-0.5">💡 Dicionário PGC Angola</span>
            </span>
          </span>
        );
      })}
    </span>
  );
};

export const LearningWorkspace: React.FC<{
  currentLanguage?: string;
  onNavigateTab?: (tab: string) => void;
}> = ({ currentLanguage = 'pt', onNavigateTab }) => {
  const currentUser = getCurrentUser();
  const userId = currentUser?.userId || 'guest';

  // State management
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'library' | 'flashcards'>('library');
  const [library, setLibrary] = useState<LearningItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLearning, setSelectedLearning] = useState<LearningItem | null>(null);

  // New features: Date Range Filter, Status Filter, Quick Shortcuts & Offline Mode
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d' | 'year'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [shortcutFilter, setShortcutFilter] = useState<'all' | 'in_progress' | 'recent_completed' | 'favorites' | 'offline'>('all');
  const [isReadingMode, setIsReadingMode] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // 3-Dots Menu & Inline Rename / Modal Delete state
  const [activeMenuMaterialId, setActiveMenuMaterialId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialTitle, setEditingMaterialTitle] = useState<string>('');
  const [deleteModalMaterial, setDeleteModalMaterial] = useState<LearningItem | null>(null);
  const [confirmDeleteChecked, setConfirmDeleteChecked] = useState<boolean>(false);

  // Upload & Analysis Form State
  const [inputTitle, setInputTitle] = useState<string>('');
  const [inputCategory, setInputCategory] = useState<string>('Auto-Detetar');
  const [inputLevel, setInputLevel] = useState<string>('Auto-Detetar');
  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('text');

  // Loading & Processing state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [animatingProgressId, setAnimatingProgressId] = useState<string | null>(null);

  // PDF Export Handler using jsPDF & html2canvas
  const handleDownloadAcademicPdf = async () => {
    const element = document.getElementById('academic-summary-pdf-content');
    if (!element) return;
    
    setIsGeneratingPdf(true);
    try {
      // Small pause to ensure rendering completes
      await new Promise(r => setTimeout(r, 150));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Resumo_Academico_Progresso_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Interactive Quiz state for currently viewed learning
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  // Multi-select study materials for bulk PDF export
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  const toggleSelectMaterial = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMaterialIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllMaterials = () => {
    if (selectedMaterialIds.length === filteredLibrary.length) {
      setSelectedMaterialIds([]);
    } else {
      setSelectedMaterialIds(filteredLibrary.map(item => item.id));
    }
  };

  const handleExportConsolidatedPdf = async () => {
    const selectedItems = library.filter(item => selectedMaterialIds.includes(item.id));
    if (selectedItems.length === 0) return;

    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Cover / Header Banner
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPÊNDIO DE MATERIAIS CONSOLIDADO', 15, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Estrutura Consolidada de Estudo por Capítulos IA | Data: ${new Date().toLocaleDateString('pt-PT')}`, 15, 32);
      doc.text(`Total de Materiais Selecionados: ${selectedItems.length}`, 15, 38);

      y = 55;

      selectedItems.forEach((item, idx) => {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        // Chapter Header
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(15, y, pageWidth - 30, 16, 3, 3, 'F');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`CAPÍTULO ${idx + 1}: ${(item.title || 'Material').toUpperCase()}`, 20, y + 10);

        y += 22;

        // Metadata
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Categoria: ${item.category} | Norma: ${(item as any).targetStandard || 'PGC Angola'} | Nível: ${item.userLevel || 'Geral'}`, 20, y);
        y += 8;

        // Key Takeaways
        if (item.keyTakeaways && item.keyTakeaways.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 58, 138);
          doc.text('Pontos-Chave e Resumo Técnico:', 20, y);
          y += 6;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          item.keyTakeaways.forEach(point => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            const lines = doc.splitTextToSize(`• ${point}`, pageWidth - 45);
            doc.text(lines, 25, y);
            y += (lines.length * 5) + 1;
          });
          y += 4;
        }

        // Sections
        if (item.sections && item.sections.length > 0) {
          item.sections.forEach(sec => {
            if (y > 260) {
              doc.addPage();
              y = 20;
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`§ ${sec.title}`, 20, y);
            y += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            const expLines = doc.splitTextToSize(sec.explanation, pageWidth - 45);
            doc.text(expLines, 25, y);
            y += (expLines.length * 4.5) + 6;
          });
        }

        y += 6;
      });

      const safeDate = new Date().toISOString().slice(0, 10);
      doc.save(`Compendio_Estudos_Consolidado_${safeDate}.pdf`);
    } catch (e) {
      console.error('Error generating consolidated PDF:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Load Library from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ga_learnings_lib_${userId}`);
      let lib: LearningItem[] = INITIAL_SAMPLE_LEARNINGS;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          lib = parsed;
        }
      } else {
        localStorage.setItem(`ga_learnings_lib_${userId}`, JSON.stringify(INITIAL_SAMPLE_LEARNINGS));
      }
      setLibrary(lib);

      const targetId = localStorage.getItem(`ga_last_selected_learning_${userId}`);
      if (targetId) {
        const found = lib.find(item => item.id === targetId);
        if (found) {
          setSelectedLearning(found);
          localStorage.removeItem(`ga_last_selected_learning_${userId}`);
          return;
        }
      }

      setSelectedLearning(lib[0]);
    } catch (e) {
      console.warn('Failed loading learnings library:', e);
      setLibrary(INITIAL_SAMPLE_LEARNINGS);
      setSelectedLearning(INITIAL_SAMPLE_LEARNINGS[0]);
    }
  }, [userId]);

  // Auto-cache opened module locally for offline study
  useEffect(() => {
    if (selectedLearning && navigator.onLine) {
      try {
        localStorage.setItem(`ga_offline_learning_${selectedLearning.id}`, JSON.stringify({
          ...selectedLearning,
          isOfflineAvailable: true,
          savedOfflineAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Auto offline caching error:', e);
      }
    }
  }, [selectedLearning?.id]);

  // Auto-sync offline progress queue when returning online
  useEffect(() => {
    const handleOnline = async () => {
      showToastNotice('🌐 Conexão à internet restabelecida! A sincronizar dados offline...');
      try {
        const res = await syncOfflineDataWithServer();
        if (res.syncedCount > 0) {
          showToastNotice(`Sincronização concluída (${res.syncedCount} alterações atualizadas no servidor).`);
        }
      } catch (e) {
        console.warn('Auto sync error:', e);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const saveLibrary = (newLib: LearningItem[]) => {
    setLibrary(newLib);
    try {
      localStorage.setItem(`ga_learnings_lib_${userId}`, JSON.stringify(newLib));
    } catch (e) {
      console.error('Error saving library:', e);
    }
  };

  // Handle File Upload & Extraction
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!inputTitle) {
      // Auto-populate title without extension
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setInputTitle(cleanName);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      setFileType('image');
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      setFileType('excel');
    } else if (['doc', 'docx'].includes(ext)) {
      setFileType('word');
    } else if (ext === 'pdf') {
      setFileType('pdf');
    } else {
      setFileType('text');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawTextContent(text);
      }
    };

    if (ext === 'txt' || ext === 'csv' || ext === 'md' || ext === 'json') {
      reader.readAsText(file);
    } else {
      // For binary or image files, create a detailed placeholder content string so AI analyzes file metadata
      setRawTextContent(`[FICHEIRO SUBMETIDO: ${file.name} | Tamanho: ${(file.size / 1024).toFixed(1)} KB | Tipo: ${file.type}]\n\nPor favor, realize a análise pedagógica e conceitual completa deste material de estudo de ${inputCategory}.`);
    }
  };

  // Trigger AI Didactic Analysis
  const handleAnalyzeMaterial = async () => {
    if (!rawTextContent.trim() && !uploadedFileName) {
      setErrorMessage('Por favor submeta um ficheiro ou cole o texto do material de estudo.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalysisStep('1. A extrair o conteúdo completo do material...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setAnalysisStep('2. A analisar conceitos chave e a adaptar explicações didáticas...');
      
      const response = await fetch('/api/ai-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inputTitle || uploadedFileName || 'Material de Estudo',
          category: inputCategory,
          content: rawTextContent || `Material de ${inputCategory} submetido pelo utilizador.`,
          fileType: fileType,
          userLevel: inputLevel,
          language: currentLanguage
        })
      });

      setAnalysisStep('3. A estruturar secções, exemplos práticos e exercícios...');
      await new Promise(r => setTimeout(r, 500));
      setAnalysisStep('4. A construir diagramas visuais e a guardar na biblioteca...');

      if (!response.ok) {
        throw new Error('Falha ao comunicar com o servidor de análise de aprendizagens.');
      }

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData.error || 'A resposta da análise veio vazia.');
      }

      const analyzed: LearningItem = {
        id: 'learn_' + Date.now(),
        userId: userId,
        title: resData.data.title || inputTitle || 'Material Analisado',
        category: resData.data.category || inputCategory,
        userLevel: resData.data.userLevel || inputLevel,
        fileType: fileType,
        fileName: uploadedFileName || 'Material_Estudo.txt',
        rawContent: rawTextContent,
        summary: resData.data.summary || 'Resumo da análise didática.',
        keyTakeaways: resData.data.keyTakeaways || [],
        sections: resData.data.sections || [],
        exercises: resData.data.exercises || [],
        visualDiagram: resData.data.visualDiagram,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedLib = [analyzed, ...library];
      saveLibrary(updatedLib);
      setSelectedLearning(analyzed);
      setActiveSubTab('library');

      // Reset form fields
      setInputTitle('');
      setRawTextContent('');
      setUploadedFileName('');
    } catch (err: any) {
      console.error('Análise de material falhou:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao analisar o material.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const showToastNotice = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleStartRenameMaterial = (item: LearningItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMaterialId(item.id);
    setEditingMaterialTitle(item.title);
    setActiveMenuMaterialId(null);
  };

  const handleSaveRenameMaterial = (id: string) => {
    if (!editingMaterialTitle.trim()) {
      setEditingMaterialId(null);
      return;
    }
    const newTitle = editingMaterialTitle.trim();
    const updated = library.map(item => {
      if (item.id === id) {
        return { ...item, title: newTitle };
      }
      return item;
    });
    saveLibrary(updated);
    if (selectedLearning?.id === id) {
      setSelectedLearning(prev => prev ? { ...prev, title: newTitle } : null);
    }
    setEditingMaterialId(null);
    showToastNotice('Título do material atualizado com sucesso!');
  };

  const handleOpenDeleteModal = (item: LearningItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteModalMaterial(item);
    setConfirmDeleteChecked(false);
    setActiveMenuMaterialId(null);
  };

  const handleDeleteLearningConfirm = (id: string) => {
    const item = library.find(i => i.id === id);
    const itemTitle = item ? `"${item.title}"` : 'este material';
    const updated = library.filter(i => i.id !== id);
    saveLibrary(updated);

    try {
      localStorage.removeItem(`ga_offline_learning_${id}`);
    } catch (err) {}

    if (selectedLearning?.id === id) {
      setSelectedLearning(updated[0] || null);
    }
    setDeleteModalMaterial(null);
    setConfirmDeleteChecked(false);
    showToastNotice(`Material ${itemTitle} foi permanentemente eliminado.`);
  };

  const toggleOfflineAccess = async (item: LearningItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const willBeOffline = !item.isOfflineAvailable;

    const updated = library.map(i => {
      if (i.id === item.id) {
        return { 
          ...i, 
          isOfflineAvailable: willBeOffline,
          savedOfflineAt: willBeOffline ? new Date().toISOString() : undefined
        };
      }
      return i;
    });

    saveLibrary(updated);

    if (willBeOffline) {
      try {
        await saveModuleForOffline(item);
        localStorage.setItem(`ga_offline_learning_${item.id}`, JSON.stringify({
          ...item,
          isOfflineAvailable: true,
          savedOfflineAt: new Date().toISOString()
        }));
        showToastNotice(`"${item.title}" foi disponibilizado offline no IndexedDB!`);
      } catch (err) {
        console.error('Error saving offline:', err);
        showToastNotice('Aviso: Falha ao guardar dados no armazenamento local.');
      }
    } else {
      try {
        await removeModuleOffline(item.id);
        localStorage.removeItem(`ga_offline_learning_${item.id}`);
        showToastNotice(`Acesso offline removido para "${item.title}".`);
      } catch (err) {}
    }

    if (selectedLearning?.id === item.id) {
      setSelectedLearning(prev => prev ? { ...prev, isOfflineAvailable: willBeOffline } : null);
    }
  };

  const handleDownloadSingleLearningPdf = async (item: LearningItem) => {
    const element = document.getElementById('single-learning-detail-content');
    if (!element) return;
    
    setIsGeneratingPdf(true);
    try {
      await new Promise(r => setTimeout(r, 150));
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeTitle = (item.title || 'Resumo').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      pdf.save(`Resumo_Academico_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = library.map(item => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    saveLibrary(updated);
    if (selectedLearning?.id === id) {
      setSelectedLearning(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // Track completed didactic sections for achievement feedback
  const [completedSectionIds, setCompletedSectionIds] = useState<Record<string, boolean>>({});

  const triggerAchievementConfetti = (isFullCompletion: boolean = false) => {
    try {
      if (isFullCompletion) {
        // Grand victory burst for 100% completion
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 200);
      } else {
        // Module level confetti burst
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#10B981', '#F59E0B', '#3B82F6']
        });
      }
    } catch (err) {
      console.log('Confetti playback:', err);
    }
  };

  const updateProgress = (id: string, newProgress: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const clamped = Math.min(100, Math.max(0, newProgress));
    
    // Trigger progress animation state
    setAnimatingProgressId(id);
    setTimeout(() => setAnimatingProgressId(null), 1200);

    // Trigger celebration feedback
    if (clamped >= 100) {
      triggerAchievementConfetti(true);
      showToastNotice('🎉 Parabéns! Módulo 100% Concluído com Sucesso!');
    } else if (clamped > 0) {
      triggerAchievementConfetti(false);
      showToastNotice(`⚡ Progresso atualizado para ${clamped}%! Continue assim!`);
    }

    const updated = library.map(item => {
      if (item.id === id) {
        return { ...item, progress: clamped };
      }
      return item;
    });
    saveLibrary(updated);
    if (selectedLearning?.id === id) {
      setSelectedLearning(prev => prev ? { ...prev, progress: clamped } : null);
    }

    if (!navigator.onLine) {
      enqueueOfflineAction('MATERIAL_COMPLETED', { id, progress: clamped, updatedAt: new Date().toISOString() });
      showToastNotice(`⚡ Registado offline: ${clamped}% (guardado na fila de sincronização).`);
    }
  };

  const toggleSectionComplete = (sectionId: string, item: LearningItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isDone = !completedSectionIds[sectionId];
    setCompletedSectionIds(prev => ({ ...prev, [sectionId]: isDone }));

    if (isDone) {
      triggerAchievementConfetti(false);
      showToastNotice('✨ Secção Didática Concluída!');

      // Boost progress proportionally
      const totalSections = item.sections.length || 1;
      const currentProg = item.progress || 0;
      const boost = Math.min(100, Math.round(currentProg + (100 / totalSections)));
      updateProgress(item.id, boost);
    }
  };

  const favoriteItems = library.filter(item => item.isFavorite);
  const inProgressCount = library.filter(i => (i.progress || 0) > 0 && (i.progress || 0) < 100).length;
  const completedCount = library.filter(i => (i.progress || 0) >= 100).length;
  const favCount = favoriteItems.length;
  const offlineCount = library.filter(i => !!i.isOfflineAvailable).length;

  // Auto-detect disciplines & categories from user library
  const availableCategories = Array.from(
    new Set([
      'All',
      'Favoritos',
      'Matemática',
      'Contabilidade',
      'Direito',
      'Línguas',
      'Economia',
      'Fiscalidade',
      'Gestão',
      'Informática',
      'Ciências Humanas',
      'Ciências Naturais',
      'Geral',
      ...library.map(i => i.category).filter(Boolean)
    ])
  );

  // Recharts Donut Chart data for Category Study Progress
  const categoryProgressData = useMemo(() => {
    const catMap: Record<string, { totalProgress: number; count: number }> = {};

    library.forEach(item => {
      const cat = item.category || 'Geral';
      if (!catMap[cat]) {
        catMap[cat] = { totalProgress: 0, count: 0 };
      }
      catMap[cat].totalProgress += (item.progress || 0);
      catMap[cat].count += 1;
    });

    const palette = [
      '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', 
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    const result = Object.keys(catMap).map((catName, idx) => {
      const avgProgress = Math.round(catMap[catName].totalProgress / catMap[catName].count);
      return {
        name: catName,
        value: avgProgress === 0 ? 12 : avgProgress, // Minimum slice size for visual clarity
        avgProgress: avgProgress,
        count: catMap[catName].count,
        color: palette[idx % palette.length]
      };
    });

    return result.length > 0 ? result : [
      { name: 'Sem dados', value: 100, avgProgress: 0, count: 0, color: '#94a3b8' }
    ];
  }, [library]);

  const filteredLibrary = library.filter(item => {
    // Quick Shortcut Filters
    let matchesShortcut = true;
    if (shortcutFilter === 'in_progress') {
      matchesShortcut = (item.progress || 0) > 0 && (item.progress || 0) < 100;
    } else if (shortcutFilter === 'recent_completed') {
      matchesShortcut = (item.progress || 0) >= 100;
    } else if (shortcutFilter === 'favorites') {
      matchesShortcut = !!item.isFavorite;
    } else if (shortcutFilter === 'offline') {
      matchesShortcut = !!item.isOfflineAvailable;
    }

    let matchesCategory = true;
    if (selectedCategory === 'Favoritos') {
      matchesCategory = !!item.isFavorite;
    } else if (selectedCategory !== 'All') {
      matchesCategory = item.category === selectedCategory;
    }

    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());

    // Date Range Filtering
    let matchesDate = true;
    if (dateRangeFilter !== 'all') {
      const itemTime = new Date(item.createdAt || item.updatedAt || Date.now()).getTime();
      const now = Date.now();
      const diffDays = (now - itemTime) / (1000 * 3600 * 24);

      if (dateRangeFilter === '7d' && diffDays > 7) matchesDate = false;
      if (dateRangeFilter === '30d' && diffDays > 30) matchesDate = false;
      if (dateRangeFilter === 'year') {
        const itemYear = new Date(item.createdAt || item.updatedAt || Date.now()).getFullYear();
        const currentYear = new Date().getFullYear();
        if (itemYear !== currentYear) matchesDate = false;
      }
    }

    // Status Filtering
    let matchesStatus = true;
    if (statusFilter === 'completed' && (item.progress || 0) < 100) matchesStatus = false;
    if (statusFilter === 'pending' && (item.progress || 0) >= 100) matchesStatus = false;

    return matchesShortcut && matchesCategory && matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto pb-16">
      <OfflineStatusBanner className="mb-3" />
      <OfflineLimitedBanner />

      {/* Connection Status & Offline Mode Indicator Bar */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition-all shadow-sm ${
        isOnline 
          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
          : 'bg-slate-900 border-blue-800 text-white shadow-xl'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border text-base flex items-center justify-center shrink-0 ${
            isOnline ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-blue-900/80 border-blue-700 text-amber-300'
          }`}>
            {isOnline ? '🟢' : '📵'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <span>{isOnline ? 'Rede Conectada (Online)' : 'Modo Offline Ativo — Cache Local'}</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                isOnline ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-400 text-slate-950'
              }`}>
                {library.filter(i => i.isOfflineAvailable).length} Módulos Prontos Offline
              </span>
            </div>
            <p className="text-xs opacity-85 mt-0.5">
              {isOnline 
                ? 'Pode clicar em "Disponibilizar Offline" nos cards para descarregar matérias específicas para estudo sem internet.' 
                : 'Apresentando matérias e módulos guardados localmente. Atividades online serão sincronizadas ao reconectar.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShortcutFilter(shortcutFilter === 'offline' ? 'all' : 'offline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              shortcutFilter === 'offline'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : isOnline 
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{shortcutFilter === 'offline' ? 'Ver Todos os Módulos' : 'Filtrar Baixados Offline'}</span>
          </button>
        </div>
      </div>
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Central de Aprendizados & Análise de Materiais IA</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Aprendizados Didáticos
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Carregue materiais de estudo (PDF, imagem, texto, Word, Excel) de <strong className="text-blue-300">qualquer área do conhecimento sem restrição</strong>: Matemática, Línguas, História, Direito, Economia, Contabilidade, Fiscalidade e mais. A IA gera resumos e <strong>quizzes automáticos</strong>.
            </p>

            {onNavigateTab && (
              <div className="pt-2">
                <button
                  onClick={() => onNavigateTab('quizzes')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Trophy className="w-4 h-4" />
                  <span>🎯 Ver Quizzes & Avaliações Automáticas</span>
                </button>
              </div>
            )}
          </div>

          {/* User Level Adaptability Selector */}
          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 space-y-2 shrink-0 max-w-full">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>Nível de Enquadramento Didático</span>
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700 max-w-full overflow-x-auto no-scrollbar">
              <button
                onClick={() => setInputLevel('Auto-Detetar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputLevel === 'Auto-Detetar' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ✨ Auto-Detetar
              </button>

              <button
                onClick={() => setInputLevel('Iniciante')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputLevel === 'Iniciante' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Iniciante
              </button>

              <button
                onClick={() => setInputLevel('Intermédio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputLevel === 'Intermédio' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Intermédio
              </button>

              <button
                onClick={() => setInputLevel('Avançado')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inputLevel === 'Avançado' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Avançado
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 max-w-full">
          <button
            onClick={() => setActiveSubTab('library')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'library'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Biblioteca Pessoal de Aprendizados</span>
            <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              {library.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('upload')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'upload'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Submeter Novo Material com IA</span>
            <span className="ml-1 bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md text-[9px] uppercase">
              NOVO
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('flashcards')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'flashcards'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>🎴 Flashcards Contábeis</span>
            <span className="ml-1 bg-indigo-200 text-indigo-950 font-black px-1.5 py-0.5 rounded-md text-[9px] uppercase">
              MEMORIZAÇÃO
            </span>
          </button>

          <button
            onClick={() => setIsPdfExportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
            title="Gerar e exportar resumo de progresso em formato PDF profissional"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            <span>Exportar Resumo PDF</span>
          </button>
        </div>

        {activeSubTab === 'library' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar materiais guardados..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        )}
      </div>

      {/* SUBTAB: FLASHCARDS INTERACTIVOS */}
      {activeSubTab === 'flashcards' && (
        <FlashcardWorkspace />
      )}

      {/* SUBTAB 1: UPLOAD & NEW MATERIAL FORM */}
      {activeSubTab === 'upload' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Upload & Análise Didática Multidisciplinar
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Submeta qualquer ficheiro de estudo ou cole o texto completo. A IA irá processar, explicar ponto por ponto e gerar o seu infográfico personalizado.
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
              <X className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Title & Category Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Título do Material de Estudo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Resumo de Depreciações PGC Angola ou Exercícios de Matemática Financeira"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Área do Material / Categoria
                </label>
                <select
                  value={inputCategory}
                  onChange={(e) => setInputCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Carregar Ficheiro (PDF, Imagem, Word, Excel, Texto)
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls,.txt,.csv,.md"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {uploadedFileName ? (
                        <span className="text-blue-600 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          {uploadedFileName}
                        </span>
                      ) : (
                        <span>Arraste o ficheiro ou clique para selecionar</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Suporta PDF, Imagens, Word, Excel, CSV ou Ficheiros de Texto
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Text Area Input */}
            <div className="space-y-2 flex flex-col">
              <label className="block text-xs font-bold text-slate-700">
                Conteúdo em Texto do Material / Notas Coladas
              </label>
              <textarea
                placeholder="Cole aqui o texto completo da matéria, apontamentos das aulas, legislação, exercícios de livros ou resumos para a IA analisar integralmente..."
                value={rawTextContent}
                onChange={(e) => setRawTextContent(e.target.value)}
                className="w-full flex-1 min-h-[220px] p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none"
              />
            </div>

          </div>

          {/* Action Button & Loading Progress */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Nível Selecionado: <strong className="text-slate-800">{inputLevel}</strong></span>
            </div>

            <button
              disabled={isAnalyzing}
              onClick={handleAnalyzeMaterial}
              className={`w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isAnalyzing ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{analysisStep || 'A processar com IA...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Analisar Material Completo com IA Didática</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* SUBTAB 2: LIBRARY & DETAILED ANALYSIS VIEW */}
      {activeSubTab === 'library' && (
        <div className="space-y-6">
          
          {/* Componente de Visualização de Progresso dos Módulos (Gráficos de Barras) */}
          <ModuleCompletionChart library={library} onSelectLearning={setSelectedLearning} />

          {/* Card Dedicado de Aprendizados Favoritos no Topo */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-200/90 rounded-3xl p-5 shadow-xs space-y-3" id="favorites-top-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
                  <Star className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>⭐ Aprendizados Favoritos</span>
                    <span className="px-2 py-0.5 text-xs font-black bg-amber-500 text-white rounded-full">
                      {favoriteItems.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Materiais destacados com estrela para consulta imediata e acompanhamento de progresso.
                  </p>
                </div>
              </div>

              {favoriteItems.length > 0 && (
                <button 
                  onClick={() => setSelectedCategory('Favoritos')}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === 'Favoritos' 
                      ? 'bg-amber-600 text-white shadow-sm' 
                      : 'bg-white hover:bg-amber-100 text-amber-800 border border-amber-300/80'
                  }`}
                >
                  <span>Filtrar Favoritos ({favoriteItems.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {favoriteItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {favoriteItems.map(fav => (
                  <div
                    key={fav.id}
                    onClick={() => setSelectedLearning(fav)}
                    className={`p-3.5 bg-white border rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2 group relative ${
                      selectedLearning?.id === fav.id ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-200/80 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-amber-100/80 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {fav.category}
                      </span>
                      <button
                        onClick={(e) => toggleFavorite(fav.id, e)}
                        className="p-1 text-amber-500 hover:text-slate-400 rounded-md transition-colors cursor-pointer"
                        title="Remover dos Favoritos"
                      >
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      </button>
                    </div>

                    <h3 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
                      {fav.title}
                    </h3>

                    {/* Visual Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                        <span>Conclusão</span>
                        <span className="font-bold text-emerald-600">{fav.progress || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-700 ease-out rounded-full shadow-2xs ${
                            animatingProgressId === fav.id ? 'brightness-125 scale-y-110' : ''
                          }`}
                          style={{ width: `${fav.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3.5 px-4 bg-white/80 rounded-2xl border border-dashed border-amber-300 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                <Star className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Nenhum material nos favoritos ainda. Clique na estrela ⭐ nos materiais para os destacar aqui.</span>
              </div>
            )}
          </div>

          {/* ATALHOS RÁPIDOS DE FILTRAGEM */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">Atalhos Rápidos de Filtragem</span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Aplicação em 1-Clique</span>
              </div>

              {shortcutFilter !== 'all' && (
                <button
                  onClick={() => setShortcutFilter('all')}
                  className="text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Limpar Filtro ({shortcutFilter})</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* Todos */}
              <button
                onClick={() => setShortcutFilter('all')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  shortcutFilter === 'all'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md ring-2 ring-blue-400/30 font-bold'
                    : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">Geral</span>
                  <BookOpen className="w-4 h-4 text-blue-300" />
                </div>
                <div className="mt-2">
                  <p className="text-xs font-black">Todos os Materiais</p>
                  <p className="text-[10px] opacity-75">{library.length} item(ns)</p>
                </div>
              </button>

              {/* Cursos em Andamento */}
              <button
                onClick={() => setShortcutFilter('in_progress')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  shortcutFilter === 'in_progress'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md ring-2 ring-amber-400/30 font-bold'
                    : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">Em Estudo</span>
                  <RefreshCw className="w-4 h-4 text-amber-300" />
                </div>
                <div className="mt-2">
                  <p className="text-xs font-black">Cursos em Andamento</p>
                  <p className="text-[10px] opacity-75">{inProgressCount} material(ais)</p>
                </div>
              </button>

              {/* Concluídos Recentemente */}
              <button
                onClick={() => setShortcutFilter('recent_completed')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  shortcutFilter === 'recent_completed'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md ring-2 ring-emerald-400/30 font-bold'
                    : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">Concluídos</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="mt-2">
                  <p className="text-xs font-black">Concluídos (100%)</p>
                  <p className="text-[10px] opacity-75">{completedCount} concluído(s)</p>
                </div>
              </button>

              {/* Favoritos */}
              <button
                onClick={() => setShortcutFilter('favorites')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  shortcutFilter === 'favorites'
                    ? 'bg-amber-400 border-amber-200 text-slate-950 shadow-md ring-2 ring-amber-300/30 font-bold'
                    : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">Destacados</span>
                  <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                </div>
                <div className="mt-2">
                  <p className="text-xs font-black">⭐ Favoritos</p>
                  <p className="text-[10px] opacity-75">{favCount} guardado(s)</p>
                </div>
              </button>

              {/* Acesso Offline */}
              <button
                onClick={() => setShortcutFilter('offline')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  shortcutFilter === 'offline'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md ring-2 ring-indigo-400/30 font-bold'
                    : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">Sem Conexão</span>
                  <Zap className="w-4 h-4 text-indigo-300 animate-pulse" />
                </div>
                <div className="mt-2">
                  <p className="text-xs font-black">⚡ Acesso Offline</p>
                  <p className="text-[10px] opacity-75">{offlineCount} offline</p>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range & Status Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Interval Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Intervalo de Datas:</span>
                </span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setDateRangeFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      dateRangeFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setDateRangeFilter('7d')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      dateRangeFilter === '7d' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => setDateRangeFilter('30d')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      dateRangeFilter === '30d' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Últimos 30 dias
                  </button>
                  <button
                    onClick={() => setDateRangeFilter('year')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      dateRangeFilter === 'year' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Este Ano
                  </button>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Estado:</span>
                </span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Concluídos (100%)
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pendentes
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por título ou palavra-chave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Saved Materials Sidebar List & Recharts Donut Chart (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Category Filter Pills */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                  <span>Filtrar por Disciplina / Área</span>
                  <span className="text-[9px] text-blue-600 font-bold">{filteredLibrary.length} Materiais</span>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {availableCategories.map(catId => {
                    let count = library.length;
                    if (catId === 'Favoritos') {
                      count = favoriteItems.length;
                    } else if (catId !== 'All') {
                      count = library.filter(i => i.category === catId).length;
                    }

                    if (catId !== 'All' && catId !== 'Favoritos' && count === 0) return null;

                    const isSelected = selectedCategory === catId;
                    const isFavTag = catId === 'Favoritos';

                    return (
                      <button
                        key={catId}
                        onClick={() => setSelectedCategory(catId)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? isFavTag
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-blue-600 text-white shadow-sm'
                            : isFavTag
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isFavTag && <Star className={`w-3 h-3 ${isSelected ? 'fill-white' : 'fill-amber-400 text-amber-500'}`} />}
                        <span>{catId === 'All' ? 'Todas' : catId}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recharts Donut Chart: Distribuição de Progresso por Categoria Temática */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Distribuição do Progresso por Tema</span>
                  </h3>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full">
                    Recharts Donut
                  </span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryProgressData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={60}
                        paddingAngle={4}
                      >
                        {categoryProgressData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-0.5">
                                <p className="font-bold text-amber-300">{data.name}</p>
                                <p className="text-[11px] text-slate-300">Progresso Médio: <strong>{data.avgProgress}%</strong></p>
                                <p className="text-[10px] text-slate-400">{data.count} material(ais)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                  {categoryProgressData.map((cat, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-slate-700 truncate max-w-[80px]">{cat.name}</span>
                      <span className="font-extrabold text-slate-900">{cat.avgProgress}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* List of Saved Learnings */}
              <div className="space-y-3">
                {filteredLibrary.length > 0 && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-between text-xs">
                    <button
                      onClick={selectAllMaterials}
                      className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMaterialIds.length > 0 && selectedMaterialIds.length === filteredLibrary.length}
                        onChange={selectAllMaterials}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <span>
                        {selectedMaterialIds.length === filteredLibrary.length ? 'Desmarcar Todos' : 'Selecionar Todos'} ({selectedMaterialIds.length}/{filteredLibrary.length})
                      </span>
                    </button>

                    {selectedMaterialIds.length > 0 && (
                      <button
                        onClick={handleExportConsolidatedPdf}
                        disabled={isGeneratingPdf}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span>Exportar PDF Consolidado ({selectedMaterialIds.length})</span>
                      </button>
                    )}
                  </div>
                )}

                {filteredLibrary.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                    <p className="text-xs text-slate-500 font-medium">Nenhum material encontrado nesta disciplina.</p>
                    <button
                      onClick={() => setActiveSubTab('upload')}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      + Carregar Novo Material
                    </button>
                  </div>
                ) : (
                  filteredLibrary.map((item) => {
                    const isSelected = selectedLearning?.id === item.id;
                    const isChecked = selectedMaterialIds.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedLearning(item)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 group relative overflow-hidden ${
                          isSelected 
                            ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => toggleSelectMaterial(item.id, e as any)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {item.category}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => toggleOfflineAccess(item, e)}
                              className={`px-2 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                                item.isOfflineAvailable 
                                  ? 'bg-indigo-600 text-white shadow-xs' 
                                  : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200'
                              }`}
                              title={item.isOfflineAvailable ? "Módulo Disponível Offline (Guardado em Cache Local)" : "Clique para Disponibilizar este módulo offline"}
                            >
                              <Zap className={`w-3.5 h-3.5 ${item.isOfflineAvailable ? 'text-amber-300 fill-amber-300 animate-pulse' : 'text-slate-400'}`} />
                              <span>{item.isOfflineAvailable ? 'Baixado' : 'Disponibilizar Offline'}</span>
                            </button>
                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              className="p-1 rounded-md transition-colors cursor-pointer"
                              title={item.isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
                            >
                              <Star className={`w-4 h-4 ${
                                item.isFavorite 
                                  ? 'fill-amber-400 text-amber-500' 
                                  : 'text-slate-300 hover:text-amber-400'
                              }`} />
                            </button>

                            {/* 3-Dots Menu Button */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMaterialId(activeMenuMaterialId === item.id ? null : item.id);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Mais opções"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuMaterialId === item.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-7 z-30 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 space-y-0.5 animate-in fade-in duration-100 font-sans"
                                >
                                  <button
                                    onClick={(e) => handleStartRenameMaterial(item, e)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Renomear</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenDeleteModal(item, e)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    <span>Eliminar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Title Editor vs Title Heading */}
                        {editingMaterialId === item.id ? (
                          <div className="flex items-center gap-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingMaterialTitle}
                              onChange={(e) => setEditingMaterialTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameMaterial(item.id);
                                if (e.key === 'Escape') setEditingMaterialId(null);
                              }}
                              autoFocus
                              className="flex-1 px-2.5 py-1 text-xs font-bold bg-slate-50 border border-blue-400 rounded-lg text-slate-900 focus:outline-none ring-2 ring-blue-500/20"
                            />
                            <button
                              onClick={() => handleSaveRenameMaterial(item.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingMaterialId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
                            {item.title}
                          </h3>
                        )}

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {item.summary}
                        </p>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Progresso de Conclusão
                            </span>
                            <span className="font-extrabold text-emerald-600">{item.progress || 0}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                            <div 
                              className={`h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-700 ease-out rounded-full ${
                                animatingProgressId === item.id ? 'brightness-125 scale-y-110' : ''
                              }`} 
                              style={{ width: `${item.progress || 0}%` }} 
                            />
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-blue-500" />
                            {item.sections.length} Secções
                          </span>
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-amber-500" />
                            {item.exercises.length} Exercícios
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          {/* Right Column: Full Learning Detail & Visual Interactive View (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {selectedLearning ? (
              <div id="single-learning-detail-content" className="space-y-6 animate-fade-in">
                
                {/* Header Card for Selected Material */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
                        <Tag className="w-3 h-3 text-blue-600" />
                        {selectedLearning.category}
                      </span>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-amber-600" />
                        Nível: {selectedLearning.userLevel}
                      </span>
                      {selectedLearning.language && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full flex items-center gap-1">
                          <Globe className="w-3 h-3 text-indigo-600" />
                          Língua: {selectedLearning.language}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setIsReadingMode(true)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-slate-700"
                        title="Ativar Modo de Leitura Sem Distrações (Ecrã Inteiro)"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Modo de Leitura</span>
                      </button>

                      <button
                        onClick={() => handleDownloadSingleLearningPdf(selectedLearning)}
                        disabled={isGeneratingPdf}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Exportar Resumo Académico Formatado em PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isGeneratingPdf ? 'A Gerar PDF...' : 'Exportar PDF'}</span>
                      </button>

                      <button
                        onClick={(e) => toggleOfflineAccess(selectedLearning, e)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          selectedLearning.isOfflineAvailable
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title={selectedLearning.isOfflineAvailable ? "Conteúdo guardado offline. Clique para remover do LocalStorage." : "Guardar texto para consulta offline no LocalStorage"}
                      >
                        <Zap className={`w-3.5 h-3.5 ${selectedLearning.isOfflineAvailable ? 'text-amber-300 animate-pulse' : 'text-slate-500'}`} />
                        <span>{selectedLearning.isOfflineAvailable ? 'Disponível Offline' : 'Acesso Offline'}</span>
                      </button>

                      <button
                        onClick={(e) => toggleFavorite(selectedLearning.id, e)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          selectedLearning.isFavorite
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${selectedLearning.isFavorite ? 'fill-white' : 'fill-amber-400 text-amber-500'}`} />
                        <span>{selectedLearning.isFavorite ? 'Favorito' : 'Marcar Favorito'}</span>
                      </button>

                      <button
                        onClick={(e) => handleOpenDeleteModal(selectedLearning, e)}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Eliminar permanentemente este material de aprendizagem"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Eliminar Material</span>
                      </button>

                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(selectedLearning.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {selectedLearning.title}
                  </h2>

                  {/* Interactive Visual Progress Bar Banner */}
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-900">
                          Progresso de Aprendizagem do Material:
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-600 text-white rounded-full">
                          {selectedLearning.progress || 0}% Concluído
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => updateProgress(selectedLearning.id, (selectedLearning.progress || 0) + 25, e)}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                        >
                          +25%
                        </button>
                        <button
                          onClick={(e) => updateProgress(selectedLearning.id, 100, e)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
                        >
                          Marcar 100% Concluído
                        </button>
                      </div>
                    </div>
                    
                    <div className="w-full h-3 bg-emerald-200/60 rounded-full overflow-hidden relative shadow-inner">
                      <div 
                        className={`h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 transition-all duration-700 ease-out rounded-full shadow-xs ${
                          animatingProgressId === selectedLearning.id ? 'brightness-125 scale-y-110' : ''
                        }`} 
                        style={{ width: `${selectedLearning.progress || 0}%` }} 
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Resumo Executivo Didático:</span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                        💡 Passe o rato sobre os termos contabilísticos sublinhados
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <HighlightAccountingTerms text={selectedLearning.summary} />
                    </p>
                  </div>

                  {/* Key Takeaways Pills */}
                  {selectedLearning.keyTakeaways && selectedLearning.keyTakeaways.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Pontos Chave de Aprendizagem
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedLearning.keyTakeaways.map((take, idx) => (
                          <div key={idx} className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 font-medium flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span><HighlightAccountingTerms text={take} /></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section-by-Section Didactic Breakdown */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Explicação por Secções & Exemplos Práticos
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {selectedLearning.sections.map((sec, idx) => {
                      const secId = sec.id || `sec_${selectedLearning.id}_${idx}`;
                      const isSecDone = !!completedSectionIds[secId];

                      return (
                        <div key={secId} className={`p-5 border rounded-2xl bg-white space-y-4 transition-all ${isSecDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-300'}`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900 text-blue-950 flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center font-bold ${isSecDone ? 'bg-emerald-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                {isSecDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                              </span>
                              <span>{sec.title}</span>
                            </h4>

                            <button
                              onClick={(e) => toggleSectionComplete(secId, selectedLearning, e)}
                              className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isSecDone
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-200'
                              }`}
                              title={isSecDone ? "Secção Concluída" : "Marcar esta secção como concluída"}
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 ${isSecDone ? 'text-white' : 'text-slate-400'}`} />
                              <span>{isSecDone ? 'Secção Concluída ✓' : 'Concluir Módulo'}</span>
                            </button>
                          </div>

                        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pl-8">
                          <HighlightAccountingTerms text={sec.explanation} />
                        </div>

                        {/* Practical Example Block if present */}
                        {sec.practicalExample && (
                          <div className="ml-8 p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2 text-xs">
                            <div className="font-extrabold text-emerald-950 flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span>Exemplo Prático Real:</span>
                            </div>
                            
                            <p className="text-emerald-900 font-medium">
                              <strong>Cenário:</strong> {sec.practicalExample.scenario}
                            </p>

                            <div className="bg-white/80 p-3 rounded-xl font-mono text-[11px] text-slate-800 border border-emerald-100 whitespace-pre-line leading-relaxed">
                              {sec.practicalExample.stepByStep}
                            </div>

                            <p className="text-emerald-800 text-[11px] italic">
                              💡 <strong>Conclusão Didática:</strong> {sec.practicalExample.conclusion}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* Visual Diagram & Infographic Section */}
                {selectedLearning.visualDiagram && (
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-5 border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-amber-400" />
                        <h3 className="text-base font-extrabold text-white">
                          Infográfico Visuais & Diagrama de Estudo
                        </h3>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                        GERADO POR IA
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-200">
                      {selectedLearning.visualDiagram.title}
                    </h4>

                    {/* Render Flowchart Nodes if available */}
                    {selectedLearning.visualDiagram.nodes && selectedLearning.visualDiagram.nodes.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 py-2">
                        {selectedLearning.visualDiagram.nodes.map((node, i) => (
                          <div key={node.id || i} className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-1 relative">
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                              Passo {i + 1}
                            </div>
                            <div className="text-xs font-bold text-white">
                              {node.label}
                            </div>
                            {node.sublabel && (
                              <div className="text-[11px] text-slate-400">
                                {node.sublabel}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Render Visual Comparison Table if available */}
                    {selectedLearning.visualDiagram.tableData && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800 text-slate-300 border-b border-slate-700">
                            <tr>
                              {selectedLearning.visualDiagram.tableData.headers.map((h, idx) => (
                                <th key={idx} className="p-3 font-bold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {selectedLearning.visualDiagram.tableData.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-3 font-medium">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Self-Assessment Practice Exercises */}
                {selectedLearning.exercises && selectedLearning.exercises.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-extrabold text-slate-900">
                          Exercícios Práticos de Fixação
                        </h3>
                      </div>
                      <span className="text-xs text-slate-500">
                        {selectedLearning.exercises.length} Questões Disponíveis
                      </span>
                    </div>

                    <div className="space-y-6">
                      {selectedLearning.exercises.map((ex, exIdx) => {
                        const isSubmitted = quizSubmitted[ex.id];
                        const selectedOpt = quizAnswers[ex.id];

                        return (
                          <div key={ex.id || exIdx} className="p-5 border border-slate-200 rounded-2xl space-y-4 bg-slate-50/50">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-start gap-2">
                              <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {exIdx + 1}
                              </span>
                              <span>{ex.question}</span>
                            </div>

                            <div className="space-y-2 pt-1">
                              {ex.options.map((opt, optIdx) => {
                                let style = "bg-white border-slate-200 text-slate-700 hover:bg-slate-100";
                                if (selectedOpt === optIdx) {
                                  style = "bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20";
                                }
                                if (isSubmitted) {
                                  if (optIdx === ex.correctOptionIndex) {
                                    style = "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold";
                                  } else if (selectedOpt === optIdx) {
                                    style = "bg-red-50 border-red-500 text-red-900 font-bold";
                                  }
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    disabled={isSubmitted}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [ex.id]: optIdx }))}
                                    className={`w-full text-left p-3 border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${style}`}
                                  >
                                    <span>{opt}</span>
                                    {isSubmitted && optIdx === ex.correctOptionIndex && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Submit / Feedback */}
                            {!isSubmitted ? (
                              <div className="pt-2 flex justify-end">
                                <button
                                  disabled={selectedOpt === undefined}
                                  onClick={() => {
                                    setQuizSubmitted(prev => ({ ...prev, [ex.id]: true }));
                                    // Automatically boost progress when quiz is answered
                                    if (selectedLearning) {
                                      const currentProg = selectedLearning.progress || 0;
                                      const boost = Math.min(100, currentProg + Math.round(100 / (selectedLearning.exercises.length || 1)));
                                      updateProgress(selectedLearning.id, boost);
                                    }
                                  }}
                                  className={`px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                                    selectedOpt !== undefined
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  Verificar Resposta
                                </button>
                              </div>
                            ) : (
                              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs animate-fade-in">
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  <span>Explicação Didática:</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed">
                                  {ex.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <BookOpen className="w-12 h-12 text-blue-500 mx-auto opacity-60" />
                <h3 className="text-base font-bold text-slate-800">Selecione um material na lista ao lado</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ou clique em "Submeter Novo Material" para analisar novos documentos em PDF, imagem, Word ou texto com IA.
                </p>
              </div>
            )}

          </div>

        </div>
      </div>
      )}

      {/* MODAL EXPORTAR RESUMO PDF DE PROGRESSO ACADÉMICO */}
      {isPdfExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Relatório de Progresso Académico</h3>
                  <p className="text-xs text-slate-300">Resumo Didático & Desempenho de Quizzes (Pronto para PDF)</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
                <button
                  onClick={() => setIsPdfExportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 bg-slate-50/50 print:p-0 print:bg-white" id="academic-summary-pdf-content">
              
              {/* Document Letterhead */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      DOCUMENTO ACADÉMICO OFICIAL
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-1">Sumário de Progresso & Avaliação de Aprendizados</h2>
                    <p className="text-xs text-slate-500">Gestor Académico & Profissional • Plataforma Integrada de Estudo</p>
                  </div>
                  <div className="text-left sm:text-right text-xs font-mono space-y-0.5">
                    <p className="font-bold text-slate-800">📅 Data de Emissão: {new Date().toLocaleDateString('pt-PT')}</p>
                    <p className="text-slate-500">🕒 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-indigo-600 font-bold">ID: LIB-PROG-{Date.now().toString().slice(-6)}</p>
                  </div>
                </div>

                {/* KPI Metrics Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Total Materiais</p>
                    <p className="text-2xl font-black text-blue-950 mt-0.5">{library.length}</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Progresso Médio</p>
                    <p className="text-2xl font-black text-emerald-950 mt-0.5">
                      {Math.round(library.reduce((acc, i) => acc + (i.progress || 0), 0) / (library.length || 1))}%
                    </p>
                  </div>
                  <div className="p-3.5 bg-purple-50/80 border border-purple-100 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Áreas de Estudo</p>
                    <p className="text-2xl font-black text-purple-950 mt-0.5">
                      {Array.from(new Set(library.map(i => i.category))).length}
                    </p>
                  </div>
                  <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Quizzes Gerados</p>
                    <p className="text-2xl font-black text-amber-950 mt-0.5">
                      {library.reduce((acc, i) => acc + (i.exercises?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Materials & Academic Status Table */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Detalhamento por Disciplina / Material de Estudo</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50">
                        <th className="p-2.5 rounded-l-lg">Material / Tema</th>
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5">Nível</th>
                        <th className="p-2.5">Exercícios</th>
                        <th className="p-2.5 rounded-r-lg text-right">Progresso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {library.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Ficheiro: {item.fileName || 'Nota Texto'}</p>
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px]">{item.userLevel}</td>
                          <td className="p-2.5 text-slate-600 font-mono text-[11px]">{item.exercises?.length || 0} perguntas</td>
                          <td className="p-2.5 text-right font-bold">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              (item.progress || 0) >= 100 
                                ? 'bg-emerald-100 text-emerald-800 font-black' 
                                : (item.progress || 0) > 0 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.progress || 0}% Concluído
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Pedagogical Performance Note */}
              <div className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl space-y-2 border border-blue-800">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Parecer Pedagógico Automático da IA</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  O estudante demonstra consistência notável nos tópicos de {Array.from(new Set(library.map(i => i.category))).join(', ')}. 
                  Recomenda-se manter a rotina diária de resolução de quizzes práticos e reforçar os conceitos com esquemas visuais antes da época de exames.
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-mono">Gerado via Gestor Académico IA • Suporte PDF Nativo</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPdfExportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={handleDownloadAcademicPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>A Gerar Ficheiro PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Exportar PDF Profissional</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FULLSCREEN READING MODE OVERLAY (MODO DE LEITURA TOTAL) */}
      {isReadingMode && selectedLearning && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-8 lg:p-12 animate-fade-in font-sans">
          
          {/* Reader Sticky Header Bar */}
          <div className="max-w-4xl mx-auto sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-amber-400 font-extrabold">
                  <span>Modo de Leitura Focada</span>
                  <span>•</span>
                  <span>{selectedLearning.category}</span>
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {selectedLearning.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsReadingMode(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-2"
                title="Sair do Modo de Leitura Focada"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Sair do Modo de Leitura</span>
              </button>
            </div>
          </div>

          {/* Clean Reader Canvas */}
          <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/60 border border-slate-800 p-6 sm:p-12 rounded-3xl shadow-2xl relative">
            
            {/* Material Meta & Title */}
            <div className="space-y-4 border-b border-slate-800 pb-6">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-bold">
                  {selectedLearning.category}
                </span>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-bold">
                  Nível: {selectedLearning.userLevel}
                </span>
                {selectedLearning.language && (
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-bold">
                    Língua: {selectedLearning.language}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {selectedLearning.title}
              </h1>
            </div>

            {/* Executive Summary */}
            <div className="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3">
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Resumo Executivo
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Passe o rato sobre os termos para definições da PGC Angola
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-serif">
                <HighlightAccountingTerms text={selectedLearning.summary} />
              </p>
            </div>

            {/* Key Takeaways */}
            {selectedLearning.keyTakeaways && selectedLearning.keyTakeaways.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Pontos Chave de Estudo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedLearning.keyTakeaways.map((take, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><HighlightAccountingTerms text={take} /></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Sections Content */}
            <div className="space-y-8 pt-4">
              <h3 className="text-lg font-black text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>Conteúdo Didático Completo</span>
              </h3>

              {selectedLearning.sections.map((sec, idx) => (
                <div key={sec.id || idx} className="space-y-4 p-6 bg-slate-800/40 border border-slate-800 rounded-2xl">
                  <h4 className="text-base font-extrabold text-amber-300 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-center font-black">
                      {idx + 1}
                    </span>
                    {sec.title}
                  </h4>

                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line pl-2 sm:pl-10 font-serif">
                    <HighlightAccountingTerms text={sec.explanation} />
                  </div>

                  {sec.practicalExample && (
                    <div className="ml-0 sm:ml-10 p-5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl space-y-3 text-xs">
                      <div className="font-extrabold text-emerald-300 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Exemplo Prático Aplicado:</span>
                      </div>
                      <p className="text-emerald-100">
                        <strong>Cenário:</strong> {sec.practicalExample.scenario}
                      </p>
                      <div className="bg-slate-950/80 p-4 rounded-xl font-mono text-xs text-emerald-300 border border-emerald-900/50 whitespace-pre-line leading-relaxed">
                        {sec.practicalExample.stepByStep}
                      </div>
                      <p className="text-emerald-300 italic">
                        💡 <strong>Conclusão:</strong> {sec.practicalExample.conclusion}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Reader Footer Exit */}
            <div className="pt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Leitura de Estudo Completa • Modo Foco</span>
              <button
                onClick={() => setIsReadingMode(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Minimize2 className="w-4 h-4 text-amber-400" />
                <span>Concluir Leitura</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL WITH MANDATORY CHECKBOX */}
      {deleteModalMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 dark:bg-red-950/80 text-red-600 rounded-2xl border border-red-200 dark:border-red-800 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Eliminar Material Permanentemente?</h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-bold">Acção irreversível e definitiva</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-extrabold text-slate-900 dark:text-white">
                "{deleteModalMaterial.title}"
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Esta acção irá remover permanentemente este material de estudo e todo o seu conteúdo gerado pela IA (resumos executivos, módulos, exercícios práticos, flashcards e armazenamento local offline).
              </p>
            </div>

            {/* Mandatory Checkbox */}
            <label className="flex items-start gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={confirmDeleteChecked}
                onChange={(e) => setConfirmDeleteChecked(e.target.checked)}
                className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 mt-0.5 cursor-pointer shrink-0"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                Compreendo que esta acção é irreversível e irá eliminar permanentemente este material e todo o seu conteúdo gerado pela IA.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setDeleteModalMaterial(null);
                  setConfirmDeleteChecked(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={!confirmDeleteChecked}
                onClick={() => handleDeleteLearningConfirm(deleteModalMaterial.id)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                  confirmDeleteChecked
                    ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                    : 'bg-red-300 dark:bg-red-950 opacity-60 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Permanentemente</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LearningWorkspace;

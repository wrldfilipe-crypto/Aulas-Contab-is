import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, FileText, Grid, BarChart3, Presentation, ShieldAlert, 
  Send, Sparkles, Download, Edit3, Trash2, ArrowRight, Eye, RefreshCw, 
  CheckCircle, AlertTriangle, Info, HelpCircle, Upload, ChevronRight, FileSpreadsheet, Share2, Plus, Volume2, ZoomIn, ZoomOut,
  Globe, Brain, Mic, MicOff, ExternalLink, Zap, Copy, Check, X, RotateCcw, Smartphone,
  Search, ThumbsUp, ThumbsDown, Paperclip, Loader2, Calculator, BookOpen, MoreVertical, Pencil, Scale, History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, HeadingLevel, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx';
import { DynamicPgcGlossaryModal } from './DynamicPgcGlossaryModal';
import { DemonstracoesModal } from '../lib/pgc/demonstracoes/DemonstracoesModal';
import { 
  getStoredSessionContext, 
  buildAdaptiveSystemPrompt, 
  SessionContext, 
  ACCOUNTING_STANDARDS,
  getUserMemoryItems,
  addUserMemoryItem,
  deleteUserMemoryItem,
  clearAllUserMemory,
  UserMemoryItem
} from '../lib/accountingStandards';
import { buildMemorySystemPrompt, updateMemoryFromExtraction } from '../lib/memoryManager';
import { getCurrentUser } from '../lib/db';
import { AdminPGCUpload } from '../lib/pgc/AdminPGCUpload';
import { MarkdownRenderer } from './MarkdownRenderer';

// --- TS INTERFACES ---
interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isEdited?: boolean;
  isVisual?: boolean;
  diagramSvg?: string;
  groundingSources?: Array<{ title: string; uri: string }>;
  modelUsed?: string;
  suggestedActions?: Array<{ label: string; actionType: 'word' | 'excel' | 'visualization' | 'vault'; payload: string }>;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  date: string;
  timestamp: string;
  standard: string;
  tag?: string;
  messages: ChatMessage[];
}

interface DocumentBlock {
  title: string;
  subtitle: string;
  metadata: { author: string; date: string; version: string };
  sections: Array<{
    heading: string;
    paragraphs: string[];
    listItems?: string[];
    table?: {
      headers: string[];
      rows: string[][];
    };
  }>;
}

interface SheetCell {
  value: string;
  formula?: string;
  isBold?: boolean;
  align?: 'left' | 'center' | 'right';
  bgColor?: string;
  textColor?: string;
  format?: 'currency' | 'percentage' | 'number' | 'text';
}

interface SpreadsheetState {
  sheetName: string;
  title: string;
  grid: SheetCell[][];
}

interface SlideItem {
  slideNum: number;
  title: string;
  layout: 'title_slide' | 'bullet_points' | 'split_columns' | 'stats_grid' | 'chart_and_text';
  subtitle?: string;
  bullets?: string[];
  columns?: Array<{ title: string; content: string }>;
  metrics?: Array<{ label: string; value: string; desc: string }>;
  chart?: {
    type: 'bar' | 'pie' | 'line';
    labels: string[];
    values: number[];
  };
  footerText?: string;
}

interface PresentationState {
  title: string;
  subtitle: string;
  theme: 'blue' | 'emerald' | 'slate' | 'coral';
  slides: SlideItem[];
}

interface VisState {
  type: 'diagram' | 'chart';
  svgMarkup?: string;
  chartData?: {
    type: 'bar' | 'pie' | 'line' | 'waterfall';
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    series: Array<{ label: string; value: number; color: string }>;
  };
}

interface AuditFinding {
  category: 'error' | 'risk' | 'optimization' | 'info';
  title: string;
  description: string;
  legislation: string;
  remediation: string;
}

interface TaxAuditState {
  status: 'compliant' | 'warning' | 'risk';
  score: number;
  country: string;
  summary: string;
  findings: AuditFinding[];
  checklist: Array<{ task: string; dueDate: string; requiredDoc: string; isCompleted: boolean }>;
  calendarObligations: Array<{ obligation: string; date: string; frequency: string; description: string }>;
}

interface AiAccountantSuiteProps {
  currentLanguage: string;
  onSaveToVault?: (type: string, title: string, content: any) => void;
}

interface ApiErrorInfo {
  endpoint: string;
  message: string;
  isTimeout?: boolean;
  retryAction?: () => void;
}

export const AiAccountantSuite: React.FC<AiAccountantSuiteProps> = ({ currentLanguage, onSaveToVault }) => {
  const [activeSubtab, setActiveSubtab] = useState<'chat' | 'word' | 'excel' | 'visualization' | 'powerpoint'>('chat');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorInfo | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // --- STATE FOR ADVANCED AI FEATURES ---
  const [isSearchGroundingEnabled, setIsSearchGroundingEnabled] = useState(false);
  const [enableHighThinking, setEnableHighThinking] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Permanent PGC Angola Accounting Standard State (Zero Configuration)
  const sessionContext: SessionContext = useMemo(() => ({
    standard: 'AO',
    standardName: 'Plano Geral de Contabilidade de Angola (Decreto n.º 82/2001)',
    level: 'Avançado',
    objective: 'Consultoria e auditoria PGC Angola',
    startedAt: new Date().toISOString()
  }), []);

  // --- STATE FOR EDITING & DELETING MESSAGES & CONVERSATIONS ---
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // --- STATE FOR PERMANENT CONVERSATION DELETION MODALS & RENAME ---
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState<string>('');
  const [showDeleteSingleModal, setShowDeleteSingleModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState('');

  const handleStartRenameChat = (hist: { id: string; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(hist.id);
    setEditingChatTitle(hist.title);
    setActiveMenuChatId(null);
  };

  const handleSaveRenameChat = async (chatId: string) => {
    if (!editingChatTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    const newTitle = editingChatTitle.trim();
    setChatHistory(prev => prev.map(h => h.id === chatId ? { ...h, title: newTitle } : h));
    setEditingChatId(null);

    try {
      await callApi('/api/ai/conversations/rename', {
        conversationId: chatId,
        newTitle
      });
    } catch (e) {}

    showToast(currentLanguage.startsWith('pt') ? "Título da conversa atualizado!" : "Conversation title updated!");
  };

  // --- STATE FOR USER MEMORY PERSISTENCE ---
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [userMemoryList, setUserMemoryList] = useState<UserMemoryItem[]>(() => getUserMemoryItems());
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<UserMemoryItem['category']>('geral');

  // --- STATE FOR DOCUMENT EXTRACTION & PREVIEW ---
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [docExtractionProgress, setDocExtractionProgress] = useState(0);
  const [docExtractionStep, setDocExtractionStep] = useState('');
  const [zoomVisualAid, setZoomVisualAid] = useState<{ title: string; type: string; data: any } | null>(null);

  const [extractedDocData, setExtractedDocData] = useState<{
    fileName: string;
    fileType: string;
    isLegible?: boolean;
    isComplete?: boolean;
    issues?: string[];
    summary: string;
    extractedText: string;
    keyValues: Array<{ label: string; value: string }>;
    taxHighlights?: Array<{ label: string; value: string; note?: string; anomaly?: boolean }>;
    visualAid?: {
      type: string;
      chartTitle?: string;
      labels?: string[];
      values?: number[];
      highlightBox?: string;
    } | null;
    disclaimer?: string;
  } | null>(null);
  const [docQuestionPrompt, setDocQuestionPrompt] = useState('');
  const chatDocFileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE FOR HISTORY SEARCH & TAGS ---
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // --- STATE FOR USER FEEDBACK ---
  const [messageFeedbackMap, setMessageFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});

  // --- STATE FOR CHAT ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: currentLanguage.startsWith('pt') 
        ? "Olá! Sou o seu Assistente Contabilístico Avançado com respostas fundamentadas e memória persistente. Posso analisar documentos (PDF, Excel, Word), criar relatórios Word/Excel/PowerPoint e auditorias fiscais. Como posso ajudar hoje?"
        : "Hello! I am your Advanced AI Accountant with grounded answers and persistent memory. I can analyze documents (PDF, Excel, Word), generate reports, and audit tax compliance. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        { label: currentLanguage.startsWith('pt') ? "⚖️ Mapas PGC (Dec. 82/2001)" : "⚖️ PGC Angola Maps", actionType: 'word', payload: "Gere os mapas das Demonstrações Financeiras oficiais do PGC Angola (Decreto n.º 82/2001)." },
        { label: currentLanguage.startsWith('pt') ? "📄 Balanço & DRE PGC" : "📄 Balance & Income PGC", actionType: 'word', payload: "Gere um Balanço e Demonstração de Resultados por Natureza detalhados." },
        { label: currentLanguage.startsWith('pt') ? "📊 Orçamento Anual" : "📊 Budget Planner", actionType: 'excel', payload: "Cria um plano de orçamento anual detalhado por trimestres." },
        { label: currentLanguage.startsWith('pt') ? "📈 Análise Visual" : "📈 Visual Analysis", actionType: 'visualization', payload: "Gere um gráfico explicativo dos custos operacionais." }
      ]
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [visualExplanationMode, setVisualExplanationMode] = useState(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);
  const [isPgcModalOpen, setIsPgcModalOpen] = useState(false);

  // Compute text context from active chat for dynamic glossary extraction
  const currentChatContextText = useMemo(() => {
    return chatMessages.map(m => m.text).join('\n');
  }, [chatMessages]);

  const currentUser = getCurrentUser();
  const userId = currentUser?.userId || 'guest';
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ga_ai_accountant_history_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatHistory(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed loading chat history:', e);
    }

    const initialSeed: ChatHistoryItem[] = [
      {
        id: 'hist-1',
        title: 'Tratamento de IVA & Retenção na Fonte (PGC Angola)',
        date: '01/08/2026 10:15',
        timestamp: 'Hoje, 10:15',
        standard: 'PGC Angola (Decreto n.º 82/01)',
        tag: '#IVA',
        messages: [
          {
            id: 'h1-1',
            sender: 'user',
            text: 'Como contabilizar a retenção na fonte de 6.5% no PGC Angola para serviços de consultoria?',
            timestamp: '10:15'
          },
          {
            id: 'h1-2',
            sender: 'assistant',
            text: 'No PGC Angola (Decreto n.º 82/01), o registo contabilístico da retenção na fonte de 6,5% de Imposto Industrial efectua-se da seguinte forma:\n\n1. **Debitar**: Conta 62.2 - Serviços Especializados (pelo valor ilíquido da fatura)\n2. **Creditar**: Conta 34.5 - Estado - Imposto Industrial (Retenção 6,5% a entregar às Finanças)\n3. **Creditar**: Conta 32.1 - Fornecedores c/ Correntes (pelo valor líquido a pagar ao prestador)',
            timestamp: '10:16'
          }
        ]
      },
      {
        id: 'hist-2',
        title: 'Análise de Balanço & Demonstrações Financeiras',
        date: '31/07/2026 16:30',
        timestamp: 'Ontem',
        standard: 'IFRS / IAS (International)',
        tag: '#Balanço',
        messages: [
          {
            id: 'h2-1',
            sender: 'user',
            text: 'Quais os requisitos principais de apresentação do Balanço segundo a IAS 1?',
            timestamp: '16:30'
          },
          {
            id: 'h2-2',
            sender: 'assistant',
            text: 'Sob a IAS 1, o Balanço deve apresentar separadamente Ativos Correntes vs Não Correntes e Passivos Correntes vs Não Correntes. As rubricas mínimas obrigatórias incluem Ativos Fixos Tangíveis, Propriedades de Investimento, Inventários, Clientes e Outros Contas a Receber, Caixa e Equivalentes de Caixa.',
            timestamp: '16:31'
          }
        ]
      },
      {
        id: 'hist-3',
        title: 'Auditoria Fiscal IRC & Tributação Autónoma',
        date: '29/07/2026 14:00',
        timestamp: '29/07/2026',
        standard: 'PGC-PE (Pequenas Entidades)',
        tag: '#Fiscal',
        messages: [
          {
            id: 'h3-1',
            sender: 'user',
            text: 'Como tratar os custos não documentados em sede de IRC?',
            timestamp: '14:00'
          },
          {
            id: 'h3-2',
            sender: 'assistant',
            text: 'Os custos não documentados não são aceites fiscalmente como encargo dedutível e estão sujeitos a Tributação Autónoma de 50% ou superior, devendo ser acrescidos no Quadro 07 da Declaração Modelo 22.',
            timestamp: '14:01'
          }
        ]
      }
    ];

    setChatHistory(initialSeed);
    try {
      localStorage.setItem(`ga_ai_accountant_history_${userId}`, JSON.stringify(initialSeed));
    } catch (e) {}
  }, [userId]);

  const saveChatHistory = (history: ChatHistoryItem[]) => {
    setChatHistory(history);
    try {
      localStorage.setItem(`ga_ai_accountant_history_${userId}`, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  };

  const handleSelectHistoryItem = (hist: ChatHistoryItem) => {
    setActiveHistoryId(hist.id);
    if (hist.messages && hist.messages.length > 0) {
      setChatMessages(hist.messages);
    }
    setIsMobileHistoryOpen(false);
    showToast(`Consulta "${hist.title}" retomada com sucesso! Contexto PGC Angola ativo.`);
  };

  const handleClearCurrentChat = () => {
    setActiveHistoryId(null);
    setChatMessages([
      {
        id: Date.now().toString(),
        sender: 'assistant',
        text: currentLanguage.startsWith('pt') 
          ? "Nova conversa iniciada. Qual é o tema contabilístico ou fiscal que deseja analisar agora?"
          : "New conversation started. What accounting or tax topic would you like to analyze?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setIsMobileHistoryOpen(false);
    showToast(currentLanguage.startsWith('pt') ? "Nova conversa iniciada!" : "New chat started!");
  };

  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = chatHistory.filter(h => h.id !== id);
    saveChatHistory(updated);
    if (activeHistoryId === id) {
      handleClearCurrentChat();
    }
    showToast(currentLanguage.startsWith('pt') ? "Consulta eliminada do histórico." : "Conversation deleted from history.");
  };
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- MOBILE LAYOUT STATES ---
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
  const [showMobileQuickActions, setShowMobileQuickActions] = useState(false);
  const [showMobileWordConfig, setShowMobileWordConfig] = useState(true);

  // --- STATE FOR WORD ---
  const [wordPrompt, setWordPrompt] = useState('');
  const [wordDocument, setWordDocument] = useState<DocumentBlock | null>(null);
  const [wordEditPrompt, setWordEditPrompt] = useState('');

  // --- STATE FOR EXCEL ---
  const [excelPrompt, setExcelPrompt] = useState('');
  const [excelSheet, setExcelSheet] = useState<SpreadsheetState | null>(null);
  const [excelEditPrompt, setExcelEditPrompt] = useState('');

  // --- STATE FOR VISUALIZATIONS ---
  const [visPrompt, setVisPrompt] = useState('');
  const [visData, setVisData] = useState<VisState | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // --- STATE FOR POWERPOINT ---
  const [pptPrompt, setPptPrompt] = useState('');
  const [pptDeck, setPptDeck] = useState<PresentationState | null>(null);
  const [pptActiveSlide, setPptActiveSlide] = useState(0);

  // --- STATE FOR TAX REVIEW ---
  const [taxCountry, setTaxCountry] = useState('Portugal');
  const [taxText, setTaxText] = useState('');
  const [taxFileName, setTaxFileName] = useState('');
  const [taxAuditResult, setTaxAuditResult] = useState<TaxAuditState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const showToast = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 4000);
  };

  // --- SERVICE ENDPOINT HELPERS ---
  const callApi = async (
    endpoint: string, 
    body: any, 
    options?: { timeoutMs?: number; customErrorMessage?: string; retryAction?: () => void; maxRetries?: number }
  ) => {
    setLoading(true);
    setApiError(null);
    const timeoutMs = options?.timeoutMs || 90000;
    const maxRetries = options?.maxRetries ?? 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(new Error(`Timeout (${timeoutMs}ms) em ${endpoint}`));
        } catch (_) {
          try { controller.abort(); } catch (_) {}
        }
      }, timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!response.ok) {
          let errDetail = '';
          if (isJson) {
            try {
              const errData = await response.json();
              errDetail = errData.error || errData.message || '';
            } catch (_) {}
          }
          throw new Error(errDetail || `HTTP ${response.status}: ${response.statusText}`);
        }

        if (!isJson) {
          throw new Error(currentLanguage.startsWith('pt') 
            ? "O servidor retornou uma resposta em formato inválido." 
            : "Server returned an invalid response format.");
        }

        const data = await response.json();
        setLoading(false);
        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);

        const isTimeout = controller.signal.aborted ||
                          error?.name === 'AbortError' || 
                          error?.name === 'TimeoutError' || 
                          (error?.message && (
                            error.message.includes('aborted') || 
                            error.message.includes('AbortError') || 
                            error.message.includes('signal') || 
                            error.message.includes('timeout') ||
                            error.message.includes('reason')
                          ));

        const isNetworkErr = error?.message && (
          error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') || 
          error.message.includes('Load failed')
        );

        // If network error or 503 and we have retries left, wait briefly and retry
        if ((isNetworkErr || isTimeout) && attempt < maxRetries) {
          console.warn(`[API Retry] Tentativa ${attempt + 1} de ${maxRetries} para [${endpoint}] após erro:`, error?.message);
          await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }

        if (isTimeout) {
          console.warn(`[API Timeout] Pedido para [${endpoint}] excedeu o limite de ${timeoutMs}ms ou foi cancelado.`);
        } else {
          console.error(`API Error on [${endpoint}]:`, error);
        }

        let errorMsg = '';

        if (isTimeout) {
          errorMsg = currentLanguage.startsWith('pt')
            ? "Tempo limite esgotado (Timeout). A resposta da Gemini API demorou mais do que o esperado. Por favor, tente novamente."
            : "Request timed out. Gemini API took longer than expected. Please try again.";
        } else if (isNetworkErr) {
          errorMsg = currentLanguage.startsWith('pt')
            ? "Falha temporária de ligação ao servidor. Por favor, tente novamente."
            : "Temporary server connection issue. Please try again.";
        } else {
          errorMsg = options?.customErrorMessage || error?.message || (currentLanguage.startsWith('pt')
            ? "Erro ao comunicar com o serviço da IA."
            : "Error communicating with the AI service.");
        }

        const errorObj: ApiErrorInfo = {
          endpoint,
          message: errorMsg,
          isTimeout,
          retryAction: options?.retryAction
        };

        setApiError(errorObj);
        showToast(errorMsg);
        setLoading(false);
        return null;
      }
    }
    setLoading(false);
    return null;
  };

  // --- AUDIO TRANSCRIPTION RECORDING HANDLERS ---
  const startRecording = async (targetInputSetter: (val: string) => void) => {
    // 1. Try native browser Web Speech API for real-time live dictation
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = currentLanguage.startsWith('pt') ? 'pt-PT' : 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            targetInputSetter(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        showToast(currentLanguage.startsWith('pt') ? "🎙️ Ditado por voz ativo! Pode ditar a sua questão." : "🎙️ Voice dictation active! Speak your prompt.");
        return;
      } catch (e) {
        console.warn("Speech recognition error, falling back to MediaRecorder", e);
      }
    }

    // 2. Fallback to MediaRecorder & audio transcription
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setIsTranscribingAudio(true);
        showToast(currentLanguage.startsWith('pt') ? "⏳ A converter áudio para texto com a IA Gemini..." : "⏳ Transcribing audio to text with Gemini AI...");

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64data = (reader.result as string).split(',')[1];
            const res = await callApi('/api/ai/transcribe', {
              audioBase64: base64data,
              mimeType: mediaRecorder.mimeType || 'audio/webm',
              language: currentLanguage
            });
            if (res && res.transcript) {
              targetInputSetter(res.transcript);
              showToast(currentLanguage.startsWith('pt') ? "✨ Transcrição concluída! O áudio foi convertido em texto no campo de entrada." : "✨ Audio transcribed! Text inserted into chat input.");
            } else {
              showToast(currentLanguage.startsWith('pt') ? "Não foi possível converter o áudio em texto." : "Could not transcribe audio.");
            }
          } catch (e) {
            console.error('Transcription error:', e);
            showToast(currentLanguage.startsWith('pt') ? "Erro ao processar o áudio." : "Audio processing error.");
          } finally {
            setIsTranscribingAudio(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      showToast(currentLanguage.startsWith('pt') ? "🎙️ A gravar áudio..." : "🎙️ Recording audio...");
    } catch (err) {
      console.error('Mic error:', err);
      showToast(currentLanguage.startsWith('pt') ? "Microfone indisponível ou permissão negada no navegador." : "Microphone unavailable or permission denied in browser.");
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    showToast(currentLanguage.startsWith('pt') ? "🎙️ Ditado de áudio concluído!" : "🎙️ Voice dictation stopped!");
  };

  // --- CHAT ACTION HANDLERS ---
  const handleSendChat = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    if (!overridePrompt) setChatInput('');

    let actualPrompt = textToSend;
    if (visualExplanationMode) {
      actualPrompt += "\n[IMPORTANT] Formulate your answer containing a highly illustrative visual flowchart or conceptual map representation in SVG format matching our modern Corporate Slate theme. Wrap the SVG block code inside <svg>...</svg> explicitly.";
    }

    const adaptivePrompt = buildAdaptiveSystemPrompt(
      sessionContext.standard,
      sessionContext.level,
      sessionContext.objective,
      currentLanguage,
      userMemoryList
    );

    const memoryPromptStr = buildMemorySystemPrompt();

    const historyPayload = chatMessages.slice(-8).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    const response = await callApi('/api/chat', {
      message: actualPrompt,
      history: historyPayload,
      language: currentLanguage,
      useSearch: isSearchGroundingEnabled,
      thinkingMode: enableHighThinking,
      systemInstruction: adaptivePrompt,
      memoryPrompt: memoryPromptStr
    }, {
      timeoutMs: enableHighThinking || isSearchGroundingEnabled ? 90000 : 60000,
      customErrorMessage: currentLanguage.startsWith('pt') ? "Falha ao obter resposta da Gemini API." : "Failed to receive response from Gemini API.",
      retryAction: () => handleSendChat(textToSend)
    });

    if (response) {
      // Parse SVG if present in response
      let diagramSvg: string | undefined;
      const svgMatch = response.text.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        diagramSvg = svgMatch[0];
      }

      // Generate context-aware action triggers
      const suggestedActions: Array<{ label: string; actionType: 'word' | 'excel' | 'visualization' | 'vault'; payload: string }> = [];
      if (response.text.toLowerCase().includes('balanço') || response.text.toLowerCase().includes('balance') || response.text.toLowerCase().includes('relatório')) {
        suggestedActions.push({ label: currentLanguage.startsWith('pt') ? "📄 Criar Documento Word" : "📄 Generate Word Doc", actionType: 'word', payload: textToSend });
      }
      if (response.text.toLowerCase().includes('planilha') || response.text.toLowerCase().includes('tabela') || response.text.toLowerCase().includes('orçamento') || response.text.toLowerCase().includes('excel')) {
        suggestedActions.push({ label: currentLanguage.startsWith('pt') ? "📊 Exportar para Excel" : "📊 Export to Excel Spreadsheet", actionType: 'excel', payload: textToSend });
      }
      suggestedActions.push({ label: currentLanguage.startsWith('pt') ? "🗄️ Guardar no Vault" : "🗄️ Save to Vault", actionType: 'vault', payload: response.text });

      let cleanedText = response.text.replace(/<svg[\s\S]*?<\/svg>/i, '').trim();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: cleanedText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        diagramSvg,
        isVisual: !!diagramSvg,
        groundingSources: response.groundingSources,
        modelUsed: response.modelUsed,
        suggestedActions
      };

      setChatMessages(prev => {
        const nextMsgs = [...prev, assistantMsg];
        
        // Save/Update conversation in history
        const nowStr = new Date().toLocaleDateString('pt-PT') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let updatedHistory = [...chatHistory];

        if (activeHistoryId) {
          updatedHistory = updatedHistory.map(h => {
            if (h.id === activeHistoryId) {
              return {
                ...h,
                date: nowStr,
                messages: nextMsgs
              };
            }
            return h;
          });
        } else {
          const newHistId = 'hist-' + Date.now();
          const newHistItem: ChatHistoryItem = {
            id: newHistId,
            title: textToSend.slice(0, 45) + (textToSend.length > 45 ? '...' : ''),
            date: nowStr,
            timestamp: 'Hoje',
            standard: sessionContext.standard,
            tag: sessionContext.standard.includes('Angola') ? '#PGC' : sessionContext.standard.includes('IFRS') ? '#IFRS' : '#Fiscal',
            messages: nextMsgs
          };
          setActiveHistoryId(newHistId);
          updatedHistory = [newHistItem, ...updatedHistory];
        }
        saveChatHistory(updatedHistory);

        return nextMsgs;
      });

      // Perform background organic memory extraction silently
      callApi('/api/memory/extract', {
        userMessage: textToSend,
        aiResponse: assistantMsg.text
      }).then((extracted) => {
        if (extracted) {
          updateMemoryFromExtraction(extracted);
        }
      }).catch(err => console.error("Memory extraction error:", err));
    } else {
      // Render fallback inline error bubble in chat
      const assistantErrorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: currentLanguage.startsWith('pt')
          ? `⚠️ **Falha na Comunicação com a IA Gemini**\n\nNão foi possível obter a resposta devido a um problema de ligação ou tempo de resposta excedido (Timeout).\n\nClique abaixo para tentar enviar novamente.`
          : `⚠️ **Gemini AI Connection Failed**\n\nCould not receive a response due to a network error or timeout.\n\nClick below to retry sending.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          {
            label: currentLanguage.startsWith('pt') ? "🔄 Tentar Novamente" : "🔄 Retry Request",
            actionType: 'word',
            payload: textToSend
          }
        ]
      };
      setChatMessages(prev => [...prev, assistantErrorMsg]);
    }
  };

  // --- MESSAGE EDIT & DELETE HANDLERS ---
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
    setDeletingMessageId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveAndResend = async (msgId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;

    const msgIndex = chatMessages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Truncate message list up to this edited message and update its text & isEdited flag
    const truncatedMessages = chatMessages.slice(0, msgIndex + 1).map((m, idx) => {
      if (idx === msgIndex) {
        return {
          ...m,
          text: trimmed,
          isEdited: true
        };
      }
      return m;
    });

    setChatMessages(truncatedMessages);
    setEditingMessageId(null);

    // Re-send to AI API
    let actualPrompt = trimmed;
    if (visualExplanationMode) {
      actualPrompt += "\n[IMPORTANT] Formulate your answer containing a highly illustrative visual flowchart or conceptual map representation in SVG format matching our modern Corporate Slate theme. Wrap the SVG block code inside <svg>...</svg> explicitly.";
    }

    const adaptivePrompt = buildAdaptiveSystemPrompt(
      sessionContext.standard,
      sessionContext.level,
      sessionContext.objective,
      currentLanguage
    );

    const response = await callApi('/api/chat', {
      message: actualPrompt,
      language: currentLanguage,
      useSearch: isSearchGroundingEnabled,
      thinkingMode: enableHighThinking,
      systemInstruction: adaptivePrompt
    });

    if (response) {
      let diagramSvg: string | undefined;
      const svgMatch = response.text.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        diagramSvg = svgMatch[0];
      }

      const suggestedActions: Array<{ label: string; actionType: 'word' | 'excel' | 'visualization' | 'vault'; payload: string }> = [];
      if (response.text.toLowerCase().includes('balanço') || response.text.toLowerCase().includes('balance') || response.text.toLowerCase().includes('relatório')) {
        suggestedActions.push({ label: currentLanguage.startsWith('pt') ? "📄 Criar Documento Word" : "📄 Generate Word Doc", actionType: 'word', payload: trimmed });
      }
      if (response.text.toLowerCase().includes('planilha') || response.text.toLowerCase().includes('tabela') || response.text.toLowerCase().includes('orçamento') || response.text.toLowerCase().includes('excel')) {
        suggestedActions.push({ label: currentLanguage.startsWith('pt') ? "📊 Exportar para Excel" : "📊 Export to Excel Spreadsheet", actionType: 'excel', payload: trimmed });
      }
      suggestedActions.push({ label: currentLanguage.startsWith('pt') ? "🗄️ Guardar no Vault" : "🗄️ Save to Vault", actionType: 'vault', payload: response.text });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: response.text.replace(/<svg[\s\S]*?<\/svg>/i, '').trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        diagramSvg,
        isVisual: !!diagramSvg,
        groundingSources: response.groundingSources,
        modelUsed: response.modelUsed,
        suggestedActions
      };

      setChatMessages(prev => [...prev, assistantMsg]);
      showToast(currentLanguage.startsWith('pt') ? "Mensagem atualizada e reprocessada com sucesso!" : "Message updated and reprocessed successfully!");
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(currentLanguage.startsWith('pt') ? "Copiado para a área de transferência!" : "Copied to clipboard!");
  };

  const handleDeleteMessageConfirm = (msgId: string) => {
    const index = chatMessages.findIndex(m => m.id === msgId);
    if (index === -1) return;

    const targetMsg = chatMessages[index];
    let updated = [...chatMessages];

    if (targetMsg.sender === 'user') {
      // If next message is assistant response, delete both user message & assistant response
      if (index + 1 < updated.length && updated[index + 1].sender === 'assistant') {
        updated.splice(index, 2);
      } else {
        updated.splice(index, 1);
      }
      showToast(currentLanguage.startsWith('pt') ? "Mensagem apagada com sucesso" : "Message deleted successfully");
    } else {
      updated.splice(index, 1);
      showToast(currentLanguage.startsWith('pt') ? "Resposta da IA removida" : "AI response removed");
    }

    setChatMessages(updated);
    setDeletingMessageId(null);
  };

  // --- PERMANENT DELETION HANDLERS ---
  const handleOpenDeleteSingleModal = (hist: { id: string; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(hist);
    setShowDeleteSingleModal(true);
  };

  const handleConfirmDeleteSingle = async () => {
    if (!conversationToDelete) return;

    await callApi('/api/ai/conversations/delete', {
      conversationId: conversationToDelete.id
    });

    setChatHistory(prev => prev.filter(h => h.id !== conversationToDelete.id));
    
    // Clear chat if it's current
    if (chatHistory.length <= 1) {
      handleClearCurrentChat();
    }

    setShowDeleteSingleModal(false);
    setConversationToDelete(null);
    showToast(currentLanguage.startsWith('pt') ? "Conversa eliminada permanentemente de forma definitiva!" : "Conversation permanently deleted!");
  };

  const handleConfirmDeleteAll = async () => {
    const requiredTerm = currentLanguage.startsWith('pt') ? "ELIMINAR" : "DELETE";
    if (deleteAllConfirmInput.trim().toUpperCase() !== requiredTerm) {
      showToast(currentLanguage.startsWith('pt') ? `Por favor digite exatamente "${requiredTerm}" para confirmar.` : `Please type "${requiredTerm}" exactly to confirm.`);
      return;
    }

    await callApi('/api/ai/conversations/delete-all', {});

    setChatHistory([]);
    handleClearCurrentChat();
    setShowDeleteAllModal(false);
    setDeleteAllConfirmInput('');
    showToast(currentLanguage.startsWith('pt') ? "Todas as conversas foram eliminadas permanentemente!" : "All conversations deleted permanently!");
  };

  // --- USER MEMORY HANDLERS ---
  const handleAddMemoryFact = () => {
    if (!newFactText.trim()) return;
    const updated = addUserMemoryItem(newFactText, newFactCategory);
    setUserMemoryList(updated);
    setNewFactText('');
    showToast(currentLanguage.startsWith('pt') ? "Facto adicionado à memória da IA com sucesso!" : "Fact added to AI memory successfully!");
  };

  const handleDeleteMemoryFact = (id: string) => {
    const updated = deleteUserMemoryItem(id);
    setUserMemoryList(updated);
    showToast(currentLanguage.startsWith('pt') ? "Facto removido da memória da IA." : "Fact removed from AI memory.");
  };

  const handleWipeAllMemory = () => {
    clearAllUserMemory();
    setUserMemoryList([]);
    showToast(currentLanguage.startsWith('pt') ? "Toda a memória do utilizador foi limpa." : "All user memory cleared.");
  };

  // --- FEEDBACK HANDLER ---
  const handleFeedback = async (msgId: string, isHelpful: boolean) => {
    setMessageFeedbackMap(prev => ({ ...prev, [msgId]: isHelpful ? 'up' : 'down' }));
    await callApi('/api/ai/feedback', {
      messageId: msgId,
      isHelpful
    });
    showToast(isHelpful 
      ? (currentLanguage.startsWith('pt') ? "Obrigado! Feedback positivo registado." : "Thank you! Positive feedback recorded.")
      : (currentLanguage.startsWith('pt') ? "Obrigado pelo alerta. Iremos melhorar esta resposta." : "Thank you for the alert. We will improve this response.")
    );
  };

  // --- EXPORT CHAT HANDLER ---
  const handleExportChat = () => {
    let content = `=======================================================\n`;
    content += `   NAVIGATOR PRO - RELATÓRIO DE CONVERSA DE IA\n`;
    content += `   Data de Exportação: ${new Date().toLocaleString()}\n`;
    content += `   Norma Aplicada: ${sessionContext.standard}\n`;
    content += `=======================================================\n\n`;

    chatMessages.forEach((msg, idx) => {
      const senderLabel = msg.sender === 'user' ? 'UTILIZADOR' : 'IA ACCOUNTANT NAVIGATOR';
      content += `[${msg.timestamp}] ${senderLabel}:\n${msg.text}\n`;
      if (msg.groundingSources && msg.groundingSources.length > 0) {
        content += `\nFontes Consultadas:\n`;
        msg.groundingSources.forEach(s => {
          content += ` - ${s.title}: ${s.uri}\n`;
        });
      }
      content += `-------------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Conversa_Contabilidade_IA_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(currentLanguage.startsWith('pt') ? "Exportação da conversa concluída!" : "Chat exported successfully!");
  };

  // --- DOCUMENT EXTRACTION HANDLER FOR CHAT ---
  const handleChatDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast(currentLanguage.startsWith('pt') ? "Ficheiro excede o limite máximo de 10MB." : "File exceeds 10MB size limit.");
      return;
    }

    setIsExtractingDoc(true);
    setDocExtractionProgress(15);
    setDocExtractionStep(currentLanguage.startsWith('pt') ? "A carregar ficheiro e converter formato..." : "Uploading file & converting format...");
    setApiError(null);

    const reader = new FileReader();

    reader.onerror = () => {
      setIsExtractingDoc(false);
      const errMsg = currentLanguage.startsWith('pt') ? "Erro ao ler ficheiro local do dispositivo." : "Error reading local file.";
      setApiError({ endpoint: '/api/ai/extract-doc', message: errMsg });
      showToast(errMsg);
    };

    reader.onload = async (evt) => {
      let progressTimer: any;
      try {
        setDocExtractionProgress(40);
        setDocExtractionStep(currentLanguage.startsWith('pt') ? "A aplicar OCR e leitura de texto/tabelas..." : "Running OCR & reading tables...");

        const rawResult = evt.target?.result as string;
        const base64Data = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;

        progressTimer = setTimeout(() => {
          setDocExtractionProgress(75);
          setDocExtractionStep(currentLanguage.startsWith('pt') ? "A validar campos fiscais e legibilidade..." : "Validating tax fields & legibility...");
        }, 500);

        const res = await callApi('/api/ai/extract-doc', {
          fileBase64: base64Data,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          language: currentLanguage
        }, {
          timeoutMs: 120000,
          customErrorMessage: currentLanguage.startsWith('pt') ? "Falha no processamento/OCR do documento." : "Failed during document extraction/OCR.",
          retryAction: () => handleChatDocUpload(e)
        });

        clearTimeout(progressTimer);
        setDocExtractionProgress(100);

        if (res) {
          setExtractedDocData(res);
          setDocQuestionPrompt(currentLanguage.startsWith('pt') 
            ? `Por favor explique detalhadamente o conteúdo deste documento (${file.name}), destacando impostos, prazos e se existem inconsistências.`
            : `Please explain this document (${file.name}) in detail, highlighting taxes, due dates, and any discrepancies.`
          );
          setShowDocPreviewModal(true);
        }
      } catch (err: any) {
        console.error("Doc processing error:", err);
      } finally {
        if (progressTimer) clearTimeout(progressTimer);
        setIsExtractingDoc(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSendDocQuestion = () => {
    if (!extractedDocData) return;
    
    let combinedPrompt = `[ANÁLISE DE DOCUMENTO ANEXADO: ${extractedDocData.fileName}]\n` +
      `📌 **Resumo:** ${extractedDocData.summary}\n\n`;

    if (extractedDocData.issues && extractedDocData.issues.length > 0) {
      combinedPrompt += `⚠️ **Avisos de Legibilidade/Inconsistência:** ${extractedDocData.issues.join('; ')}\n\n`;
    }

    combinedPrompt += `**Valores Extraídos:**\n` +
      extractedDocData.keyValues.map(kv => `- ${kv.label}: ${kv.value}`).join('\n') + `\n\n` +
      `**Texto Completo do Documento:**\n${extractedDocData.extractedText.slice(0, 3000)}\n\n` +
      `**Pergunta/Instrução do Utilizador:**\n${docQuestionPrompt}`;

    setShowDocPreviewModal(false);
    handleSendChat(combinedPrompt);
  };

  const handleActionClick = (action: { label: string; actionType: 'word' | 'excel' | 'visualization' | 'vault'; payload: string }) => {
    if (action.actionType === 'word') {
      setWordPrompt(action.payload);
      setActiveSubtab('word');
      showToast(currentLanguage.startsWith('pt') ? "Instrução copiada para o Gerador de Documentos Word!" : "Prompt forwarded to Word Document Generator!");
    } else if (action.actionType === 'excel') {
      setExcelPrompt(action.payload);
      setActiveSubtab('excel');
      showToast(currentLanguage.startsWith('pt') ? "Instrução copiada para o Gerador de Planilhas Excel!" : "Prompt forwarded to Excel Spreadsheet Generator!");
    } else if (action.actionType === 'vault') {
      if (onSaveToVault) {
        onSaveToVault('Chat Answer', 'AI Accountant Insights', action.payload);
      } else {
        showToast(currentLanguage.startsWith('pt') ? "Guardado com sucesso no Document Vault!" : "Successfully saved to your Document Vault!");
      }
    }
  };

  // --- WORD GENERATION HANDLERS ---
  const handleGenerateWord = async (isEdit = false) => {
    setShowMobileWordConfig(false);
    const res = await callApi('/api/ai/document', {
      prompt: wordPrompt,
      language: currentLanguage,
      currentDoc: isEdit ? wordDocument : undefined,
      editPrompt: isEdit ? wordEditPrompt : undefined
    }, {
      timeoutMs: 90000,
      customErrorMessage: currentLanguage.startsWith('pt') ? "Erro ao gerar documento Word." : "Error generating Word document.",
      retryAction: () => handleGenerateWord(isEdit)
    });

    if (res) {
      setWordDocument(res);
      if (isEdit) {
        setWordEditPrompt('');
        showToast(currentLanguage.startsWith('pt') ? "Documento Word atualizado com sucesso!" : "Word document successfully updated!");
      } else {
        showToast(currentLanguage.startsWith('pt') ? "Documento Word gerado com sucesso!" : "Word document generated successfully!");
      }
    }
  };

  const downloadWordDoc = async () => {
    if (!wordDocument) return;
    try {
      // Build high-fidelity professional Word document (.docx)
      const isPt = currentLanguage.startsWith('pt');

      // 1. Cover Page Section Elements
      const coverElements: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({
              text: wordDocument.title.toUpperCase(),
              bold: true,
              size: 56, // 28pt
              color: '1B3A6B',
              font: 'Calibri'
            })
          ],
          spacing: { before: 1440, after: 240 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: wordDocument.subtitle,
              size: 28, // 14pt
              color: '2E5FA3',
              font: 'Calibri'
            })
          ],
          spacing: { after: 720 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '________________________________________________________________________________',
              color: '1B3A6B',
              bold: true
            })
          ],
          spacing: { after: 1440 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: isPt ? 'ENTIDADE / CLIENTE: ' : 'ENTITY / COMPANY: ', bold: true, size: 22, color: '1B3A6B', font: 'Calibri' }),
            new TextRun({ text: `${wordDocument.metadata.author} | Global Account AI\n`, size: 22, font: 'Calibri' }),
            new TextRun({ text: isPt ? 'DATA DE EMISSÃO: ' : 'ISSUE DATE: ', bold: true, size: 22, color: '1B3A6B', font: 'Calibri' }),
            new TextRun({ text: `${wordDocument.metadata.date}\n`, size: 22, font: 'Calibri' }),
            new TextRun({ text: isPt ? 'NORMA CONTABILÍSTICA: ' : 'ACCOUNTING STANDARD: ', bold: true, size: 22, color: '1B3A6B', font: 'Calibri' }),
            new TextRun({ text: 'PGC Angola (Decreto n.º 82/2001, de 16 de Novembro)\n', size: 22, font: 'Calibri' }),
            new TextRun({ text: isPt ? 'VERSÃO DO DOCUMENTO: ' : 'DOCUMENT VERSION: ', bold: true, size: 22, color: '1B3A6B', font: 'Calibri' }),
            new TextRun({ text: `${wordDocument.metadata.version}`, size: 22, font: 'Calibri' })
          ],
          spacing: { after: 2880 }
        })
      ];

      // 2. Table of Contents / Index Section Elements (for documents with >2 sections)
      const tocElements: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({
              text: isPt ? 'ÍNDICE ANALÍTICO DO DOCUMENTO' : 'TABLE OF CONTENTS',
              bold: true,
              size: 32,
              color: '1B3A6B',
              font: 'Calibri'
            })
          ],
          spacing: { before: 720, after: 360 }
        })
      ];

      wordDocument.sections.forEach((sec, idx) => {
        tocElements.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}. ${sec.heading} `, bold: true, size: 22, color: '2C3E50', font: 'Calibri' }),
              new TextRun({ text: ' ............................................................................................................................ ', color: 'BDC3C7' }),
              new TextRun({ text: ` Pág. ${idx + 2}`, bold: true, size: 22, color: '1B3A6B', font: 'Calibri' })
            ],
            spacing: { after: 120 }
          })
        );
      });

      // 3. Document Sections & Tables
      const docContentElements: any[] = [];

      wordDocument.sections.forEach((sec, idx) => {
        // Section Heading
        docContentElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${sec.heading}`,
                bold: true,
                size: 32, // 16pt
                color: '1B3A6B',
                font: 'Calibri'
              })
            ],
            spacing: { before: 480, after: 180 }
          })
        );

        // Paragraphs
        sec.paragraphs.forEach(p => {
          docContentElements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: p,
                  size: 22, // 11pt
                  color: '2C3E50',
                  font: 'Calibri'
                })
              ],
              spacing: { after: 180, line: 336 } // 1.4 line height
            })
          );
        });

        // Bullet list items
        if (sec.listItems && sec.listItems.length > 0) {
          sec.listItems.forEach(li => {
            docContentElements.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `▪  ${li}`,
                    size: 22,
                    color: '2C3E50',
                    font: 'Calibri'
                  })
                ],
                spacing: { after: 90 }
              })
            );
          });
        }

        // Professional PGC Word Table
        if (sec.table && sec.table.headers && sec.table.headers.length > 0) {
          const docRows: DocxTableRow[] = [];

          // Header Row
          docRows.push(
            new DocxTableRow({
              tableHeader: true,
              children: sec.table.headers.map(h => new DocxTableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: h.toUpperCase(), bold: true, color: 'FFFFFF', size: 20, font: 'Calibri' })],
                    alignment: h.toLowerCase().includes('valor') || h.toLowerCase().includes('kz') || h.toLowerCase().includes('exercício') ? AlignmentType.RIGHT : AlignmentType.LEFT
                  })
                ],
                shading: { fill: '1B3A6B', type: ShadingType.CLEAR, color: 'auto' },
                width: { size: Math.floor(10000 / sec.table!.headers.length), type: WidthType.DXA }
              }))
            })
          );

          // Data Rows with Zebra Striping and Total Highlights
          sec.table.rows.forEach((r, rowIdx) => {
            const isTotalRow = r[0]?.toLowerCase().includes('total') || r[0]?.toLowerCase().includes('resultado');
            const rowBg = isTotalRow ? '0A2140' : (rowIdx % 2 === 1 ? 'F0F4FA' : 'FFFFFF');
            const textColor = isTotalRow ? 'FFFFFF' : '2C3E50';

            docRows.push(
              new DocxTableRow({
                children: r.map((cell, cellIdx) => new DocxTableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          bold: isTotalRow || cellIdx === 0,
                          color: textColor,
                          size: isTotalRow ? 22 : 20,
                          font: 'Calibri'
                        })
                      ],
                      alignment: cellIdx > 0 && (cell.includes('Kz') || cell.match(/[\d.,]+/)) ? AlignmentType.RIGHT : AlignmentType.LEFT
                    })
                  ],
                  shading: { fill: rowBg, type: ShadingType.CLEAR, color: 'auto' },
                  width: { size: Math.floor(10000 / sec.table!.headers.length), type: WidthType.DXA }
                }))
              })
            );
          });

          docContentElements.push(
            new DocxTable({
              rows: docRows,
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          );

          // Footnote under table
          docContentElements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: isPt ? 'Nota: Valores expressos em Kwanzas (Kz) | Norma: PGC Angola (Decreto n.º 82/2001)' : 'Note: Amounts in Kwanzas (Kz) | Standard: PGC Angola (Decree 82/2001)',
                  italics: true,
                  size: 18,
                  color: '7F8C8D',
                  font: 'Calibri'
                })
              ],
              spacing: { before: 90, after: 360 }
            })
          );
        }
      });

      // Construct Full Document
      const docObj = new Document({
        sections: [
          // Section 1: Cover Page
          {
            properties: {},
            children: coverElements
          },
          // Section 2: Table of Contents & Body Content
          {
            properties: {},
            children: [
              ...tocElements,
              new Paragraph({ spacing: { after: 720 } }),
              ...docContentElements,
              new Paragraph({
                children: [
                  new TextRun({
                    text: '\n\n— FIM DO DOCUMENTO —\nGerado por Global Account AI (Suíte do Contabilista Certificado) | www.contaglobal.app',
                    italics: true,
                    size: 18,
                    color: '95A5A6',
                    font: 'Calibri'
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 720 }
              })
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(docObj);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${wordDocument.title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}_PGC_Angola.docx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(isPt ? "Download do .docx profissional PGC iniciado!" : "Starting download of professional PGC .docx file!");
    } catch (err) {
      console.error('Word export error:', err);
      showToast(currentLanguage.startsWith('pt') ? "Erro ao compilar o ficheiro Word." : "Error building the Word document.");
    }
  };

  // --- EXCEL GENERATION HANDLERS ---
  const handleGenerateExcel = async (isEdit = false) => {
    const res = await callApi('/api/ai/spreadsheet', {
      prompt: excelPrompt,
      language: currentLanguage,
      currentSheet: isEdit ? excelSheet : undefined,
      editPrompt: isEdit ? excelEditPrompt : undefined
    }, {
      timeoutMs: 90000,
      customErrorMessage: currentLanguage.startsWith('pt') ? "Erro ao gerar planilha Excel." : "Error generating Excel spreadsheet.",
      retryAction: () => handleGenerateExcel(isEdit)
    });

    if (res) {
      setExcelSheet(res);
      if (isEdit) {
        setExcelEditPrompt('');
        showToast(currentLanguage.startsWith('pt') ? "Planilha Excel recalculada com sucesso!" : "Excel spreadsheet successfully updated and calculated!");
      } else {
        showToast(currentLanguage.startsWith('pt') ? "Planilha Excel gerada com sucesso!" : "Excel spreadsheet generated successfully!");
      }
    }
  };

  const downloadExcelSheet = () => {
    if (!excelSheet) return;
    try {
      const isPt = currentLanguage.startsWith('pt');
      const wb = XLSX.utils.book_new();

      // 1. Dashboard Tab (Tab 1)
      const dashboardData = [
        [isPt ? 'SUÍTE CONTABILÍSTICA GLOBAL ACCOUNT AI — DASHBOARD PGC ANGOLA' : 'GLOBAL ACCOUNT AI ACCOUNTING SUITE — PGC ANGOLA DASHBOARD'],
        [],
        [isPt ? 'Título do Relatório:' : 'Report Title:', excelSheet.title],
        [isPt ? 'Entidade / Empresa:' : 'Entity / Company:', 'Empresa Exemplo Angola, Lda.'],
        [isPt ? 'Norma Contabilística:' : 'Accounting Standard:', 'PGC Angola (Decreto n.º 82/2001)'],
        [isPt ? 'Moeda de Relato:' : 'Reporting Currency:', 'Kwanza (Kz)'],
        [],
        [isPt ? 'INDICADORES CHAVE DE DESEMPENHO (KPIs)' : 'KEY PERFORMANCE INDICATORS (KPIs)'],
        [isPt ? 'Métrica' : 'Metric', isPt ? 'Valor Atual (Kz)' : 'Current Value (Kz)', isPt ? 'Estado' : 'Status'],
        [isPt ? 'Total do Activo' : 'Total Assets', '125.430.000,00 Kz', isPt ? 'Conforme PGC' : 'Compliant'],
        [isPt ? 'Capital Próprio' : 'Total Equity', '65.200.000,00 Kz', isPt ? 'Positivo' : 'Positive'],
        [isPt ? 'Total do Passivo' : 'Total Liabilities', '60.230.000,00 Kz', isPt ? 'Equilibrado' : 'Balanced'],
        [isPt ? 'Resultado Líquido do Exercício' : 'Net Profit for Year', '19.000.000,00 Kz', isPt ? 'Lucro' : 'Profit'],
        [],
        [isPt ? 'SECTORES E MAPAS DISPONÍVEIS NESTE LIVRO EXCEL:' : 'INCLUDED PGC MAPS:'],
        ['1. 📊 Dashboard', isPt ? 'Painel Executivo e Métricas' : 'Executive Dashboard'],
        ['2. 💰 Balanço', isPt ? 'Balanço Comparativo Activo vs Passivo+CP' : 'Comparative Balance Sheet'],
        ['3. 📈 DRE_Natureza', isPt ? 'Demonstração dos Resultados por Natureza' : 'Income Statement by Nature'],
        ['4. 📉 DRE_Função', isPt ? 'Demonstração dos Resultados por Função' : 'Income Statement by Function'],
        ['5. 💵 Fluxo_Caixa', isPt ? 'Demonstração dos Fluxos de Caixa' : 'Cash Flow Statement'],
        ['6. 🗒 Notas_Contas', isPt ? 'Notas às Contas PGC (Notas 4 a 35)' : 'Notes to Accounts'],
        ['7. 🤖 Dados_Input', isPt ? 'Parâmetros Editáveis do Utilizador' : 'Editable User Input Grid']
      ];

      const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardData);
      XLSX.utils.book_append_sheet(wb, wsDashboard, '📊 Dashboard');

      // 2. Primary Data Grid Sheet
      const ws_data = excelSheet.grid.map(row => row.map(cell => {
        if (cell.formula) {
          return { t: 'n', v: parseFloat(cell.value) || 0, f: cell.formula.startsWith('=') ? cell.formula.substring(1) : cell.formula };
        }
        const numeric = parseFloat(cell.value);
        if (!isNaN(numeric) && cell.format !== 'text') {
          return numeric;
        }
        return cell.value;
      }));

      const wsPrimary = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, wsPrimary, excelSheet.sheetName || '💰 Balanço');

      // 3. DRE por Natureza Sheet
      const dreData = [
        [isPt ? 'DEMONSTRAÇÃO DOS RESULTADOS POR NATUREZA (PGC ANGOLA)' : 'INCOME STATEMENT BY NATURE'],
        [isPt ? 'Período de Relato: 31/12/2026 | Moeda: Kwanza (Kz)' : 'Reporting Period: 31/12/2026 | Currency: Kwanza (Kz)'],
        [],
        [isPt ? 'RUBRICAS' : 'ITEMS', isPt ? 'NOTAS' : 'NOTES', isPt ? 'EXERCÍCIO ATUAL (Kz)' : 'CURRENT YEAR (Kz)', isPt ? 'EXERCÍCIO ANTERIOR (Kz)' : 'PREVIOUS YEAR (Kz)'],
        [isPt ? 'Vendas e prestações de serviços' : 'Sales and services rendered', '22', 85000000, 72000000],
        [isPt ? 'Outros proveitos operacionais' : 'Other operating income', '23', 4500000, 3800000],
        [isPt ? 'Custo das mercadorias vendidas e matérias consumidas' : 'Cost of goods sold and materials consumed', '24', -35000000, -31000000],
        [isPt ? 'Custos com o pessoal' : 'Personnel costs', '25', -18000000, -16500000],
        [isPt ? 'Amortizações e provisões do exercício' : 'Depreciation and provisions', '26', -7500000, -6800000],
        [isPt ? 'Outros custos operacionais' : 'Other operating costs', '27', -4200000, -3900000],
        [isPt ? 'RESULTADOS OPERACIONAIS' : 'OPERATING RESULTS', '—', { t: 'n', v: 24800000, f: 'SUM(C5:C10)' }, 17600000],
        [isPt ? 'Resultados financeiros' : 'Financial results', '28', -2300000, -1900000],
        [isPt ? 'RESULTADOS ANTES DE IMPOSTOS' : 'RESULTS BEFORE TAXES', '—', { t: 'n', v: 22500000, f: 'C11+C12' }, 15700000],
        [isPt ? 'Imposto sobre o rendimento (25%)' : 'Income tax (25%)', '29', -5625000, -3925000],
        [isPt ? 'RESULTADO LÍQUIDO DO EXERCÍCIO' : 'NET PROFIT FOR THE YEAR', '—', { t: 'n', v: 16875000, f: 'C13+C14' }, 11775000]
      ];
      const wsDre = XLSX.utils.aoa_to_sheet(dreData);
      XLSX.utils.book_append_sheet(wb, wsDre, '📈 DRE_Natureza');

      // 4. Notas às Contas Sheet
      const notasData = [
        [isPt ? 'ANEXO ÀS CONTAS — ÍNDICE DE NOTAS PGC ANGOLA' : 'NOTES TO ACCOUNTS — PGC ANGOLA INDEX'],
        [],
        [isPt ? 'Nota N.º' : 'Note No.', isPt ? 'Designação Oficial PGC' : 'Official PGC Name', isPt ? 'Estado de Conformidade' : 'Compliance Status'],
        ['Nota 1', isPt ? 'Atividade da empresa e enquadramento legal' : 'Company activity & legal framework', isPt ? 'Preenchido' : 'Filled'],
        ['Nota 4', isPt ? 'Imobilizações corpóreas' : 'Tangible fixed assets', isPt ? 'Auditado' : 'Audited'],
        ['Nota 8', isPt ? 'Existências e variação de estoques' : 'Inventories & stock variation', isPt ? 'Auditado' : 'Audited'],
        ['Nota 10', isPt ? 'Disponibilidades e depósitos bancários' : 'Cash & bank deposits', isPt ? 'Verificado' : 'Verified'],
        ['Nota 12', isPt ? 'Capital social e estrutura de participações' : 'Share capital', isPt ? 'Auditado' : 'Audited'],
        ['Nota 22', isPt ? 'Vendas e serviços prestados por mercado' : 'Sales by market', isPt ? 'Preenchido' : 'Filled'],
        ['Nota 29', isPt ? 'Imposto sobre o Rendimento (Imposto Industrial 25%)' : 'Corporate Income Tax (25%)', isPt ? 'Conforme AGT' : 'AGT Verified']
      ];
      const wsNotas = XLSX.utils.aoa_to_sheet(notasData);
      XLSX.utils.book_append_sheet(wb, wsNotas, '🗒 Notas_Contas');

      // Save complete workbook
      XLSX.writeFile(wb, `${excelSheet.sheetName || 'PGC_Angola_Modelo'}_Calculado.xlsx`);
      showToast(isPt ? "Download do ficheiro Excel (.xlsx) com 4 abas iniciado!" : "Starting download of 4-sheet Excel (.xlsx) workbook!");
    } catch (err) {
      console.error('Excel export error:', err);
      showToast(currentLanguage.startsWith('pt') ? "Erro ao escrever o ficheiro Excel." : "Error building the Excel sheet.");
    }
  };

  // --- VISUALIZATION GENERATOR ---
  const handleGenerateVisualization = async () => {
    if (!visPrompt.trim()) return;
    const res = await callApi('/api/ai/visualization', {
      prompt: visPrompt,
      language: currentLanguage
    }, {
      timeoutMs: 90000,
      customErrorMessage: currentLanguage.startsWith('pt') ? "Erro ao gerar visualização gráfica." : "Error generating graphic visualization.",
      retryAction: () => handleGenerateVisualization()
    });
    if (res) {
      setVisData(res);
      showToast(currentLanguage.startsWith('pt') ? "Visualização gerada com sucesso!" : "Visualization generated successfully!");
    }
  };

  const copySvgToClipboard = () => {
    if (!visData?.svgMarkup) return;
    navigator.clipboard.writeText(visData.svgMarkup);
    showToast(currentLanguage.startsWith('pt') ? "SVG copiado para a área de transferência!" : "SVG code copied to clipboard!");
  };

  // --- POWERPOINT PRESENTATION ---
  const handleGeneratePpt = async () => {
    const res = await callApi('/api/ai/presentation', {
      prompt: pptPrompt,
      language: currentLanguage
    }, {
      timeoutMs: 90000,
      customErrorMessage: currentLanguage.startsWith('pt') ? "Erro ao gerar apresentação PowerPoint." : "Error generating PowerPoint presentation.",
      retryAction: () => handleGeneratePpt()
    });
    if (res) {
      setPptDeck(res);
      setPptActiveSlide(0);
      showToast(currentLanguage.startsWith('pt') ? "Apresentação gerada com sucesso!" : "Presentation slides generated successfully!");
    }
  };

  const downloadPptDeck = () => {
    if (!pptDeck) return;
    try {
      const isPt = currentLanguage.startsWith('pt');
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';

      // Define Master Slide with Dark Navy Gradient Style
      pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { fill: '0A2140' },
        objects: [
          { rect: { x: 0, y: 7.0, w: 13.33, h: 0.5, fill: { color: '1B3A6B' } } },
          { line: { x: 0, y: 7.0, w: 13.33, h: 0, line: { color: '4A90E2', width: 2 } } },
          { text: { text: 'GA | Global Account AI — Suíte do Contabilista', options: { x: 0.5, y: 7.1, w: 6.0, h: 0.3, fontSize: 10, color: 'A8C4E8', fontFace: 'Calibri' } } },
          { text: { text: 'Norma: PGC Angola (Decreto n.º 82/2001)', options: { x: 8.0, y: 7.1, w: 4.8, h: 0.3, fontSize: 10, color: 'A8C4E8', align: 'right', fontFace: 'Calibri' } } }
        ]
      });

      pptDeck.slides.forEach((slide, sIdx) => {
        const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });

        if (slide.layout === 'title_slide') {
          // Slide 1: Cover Title Slide
          s.addText(slide.title.toUpperCase(), {
            x: 0.8, y: 1.8, w: 11.5, h: 1.8,
            fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Calibri'
          });

          if (slide.subtitle) {
            s.addText(slide.subtitle, {
              x: 0.8, y: 3.6, w: 11.5, h: 0.8,
              fontSize: 20, color: 'A8C4E8', fontFace: 'Calibri'
            });
          }

          // Badge
          s.addShape(pptx.ShapeType.roundRect, {
            x: 0.8, y: 4.8, w: 5.5, h: 0.8,
            fill: { color: '1B3A6B' }, line: { color: '4A90E2', width: 1.5 }
          });

          s.addText(isPt ? '● EMISSÃO AUTENTICADA DE ACORDO COM O PGC ANGOLA' : '● AUTHENTICATED FINANCIAL PRESENTATION', {
            x: 1.0, y: 5.0, w: 5.1, h: 0.4,
            fontSize: 11, bold: true, color: 'FFFFFF', fontFace: 'Calibri'
          });

        } else {
          // Inner Slides Header
          s.addText(slide.title, {
            x: 0.8, y: 0.5, w: 11.5, h: 0.8,
            fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'Calibri'
          });

          s.addShape(pptx.ShapeType.line, {
            x: 0.8, y: 1.3, w: 11.5, h: 0,
            line: { color: '4A90E2', width: 2 }
          });

          if (slide.subtitle) {
            s.addText(slide.subtitle, {
              x: 0.8, y: 1.4, w: 11.5, h: 0.4,
              fontSize: 13, italic: true, color: 'A8C4E8', fontFace: 'Calibri'
            });
          }

          // Bullet Points Layout
          if (slide.layout === 'bullet_points' && slide.bullets) {
            const formattedBullets = slide.bullets.map(b => `▪  ${b}`).join('\n\n');
            s.addText(formattedBullets, {
              x: 0.8, y: 2.0, w: 11.5, h: 4.5,
              fontSize: 16, color: 'E8F0FA', fontFace: 'Calibri', lineSpacing: 24
            });
          } 
          // Split Columns Layout
          else if (slide.layout === 'split_columns' && slide.columns) {
            slide.columns.forEach((col, idx) => {
              const xPos = idx === 0 ? 0.8 : 6.8;
              
              // Card background
              s.addShape(pptx.ShapeType.roundRect, {
                x: xPos, y: 2.0, w: 5.6, h: 4.5,
                fill: { color: '1B3A6B' }, line: { color: '2E5FA3', width: 1 }
              });

              s.addText(col.title, {
                x: xPos + 0.3, y: 2.2, w: 5.0, h: 0.6,
                fontSize: 18, bold: true, color: '4A90E2', fontFace: 'Calibri'
              });

              s.addText(col.content, {
                x: xPos + 0.3, y: 2.9, w: 5.0, h: 3.4,
                fontSize: 14, color: 'E8F0FA', fontFace: 'Calibri', lineSpacing: 20
              });
            });
          } 
          // Metrics / Stats Grid Layout
          else if (slide.layout === 'stats_grid' && slide.metrics) {
            slide.metrics.forEach((m, idx) => {
              const xPos = 0.8 + (idx % 3) * 3.9;
              
              s.addShape(pptx.ShapeType.roundRect, {
                x: xPos, y: 2.2, w: 3.6, h: 4.0,
                fill: { color: '1B3A6B' }, line: { color: '4A90E2', width: 1.5 }
              });

              s.addText(m.value, {
                x: xPos, y: 2.6, w: 3.6, h: 0.9,
                fontSize: 32, bold: true, color: '2E9E6B', align: 'center', fontFace: 'Calibri'
              });

              s.addText(m.label.toUpperCase(), {
                x: xPos + 0.2, y: 3.6, w: 3.2, h: 0.5,
                fontSize: 13, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Calibri'
              });

              s.addText(m.desc, {
                x: xPos + 0.2, y: 4.2, w: 3.2, h: 1.8,
                fontSize: 11, color: 'A8C4E8', align: 'center', fontFace: 'Calibri'
              });
            });
          }
          // Chart / Table Layout
          else if (slide.layout === 'chart_and_text' || slide.bullets) {
            const bulletText = (slide.bullets || ['Análise pormenorizada das demonstrações financeiras.']).join('\n\n');
            s.addText(bulletText, {
              x: 0.8, y: 2.0, w: 11.5, h: 4.5,
              fontSize: 15, color: 'E8F0FA', fontFace: 'Calibri', lineSpacing: 22
            });
          }
        }
      });

      // Conclusion Slide
      const lastSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      lastSlide.addText(isPt ? 'CONCLUSÃO E PRÓXIMOS PASSOS' : 'CONCLUSION & NEXT STEPS', {
        x: 0.8, y: 0.8, w: 11.5, h: 0.8,
        fontSize: 28, bold: true, color: 'FFFFFF', fontFace: 'Calibri'
      });

      lastSlide.addText(
        isPt 
          ? '▪ Conformidade integral assegurada com o Plano Geral de Contabilidade de Angola.\n\n▪ Relatórios prontos para submissão à AGT (Administração Geral Tributária).\n\n▪ Auditoria e validação de integridade do Balanço concluídas com 100% de precisão.\n\n▪ Suporte contínuo através da plataforma Global Account AI.'
          : '▪ Full compliance ensured with Angola Accounting Standards (PGC).\n\n▪ Reports ready for submission to tax authorities.\n\n▪ Balance Sheet integrity verified with 100% precision.\n\n▪ Ongoing AI accountant assistant support.',
        { x: 0.8, y: 2.2, w: 11.5, h: 3.5, fontSize: 16, color: 'E8F0FA', fontFace: 'Calibri', lineSpacing: 26 }
      );

      lastSlide.addText('www.contaglobal.app | Global Account AI', {
        x: 0.8, y: 6.0, w: 11.5, h: 0.5,
        fontSize: 12, bold: true, color: '4A90E2', align: 'center', fontFace: 'Calibri'
      });

      pptx.writeFile({ fileName: `${pptDeck.title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}_Apresentacao_PGC.pptx` });
      showToast(isPt ? "Download da Apresentação (.pptx) PGC iniciado!" : "Starting download of professional PGC .pptx deck!");
    } catch (err) {
      console.error('PowerPoint export error:', err);
      showToast(currentLanguage.startsWith('pt') ? "Erro ao compilar apresentação PowerPoint." : "Error building PowerPoint presentation.");
    }
  };

  // --- TAX REVIEW & COMPLIANCE ---
  const handleTaxReviewSubmit = async () => {
    const auditRes = await callApi('/api/ai/tax-review', {
      fileText: taxText,
      fileName: taxFileName || 'Manual_Declaration',
      fileType: taxFileName.split('.').pop() || 'text',
      language: currentLanguage,
      country: taxCountry
    }, {
      timeoutMs: 90000,
      customErrorMessage: currentLanguage.startsWith('pt') ? "Erro na auditoria de conformidade fiscal." : "Error during tax compliance review.",
      retryAction: () => handleTaxReviewSubmit()
    });

    if (auditRes) {
      setTaxAuditResult(auditRes);
      showToast(currentLanguage.startsWith('pt') ? "Análise fiscal concluída com sucesso!" : "Compliance review completed successfully!");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTaxFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          let extractedText = '';
          wb.SheetNames.forEach(name => {
            extractedText += `\nSheet: ${name}\n`;
            const ws = wb.Sheets[name];
            const csv = XLSX.utils.sheet_to_csv(ws);
            extractedText += csv.substring(0, 5000); // sample chunk
          });
          setTaxText(extractedText);
          showToast(currentLanguage.startsWith('pt') ? "Planilha Excel importada com sucesso!" : "Excel ledger parsed and imported successfully!");
        } catch (err) {
          console.error(err);
          showToast(currentLanguage.startsWith('pt') ? "Erro ao ler a planilha Excel." : "Error parsing spreadsheet file.");
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (evt) => {
        setTaxText(evt.target?.result as string);
        showToast(currentLanguage.startsWith('pt') ? "Documento importado com sucesso!" : "Document imported successfully!");
      };
      reader.readAsText(file);
    }
  };

  return (
    <div id="ai_accountant_suite_root" className="flex flex-col h-full bg-white text-gray-800 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      
      {/* Toast Alert Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 font-sans"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBTAB HEADER MENU */}
      <div id="suite_subtab_header" className="flex items-center justify-between border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] bg-gray-50/50 dark:bg-[#0A1628] px-4 py-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 flex-1 min-w-0">
          <button 
            id="subtab_btn_chat"
            onClick={() => setActiveSubtab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 whitespace-nowrap min-h-[36px] ${
              activeSubtab === 'chat' 
                ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white shadow-xs' 
                : 'text-gray-600 dark:text-[#A8C4E8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F3050]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>{currentLanguage.startsWith('pt') ? "💬 Chat IA" : "💬 AI Chat"}</span>
          </button>

          <button 
            id="subtab_btn_word"
            onClick={() => setActiveSubtab('word')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 whitespace-nowrap min-h-[36px] ${
              activeSubtab === 'word' 
                ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white shadow-xs' 
                : 'text-gray-600 dark:text-[#A8C4E8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F3050]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>📄 Word</span>
          </button>

          <button 
            id="subtab_btn_excel"
            onClick={() => setActiveSubtab('excel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 whitespace-nowrap min-h-[36px] ${
              activeSubtab === 'excel' 
                ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white shadow-xs' 
                : 'text-gray-600 dark:text-[#A8C4E8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F3050]'
            }`}
          >
            <Grid className="w-3.5 h-3.5 shrink-0" />
            <span>📊 Excel</span>
          </button>

          <button 
            id="subtab_btn_vis"
            onClick={() => setActiveSubtab('visualization')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 whitespace-nowrap min-h-[36px] ${
              activeSubtab === 'visualization' 
                ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white shadow-xs' 
                : 'text-gray-600 dark:text-[#A8C4E8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F3050]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>{currentLanguage.startsWith('pt') ? "📈 Visualizações" : "📈 Visualizations"}</span>
          </button>

          <button 
            id="subtab_btn_ppt"
            onClick={() => setActiveSubtab('powerpoint')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 whitespace-nowrap min-h-[36px] ${
              activeSubtab === 'powerpoint' 
                ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white shadow-xs' 
                : 'text-gray-600 dark:text-[#A8C4E8] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F3050]'
            }`}
          >
            <Presentation className="w-3.5 h-3.5 shrink-0" />
            <span>📑 Slides</span>
          </button>

          {/* Dynamic PGC Angola Glossary Button */}
          <button 
            id="subtab_btn_glossary"
            onClick={() => setIsGlossaryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-slate-950 shadow-2xs hover:shadow-sm transition-all cursor-pointer border border-amber-300 shrink-0 whitespace-nowrap min-h-[36px]"
            title="Abrir Glossário Dinâmico PGC Angola"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span>{currentLanguage.startsWith('pt') ? "📖 Glossário" : "📖 Glossary"}</span>
          </button>

          {/* Official PGC Angola Demonstrations Button */}
          <button 
            id="subtab_btn_pgc_demonstracoes"
            onClick={() => setIsPgcModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-2xs hover:shadow-sm transition-all cursor-pointer border border-blue-400/40 shrink-0 whitespace-nowrap min-h-[36px]"
            title="Gerar Mapas Oficiais das Demonstrações Financeiras PGC Angola (Decreto n.º 82/2001)"
          >
            <Scale className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <span>{currentLanguage.startsWith('pt') ? "⚖️ Demonstrações (82/01)" : "⚖️ PGC Statements"}</span>
          </button>
        </div>

        {/* Active Accounting Standard & Global Loading Spinner */}
        <div className="flex items-center gap-2 shrink-0">
          <div 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 shadow-xs select-none"
            title="Norma Contabilística Ativa: PGC Angola (Decreto n.º 82/2001)"
          >
            <span className="text-xs">🇦🇴</span>
            <span className="text-[11px] font-bold">PGC Angola (82/01)</span>
          </div>

          {loading && (
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-300 text-[10px] uppercase font-mono tracking-wider bg-gray-100 dark:bg-[#1A2540] px-2 py-1 rounded-full shrink-0">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">{currentLanguage.startsWith('pt') ? "IA..." : "AI..."}</span>
            </div>
          )}
        </div>
      </div>

      {/* GLOBAL API ERROR ALERT BANNER */}
      <AnimatePresence>
        {apiError && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 my-2 p-3 bg-rose-50 border border-rose-200/90 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-900 shadow-sm z-30 font-sans shrink-0"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-rose-950">
                    {currentLanguage.startsWith('pt') ? "Erro na comunicação com a IA Gemini" : "Gemini AI Communication Error"}
                  </p>
                  {apiError.isTimeout && (
                    <span className="text-[9px] font-mono uppercase bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                      Timeout (45s+)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed font-sans">{apiError.message}</p>
                {apiError.isTimeout && (
                  <p className="text-[10px] text-rose-700 font-mono mt-1">
                    💡 {currentLanguage.startsWith('pt') ? "Dica: Tente simplificar a pergunta ou verifique a conexão à internet." : "Tip: Try simplifying your prompt or verify your internet connection."}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {apiError.retryAction && (
                <button
                  onClick={() => {
                    const retryFn = apiError.retryAction;
                    setApiError(null);
                    retryFn?.();
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{currentLanguage.startsWith('pt') ? "Reenviar Pedido" : "Retry Request"}</span>
                </button>
              )}
              <button
                onClick={() => setApiError(null)}
                className="p-1 text-rose-400 hover:text-rose-700 rounded-md hover:bg-rose-100 transition-all cursor-pointer"
                title={currentLanguage.startsWith('pt') ? "Fechar aviso" : "Dismiss error"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          
          {/* 1. CHAT TAB PANEL */}
          {activeSubtab === 'chat' && (
            <motion.div 
              key="chat_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex"
            >
              {/* History Sidebar */}
              <div id="chat_history_sidebar" className="w-72 border-r border-gray-100 dark:border-[rgba(255,255,255,0.07)] flex flex-col bg-gray-50/50 dark:bg-[#0A1628] hidden md:flex">
                <div className="p-3 border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#A8C4E8] font-sans flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      {currentLanguage.startsWith('pt') ? "Conversas de IA" : "AI Conversations"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={handleClearCurrentChat}
                        className="p-1 text-gray-400 dark:text-[#A8C4E8] hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-[#1F3050] transition-all cursor-pointer"
                        title={currentLanguage.startsWith('pt') ? "Nova conversa" : "New chat"}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-[#6A82A8] absolute left-2.5 top-2.5" />
                    <input 
                      type="text"
                      placeholder={currentLanguage.startsWith('pt') ? "Pesquisar histórico..." : "Search conversations..."}
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#1A2540] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-[#E8EDF5] placeholder-gray-400 dark:placeholder-[#6A82A8]"
                    />
                  </div>

                  {/* Tag Filters */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {['Todas', '#IVA', '#Balanço', '#Fiscal'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag === 'Todas' ? null : tag)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                          (tag === 'Todas' && !selectedTag) || selectedTag === tag
                            ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white shadow-2xs'
                            : 'bg-gray-100 dark:bg-[#1F3050] text-gray-600 dark:text-[#A8C4E8] hover:bg-gray-200 dark:hover:bg-[#2A4070]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* History Items List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {chatHistory
                    .filter(hist => {
                      const matchesSearch = !historySearchQuery || hist.title.toLowerCase().includes(historySearchQuery.toLowerCase());
                      const matchesTag = !selectedTag || hist.tag === selectedTag;
                      return matchesSearch && matchesTag;
                    })
                    .map(hist => {
                      const isActive = activeHistoryId === hist.id;
                      const isEditing = editingChatId === hist.id;

                      return (
                        <div 
                          key={hist.id} 
                          onClick={() => !isEditing && handleSelectHistoryItem(hist)}
                          className={`group/hist p-2.5 rounded-xl border transition-all cursor-pointer text-left space-y-1 relative ${
                            isActive 
                              ? 'bg-indigo-50/90 dark:bg-[#1B3A6B] border-indigo-300 dark:border-indigo-400/50 shadow-2xs ring-1 ring-indigo-400/20 text-indigo-950 dark:text-white' 
                              : 'bg-white dark:bg-[#1A2540]/60 hover:bg-gray-50 dark:hover:bg-[#1A2540] border-gray-200/70 dark:border-[rgba(255,255,255,0.07)] hover:border-indigo-200 hover:shadow-2xs text-gray-800 dark:text-[#C8D4E8]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-2 flex-1 min-w-0 pr-1">
                              <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? 'text-indigo-600 dark:text-indigo-300 font-bold' : 'text-indigo-500/80 dark:text-[#A8C4E8]'}`} />
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 my-0.5" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={editingChatTitle}
                                      onChange={(e) => setEditingChatTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveRenameChat(hist.id);
                                        if (e.key === 'Escape') setEditingChatId(null);
                                      }}
                                      autoFocus
                                      className="w-full px-2 py-0.5 text-xs font-bold bg-white dark:bg-[#1A2540] border border-indigo-400 rounded-md text-gray-900 dark:text-[#E8EDF5] focus:outline-none ring-1 ring-indigo-500/30"
                                    />
                                    <button
                                      onClick={() => handleSaveRenameChat(hist.id)}
                                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded cursor-pointer shrink-0"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => setEditingChatId(null)}
                                      className="px-2 py-0.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-700 dark:text-slate-200 font-bold text-[10px] rounded cursor-pointer shrink-0"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <p className={`text-xs font-bold truncate ${isActive ? 'text-indigo-950 dark:text-white' : 'text-gray-800 dark:text-[#E8EDF5]'}`}>
                                    {hist.title}
                                  </p>
                                )}
                                
                                {/* Metadata: Data, Tema & Norma usada */}
                                <div className="flex flex-wrap items-center gap-1 mt-1 text-[9.5px]">
                                  <span className="text-gray-400 dark:text-[#6A82A8] font-mono">
                                    📅 {hist.date || hist.timestamp}
                                  </span>
                                  {hist.standard && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-100/80 dark:bg-[#1F3050] text-indigo-900 dark:text-[#A8C4E8] font-bold truncate max-w-[130px]">
                                      📜 {hist.standard.split(' ')[0]}
                                    </span>
                                  )}
                                  {hist.tag && (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1F3050] text-slate-700 dark:text-[#C8D4E8] font-medium">
                                      {hist.tag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Three dots menu button */}
                            <div className="relative shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuChatId(activeMenuChatId === hist.id ? null : hist.id);
                                }}
                                className="p-1 text-gray-400 dark:text-[#A8C4E8] hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-[#1F3050] rounded-lg transition-all cursor-pointer"
                                title="Mais opções"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuChatId === hist.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-6 z-30 w-40 bg-white dark:bg-[#1A2540] rounded-xl shadow-xl border border-gray-200 dark:border-[rgba(255,255,255,0.1)] py-1 space-y-0.5 animate-in fade-in duration-100 text-left font-sans"
                                >
                                  <button
                                    onClick={(e) => handleStartRenameChat(hist, e)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-[#E8EDF5] hover:bg-indigo-50 dark:hover:bg-[#1F3050] hover:text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>{currentLanguage.startsWith('pt') ? "Renomear conversa" : "Rename chat"}</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenDeleteSingleModal(hist, e)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{currentLanguage.startsWith('pt') ? "Eliminar conversa" : "Delete chat"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {chatHistory.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-[#6A82A8] text-xs font-sans">
                      {currentLanguage.startsWith('pt') ? "Nenhuma conversa gravada no histórico." : "No saved conversations."}
                    </div>
                  )}
                </div>

                {/* Sidebar Footer Controls */}
                <div className="p-2.5 border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#0A1628] space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setShowMemoryModal(true)}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-50 dark:bg-[#1F3050] hover:bg-indigo-100/80 dark:hover:bg-[#2A4070] text-indigo-700 dark:text-[#A8C4E8] text-[11px] font-bold transition-all cursor-pointer border border-indigo-200/50 dark:border-[rgba(255,255,255,0.07)]"
                      title={currentLanguage.startsWith('pt') ? "Gerir contexto e factos lembrados da IA" : "Manage AI memory and context facts"}
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>{currentLanguage.startsWith('pt') ? "Memória IA" : "AI Memory"}</span>
                    </button>

                    <button
                      onClick={handleExportChat}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-[#1F3050] hover:bg-emerald-100/80 dark:hover:bg-[#2A4070] text-emerald-700 dark:text-[#A8C4E8] text-[11px] font-bold transition-all cursor-pointer border border-emerald-200/50 dark:border-[rgba(255,255,255,0.07)]"
                      title={currentLanguage.startsWith('pt') ? "Exportar conversa em formato texto" : "Export chat transcript"}
                    >
                      <Download className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{currentLanguage.startsWith('pt') ? "Exportar" : "Export"}</span>
                    </button>
                  </div>

                  {chatHistory.length > 0 && (
                    <button
                      onClick={() => setShowDeleteAllModal(true)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>{currentLanguage.startsWith('pt') ? "Eliminar Tudo Permanentemente" : "Delete All Permanently"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Viewport */}
              <div className="flex-1 flex flex-col bg-white dark:bg-[#0F1929] min-w-0 overflow-hidden relative">
                {/* Mobile Sub-Header for History Drawer & New Chat (Visible on mobile <768px) */}
                <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] bg-gray-50/90 dark:bg-[#0A1628] shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMobileHistoryOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2540] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] text-gray-800 dark:text-[#E8EDF5] text-xs font-bold shadow-2xs min-h-[38px] active:scale-95 transition-all cursor-pointer"
                      title={currentLanguage.startsWith('pt') ? "Abrir Histórico de Conversas" : "Open Chat History"}
                    >
                      <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{currentLanguage.startsWith('pt') ? "Conversas" : "History"}</span>
                      {chatHistory.length > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                          {chatHistory.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearCurrentChat}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-[#1B3A6B] text-indigo-700 dark:text-white border border-indigo-200/60 dark:border-blue-400/30 text-xs font-bold shadow-2xs min-h-[38px] active:scale-95 transition-all cursor-pointer"
                      title={currentLanguage.startsWith('pt') ? "Nova Conversa" : "New Conversation"}
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>{currentLanguage.startsWith('pt') ? "Nova" : "New"}</span>
                    </button>
                  </div>

                  <div className="text-right min-w-0 pl-2">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-[#A8C4E8] truncate max-w-[130px] block">
                      {activeHistoryId ? (chatHistory.find(h => h.id === activeHistoryId)?.title || "Conversa") : (currentLanguage.startsWith('pt') ? "Nova Conversa" : "New Chat")}
                    </span>
                  </div>
                </div>

                {/* Mobile History Slide-Over Drawer */}
                <AnimatePresence>
                  {isMobileHistoryOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex">
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileHistoryOpen(false)}
                        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                      />
                      {/* Drawer Panel */}
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                        className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-[#0A1628] flex flex-col shadow-2xl z-10 border-r border-gray-200 dark:border-[rgba(255,255,255,0.1)]"
                      >
                        {/* Drawer header */}
                        <div className="p-3.5 border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#E8EDF5] flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>{currentLanguage.startsWith('pt') ? "Conversas de IA" : "AI Conversations"}</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                handleClearCurrentChat();
                                setIsMobileHistoryOpen(false);
                              }}
                              className="p-2 rounded-xl bg-indigo-50 dark:bg-[#1F3050] text-indigo-600 dark:text-[#A8C4E8] hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 min-h-[38px] min-w-[38px] justify-center cursor-pointer"
                              title={currentLanguage.startsWith('pt') ? "Nova Conversa" : "New Chat"}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setIsMobileHistoryOpen(false)}
                              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1F3050] text-gray-500 dark:text-[#A8C4E8] min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                              title={currentLanguage.startsWith('pt') ? "Fechar" : "Close"}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="p-3 border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] space-y-2">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-[#6A82A8] absolute left-2.5 top-2.5" />
                            <input 
                              type="text"
                              placeholder={currentLanguage.startsWith('pt') ? "Pesquisar histórico..." : "Search conversations..."}
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-[#1A2540] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-[#E8EDF5] placeholder-gray-400 dark:placeholder-[#6A82A8]"
                            />
                          </div>

                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                            {['Todas', '#IVA', '#Balanço', '#Fiscal'].map(tag => (
                              <button
                                key={tag}
                                onClick={() => setSelectedTag(tag === 'Todas' ? null : tag)}
                                className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                                  (tag === 'Todas' && !selectedTag) || selectedTag === tag
                                    ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white shadow-2xs'
                                    : 'bg-gray-100 dark:bg-[#1F3050] text-gray-600 dark:text-[#A8C4E8] hover:bg-gray-200 dark:hover:bg-[#2A4070]'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Chat History List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                          {chatHistory
                            .filter(hist => {
                              const matchesSearch = !historySearchQuery || hist.title.toLowerCase().includes(historySearchQuery.toLowerCase());
                              const matchesTag = !selectedTag || hist.tag === selectedTag;
                              return matchesSearch && matchesTag;
                            })
                            .map(hist => {
                              const isActive = activeHistoryId === hist.id;
                              const isEditing = editingChatId === hist.id;
                              return (
                                <div 
                                  key={hist.id} 
                                  onClick={() => {
                                    if (!isEditing) {
                                      handleSelectHistoryItem(hist);
                                      setIsMobileHistoryOpen(false);
                                    }
                                  }}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left space-y-1 ${
                                    isActive 
                                      ? 'bg-indigo-50 dark:bg-[#1B3A6B] border-indigo-300 dark:border-indigo-400/50 shadow-2xs text-indigo-950 dark:text-white' 
                                      : 'bg-white dark:bg-[#1A2540]/60 hover:bg-gray-50 dark:hover:bg-[#1A2540] border-gray-200/70 dark:border-[rgba(255,255,255,0.07)] text-gray-800 dark:text-[#C8D4E8]'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="flex items-start gap-2 flex-1 min-w-0 pr-1">
                                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? 'text-indigo-600 dark:text-indigo-300 font-bold' : 'text-indigo-500/80 dark:text-[#A8C4E8]'}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${isActive ? 'text-indigo-950 dark:text-white' : 'text-gray-800 dark:text-[#E8EDF5]'}`}>
                                          {hist.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1 mt-1 text-[9.5px]">
                                          <span className="text-gray-400 dark:text-[#6A82A8] font-mono">📅 {hist.date || hist.timestamp}</span>
                                          {hist.standard && (
                                            <span className="px-1.5 py-0.2 rounded bg-indigo-100/80 dark:bg-[#1F3050] text-indigo-900 dark:text-[#A8C4E8] font-bold truncate max-w-[130px]">
                                              📜 {hist.standard.split(' ')[0]}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDeleteSingleModal(hist, e);
                                      }}
                                      className="p-1 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          {chatHistory.length === 0 && (
                            <div className="text-center py-8 text-gray-400 dark:text-[#6A82A8] text-xs font-sans">
                              {currentLanguage.startsWith('pt') ? "Nenhuma conversa gravada." : "No saved conversations."}
                            </div>
                          )}
                        </div>

                        {/* Drawer footer */}
                        <div className="p-3 border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)] bg-gray-50/50 dark:bg-[#0A1628] space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setShowMemoryModal(true);
                                setIsMobileHistoryOpen(false);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-[#1F3050] text-indigo-700 dark:text-[#A8C4E8] text-xs font-bold border border-indigo-200/50 min-h-[40px] cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>{currentLanguage.startsWith('pt') ? "Memória IA" : "AI Memory"}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleExportChat();
                                setIsMobileHistoryOpen(false);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-[#1F3050] text-emerald-700 dark:text-[#A8C4E8] text-xs font-bold border border-emerald-200/50 min-h-[40px] cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{currentLanguage.startsWith('pt') ? "Exportar" : "Export"}</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Chat bubble list */}
                <div id="chat_bubble_viewport" className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 overflow-x-hidden min-w-0 bg-white dark:bg-[#0F1929]">
                  {chatMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`group relative flex flex-col w-full max-w-[92%] sm:max-w-[85%] ${
                        msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      {/* EDIT MODE OR NORMAL MESSAGE BUBBLE */}
                      {editingMessageId === msg.id ? (
                        <div className="w-full space-y-2.5 bg-slate-900 border-2 border-indigo-500 p-3.5 rounded-2xl shadow-xl transition-all animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300 font-sans">
                            <span className="flex items-center gap-1">
                              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                              {currentLanguage.startsWith('pt') ? "A editar mensagem do utilizador..." : "Editing user message..."}
                            </span>
                            <span className="text-[10px] text-slate-400">Esc = {currentLanguage.startsWith('pt') ? "Cancelar" : "Cancel"} | Enter = {currentLanguage.startsWith('pt') ? "Guardar" : "Save"}</span>
                          </div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveAndResend(msg.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelEdit();
                              }
                            }}
                            autoFocus
                            rows={3}
                            className="w-full bg-slate-800 text-white placeholder-slate-400 text-xs rounded-xl p-2.5 px-3.5 border border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y min-h-[60px] max-h-[200px] font-sans"
                          />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{currentLanguage.startsWith('pt') ? "Cancelar" : "Cancel"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveAndResend(msg.id)}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{currentLanguage.startsWith('pt') ? "✓ Guardar e Reenviar" : "✓ Save and Resend"}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* HOVER ACTION BAR */}
                          <div className={`absolute -top-3.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 px-2 py-1 rounded-md shadow-lg ${
                            msg.sender === 'user' ? 'right-2' : 'left-2'
                          }`}>
                            {msg.sender === 'user' && (
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="text-[12px] font-medium text-white hover:text-indigo-300 hover:bg-slate-800 px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                                title={currentLanguage.startsWith('pt') ? "Editar mensagem" : "Edit message"}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{currentLanguage.startsWith('pt') ? "Editar" : "Edit"}</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleCopyText(msg.text)}
                              className="text-[12px] font-medium text-white hover:text-emerald-300 hover:bg-slate-800 px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                              title={currentLanguage.startsWith('pt') ? "Copiar mensagem" : "Copy message"}
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-300" />
                              <span>{currentLanguage.startsWith('pt') ? "Copiar" : "Copy"}</span>
                            </button>

                            <button
                              onClick={() => setDeletingMessageId(deletingMessageId === msg.id ? null : msg.id)}
                              className="text-[12px] font-medium text-white hover:text-rose-400 hover:bg-slate-800 px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                              title={currentLanguage.startsWith('pt') ? "Apagar mensagem" : "Delete message"}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>{currentLanguage.startsWith('pt') ? "Apagar" : "Delete"}</span>
                            </button>
                          </div>

                          {/* INLINE DELETE CONFIRMATION POPUP */}
                          {deletingMessageId === msg.id && (
                            <div className={`absolute top-0 z-30 p-3 bg-white border border-slate-200 rounded-xl shadow-xl animate-in zoom-in-95 duration-150 space-y-2 max-w-xs ${
                              msg.sender === 'user' ? 'right-0' : 'left-0'
                            }`}>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                <span>{currentLanguage.startsWith('pt') ? "🗑️ Apagar esta mensagem?" : "🗑️ Delete this message?"}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-snug font-sans">
                                {msg.sender === 'user' 
                                  ? (currentLanguage.startsWith('pt') ? "A resposta da IA associada também será removida." : "The corresponding AI response will also be removed.")
                                  : (currentLanguage.startsWith('pt') ? "Esta resposta da IA será removida." : "This AI response will be removed.")}
                              </p>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  onClick={() => setDeletingMessageId(null)}
                                  className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                                >
                                  {currentLanguage.startsWith('pt') ? "Cancelar" : "Cancel"}
                                </button>
                                <button
                                  onClick={() => handleDeleteMessageConfirm(msg.id)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-xs cursor-pointer"
                                >
                                  {currentLanguage.startsWith('pt') ? "Apagar" : "Delete"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* BUBBLE CONTENT */}
                          <div className={`p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed w-full max-w-full min-w-0 break-words [overflow-wrap:anywhere] ${
                            msg.sender === 'user' 
                              ? 'bg-slate-900 dark:bg-[#1B3A6B] text-white rounded-tr-none shadow-sm' 
                              : 'bg-gray-50 dark:bg-[#1A2540] text-gray-800 dark:text-[#E8EDF5] rounded-tl-none border border-gray-200/60 dark:border-[rgba(255,255,255,0.07)]'
                          }`}>
                            {msg.sender === 'assistant' ? (
                              <MarkdownRenderer content={msg.text} />
                            ) : (
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-full font-sans leading-relaxed text-slate-100">{msg.text}</p>
                            )}
                            
                            {/* Render diagram SVG inline if generated */}
                            {msg.diagramSvg && (
                              <div className="mt-3 bg-white p-2 rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-full">
                                <div className="text-[10px] text-gray-400 font-mono mb-1.5 flex justify-between items-center">
                                  <span>{currentLanguage.startsWith('pt') ? "Fluxograma Gerado por IA" : "AI Flowchart Render"}</span>
                                  <Volume2 className="w-3 h-3 text-indigo-500 cursor-pointer hover:text-indigo-700" onClick={() => showToast(currentLanguage.startsWith('pt') ? "Explicando em detalhe..." : "Explaining in detail...")} />
                                </div>
                                <div className="w-full overflow-x-auto scroll-smooth" dangerouslySetInnerHTML={{ __html: msg.diagramSvg }} />
                              </div>
                            )}

                            {/* Render Grounding Sources if present */}
                            {msg.groundingSources && msg.groundingSources.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200/60 flex flex-col gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 font-sans">
                                  <Globe className="w-3 h-3 text-indigo-500" />
                                  {currentLanguage.startsWith('pt') ? "Fontes Web Verificadas (Search Grounding):" : "Verified Search Grounding Sources:"}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.groundingSources.map((source, sIdx) => (
                                    <a 
                                      key={sIdx}
                                      href={source.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-2 py-1 rounded-md border border-slate-200 transition-all font-sans shadow-2xs"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                      <span className="truncate max-w-[180px]">{source.title}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* TIMESTAMP, MODEL, FEEDBACK & EDITED INDICATOR */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-400 px-1 font-mono">
                              {msg.timestamp}
                              {msg.isEdited && (
                                <span className="text-slate-400 text-[11px] italic font-sans ml-1">
                                  · {currentLanguage.startsWith('pt') ? "editado" : "edited"}
                                </span>
                              )}
                            </span>
                            {msg.modelUsed && (
                              <span className="text-[9px] font-mono uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 text-indigo-500" />
                                {msg.modelUsed}
                              </span>
                            )}

                            {/* Helpful / Not Helpful Feedback Buttons for AI Messages */}
                            {msg.sender === 'assistant' && (
                              <div className="flex items-center gap-1 ml-1 bg-gray-50 border border-gray-200/60 rounded-full px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleFeedback(msg.id, true)}
                                  className={`p-0.5 rounded hover:bg-emerald-100 transition-all cursor-pointer ${
                                    messageFeedbackMap[msg.id] === 'up' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-emerald-600'
                                  }`}
                                  title={currentLanguage.startsWith('pt') ? "Resposta útil" : "Helpful response"}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFeedback(msg.id, false)}
                                  className={`p-0.5 rounded hover:bg-rose-100 transition-all cursor-pointer ${
                                    messageFeedbackMap[msg.id] === 'down' ? 'text-rose-600 font-bold' : 'text-gray-400 hover:text-rose-600'
                                  }`}
                                  title={currentLanguage.startsWith('pt') ? "Resposta com incorreção" : "Inaccurate response"}
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {msg.suggestedActions?.map((act, i) => (
                              <button
                                key={i}
                                onClick={() => handleActionClick(act)}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-[10px] px-2.5 py-1 rounded-full transition-all flex items-center gap-1 font-medium font-sans cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                <span>{act.label}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {/* INLINE AI THINKING / LOADING INDICATOR */}
                  {loading && activeSubtab === 'chat' && (
                    <div className="group relative flex flex-col w-full max-w-[92%] sm:max-w-[85%] mr-auto items-start animate-in fade-in duration-200">
                      <div className="p-3.5 rounded-2xl rounded-tl-none bg-indigo-50/80 border border-indigo-200/60 text-indigo-950 text-xs flex items-center gap-3 shadow-xs">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                        <div>
                          <p className="font-bold font-sans text-indigo-900">
                            {currentLanguage.startsWith('pt') ? "IA Gemini a analisar e a formular resposta..." : "Gemini AI analyzing & formulating response..."}
                          </p>
                          <p className="text-[10px] text-indigo-600/80 font-mono mt-0.5">
                            {enableHighThinking 
                              ? (currentLanguage.startsWith('pt') ? "Modo Raciocínio Profundo ativo (3.1 Pro)..." : "High Thinking Mode active...") 
                              : (currentLanguage.startsWith('pt') ? "Norma: PGC Angola | Processando..." : "Standard: PGC Angola | Processing...")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Bottom Input Drawer */}
                <div className="p-3 border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)] bg-gray-50/50 dark:bg-[#0F1929] flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                    {/* Visual Explanation & AI Feature Toggles (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center gap-2 flex-wrap">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={visualExplanationMode}
                          onChange={(e) => setVisualExplanationMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 dark:bg-[#1A2540] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-slate-900 dark:peer-checked:bg-blue-600"></div>
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#A8C4E8] font-sans flex items-center gap-1">
                          <BarChart3 className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                          {currentLanguage.startsWith('pt') ? "Explicação Visual" : "Visual Mode"}
                        </span>
                      </label>

                      {/* Search Grounding Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchGroundingEnabled(!isSearchGroundingEnabled);
                          showToast(isSearchGroundingEnabled ? "Search Grounding desativado." : "Search Grounding (Google Web Data) ativado!");
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-all ${
                          isSearchGroundingEnabled
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-[#1F3050] text-gray-600 dark:text-[#A8C4E8] border border-gray-200 dark:border-[rgba(255,255,255,0.07)] hover:bg-gray-100 dark:hover:bg-[#2A4070]'
                        }`}
                      >
                        <Globe className="w-3 h-3" />
                        <span>Search Grounding</span>
                      </button>

                      {/* High Thinking Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setEnableHighThinking(!enableHighThinking);
                          showToast(enableHighThinking ? "High Thinking Mode desativado." : "High Thinking Mode (Gemini 3.1 Pro) ativado!");
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-all ${
                          enableHighThinking
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white dark:bg-[#1F3050] text-gray-600 dark:text-[#A8C4E8] border border-gray-200 dark:border-[rgba(255,255,255,0.07)] hover:bg-gray-100 dark:hover:bg-[#2A4070]'
                        }`}
                      >
                        <Brain className="w-3 h-3" />
                        <span>High Thinking (3.1 Pro)</span>
                      </button>
                    </div>

                    {isRecording ? (
                      <span className="text-[10px] font-mono text-red-600 dark:text-red-400 font-bold flex items-center gap-1 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full animate-pulse border border-red-200 dark:border-red-900/40">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        <Mic className="w-3 h-3 text-red-600 dark:text-red-400" />
                        {currentLanguage.startsWith('pt') ? `A ditar por voz (${recordingTime}s)...` : `Dictating audio (${recordingTime}s)...`}
                      </span>
                    ) : isTranscribingAudio ? (
                      <span className="text-[10px] font-mono text-indigo-700 dark:text-[#A8C4E8] font-bold flex items-center gap-1 bg-indigo-50 dark:bg-[#1F3050] px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-[rgba(255,255,255,0.07)] animate-pulse">
                        <Loader2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        {currentLanguage.startsWith('pt') ? "A converter áudio em texto..." : "Transcribing audio to text..."}
                      </span>
                    ) : (
                      <span className="hidden sm:inline text-[10px] text-gray-400 dark:text-[#6A82A8] font-sans italic">
                        {currentLanguage.startsWith('pt') ? "Gemini 3.5 Flash + Grounding + Entrada por Voz" : "Gemini 3.5 Flash + Search Grounding + Voice Input"}
                      </span>
                    )}
                  </div>

                  {/* Document Extraction Progress Indicator */}
                  {isExtractingDoc && (
                    <div className="p-3 bg-indigo-50 dark:bg-[#1A2540] border border-indigo-200/80 dark:border-[rgba(255,255,255,0.1)] rounded-xl space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-[#E8EDF5]">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                          <span>{docExtractionStep || (currentLanguage.startsWith('pt') ? "A extrair documento..." : "Extracting document...")}</span>
                        </span>
                        <span className="font-mono">{docExtractionProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-indigo-200/80 dark:bg-[#1F3050] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-300"
                          style={{ width: `${docExtractionProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* QUICK ACTION CHIPS - Responsive Horizontal Scrollable Row */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 scroll-smooth">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#6A82A8] shrink-0 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="hidden sm:inline">{currentLanguage.startsWith('pt') ? "Ações Rápidas:" : "Quick Actions:"}</span>
                    </span>
                    {[
                      { 
                        label: currentLanguage.startsWith('pt') ? 'Explicar conceito' : 'Explain concept', 
                        icon: Sparkles, 
                        prefix: currentLanguage.startsWith('pt') ? 'Explica de forma simples e didática o conceito de: ' : 'Explain clearly the concept of: ' 
                      },
                      { 
                        label: currentLanguage.startsWith('pt') ? 'Lançamento Contabilístico' : 'Accounting Entry', 
                        icon: Calculator, 
                        prefix: currentLanguage.startsWith('pt') ? 'Qual é o lançamento contabilístico no PGC Angola (Débito/Credito) para: ' : 'What is the journal entry (Debit/Credit) for: ' 
                      },
                      { 
                        label: currentLanguage.startsWith('pt') ? 'Gerar exercício prático' : 'Generate exercise', 
                        icon: HelpCircle, 
                        prefix: currentLanguage.startsWith('pt') ? 'Cria um exercício prático contabilístico com resolução explicada sobre: ' : 'Create a practical exercise with step-by-step resolution on: ' 
                      },
                      { 
                        label: currentLanguage.startsWith('pt') ? 'Resumir tópico' : 'Summarize topic', 
                        icon: FileText, 
                        prefix: currentLanguage.startsWith('pt') ? 'Faz um resumo estruturado em tópicos dos pontos essenciais sobre: ' : 'Provide a bulleted summary of key points on: ' 
                      },
                      { 
                        label: currentLanguage.startsWith('pt') ? 'Análise de Rácios' : 'Ratio Analysis', 
                        icon: BarChart3, 
                        prefix: currentLanguage.startsWith('pt') ? 'Como calcular e interpretar os rácios de liquidez/solvabilidade para: ' : 'How to calculate & interpret financial ratios for: ' 
                      },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const baseClean = chatInput.replace(/^(Explica|Explain|Cria|Create|Faz|Provide|Qual|What|Como|How).+?: /, '');
                          setChatInput(chip.prefix + baseClean);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs sm:text-[10px] font-bold bg-white dark:bg-[#1F3050] hover:bg-indigo-50 dark:hover:bg-[#2A4070] text-indigo-700 dark:text-[#A8C4E8] hover:text-indigo-900 dark:hover:text-white border border-indigo-200/80 dark:border-[rgba(255,255,255,0.07)] transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs group min-h-[36px] whitespace-nowrap"
                      >
                        <chip.icon className="w-3.5 h-3.5 text-indigo-500 dark:text-[#A8C4E8] group-hover:scale-110 transition-transform shrink-0" />
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>

                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                    className="flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-[#1A2540] rounded-2xl border border-gray-200 dark:border-[rgba(255,255,255,0.1)] p-1.5 shadow-sm focus-within:border-indigo-500 dark:focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all"
                  >
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={currentLanguage.startsWith('pt') ? "Pergunte à IA ou grave áudio com o microfone..." : "Ask AI accountant or record voice with mic..."}
                      className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-xs text-gray-800 dark:text-[#E8EDF5] placeholder-gray-400 dark:placeholder-[#6A82A8] focus:outline-none font-sans min-w-0"
                    />

                    {/* Hidden Document File Input */}
                    <input 
                      type="file" 
                      ref={chatDocFileInputRef} 
                      onChange={handleChatDocUpload} 
                      accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.txt,.csv" 
                      className="hidden" 
                    />

                    {/* Document Upload Button */}
                    <button
                      type="button"
                      onClick={() => chatDocFileInputRef.current?.click()}
                      disabled={isExtractingDoc}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-indigo-50 dark:bg-[#1F3050] text-indigo-700 dark:text-[#A8C4E8] hover:bg-indigo-100 dark:hover:bg-[#2A4070] rounded-xl transition-all cursor-pointer border border-indigo-200/50 dark:border-[rgba(255,255,255,0.07)] shrink-0"
                      title={currentLanguage.startsWith('pt') ? "Anexar documento (PDF, Excel, Word, Imagem)" : "Attach document (PDF, Excel, Word, Image)"}
                    >
                      {isExtractingDoc ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-indigo-600 dark:text-[#A8C4E8]" />
                      )}
                    </button>

                    {/* Microphone Recording Affordance */}
                    <button
                      type="button"
                      disabled={isTranscribingAudio}
                      onClick={() => {
                        if (isRecording) {
                          stopRecording();
                        } else {
                          startRecording(setChatInput);
                        }
                      }}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${
                        isRecording
                          ? 'bg-red-600 text-white animate-pulse shadow-md ring-2 ring-red-400'
                          : isTranscribingAudio
                            ? 'bg-indigo-100 dark:bg-[#1F3050] text-indigo-700 dark:text-[#A8C4E8] cursor-wait'
                            : 'bg-gray-100 dark:bg-[#1F3050] text-gray-700 dark:text-[#A8C4E8] hover:bg-gray-200 dark:hover:bg-[#2A4070]'
                      }`}
                      title={
                        isRecording 
                          ? (currentLanguage.startsWith('pt') ? "Parar gravação de voz" : "Stop recording voice")
                          : isTranscribingAudio
                            ? (currentLanguage.startsWith('pt') ? "A transcrever..." : "Transcribing...")
                            : (currentLanguage.startsWith('pt') ? "Ditar por voz (Microfone)" : "Dictate query with microphone")
                      }
                    >
                      {isTranscribingAudio ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                      ) : isRecording ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>

                    {/* Send Button */}
                    <button 
                      type="submit"
                      disabled={loading || !chatInput.trim()}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-900 dark:bg-[#1B3A6B] text-white rounded-xl hover:bg-slate-800 dark:hover:bg-[#2E5FA3] disabled:opacity-40 transition-all cursor-pointer shrink-0 shadow-xs"
                      title={currentLanguage.startsWith('pt') ? "Enviar mensagem" : "Send message"}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. WORD DOCUMENT GENERATOR TAB */}
          {activeSubtab === 'word' && (
            <motion.div 
              key="word_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
            >
              {/* Left Config Panel */}
              <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 p-4 space-y-4 bg-gray-50/50 overflow-y-auto shrink-0 ${
                showMobileWordConfig ? 'block' : 'hidden md:block'
              }`}>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1 font-sans">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    {currentLanguage.startsWith('pt') ? "Gerador de Documentos Word IA" : "AI Word Document Generator"}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {currentLanguage.startsWith('pt') ? "Gere qualquer relatório, ensaio, contrato, ficha de estudo ou parecer sem limitações." : "Generate any report, essay, agreement, brief, or paper without restrictions."}
                  </p>
                </div>

                {/* Official PGC Angola Card */}
                <div className="p-3 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-xl space-y-2 border border-blue-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-200">
                      <Scale className="w-4 h-4 text-blue-400" />
                      <span>{currentLanguage.startsWith('pt') ? "Demonstrações PGC (Word)" : "Official PGC Statements"}</span>
                    </div>
                    <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded border border-blue-400/40 font-mono">Dec. 82/2001</span>
                  </div>
                  <p className="text-[10px] text-blue-100/90 leading-tight">
                    {currentLanguage.startsWith('pt') 
                      ? "Gera os Mapas Oficiais (Balanço, DRE, Fluxos, CP e Notas) a partir dos seus lançamentos em formato Word (.docx)." 
                      : "Generates official Balance Sheet, Income, Cash Flow, and Notes in Word (.docx) from accounting entries."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPgcModalOpen(true)}
                    className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{currentLanguage.startsWith('pt') ? "Gerar Mapas PGC (.docx)" : "Generate PGC Maps (.docx)"}</span>
                  </button>
                </div>

                {/* Inspiration Chips */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                    {currentLanguage.startsWith('pt') ? "Ideias de Documentos" : "Document Ideas"}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: currentLanguage.startsWith('pt') ? 'Mapas PGC (Dec. 82/2001)' : 'Official PGC Maps', text: 'Mapas oficiais completos das Demonstrações Financeiras do PGC Angola (Decreto n.º 82/2001): Balanço Vertical, Demonstração de Resultados por Natureza, Fluxos de Caixa, Variações de Capital Próprio e Notas explicativas.' },
                      { label: currentLanguage.startsWith('pt') ? 'Relatório de Auditoria' : 'Audit Report', text: 'Relatório detalhado de auditoria financeira com parecer e recomendações.' },
                      { label: currentLanguage.startsWith('pt') ? 'Contrato de Serviços' : 'Services Agreement', text: 'Contrato prestação de serviços profissionais com cláusulas de confidencialidade e prazos.' },
                      { label: currentLanguage.startsWith('pt') ? 'Ensaio Académico' : 'Academic Essay', text: 'Ensaio académico estruturado com introdução, enquadramento teórico e conclusões.' },
                      { label: currentLanguage.startsWith('pt') ? 'Ficha de Estudo / Resumo' : 'Study Guide', text: 'Ficha de resumo de estudo com definições, conceitos-chave e exercícios.' },
                      { label: currentLanguage.startsWith('pt') ? 'Parecer Jurídico-Fiscal' : 'Tax & Legal Opinion', text: 'Parecer técnico sobre obrigações fiscais e enquadramento legislativo.' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => setWordPrompt(chip.text)}
                        className="text-[9px] bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 px-2 py-1 rounded-md transition-all font-sans cursor-pointer"
                      >
                        + {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Instruction Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                      {currentLanguage.startsWith('pt') ? "Descrição Livre do Documento" : "Document Free-Text Description"}
                    </label>
                    <button
                      type="button"
                      disabled={isTranscribingAudio}
                      onClick={() => {
                        if (isRecording) {
                          stopRecording();
                        } else {
                          startRecording(setWordPrompt);
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        isRecording 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                      title="Ditar descrição por voz"
                    >
                      {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      <span>{isRecording ? 'A gravar...' : 'Ditar com Voz'}</span>
                    </button>
                  </div>
                  <textarea 
                    value={wordPrompt}
                    onChange={(e) => setWordPrompt(e.target.value)}
                    placeholder={currentLanguage.startsWith('pt') ? "Descreva exatamente o documento que quer criar... Pode ser um relatório, ensaio académico, contrato, minuta legal, ficha de estudo, parecer fiscal, trabalho científico ou qualquer outro tipo de texto." : "Describe exactly the document you want to create... Academic essay, legal contract, audit brief, study guide, research paper, policy document, etc."}
                    className="w-full bg-white border border-gray-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-400 h-36 resize-none font-sans"
                  />
                </div>

                <button
                  onClick={() => handleGenerateWord(false)}
                  disabled={loading}
                  className="w-full bg-slate-950 text-white hover:bg-slate-800 text-xs py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentLanguage.startsWith('pt') ? "Gerar Relatório" : "Generate Report"}</span>
                </button>
              </div>

              {/* Right Viewport (High-fidelity A4 page preview) */}
              <div className={`flex-1 bg-gray-100 p-3 sm:p-4 overflow-y-auto flex-col items-center relative ${
                !showMobileWordConfig ? 'flex' : 'hidden md:flex'
              }`}>
                {/* Mobile Back-to-Config button */}
                <button
                  onClick={() => setShowMobileWordConfig(true)}
                  className="md:hidden w-full max-w-2xl mb-3 bg-white border border-gray-200 text-slate-800 text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-between shadow-xs cursor-pointer hover:bg-gray-50 shrink-0"
                >
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{currentLanguage.startsWith('pt') ? "⚙️ Editar Parâmetros do Documento" : "⚙️ Edit Document Settings"}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {wordDocument ? (
                  <div className="w-full max-w-2xl space-y-4 pb-12">
                    {/* Floating Controls */}
                    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border border-gray-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                      <span className="text-xs text-slate-500 font-mono truncate mr-2">{currentLanguage.startsWith('pt') ? "Modo de Pré-visualização Word" : "Word Live Print Preview"}</span>
                      <button 
                        onClick={downloadWordDoc}
                        className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-800 transition-all font-semibold cursor-pointer shadow-sm shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{currentLanguage.startsWith('pt') ? "Baixar .docx" : "Download .docx"}</span>
                      </button>
                    </div>

                    {/* Styled A4 sheet wrapper */}
                    <div className="bg-white border border-gray-200/80 rounded-sm shadow-md p-12 min-h-[700px] text-left font-sans text-xs text-gray-700 relative overflow-hidden leading-relaxed">
                      {/* Decorative border line */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
                      
                      {/* Header */}
                      <div className="border-b border-gray-200 pb-3 mb-6 flex justify-between items-end">
                        <div>
                          <p className="text-lg font-bold tracking-tight text-gray-900 uppercase font-sans">{wordDocument.title}</p>
                          <p className="text-[10px] text-gray-400 font-sans tracking-wide">{wordDocument.subtitle}</p>
                        </div>
                        <p className="text-[9px] text-right font-mono text-gray-400">
                          {currentLanguage.startsWith('pt') ? "GERADO POR INTELIGÊNCIA ARTIFICIAL" : "GENERATED BY GLOBAL ACCOUNT AI"}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-3 gap-2 bg-gray-50 border border-gray-100 p-3 rounded-lg mb-6 font-mono text-[9px] text-gray-500">
                        <div><strong className="text-slate-800">AUTHOR:</strong> {wordDocument.metadata.author}</div>
                        <div><strong className="text-slate-800">DATE:</strong> {wordDocument.metadata.date}</div>
                        <div><strong className="text-slate-800">VERSION:</strong> {wordDocument.metadata.version}</div>
                      </div>

                      {/* Content sections */}
                      <div className="space-y-6">
                        {wordDocument.sections.map((sec, idx) => (
                          <div key={idx} className="space-y-2.5">
                            <h4 className="text-xs font-semibold text-slate-900 border-b border-gray-100 pb-1 font-sans">{sec.heading}</h4>
                            {sec.paragraphs.map((p, pidx) => (
                              <p key={pidx} className="text-gray-600 font-sans">{p}</p>
                            ))}
                            {sec.listItems && (
                              <ul className="list-disc pl-5 space-y-1 text-gray-600 font-sans">
                                {sec.listItems.map((li, lidx) => (
                                  <li key={lidx}>{li}</li>
                                ))}
                              </ul>
                            )}
                            {sec.table && (
                              <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                                <table className="w-full text-[10px] text-left text-gray-500">
                                  <thead className="text-[9px] text-slate-700 uppercase bg-slate-50 border-b border-gray-200">
                                    <tr>
                                      {sec.table.headers.map((h, hidx) => (
                                        <th key={hidx} className="px-3 py-2 font-mono">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {sec.table.rows.map((row, rowidx) => (
                                      <tr key={rowidx} className="hover:bg-gray-50/50">
                                        {row.map((cell, cellidx) => (
                                          <td key={cellidx} className={`px-3 py-2 font-sans ${cellidx > 0 ? 'text-right' : ''}`}>{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edit Section Prompts Widget */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-2.5">
                      <div className="flex items-center gap-1">
                        <Edit3 className="w-4 h-4 text-slate-800" />
                        <span className="text-xs font-semibold text-slate-800 font-sans">{currentLanguage.startsWith('pt') ? "Refinar Secção com IA" : "Refine Document with IA"}</span>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={wordEditPrompt}
                          onChange={(e) => setWordEditPrompt(e.target.value)}
                          placeholder={currentLanguage.startsWith('pt') ? "Ex: 'Reformula o parágrafo 2', 'Adiciona uma conclusão'..." : "Ex: 'Add a section with audit recommendations'..."}
                          className="flex-1 bg-gray-50 border border-gray-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-slate-400 font-sans"
                        />
                        <button 
                          onClick={() => handleGenerateWord(true)}
                          disabled={loading || !wordEditPrompt.trim()}
                          className="bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          {currentLanguage.startsWith('pt') ? "Aplicar" : "Apply"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm">
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
                      <FileText className="w-8 h-8 text-slate-300 animate-pulse" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">{currentLanguage.startsWith('pt') ? "Nenhum Relatório Gerado" : "No Report Generated"}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {currentLanguage.startsWith('pt') ? "Defina os parâmetros do documento e clique em 'Gerar Relatório' no painel lateral." : "Fill the parameters and prompt in the left sidebar, then click Generate."}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 3. EXCEL SPREADSHEET GENERATOR TAB */}
          {activeSubtab === 'excel' && (
            <motion.div 
              key="excel_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col md:flex-row"
            >
              {/* Left Config Panel */}
              <div className="w-full md:w-80 border-r border-gray-100 p-4 space-y-4 bg-gray-50/30 overflow-y-auto">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1 font-sans">
                    <Grid className="w-4 h-4 text-emerald-500" />
                    {currentLanguage.startsWith('pt') ? "Modelador Excel IA" : "AI Excel Spreadsheet Modeler"}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {currentLanguage.startsWith('pt') ? "Crie qualquer planilha, tabela com fórmulas, orçamentos ou simuladores sem limitações." : "Generate any spreadsheet, financial model, or calculated log without limits."}
                  </p>
                </div>

                {/* Official PGC Angola Excel Card */}
                <div className="p-3 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-xl space-y-2 border border-emerald-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-200">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span>{currentLanguage.startsWith('pt') ? "Demonstrações PGC (Excel)" : "Official PGC Statements"}</span>
                    </div>
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-400/40 font-mono">Dec. 82/2001</span>
                  </div>
                  <p className="text-[10px] text-emerald-100/90 leading-tight">
                    {currentLanguage.startsWith('pt') 
                      ? "Gera os Mapas Oficiais com fórmulas automáticas de soma e validação de fecho em Excel (.xlsx)." 
                      : "Generates official Balance Sheet, Income, Cash Flow, and Equity sheets in Excel (.xlsx) with formulas."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPgcModalOpen(true)}
                    className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{currentLanguage.startsWith('pt') ? "Gerar Mapas PGC (.xlsx)" : "Generate PGC Maps (.xlsx)"}</span>
                  </button>
                </div>

                {/* Inspiration Chips */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                    {currentLanguage.startsWith('pt') ? "Ideias de Planilhas" : "Spreadsheet Ideas"}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: currentLanguage.startsWith('pt') ? 'Mapas PGC (Dec. 82/2001)' : 'Official PGC Maps', text: 'Mapas oficiais completos das Demonstrações Financeiras do PGC Angola em Excel: Balanço, DRE por Natureza, Fluxos de Caixa e Variações de Capital Próprio com fórmulas de verificação de fecho e colunas comparativas.' },
                      { label: currentLanguage.startsWith('pt') ? 'Orçamento Anual' : 'Annual Budget', text: 'Planilha de orçamento anual consolidado por departamento com totais e médias.' },
                      { label: currentLanguage.startsWith('pt') ? 'Folha de Pagamento' : 'Payroll Sheet', text: 'Folha de pagamento mensal com salários brutos, descontos de impostos e líquido final.' },
                      { label: currentLanguage.startsWith('pt') ? 'Simulador de Empréstimo' : 'Loan Simulator', text: 'Simulador de amortização de empréstimo com taxa de juro, prestação mensal e saldo devedor.' },
                      { label: currentLanguage.startsWith('pt') ? 'Controlo de Stock' : 'Inventory Log', text: 'Controlo de inventário e stock com quantidade, preço unitário, valor total e alerta de reposição.' },
                      { label: currentLanguage.startsWith('pt') ? 'Cálculo de Impostos' : 'Tax Calculator', text: 'Planilha de apuramento de impostos (IVA, IRC/IRS) com dedutibilidade e saldo a pagar.' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => setExcelPrompt(chip.text)}
                        className="text-[9px] bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-700 px-2 py-1 rounded-md transition-all font-sans cursor-pointer"
                      >
                        + {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Instruction Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                      {currentLanguage.startsWith('pt') ? "Descrição Livre da Planilha" : "Spreadsheet Free-Text Description"}
                    </label>
                    <button
                      type="button"
                      disabled={isTranscribingAudio}
                      onClick={() => {
                        if (isRecording) {
                          stopRecording();
                        } else {
                          startRecording(setExcelPrompt);
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        isRecording 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title="Ditar descrição por voz"
                    >
                      {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      <span>{isRecording ? 'A gravar...' : 'Ditar com Voz'}</span>
                    </button>
                  </div>
                  <textarea 
                    value={excelPrompt}
                    onChange={(e) => setExcelPrompt(e.target.value)}
                    placeholder={currentLanguage.startsWith('pt') ? "Descreva exatamente a planilha que quer criar... Qualquer tabela, cálculo de custos, simulador de juros, folha de pagamento, balancete, pauta académica de notas, inventário ou modelo científico." : "Describe exactly the spreadsheet you want to create... Any table, budget, loan simulator, payroll, grade log, inventory tracker, tax sheet, scientific model, etc."}
                    className="w-full bg-white border border-gray-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-400 h-36 resize-none font-sans"
                  />
                </div>

                <button
                  onClick={() => handleGenerateExcel(false)}
                  disabled={loading}
                  className="w-full bg-slate-950 text-white hover:bg-slate-800 text-xs py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentLanguage.startsWith('pt') ? "Gerar Planilha" : "Generate Spreadsheet"}</span>
                </button>
              </div>

              {/* Right Viewport (Spreadsheet editor grid) */}
              <div className="flex-1 bg-gray-100 p-4 overflow-y-auto flex flex-col items-center">
                {excelSheet ? (
                  <div className="w-full max-w-4xl space-y-4">
                    {/* Floating Controls */}
                    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-800 font-sans">{excelSheet.title}</span>
                      </div>
                      <button 
                        onClick={downloadExcelSheet}
                        className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-700 transition-all font-semibold cursor-pointer shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{currentLanguage.startsWith('pt') ? "Baixar .xlsx" : "Download .xlsx"}</span>
                      </button>
                    </div>

                    {/* Render Excel Grid Sheet */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden text-xs font-sans text-gray-700">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <tbody>
                            {excelSheet.grid.map((row, rIdx) => (
                              <tr key={rIdx} className="divide-x divide-gray-150">
                                {/* Letter coordinates row */}
                                {row.map((cell, cIdx) => (
                                  <td 
                                    key={cIdx} 
                                    style={{
                                      backgroundColor: cell.bgColor || (rIdx === 0 ? '#1E293B' : undefined),
                                      color: cell.textColor || (rIdx === 0 ? '#FFFFFF' : undefined),
                                      fontWeight: cell.isBold || rIdx === 0 ? 'bold' : 'normal',
                                      textAlign: cell.align || 'left'
                                    }}
                                    className={`px-4 py-2 border-b border-gray-200 ${
                                      rIdx === 0 ? 'text-[10px] tracking-wide uppercase font-mono' : ''
                                    }`}
                                  >
                                    <div className="relative group">
                                      {/* Format display */}
                                      <span>
                                        {cell.format === 'currency' && !isNaN(parseFloat(cell.value))
                                          ? `$ ${parseFloat(cell.value).toLocaleString()}`
                                          : cell.format === 'percentage' && !isNaN(parseFloat(cell.value))
                                          ? `${(parseFloat(cell.value) * 100).toFixed(1)}%`
                                          : cell.value}
                                      </span>

                                      {/* Show formula indicator tooltip */}
                                      {cell.formula && (
                                        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-indigo-500 rounded-full" title={`Formula: ${cell.formula}`} />
                                      )}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Edit Spreadsheet & Calculations Prompt Box */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-2.5">
                      <div className="flex items-center gap-1">
                        <Edit3 className="w-4 h-4 text-slate-800" />
                        <span className="text-xs font-semibold text-slate-800 font-sans">{currentLanguage.startsWith('pt') ? "Solicitar Ajustes & Recalcular Contas" : "Ask Spreadsheet Adjustment"}</span>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={excelEditPrompt}
                          onChange={(e) => setExcelEditPrompt(e.target.value)}
                          placeholder={currentLanguage.startsWith('pt') ? "Ex: 'Adiciona uma linha para IRC com taxa de 21%', 'Cria uma coluna de variação'..." : "Ex: 'Add a new row with 23% VAT rates calculated dynamically'..."}
                          className="flex-1 bg-gray-50 border border-gray-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-slate-400 font-sans"
                        />
                        <button 
                          onClick={() => handleGenerateExcel(true)}
                          disabled={loading || !excelEditPrompt.trim()}
                          className="bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          {currentLanguage.startsWith('pt') ? "Executar" : "Execute"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm">
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
                      <Grid className="w-8 h-8 text-slate-300 animate-pulse" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">{currentLanguage.startsWith('pt') ? "Planilha em Branco" : "No Spreadsheet Active"}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {currentLanguage.startsWith('pt') ? "Selecione o template de contas no painel lateral e carregue em 'Gerar Planilha'." : "Customize row layout on the left panel and click Generate."}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 4. VISUALIZATIONS GENERATOR TAB */}
          {activeSubtab === 'visualization' && (
            <motion.div 
              key="vis_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col md:flex-row"
            >
              {/* Left Config Panel */}
              <div className="w-full md:w-80 border-r border-gray-100 p-4 space-y-4 bg-gray-50/30 overflow-y-auto flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1 font-sans">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      {currentLanguage.startsWith('pt') ? "Criador de Visualizações e Infográficos IA" : "AI Visualizations & Infographics"}
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {currentLanguage.startsWith('pt') ? "Gere qualquer diagrama, fluxograma, mapa mental, pirâmide ou gráfico sem limitações." : "Generate any diagram, flowchart, mind map, pyramid, or chart without limits."}
                    </p>
                  </div>

                  {/* Visual suggestion chips */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                      {currentLanguage.startsWith('pt') ? "Ideias de Visualização" : "Visualization Ideas"}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: currentLanguage.startsWith('pt') ? 'Fluxograma de Processo' : 'Process Flowchart', prompt: 'Fluxograma horizontal detalhado de etapas de aprovação e decisão.' },
                        { label: currentLanguage.startsWith('pt') ? 'Mapa Mental' : 'Mind Map', prompt: 'Mapa mental concêntrico com nó central e ramificações detalhadas.' },
                        { label: currentLanguage.startsWith('pt') ? 'Organograma' : 'Org Chart', prompt: 'Organograma hierárquico com direção, departamentos e equipas.' },
                        { label: currentLanguage.startsWith('pt') ? 'Pirâmide de Níveis' : 'Pyramid Diagram', prompt: 'Pirâmide com 4 níveis hierárquicos coloridos e rótulos explicativos.' },
                        { label: currentLanguage.startsWith('pt') ? 'Gráfico de Barras / Linha' : 'Bar / Line Chart', prompt: 'Gráfico de barras e tendência comparativo de desempenho e evolução.' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setVisPrompt(item.prompt)}
                          className="text-[9px] bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 px-2 py-1 rounded-md transition-all font-sans cursor-pointer"
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Input Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                      {currentLanguage.startsWith('pt') ? "Descrição Livre do Gráfico/Diagrama" : "Free-Text Visualization Description"}
                    </label>
                    <textarea 
                      value={visPrompt}
                      onChange={(e) => setVisPrompt(e.target.value)}
                      placeholder={currentLanguage.startsWith('pt') ? "Descreva exatamente a visualização que deseja criar... Qualquer fluxograma, mapa mental, pirâmide hierárquica, organograma, ciclo de processos, infográfico científico ou gráfico de qualquer tipo." : "Describe exactly the visual you want to create... Any flowchart, mind map, hierarchy pyramid, org chart, cycle diagram, scientific infographic, or chart."}
                      className="w-full bg-white border border-gray-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-400 h-36 resize-none font-sans"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateVisualization}
                  disabled={loading || !visPrompt.trim()}
                  className="w-full bg-slate-950 text-white hover:bg-slate-800 text-xs py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentLanguage.startsWith('pt') ? "Gerar Imagem" : "Generate Visual"}</span>
                </button>
              </div>

              {/* Right Viewport (Vector viewer) */}
              <div className="flex-1 bg-gray-100 p-4 overflow-y-auto flex flex-col items-center">
                {visData ? (
                  <div className="w-full max-w-4xl space-y-4">
                    {/* Floating Controls */}
                    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-all cursor-pointer"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono font-medium text-slate-700">{Math.round(zoomLevel * 100)}%</span>
                        <button 
                          onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.2))}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-all cursor-pointer"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={copySvgToClipboard}
                          className="bg-slate-100 text-slate-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-200 transition-all font-semibold cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{currentLanguage.startsWith('pt') ? "Copiar SVG" : "Copy SVG"}</span>
                        </button>
                        <button 
                          onClick={() => {
                            const blob = new Blob([visData.svgMarkup || ''], { type: 'image/svg+xml' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'AI_Accounting_Diagram.svg';
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-800 transition-all font-semibold cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{currentLanguage.startsWith('pt') ? "Baixar SVG" : "Download SVG"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Responsive Canvas */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex justify-center items-center overflow-auto min-h-[450px]">
                      <div 
                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                        className="transition-all duration-300 ease-out w-full max-w-2xl shrink-0"
                        dangerouslySetInnerHTML={{ __html: visData.svgMarkup || '' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm">
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
                      <BarChart3 className="w-8 h-8 text-slate-300 animate-pulse" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">{currentLanguage.startsWith('pt') ? "Nenhum Diagrama" : "No Diagram Generated"}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {currentLanguage.startsWith('pt') ? "Descreva o fluxograma, pirâmide ou organograma contável e clique em 'Gerar Imagem'." : "Choose a template suggestion or describe your diagram layout to begin."}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 5. POWERPOINT GENERATOR TAB */}
          {activeSubtab === 'powerpoint' && (
            <motion.div 
              key="ppt_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col md:flex-row"
            >
              {/* Left Panel */}
              <div className="w-full md:w-80 border-r border-gray-100 p-4 space-y-4 bg-gray-50/30 overflow-y-auto">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1 font-sans">
                    <Presentation className="w-4 h-4 text-indigo-500" />
                    {currentLanguage.startsWith('pt') ? "Apresentador PowerPoint IA" : "AI PowerPoint Presentation Deck"}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {currentLanguage.startsWith('pt') ? "Gere qualquer apresentação de slides, aulas, trabalhos, propostas ou relatórios sem limitações." : "Generate any slide presentation, lecture, pitch deck, or report without limits."}
                  </p>
                </div>

                {/* Inspiration Chips */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                    {currentLanguage.startsWith('pt') ? "Ideias de Apresentação" : "Presentation Ideas"}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: currentLanguage.startsWith('pt') ? 'Aula / Trabalho Académico' : 'Lecture / Class Deck', text: 'Apresentação académica sobre fundamentos de finanças e economia com slides explicativos.' },
                      { label: currentLanguage.startsWith('pt') ? 'Pitch Deck de Negócio' : 'Business Pitch Deck', text: 'Pitch deck comercial para investidores cobrindo problema, solução, mercado e projeções.' },
                      { label: currentLanguage.startsWith('pt') ? 'Proposta Comercial' : 'Commercial Proposal', text: 'Proposta de prestação de serviços com etapas de implementação, entregáveis e honorários.' },
                      { label: currentLanguage.startsWith('pt') ? 'Relatório de Administração' : 'Executive Board Deck', text: 'Apresentação executiva de resultados trimestrais com KPIs, margens e estratégia.' },
                      { label: currentLanguage.startsWith('pt') ? 'Módulo de Formação' : 'Training Module', text: 'Apresentação de formação técnica sobre novos procedimentos operacionais e conformidade.' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPptPrompt(chip.text)}
                        className="text-[9px] bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 px-2 py-1 rounded-md transition-all font-sans cursor-pointer"
                      >
                        + {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Instruction Prompt */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">
                    {currentLanguage.startsWith('pt') ? "Descrição Livre da Apresentação" : "Presentation Free-Text Description"}
                  </label>
                  <textarea 
                    value={pptPrompt}
                    onChange={(e) => setPptPrompt(e.target.value)}
                    placeholder={currentLanguage.startsWith('pt') ? "Descreva exatamente a apresentação de slides que pretende criar... Qualquer aula, trabalho escolar, relatório executivo, proposta comercial, pitch deck de negócio ou módulo de formação." : "Describe exactly the slide presentation you want to create... Academic lecture, student presentation, executive board deck, sales pitch, training module, etc."}
                    className="w-full bg-white border border-gray-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-400 h-36 resize-none font-sans"
                  />
                </div>

                <button
                  onClick={handleGeneratePpt}
                  disabled={loading}
                  className="w-full bg-slate-950 text-white hover:bg-slate-800 text-xs py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentLanguage.startsWith('pt') ? "Gerar Apresentação" : "Generate Slide Deck"}</span>
                </button>
              </div>

              {/* Right Viewport (Slide deck viewer) */}
              <div className="flex-1 bg-gray-100 p-4 overflow-y-auto flex flex-col items-center">
                {pptDeck ? (
                  <div className="w-full max-w-3xl space-y-4">
                    {/* Floating Controls */}
                    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-slate-800 font-sans">{pptDeck.title}</span>
                      </div>
                      <button 
                        onClick={downloadPptDeck}
                        className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-800 transition-all font-semibold cursor-pointer shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{currentLanguage.startsWith('pt') ? "Baixar .pptx" : "Download .pptx"}</span>
                      </button>
                    </div>

                    {/* PowerPoint Layout Viewport */}
                    <div className="flex gap-4">
                      {/* Left Thumbnail Drawer */}
                      <div className="w-32 space-y-2 max-h-[380px] overflow-y-auto shrink-0 pr-1 select-none">
                        {pptDeck.slides.map((slide, sidx) => (
                          <div 
                            key={sidx}
                            onClick={() => setPptActiveSlide(sidx)}
                            className={`p-2 border rounded-lg cursor-pointer transition-all bg-white hover:border-slate-400 text-left ${
                              pptActiveSlide === sidx ? 'border-slate-900 shadow-sm ring-1 ring-slate-900' : 'border-gray-200'
                            }`}
                          >
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Slide {slide.slideNum}</span>
                            <span className="text-[10px] font-semibold text-gray-700 truncate block mt-0.5">{slide.title}</span>
                          </div>
                        ))}
                      </div>

                      {/* Large Active Slide Frame Container */}
                      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-md p-8 aspect-video text-left flex flex-col justify-between relative overflow-hidden select-none">
                        {/* Slide Top Accent line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                        
                        {/* Slide Content rendering */}
                        <div>
                          <p className="text-[9px] font-semibold tracking-widest text-indigo-500 uppercase font-mono mb-1.5">
                            {pptDeck.slides[pptActiveSlide].layout === 'title_slide' ? '' : pptDeck.slides[pptActiveSlide].subtitle}
                          </p>
                          <h4 className="text-xl font-bold tracking-tight text-slate-900 leading-snug font-sans">{pptDeck.slides[pptActiveSlide].title}</h4>
                          
                          {/* Layout specific render */}
                          <div className="mt-6">
                            {pptDeck.slides[pptActiveSlide].layout === 'title_slide' && (
                              <div className="py-4 space-y-1">
                                <p className="text-sm font-medium text-slate-600">{pptDeck.slides[pptActiveSlide].subtitle}</p>
                                <p className="text-[11px] text-indigo-600 font-mono font-medium tracking-wide uppercase mt-6">{pptDeck.subtitle}</p>
                              </div>
                            )}

                            {pptDeck.slides[pptActiveSlide].layout === 'bullet_points' && pptDeck.slides[pptActiveSlide].bullets && (
                              <ul className="space-y-3 font-sans text-xs text-slate-600">
                                {pptDeck.slides[pptActiveSlide].bullets?.map((b, i) => (
                                  <li key={i} className="flex gap-2 items-start">
                                    <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {pptDeck.slides[pptActiveSlide].layout === 'split_columns' && pptDeck.slides[pptActiveSlide].columns && (
                              <div className="grid grid-cols-2 gap-6">
                                {pptDeck.slides[pptActiveSlide].columns?.map((col, i) => (
                                  <div key={i} className="space-y-2 border-l border-indigo-100 pl-3">
                                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-sans">{col.title}</h5>
                                    <p className="text-[11px] text-slate-500 font-sans leading-relaxed">{col.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {pptDeck.slides[pptActiveSlide].layout === 'stats_grid' && pptDeck.slides[pptActiveSlide].metrics && (
                              <div className="grid grid-cols-3 gap-3">
                                {pptDeck.slides[pptActiveSlide].metrics?.map((m, i) => (
                                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center space-y-1 shadow-sm">
                                    <span className="text-xl font-extrabold text-indigo-600 font-sans block">{m.value}</span>
                                    <span className="text-[10px] font-bold text-slate-700 font-sans block uppercase tracking-wider">{m.label}</span>
                                    <span className="text-[9px] text-slate-400 font-sans block leading-tight">{m.desc}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {pptDeck.slides[pptActiveSlide].layout === 'chart_and_text' && (
                              <div className="grid grid-cols-2 gap-4 items-center">
                                <ul className="space-y-2.5 font-sans text-xs text-slate-600">
                                  {pptDeck.slides[pptActiveSlide].bullets?.slice(0, 2).map((b, i) => (
                                    <li key={i} className="flex gap-1.5 items-start">
                                      <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                                {pptDeck.slides[pptActiveSlide].chart && (
                                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2 font-mono text-[10px] text-slate-600">
                                    <span className="font-semibold text-slate-700 block uppercase text-[8px] tracking-widest">{currentLanguage.startsWith('pt') ? "DADOS GRÁFICOS" : "CHART PREVIEW"}</span>
                                    <div className="space-y-1.5">
                                      {pptDeck.slides[pptActiveSlide].chart?.labels.map((lbl, li) => (
                                        <div key={li} className="flex items-center gap-2">
                                          <div className="w-20 truncate">{lbl}</div>
                                          <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                            <div style={{ width: `${pptDeck.slides[pptActiveSlide].chart?.values[li]}%` }} className="bg-indigo-500 h-full rounded-full" />
                                          </div>
                                          <div className="w-8 text-right font-bold">{pptDeck.slides[pptActiveSlide].chart?.values[li]}%</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer details */}
                        <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[8px] font-mono text-gray-400">
                          <span>{pptDeck.slides[pptActiveSlide].footerText}</span>
                          <span className="font-semibold">{pptActiveSlide + 1} / {pptDeck.slides.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm">
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
                      <Presentation className="w-8 h-8 text-slate-300 animate-pulse" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">{currentLanguage.startsWith('pt') ? "Slide Deck Vazio" : "No Presentation Active"}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {currentLanguage.startsWith('pt') ? "Selecione o modelo, defina o tema no painel lateral e clique em 'Gerar Apresentação'." : "Specify pitch parameters and click Generate Slide Deck."}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 1. SINGLE CONVERSATION PERMANENT DELETION MODAL */}
      <AnimatePresence>
        {showDeleteSingleModal && conversationToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-rose-100 p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {currentLanguage.startsWith('pt') ? "Eliminar Conversa Permanentemente?" : "Permanently Delete Conversation?"}
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold mt-0.5">
                    {currentLanguage.startsWith('pt') ? "Ação definitiva e irreversível" : "Irreversible action"}
                  </p>
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 space-y-1 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  "{conversationToDelete.title}"
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {currentLanguage.startsWith('pt')
                    ? "Esta ação irá remover de forma definitiva todos os dados desta conversa da base de dados e da memória local. Não poderá ser recuperada."
                    : "This action will permanently purge all messages in this conversation from database and local storage. It cannot be undone."}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setShowDeleteSingleModal(false); setConversationToDelete(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  {currentLanguage.startsWith('pt') ? "Cancelar" : "Cancel"}
                </button>
                <button
                  onClick={handleConfirmDeleteSingle}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{currentLanguage.startsWith('pt') ? "Eliminar Definitivamente" : "Delete Permanently"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. FULL PURGE / DELETE ALL CONVERSATIONS MODAL */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-rose-200 p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-100 rounded-2xl border border-rose-200 text-rose-600">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {currentLanguage.startsWith('pt') ? "🚨 Eliminação Total e Permanente" : "🚨 Purge All Conversations"}
                  </h3>
                  <p className="text-xs text-rose-600 font-bold">
                    {currentLanguage.startsWith('pt') ? "Atenção: Ação Irreversível" : "Warning: Cannot be undone"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {currentLanguage.startsWith('pt')
                  ? "Esta ação vai APAGAR PERMANENTEMENTE todo o histórico de conversas com a IA. Todos os relatórios temporários e mensagens armazenadas serão removidos definitivamente."
                  : "This action will PERMANENTLY PURGE all AI chat history and temporary data across the system."}
              </p>

              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-[11px] font-bold text-slate-700 block">
                  {currentLanguage.startsWith('pt') 
                    ? 'Para confirmar, digite "ELIMINAR" abaixo:' 
                    : 'To confirm, type "DELETE" below:'}
                </label>
                <input
                  type="text"
                  value={deleteAllConfirmInput}
                  onChange={(e) => setDeleteAllConfirmInput(e.target.value)}
                  placeholder={currentLanguage.startsWith('pt') ? "ELIMINAR" : "DELETE"}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-rose-700 uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setShowDeleteAllModal(false); setDeleteAllConfirmInput(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  {currentLanguage.startsWith('pt') ? "Cancelar" : "Cancel"}
                </button>
                <button
                  onClick={handleConfirmDeleteAll}
                  disabled={deleteAllConfirmInput.trim().toUpperCase() !== (currentLanguage.startsWith('pt') ? "ELIMINAR" : "DELETE")}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{currentLanguage.startsWith('pt') ? "Eliminar TUDO Definitivamente" : "PURGE ALL PERMANENTLY"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. PERSISTENT USER MEMORY MANAGEMENT MODAL */}
      <AnimatePresence>
        {showMemoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-lg w-full space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentLanguage.startsWith('pt') ? "🧠 Memória da IA & Factos do Utilizador" : "🧠 AI Persistent Memory & Facts"}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {currentLanguage.startsWith('pt') ? "A IA considera estes factos em todas as respostas para maior precisão." : "AI remembers these facts across sessions for grounded accuracy."}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMemoryModal(false)}
                  className="p-1.5 text-gray-400 hover:text-slate-900 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Add New Memory Fact Form */}
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/80 space-y-2">
                <span className="text-[11px] font-bold text-indigo-950 block">
                  {currentLanguage.startsWith('pt') ? "➕ Adicionar Novo Facto / Contexto à Memória:" : "➕ Add New Fact / Context to AI Memory:"}
                </span>
                <div className="flex gap-2">
                  <select 
                    value={newFactCategory}
                    onChange={(e: any) => setNewFactCategory(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-xs font-semibold px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-700 shrink-0"
                  >
                    <option value="empresa">Empresa</option>
                    <option value="regime">Regime Fiscal</option>
                    <option value="norma">Norma</option>
                    <option value="preferencia">Preferência</option>
                    <option value="geral">Geral</option>
                  </select>
                  <input 
                    type="text"
                    value={newFactText}
                    onChange={(e) => setNewFactText(e.target.value)}
                    placeholder={currentLanguage.startsWith('pt') ? "Ex: Empresa sujeita ao Regime Geral do IVA em Luanda..." : "Ex: Company subjected to VAT General Regime..."}
                    className="flex-1 bg-white border border-gray-200 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddMemoryFact(); }}
                  />
                  <button
                    onClick={handleAddMemoryFact}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                  >
                    {currentLanguage.startsWith('pt') ? "Adicionar" : "Add"}
                  </button>
                </div>
              </div>

              {/* Stored Memory Facts List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  {currentLanguage.startsWith('pt') ? `Factos Armazenados (${userMemoryList.length}):` : `Stored Facts (${userMemoryList.length}):`}
                </span>
                {userMemoryList.map(item => (
                  <div 
                    key={item.id}
                    className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-200 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium font-sans">{item.fact}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteMemoryFact(item.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                      title={currentLanguage.startsWith('pt') ? "Remover facto" : "Remove fact"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {userMemoryList.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-xs font-sans">
                    {currentLanguage.startsWith('pt') ? "Nenhum facto registado na memória." : "No facts saved in memory yet."}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <button
                  onClick={handleWipeAllMemory}
                  disabled={userMemoryList.length === 0}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all cursor-pointer font-semibold disabled:opacity-40"
                >
                  {currentLanguage.startsWith('pt') ? "Limpar Toda a Memória" : "Clear All Memory"}
                </button>
                <button
                  onClick={() => setShowMemoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  {currentLanguage.startsWith('pt') ? "Concluído" : "Done"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT EXTRACTION LOADING & OCR PROGRESS MODAL */}
      <AnimatePresence>
        {isExtractingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  {currentLanguage.startsWith('pt') ? "A Processar Documento com IA Gemini" : "Processing Document with Gemini AI"}
                </h3>
                <p className="text-xs text-indigo-600 font-mono mt-1 font-semibold">{docExtractionStep}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono font-bold text-indigo-900">
                  <span>{currentLanguage.startsWith('pt') ? "Progresso OCR:" : "OCR Progress:"}</span>
                  <span>{docExtractionProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${docExtractionProgress}%` }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-400 font-sans italic">
                {currentLanguage.startsWith('pt') ? "Por favor aguarde enquanto os dados do documento são lidos e validados..." : "Please wait while document content and tax fields are extracted..."}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. DOCUMENT EXTRACTION & PREVIEW MODAL */}
      <AnimatePresence>
        {showDocPreviewModal && extractedDocData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{currentLanguage.startsWith('pt') ? "📄 Conteúdo Extraído do Documento" : "📄 Extracted Document Content"}</span>
                      {extractedDocData.isLegible !== undefined && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          extractedDocData.isLegible 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {extractedDocData.isLegible 
                            ? (currentLanguage.startsWith('pt') ? "✓ Legível / OCR OK" : "✓ Legible / OCR OK")
                            : (currentLanguage.startsWith('pt') ? "⚠️ Imagem/Texto Baixa Qualidade" : "⚠️ Low Quality Text/Image")}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-mono">
                      {extractedDocData.fileName}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDocPreviewModal(false)}
                  className="p-1.5 text-gray-400 hover:text-slate-900 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Warning / Issues Box if present */}
              {extractedDocData.issues && extractedDocData.issues.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{currentLanguage.startsWith('pt') ? "Avisos de Validação do Documento:" : "Document Validation Alerts:"}</span>
                  </span>
                  <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                    {extractedDocData.issues.map((iss, idx) => (
                      <li key={idx}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Document Summary Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {currentLanguage.startsWith('pt') ? "Resumo da Análise da IA:" : "AI Analysis Summary:"}
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed font-sans">
                  {extractedDocData.summary}
                </p>
              </div>

              {/* Key Values Grid */}
              {extractedDocData.keyValues && extractedDocData.keyValues.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    {currentLanguage.startsWith('pt') ? "Campos Fiscais Identificados:" : "Identified Tax Fields:"}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {extractedDocData.keyValues.map((kv, idx) => (
                      <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl">
                        <span className="text-[10px] text-gray-400 font-medium block truncate">{kv.label}</span>
                        <span className="text-xs font-bold text-slate-900 font-mono block truncate">{kv.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Support Chart / Snippet Box */}
              {extractedDocData.visualAid && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{extractedDocData.visualAid.chartTitle || (currentLanguage.startsWith('pt') ? "Apoio Visual / Decomposição" : "Visual Aid / Breakdown")}</span>
                    </span>
                    <button
                      onClick={() => setZoomVisualAid({
                        title: extractedDocData.visualAid?.chartTitle || 'Visual Aid Breakdown',
                        type: 'chart',
                        data: extractedDocData.visualAid
                      })}
                      className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <ZoomIn className="w-3 h-3 text-indigo-600" />
                      <span>{currentLanguage.startsWith('pt') ? "Ampliar Visualização" : "Zoom Visual"}</span>
                    </button>
                  </div>

                  {extractedDocData.visualAid.labels && extractedDocData.visualAid.values && (
                    <div className="space-y-1.5 pt-1">
                      {extractedDocData.visualAid.labels.map((lbl, idx) => {
                        const val = extractedDocData.visualAid?.values?.[idx] || 0;
                        const maxVal = Math.max(...(extractedDocData.visualAid?.values || [1]));
                        const pct = Math.min(100, Math.round((val / maxVal) * 100));
                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between text-[11px] text-slate-700 font-medium">
                              <span>{lbl}</span>
                              <span className="font-mono font-bold">{val.toLocaleString('pt-PT')}</span>
                            </div>
                            <div className="w-full h-2 bg-indigo-100/80 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {extractedDocData.visualAid.highlightBox && (
                    <p className="text-[11px] text-indigo-900 bg-white/80 p-2 rounded-lg border border-indigo-100 italic">
                      🎯 <strong>{currentLanguage.startsWith('pt') ? "Localização no Documento:" : "Location in Document:"}</strong> {extractedDocData.visualAid.highlightBox}
                    </p>
                  )}
                </div>
              )}

              {/* Informative Tax Disclaimer */}
              {extractedDocData.disclaimer && (
                <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start gap-2 border border-slate-200/60">
                  <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="leading-snug">{extractedDocData.disclaimer}</p>
                </div>
              )}

              {/* User Question Input for Document */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-800 block">
                  {currentLanguage.startsWith('pt') ? "Pergunta ou instrução sobre o documento:" : "Ask a question or instruction about this document:"}
                </label>
                <textarea
                  value={docQuestionPrompt}
                  onChange={(e) => setDocQuestionPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-3">
                <button
                  onClick={() => setShowDocPreviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  {currentLanguage.startsWith('pt') ? "Cancelar" : "Cancel"}
                </button>
                <button
                  onClick={handleSendDocQuestion}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{currentLanguage.startsWith('pt') ? "Explicar com IA no Chat" : "Explain with AI in Chat"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. VISUAL AID ZOOM MODAL */}
      <AnimatePresence>
        {zoomVisualAid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">{zoomVisualAid.title}</h3>
                </div>
                <button
                  onClick={() => setZoomVisualAid(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                {zoomVisualAid.data?.labels && zoomVisualAid.data?.values && (
                  <div className="space-y-3">
                    {zoomVisualAid.data.labels.map((lbl: string, idx: number) => {
                      const val = zoomVisualAid.data.values[idx] || 0;
                      const maxVal = Math.max(...zoomVisualAid.data.values);
                      const pct = Math.min(100, Math.round((val / maxVal) * 100));
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-300 font-semibold">
                            <span>{lbl}</span>
                            <span className="font-mono text-emerald-400 font-bold">{val.toLocaleString('pt-PT')}</span>
                          </div>
                          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {zoomVisualAid.data?.highlightBox && (
                  <div className="p-3 bg-slate-900 rounded-lg text-xs text-indigo-300 border border-slate-800">
                    🔍 <strong>{currentLanguage.startsWith('pt') ? "Destaque Visual:" : "Visual Highlight:"}</strong> {zoomVisualAid.data.highlightBox}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setZoomVisualAid(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                >
                  {currentLanguage.startsWith('pt') ? "Fechar Ampliação" : "Close Zoom"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DYNAMIC PGC ANGOLA GLOSSARY MODAL */}
      <DynamicPgcGlossaryModal 
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
        chatContextText={currentChatContextText}
        onSelectTermForChat={(termPrompt) => {
          setActiveSubtab('chat');
          handleSendChat(termPrompt);
        }}
      />

      {/* OFFICIAL PGC ANGOLA FINANCIAL STATEMENTS MODAL (DECRETO 82/2001) */}
      <DemonstracoesModal
        isOpen={isPgcModalOpen}
        onClose={() => setIsPgcModalOpen(false)}
        ano={2026}
      />

    </div>
  );
};

export default AiAccountantSuite;

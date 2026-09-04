import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, MessageSquare, FileText, Grid, BarChart3, Presentation, ShieldCheck, 
  Send, Sparkles, Download, Edit3, Trash2, ArrowRight, RefreshCw, 
  CheckCircle, AlertTriangle, Info, Upload, ChevronRight, ChevronLeft, 
  Share2, Plus, Volume2, VolumeX, Copy, Check, X, RotateCcw,
  Paperclip, Loader2, Calculator, BookOpen, Layers, Maximize2, FileSpreadsheet,
  Mic, MicOff, ThumbsUp, ThumbsDown, Search, SlidersHorizontal, ArrowUpRight,
  HelpCircle, Eye, FileCode, CheckSquare, Sparkle, History, Menu
} from 'lucide-react';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getCurrentUser } from '../lib/db';
import { salvarFeedbackYohanFirestore } from '../lib/firebase';
import { PGC_CHART_OF_ACCOUNTS } from '../lib/pgc/pgcKnowledgeBase';
import { VirtualizedChatMessagesList } from './VirtualizedChatMessagesList';
import { perguntarYohanStreaming, gerarDocumentoGrande } from '../services/yohanAiService';
import { SparklingAiAura } from './SparklingAiAura';
import { YohanLogo } from './YohanLogo';

export interface YohanAIProps {
  currentLanguage?: string;
  onSaveToVault?: (type: string, title: string, content: any) => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feedback?: 'up' | 'down' | null;
  edited?: boolean;
  editedAt?: string;
  attachedFile?: { name: string; size?: number };
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  tag: string;
  messages: ChatMessage[];
}

type YohanMode = 'chat' | 'document' | 'spreadsheet' | 'presentation' | 'visualization' | 'tax-review';

// PGC Angola Quick Classes Reference for Glossary Tool
const PGC_CLASSES = [
  { classNum: 1, name: 'Classe 1 - Meios Fixos e Investimentos', desc: 'Imobilizações corpóreas, incorpóreas, investimentos financeiros e amortizações acumuladas.' },
  { classNum: 2, name: 'Classe 2 - Existências', desc: 'Mercadorias, matérias-primas, produtos acabados, produtos em curso e adiantamentos a fornecedores.' },
  { classNum: 3, name: 'Classe 3 - Terceiros', desc: 'Clientes, fornecedores, pessoal, Estado e outros entes públicos (IVA, IRT, Imposto Industrial) e outros devedores/credores.' },
  { classNum: 4, name: 'Classe 4 - Meios Monetários', desc: 'Caixa, depósitos à ordem, depósitos a prazo e outros títulos negociáveis.' },
  { classNum: 5, name: 'Classe 5 - Capital e Reservas', desc: 'Capital social, reservas legais e estatutárias, resultados transitados e excedentes de revalorização.' },
  { classNum: 6, name: 'Classe 6 - Proveitos e Ganhos por Natureza', desc: 'Vendas, prestações de serviços, variações de produção, trabalhos para a própria empresa e outros proveitos operacionais.' },
  { classNum: 7, name: 'Classe 7 - Custos e Perdas por Natureza', desc: 'Custo das mercadorias vendidas, fornecimentos e serviços de terceiros (FST), gastos com pessoal, amortizações e provisões.' },
  { classNum: 8, name: 'Classe 8 - Resultados', desc: 'Resultados operacionais, resultados financeiros, resultados extraordinários e apuramento do resultado líquido do exercício.' }
];

// Quick Prompt Templates
const PROMPT_TEMPLATES = [
  {
    category: 'Lançamentos PGC',
    icon: '📑',
    title: 'Compra de Mercadorias com IVA 14%',
    prompt: 'Explica o lançamento contabilístico de compra de mercadorias no valor de 1.000.000 Kz a prazo, com incidência de IVA a 14% dedutível segundo o PGC Angola (Classes 2, 3 e 4).'
  },
  {
    category: 'Lançamentos PGC',
    icon: '🏢',
    title: 'Amortização de Ativos Fixos',
    prompt: 'Como registar a quota anual de amortização de uma viatura ligeira no valor de 12.000.000 Kz pelo método das quotas constantes (taxa de 25%) segundo as regras da AGT e PGC?'
  },
  {
    category: 'Fiscalidade AGT',
    icon: '🏛️',
    title: 'Retenção na Fonte de 6.5%',
    prompt: 'Quais as regras e prazos para aplicação e entrega da retenção na fonte de 6,5% a título de Imposto Industrial sobre prestação de serviços em Angola?'
  },
  {
    category: 'Fiscalidade AGT',
    icon: '🧾',
    title: 'Apuramento e Declaração de IVA',
    prompt: 'Explica passo a passo o processo de apuramento mensal do IVA em Angola (IVA Liquidado vs IVA Dedutível na conta 34.5) e prazo de submissão do Modelo 7.'
  },
  {
    category: 'Fecho de Contas',
    icon: '📊',
    title: 'Apuramento do Resultado Líquido',
    prompt: 'Descreve as etapas de encerramento das contas das Classes 6 e 7 para a Classe 8 (Resultados), cálculo do RAI, estimativa de Imposto Industrial (25%) e apuramento do Resultado Líquido.'
  },
  {
    category: 'Exercícios Práticos',
    icon: '📝',
    title: 'Gerar Exercício com Balancete',
    prompt: 'Gera um exercício prático de contabilidade geral com 5 operações do mês para registar no Diário, Razão e apurar o Balancete de Verificação de 6 colunas.'
  },
  {
    category: 'Análise Financeira',
    icon: '📈',
    title: 'Cálculo de Rácios Financeiros',
    prompt: 'Como calcular e interpretar os rácios de Liquidez Geral, Liquidez Reduzida, Autonomia Financeira e Rentabilidade do Capital Próprio (ROE) a partir do Balanço PGC?'
  }
];

export const YohanAI: React.FC<YohanAIProps> = ({
  currentLanguage = 'pt-PT',
  onSaveToVault
}) => {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.userId || (currentUser as any)?.id || 'default_user';

  const [activeMode, setActiveMode] = useState<YohanMode>('chat');
  const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 900 : true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 900 : false);
  const [docProgress, setDocProgress] = useState<{ current: number; total: number; title: string } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 900;
      setIsDesktop(desktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editConvTitle, setEditConvTitle] = useState('');
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [selectedGlossaryClass, setSelectedGlossaryClass] = useState<number | null>(null);
  const [glossarySearchQuery, setGlossarySearchQuery] = useState('');

  // Conversations Storage
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const key = `ga_yohan_conversations_${currentUserId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Failed parsing Yohan AI conversations:', e);
      }
    }

    // Default first conversation
    const defaultConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'Consultoria Inicial PGC Angola',
      updatedAt: new Date().toISOString(),
      tag: '#Geral',
      messages: [
        {
          id: 'msg-welcome-yohan',
          role: 'assistant',
          content: `Olá! Sou o **Yohan AI**, o teu consultor sénior de contabilidade e auditoria especializado no **Plano Geral de Contabilidade (PGC) de Angola** (Decreto n.º 82/2001) e fiscalidade da AGT.

Como posso ajudar hoje?
- 📑 **Lançamentos Contabilísticos & Contas PGC** (Classes 1 a 8)
- 📊 **Demonstrações Financeiras** (Balanço, DRE por Natureza e Funções)
- 🏛️ **Fiscalidade AGT** (IVA 14%, Imposto Industrial 25%, IRT, Retenções 6.5%)
- 📄 **Gerador de Documentos Word, Planilhas Excel, Slides PPTX e Diagramas**
- 🛡️ **Auditoria e Revisão de Documentos Fiscais**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    return [defaultConv];
  });

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    return conversations[0]?.id || `conv-${Date.now()}`;
  });

  // Current active conversation
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConvId) || conversations[0];
  }, [conversations, activeConvId]);

  const messages = activeConversation?.messages || [];

  // Chat Input State
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; size?: number } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Document Generator State
  const [docPrompt, setDocPrompt] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  const [isDocGenerating, setIsDocGenerating] = useState(false);

  // Spreadsheet Generator State
  const [sheetPrompt, setSheetPrompt] = useState('');
  const [generatedSheet, setGeneratedSheet] = useState<any>(null);
  const [isSheetGenerating, setIsSheetGenerating] = useState(false);

  // Presentation Generator State
  const [pptPrompt, setPptPrompt] = useState('');
  const [generatedDeck, setGeneratedDeck] = useState<any>(null);
  const [isPptGenerating, setIsPptGenerating] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Visualization / Diagram Generator State
  const [vizPrompt, setVizPrompt] = useState('');
  const [generatedViz, setGeneratedViz] = useState<any>(null);
  const [isVizGenerating, setIsVizGenerating] = useState(false);

  // Tax Review State
  const [taxText, setTaxText] = useState('');
  const [taxFileName, setTaxFileName] = useState('');
  const [generatedTaxAudit, setGeneratedTaxAudit] = useState<any>(null);
  const [isTaxAuditing, setIsTaxAuditing] = useState(false);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(`ga_yohan_conversations_${currentUserId}`, JSON.stringify(conversations));
      localStorage.setItem(`ga_yohan_chat_history`, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed saving Yohan AI conversations:', e);
    }
  }, [conversations, currentUserId, messages]);

  // Listen to Global Header Events
  useEffect(() => {
    const handleOpenHistory = () => setIsHistoryOpen(prev => !prev);
    const handleNewChat = () => handleCreateNewConversation();

    window.addEventListener('ga-open-ai-history', handleOpenHistory);
    window.addEventListener('ga-new-ai-chat', handleNewChat);

    return () => {
      window.removeEventListener('ga-open-ai-history', handleOpenHistory);
      window.removeEventListener('ga-new-ai-chat', handleNewChat);
    };
  }, [conversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeMode === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeMode, isLoading]);

  // Create New Conversation
  const handleCreateNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'Nova Consulta PGC',
      updatedAt: new Date().toISOString(),
      tag: '#Geral',
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: `Olá! Em que posso ajudar com a contabilidade angolana ou fiscalidade AGT nesta nova conversa?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setActiveMode('chat');
    setIsHistoryOpen(false);
  };

  // Switch Conversation
  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setActiveMode('chat');
    setIsHistoryOpen(false);
  };

  // Rename Conversation
  const handleSaveRename = (id: string) => {
    if (!editConvTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editConvTitle.trim() } : c));
    setEditingConvId(null);
    setEditConvTitle('');
  };

  // Delete Single Conversation
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    if (updated.length === 0) {
      const freshConv: Conversation = {
        id: `conv-${Date.now()}`,
        title: 'Nova Consulta PGC',
        updatedAt: new Date().toISOString(),
        tag: '#Geral',
        messages: [
          {
            id: `msg-welcome-${Date.now()}`,
            role: 'assistant',
            content: `Olá! Sou o **Yohan AI**. Como posso ajudar hoje?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
      setConversations([freshConv]);
      setActiveConvId(freshConv.id);
    } else {
      setConversations(updated);
      if (activeConvId === id) {
        setActiveConvId(updated[0].id);
      }
    }
  };

  // Clear All Conversations
  const handleClearAllConversations = () => {
    const freshConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'Nova Consulta PGC',
      updatedAt: new Date().toISOString(),
      tag: '#Geral',
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: `Histórico reiniciado. Sou o **Yohan AI**. Em que posso ser útil?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    setConversations([freshConv]);
    setActiveConvId(freshConv.id);
    setShowClearAllModal(false);
    setIsHistoryOpen(false);
  };

  // Feedback on Message (Thumbs up / down)
  const handleFeedback = async (msgId: string, rating: 'up' | 'down') => {
    const targetMsg = messages.find(m => m.id === msgId);

    setConversations(prev => prev.map(c => {
      if (c.id !== activeConvId) return c;
      return {
        ...c,
        messages: c.messages.map(m => m.id === msgId ? { ...m, feedback: rating } : m)
      };
    }));

    // 1. Persist directly to Firestore
    try {
      await salvarFeedbackYohanFirestore(
        currentUserId,
        msgId,
        rating,
        activeConvId,
        targetMsg?.content
      );
    } catch (fsErr) {
      console.warn('[Yohan AI] Firestore feedback write fallback:', fsErr);
    }

    // 2. Report to backend API endpoint
    try {
      await fetch('/api/yohan/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msgId,
          rating,
          conversationId: activeConvId,
          userId: currentUserId,
          content: targetMsg?.content?.slice(0, 300)
        })
      });
    } catch (e) {
      console.warn('[Yohan AI] Backend feedback report failed:', e);
    }
  };

  // Speech Synthesis - Natural human male consultant voice
  const handleToggleSpeech = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('A síntese de voz não é suportada neste navegador.');
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/```[a-z]*[\s\S]*?```/gi, ' ')
      .replace(/[*#`_~[\]()]/g, ' ')
      .replace(/>+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();

    // Prioritizar voz masculina em português (Angola, Portugal ou Brasil)
    const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
    const preferredMaleVoice = ptVoices.find(v => 
      /male|homem|jorge|duarte|antonio|gabriel|felipe|ricardo|pt-pt/i.test(v.name)
    ) || ptVoices[0] || voices.find(v => v.lang.startsWith('pt'));

    if (preferredMaleVoice) {
      utterance.voice = preferredMaleVoice;
    }

    utterance.lang = currentLanguage.startsWith('pt') ? (preferredMaleVoice?.lang || 'pt-PT') : 'en-US';
    utterance.rate = 0.96; // Cadência humana e calma
    utterance.pitch = 0.98; // Timbre masculino equilibrado

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Stop speech synthesis when mode changes
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeMode]);

  // Voice Input Speech Recognition
  const handleToggleVoiceInput = () => {
    if (isRecordingVoice) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecordingVoice(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('O reconhecimento de voz não é suportado pelo seu navegador.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLanguage.startsWith('pt') ? 'pt-PT' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecordingVoice(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };
      recognition.onerror = () => setIsRecordingVoice(false);
      recognition.onend = () => setIsRecordingVoice(false);

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsRecordingVoice(false);
    }
  };

  // File Upload and Text Extraction
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      setIsLoading(true);

      // Check if text/json/csv
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        const text = await file.text();
        setAttachedFile({ name: file.name, content: text.slice(0, 15000), size: file.size });
      } else {
        // Send to backend extract endpoint
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/yohan/extract-doc', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          setAttachedFile({ name: file.name, content: data.text || 'Documento carregado', size: file.size });
        } else {
          // Fallback reading
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setAttachedFile({ name: file.name, content: content ? content.slice(0, 5000) : 'Ficheiro lido', size: file.size });
          };
          reader.readAsText(file);
        }
      }
    } catch (err) {
      console.error('File extraction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Send Chat Message with Streaming, 24h Cache, 15s Timeout, and Auto-Retry
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userText = (customText || inputMessage).trim();
    if (!userText || isLoading) return;

    // 1. Immediate visual feedback (< 100ms)
    setIsLoading(true);
    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFile: attachedFile ? { name: attachedFile.name, size: attachedFile.size } : undefined
    };

    const currentAttached = attachedFile;
    setAttachedFile(null);

    // Update conversation with user message
    const updatedMessages = [...messages, userMsg];
    
    // Auto-update conversation title if it's default
    let newTitle = activeConversation.title;
    if (activeConversation.title === 'Nova Consulta PGC' || activeConversation.title === 'Consultoria Inicial PGC Angola') {
      newTitle = userText.slice(0, 36) + (userText.length > 36 ? '...' : '');
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== activeConvId) return c;
      return {
        ...c,
        title: newTitle,
        updatedAt: new Date().toISOString(),
        messages: updatedMessages
      };
    }));

    // 2. Cache 24h lookup for common queries
    const cacheKey = 'ga_ai_cache:' + hashString(userText.toLowerCase().trim());
    if (!currentAttached) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { response, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age < 24 * 60 * 60 * 1000 && response) {
            const cachedBotMsg: ChatMessage = {
              id: `msg-${Date.now() + 1}`,
              role: 'assistant',
              content: response,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setConversations(prev => prev.map(c => {
              if (c.id !== activeConvId) return c;
              return {
                ...c,
                updatedAt: new Date().toISOString(),
                messages: [...c.messages, cachedBotMsg]
              };
            }));
            setIsLoading(false);
            return;
          }
        }
      } catch (_) {}
    }

    const fileContext = currentAttached ? `\n\n[DOCUMENTO ANEXADO: ${currentAttached.name}]\n${currentAttached.content}\n` : '';

    // 3. Limit history sent to API to the last 10 messages
    const recentHistory = updatedMessages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const botMsgId = `msg-${Date.now() + 1}`;
    const botTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updateAssistantMsg = (fullText: string) => {
      setConversations(prev => prev.map(c => {
        if (c.id !== activeConvId) return c;
        const msgExists = c.messages.some(m => m.id === botMsgId);
        const newMsgs = msgExists
          ? c.messages.map(m => m.id === botMsgId ? { ...m, content: fullText } : m)
          : [...c.messages, { id: botMsgId, role: 'assistant' as const, content: fullText, timestamp: botTimestamp }];
        return {
          ...c,
          updatedAt: new Date().toISOString(),
          messages: newMsgs
        };
      }));
    };

    const fullUserPrompt = `${userText}${fileContext}`;

    try {
      if (activeMode === 'chat' || activeMode === 'tax-review') {
        const fullResponse = await perguntarYohanStreaming(
          fullUserPrompt,
          recentHistory.slice(0, -1),
          (chunkText) => {
            updateAssistantMsg(chunkText);
          }
        );
        updateAssistantMsg(fullResponse);

        // Guardar no cache 24h se for resposta válida
        if (fullResponse && !fullResponse.startsWith('⚠️') && !currentAttached) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              response: fullResponse,
              timestamp: Date.now()
            }));
          } catch (_) {}
        }
      } else {
        // Modos Document / Spreadsheet / Presentation: geração profunda em 2 fases
        setIsDocGenerating(true);
        setDocProgress({ current: 0, total: 10, title: 'A estruturar seções do documento...' });

        const fullDocText = await gerarDocumentoGrande(
          fullUserPrompt,
          (feitas, total, tituloSecao, textoAcumulado) => {
            setDocProgress({ current: feitas, total, title: tituloSecao });
            if (textoAcumulado) {
              updateAssistantMsg(textoAcumulado);
            }
          }
        );

        updateAssistantMsg(fullDocText);
        setDocProgress(null);

        // Processar para botões de exportação (DOCX / XLSX / PPTX)
        const titleMatch = fullDocText.match(/^#\s+(.+)$/m);
        const docTitle = titleMatch ? titleMatch[1].trim() : userText.slice(0, 40);

        const sectionMatches = Array.from(fullDocText.matchAll(/##\s+([^\n]+)\n\n([\s\S]*?)(?=(?:##|\n---|$))/g));
        const structuredSections = sectionMatches.map(m => ({
          heading: m[1].trim(),
          paragraphs: m[2].split('\n\n').map(p => p.trim()).filter(Boolean)
        }));

        const newDoc = {
          title: docTitle,
          subtitle: 'Guia Técnico Aprofundado - Yohan AI (PGC Angola)',
          sections: structuredSections.length > 0 ? structuredSections : [{ heading: 'Conteúdo Integral', paragraphs: [fullDocText] }]
        };
        setGeneratedDoc(newDoc);

        if (onSaveToVault) {
          onSaveToVault(activeMode, docTitle, newDoc);
        }
      }
    } catch (err: any) {
      console.error('Yohan AI Error:', err);
      const rawErrMsg = err?.message || String(err) || 'Erro de comunicação';
      const errorMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: `⚠️ Não foi possível obter resposta: ${rawErrMsg}\n\n*Sugestão:* Verifique as suas credenciais de API ou tente novamente em instantes.`,
        timestamp: botTimestamp
      };

      setConversations(prev => prev.map(c => {
        if (c.id !== activeConvId) return c;
        const msgExists = c.messages.some(m => m.id === botMsgId);
        const newMsgs = msgExists
          ? c.messages.map(m => m.id === botMsgId ? errorMsg : m)
          : [...c.messages, errorMsg];
        return {
          ...c,
          updatedAt: new Date().toISOString(),
          messages: newMsgs
        };
      }));
    } finally {
      setIsLoading(false);
      setIsDocGenerating(false);
      setDocProgress(null);
    }
  };

  // Re-generate AI response for an edited user message
  const sendEditedToAPI = async (editedUserText: string, currentHistory: ChatMessage[]) => {
    setIsLoading(true);
    const botMsgId = `msg-${Date.now() + 1}`;
    const botTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const recentHistory = currentHistory.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const updateAssistantMsg = (fullText: string) => {
      setConversations(prev => prev.map(c => {
        if (c.id !== activeConvId) return c;
        const msgExists = c.messages.some(m => m.id === botMsgId);
        const newMsgs = msgExists
          ? c.messages.map(m => m.id === botMsgId ? { ...m, content: fullText } : m)
          : [...c.messages, { id: botMsgId, role: 'assistant' as const, content: fullText, timestamp: botTimestamp }];
        return {
          ...c,
          updatedAt: new Date().toISOString(),
          messages: newMsgs
        };
      }));
    };

    try {
      const fullResponse = await perguntarYohanStreaming(
        editedUserText,
        recentHistory.slice(0, -1),
        (chunkText) => {
          updateAssistantMsg(chunkText);
        }
      );
      updateAssistantMsg(fullResponse);
    } catch (err: any) {
      console.error('Yohan AI Edit Chat error:', err);
      const rawErrMsg = err?.message || String(err) || 'Erro de comunicação';
      const errorMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: `⚠️ Não foi possível obter resposta após a edição: ${rawErrMsg}`,
        timestamp: botTimestamp
      };

      setConversations(prev => prev.map(c => {
        if (c.id !== activeConvId) return c;
        const msgExists = c.messages.some(m => m.id === botMsgId);
        const newMsgs = msgExists
          ? c.messages.map(m => m.id === botMsgId ? errorMsg : m)
          : [...c.messages, errorMsg];
        return {
          ...c,
          updatedAt: new Date().toISOString(),
          messages: newMsgs
        };
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Edit User Message & Regenerate AI Response
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim() || isLoading) return;

    // Atualizar o conteúdo da mensagem no histórico com flag edited
    const updatedMessages = messages.map(m =>
      m.id === messageId
        ? { ...m, content: newContent, edited: true, editedAt: new Date().toISOString() }
        : m
    );

    // Remover mensagens subsequentes após a mensagem editada
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    const trimmedMessages = updatedMessages.slice(0, messageIndex + 1);

    // Atualizar o estado
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConvId) return c;
      return {
        ...c,
        updatedAt: new Date().toISOString(),
        messages: trimmedMessages
      };
    }));

    try {
      const updatedConvs = conversations.map(c => 
        c.id === activeConvId ? { ...c, messages: trimmedMessages, updatedAt: new Date().toISOString() } : c
      );
      localStorage.setItem(`ga_yohan_conversations_${currentUserId}`, JSON.stringify(updatedConvs));
      localStorage.setItem(`ga_yohan_chat_history`, JSON.stringify(trimmedMessages));
    } catch (_) {}

    // Reenviar para a API
    await sendEditedToAPI(newContent, trimmedMessages);
  };

  // 2. Delete Message
  const handleDeleteMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    const message = messages[messageIndex];

    let newMessages = [...messages];

    if (message.role === 'user') {
      // Apagar a mensagem do utilizador E a resposta da IA seguinte
      const nextMessage = messages[messageIndex + 1];
      if (nextMessage && nextMessage.role === 'assistant') {
        newMessages = messages.filter(m =>
          m.id !== messageId && m.id !== nextMessage.id
        );
      } else {
        newMessages = messages.filter(m => m.id !== messageId);
      }
    } else {
      // Apagar apenas a mensagem da IA
      newMessages = messages.filter(m => m.id !== messageId);
    }

    // Se a conversa ficar vazia, repõe mensagem inicial
    if (newMessages.length === 0) {
      newMessages = [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: 'Olá! Sou o Yohan AI, o teu consultor sénior de contabilidade. Diz-me o que precisas: lançamentos PGC, dúvidas de IVA, amortizações ou fecho de contas.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== activeConvId) return c;
      return {
        ...c,
        updatedAt: new Date().toISOString(),
        messages: newMessages
      };
    }));

    try {
      const updatedConvs = conversations.map(c => 
        c.id === activeConvId ? { ...c, messages: newMessages, updatedAt: new Date().toISOString() } : c
      );
      localStorage.setItem(`ga_yohan_conversations_${currentUserId}`, JSON.stringify(updatedConvs));
      localStorage.setItem(`ga_yohan_chat_history`, JSON.stringify(newMessages));
    } catch (e) {
      console.warn('Failed saving deleted message to storage:', e);
    }
  };

  // Generate Document Word with Two-Phase Large Generation
  const handleGenerateDoc = async () => {
    if (!docPrompt.trim() || isDocGenerating) return;
    setIsDocGenerating(true);
    setDocProgress({ current: 0, total: 10, title: 'A estruturar seções do documento...' });
    try {
      const fullDocText = await gerarDocumentoGrande(
        docPrompt,
        (feitas, total, tituloSecao) => {
          setDocProgress({ current: feitas, total, title: tituloSecao });
        }
      );

      const titleMatch = fullDocText.match(/^#\s+(.+)$/m);
      const docTitle = titleMatch ? titleMatch[1].trim() : docPrompt.slice(0, 40);

      const sectionMatches = Array.from(fullDocText.matchAll(/##\s+([^\n]+)\n\n([\s\S]*?)(?=(?:##|\n---|$))/g));
      const structuredSections = sectionMatches.map(m => ({
        heading: m[1].trim(),
        paragraphs: m[2].split('\n\n').map(p => p.trim()).filter(Boolean)
      }));

      const newDoc = {
        title: docTitle,
        subtitle: 'Documento Técnico Aprofundado - Yohan AI (PGC Angola)',
        sections: structuredSections.length > 0 ? structuredSections : [{ heading: 'Conteúdo Integral', paragraphs: [fullDocText] }]
      };
      setGeneratedDoc(newDoc);
      if (onSaveToVault) {
        onSaveToVault('document', docTitle, newDoc);
      }
    } catch (e) {
      console.error('Doc generation error:', e);
    } finally {
      setIsDocGenerating(false);
      setDocProgress(null);
    }
  };

  // Export DOCX
  const handleExportDOCX = async () => {
    if (!generatedDoc) return;
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: generatedDoc.title || 'Relatório Yohan AI',
              heading: HeadingLevel.HEADING_1
            }),
            new Paragraph({
              text: generatedDoc.subtitle || '',
              heading: HeadingLevel.HEADING_2
            }),
            ...(generatedDoc.sections || []).flatMap((sec: any) => [
              new Paragraph({ text: sec.heading || '', heading: HeadingLevel.HEADING_3 }),
              ...(sec.paragraphs || []).map((p: string) => new Paragraph({ text: p }))
            ])
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedDoc.title || 'Relatorio_Yohan_AI'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting DOCX:', e);
    }
  };

  // Generate Spreadsheet
  const handleGenerateSheet = async () => {
    if (!sheetPrompt.trim() || isSheetGenerating) return;
    setIsSheetGenerating(true);
    try {
      const res = await fetch('/api/yohan/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sheetPrompt, language: currentLanguage, country: 'Angola' })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setGeneratedSheet(data);
        if (onSaveToVault) {
          onSaveToVault('spreadsheet', data.title || 'Planilha PGC', data);
        }
      } else {
        console.warn('Spreadsheet generation error:', res.status);
      }
    } catch (e) {
      console.error('Spreadsheet generation error:', e);
    } finally {
      setIsSheetGenerating(false);
    }
  };

  // Export XLSX
  const handleExportXLSX = () => {
    if (!generatedSheet || !generatedSheet.grid) return;
    try {
      const wsData = generatedSheet.grid.map((row: any[]) => row.map(cell => cell.value || ''));
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, generatedSheet.sheetName || 'Planilha_PGC');
      XLSX.writeFile(wb, `${generatedSheet.title || 'Planilha_Yohan_AI'}.xlsx`);
    } catch (e) {
      console.error('Error exporting XLSX:', e);
    }
  };

  // Generate Presentation
  const handleGeneratePpt = async () => {
    if (!pptPrompt.trim() || isPptGenerating) return;
    setIsPptGenerating(true);
    try {
      const res = await fetch('/api/yohan/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: pptPrompt, language: currentLanguage })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setGeneratedDeck(data);
        setCurrentSlideIndex(0);
        if (onSaveToVault) {
          onSaveToVault('presentation', data.title || 'Apresentação PGC', data);
        }
      } else {
        console.warn('Presentation generation error:', res.status);
      }
    } catch (e) {
      console.error('Presentation generation error:', e);
    } finally {
      setIsPptGenerating(false);
    }
  };

  // Export PPTX
  const handleExportPPTX = async () => {
    if (!generatedDeck || !generatedDeck.slides) return;
    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';

      generatedDeck.slides.forEach((slideData: any) => {
        const slide = pptx.addSlide();
        slide.addText(slideData.title || '', { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 24, bold: true, color: '1E293B' });
        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, { x: 0.5, y: 1.5, w: 9, h: 0.8, fontSize: 16, color: '475569' });
        }
        if (slideData.bullets) {
          slide.addText(slideData.bullets.join('\n• '), { x: 0.5, y: 2.5, w: 9, h: 3, fontSize: 14, color: '334155' });
        }
      });

      await pptx.writeFile({ fileName: `${generatedDeck.title || 'Apresentacao_Yohan_AI'}.pptx` });
    } catch (e) {
      console.error('Error exporting PPTX:', e);
    }
  };

  // Generate Visualization
  const handleGenerateViz = async () => {
    if (!vizPrompt.trim() || isVizGenerating) return;
    setIsVizGenerating(true);
    try {
      const res = await fetch('/api/yohan/visualization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: vizPrompt, language: currentLanguage })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setGeneratedViz(data);
        if (onSaveToVault) {
          onSaveToVault('visualization', 'Diagrama PGC', data);
        }
      } else {
        console.warn('Visualization generation error:', res.status);
      }
    } catch (e) {
      console.error('Visualization generation error:', e);
    } finally {
      setIsVizGenerating(false);
    }
  };

  // Tax Review Audit
  const handleRunTaxReview = async () => {
    if (!taxText.trim() || isTaxAuditing) return;
    setIsTaxAuditing(true);
    try {
      const res = await fetch('/api/yohan/tax-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileText: taxText,
          fileName: taxFileName || 'Documento_Fiscal_Manual.txt',
          language: currentLanguage,
          country: 'Angola'
        })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setGeneratedTaxAudit(data);
        if (onSaveToVault) {
          onSaveToVault('tax-review', data.summary || 'Auditoria Fiscal', data);
        }
      } else {
        console.warn('Tax audit error:', res.status);
      }
    } catch (e) {
      console.error('Tax audit error:', e);
    } finally {
      setIsTaxAuditing(false);
    }
  };

  // Filtered conversations list
  const filteredConversations = useMemo(() => {
    if (!historySearchQuery.trim()) return conversations;
    const q = historySearchQuery.toLowerCase();
    return conversations.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.tag.toLowerCase().includes(q) ||
      c.messages.some(m => m.content.toLowerCase().includes(q))
    );
  }, [conversations, historySearchQuery]);

  return (
    <div 
      id="yohan-ai-workspace"
      className="ai-accountant-page bg-slate-900 text-slate-100 font-sans select-text relative"
      style={{
        height: 'calc(100vh - 64px)',
        width: '100%',
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* DRAG & DROP OVERLAY */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/85 backdrop-blur-sm border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none">
          <Upload className="w-12 h-12 text-indigo-400 animate-bounce mb-3" />
          <p className="text-base font-black text-white">Solte o ficheiro aqui para análise no Yohan AI</p>
          <p className="text-xs text-indigo-300 mt-1">Suporta PDF, Word (.docx), Excel (.xlsx, .csv) e Texto</p>
        </div>
      )}

      {/* CONVERSATIONS SIDEBAR / DRAWER */}
      {/* 1. Mobile Backdrop (< 900px) */}
      {!isDesktop && isHistoryOpen && (
        <div
          onClick={() => setIsHistoryOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* 2. Sidebar Column: 300px on desktop (in-flow), or overlay drawer on mobile */}
      {(isHistoryOpen || isDesktop) && (
        <aside
          style={{ width: 300, minWidth: 300, maxWidth: 300 }}
          className={`h-full bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ${
            isDesktop
              ? (isHistoryOpen ? 'flex' : 'hidden')
              : (isHistoryOpen ? 'fixed inset-y-0 left-0 z-50 shadow-2xl flex' : 'hidden')
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <YohanLogo size={18} />
              <h2 className="text-sm font-bold text-white">Conversas</h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCreateNewConversation}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                title="Nova Conversa"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar Painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Conversations */}
          <div className="p-3 border-b border-slate-800/80 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Pesquisar histórico..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const isEditing = editingConvId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`group relative flex flex-col p-2.5 rounded-xl transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-indigo-950/40 border-indigo-500/40 text-white shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editConvTitle}
                          onChange={(e) => setEditConvTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id);
                            if (e.key === 'Escape') setEditingConvId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-slate-900 border border-indigo-500 rounded px-2 py-0.5 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(conv.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingConvId(null)}
                          className="p-1 text-slate-400 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate flex-1">{conv.title}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(conv.id);
                                setEditConvTitle(conv.title);
                              }}
                              className="p-1 hover:text-indigo-300 text-slate-400"
                              title="Renomear"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              className="p-1 hover:text-red-400 text-slate-400"
                              title="Apagar conversa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>{conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}</span>
                          <span className="font-mono">{new Date(conv.updatedAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar todas</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono">v3.7 PGC</span>
          </div>
        </aside>
      )}

      {/* MAIN CHAT COLUMN */}
      <div 
        className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative"
        style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {/* TOP BAR WITH DYNAMIC GENERATION GRADIENT ANIMATION */}
        <header className={`ai-models-bar flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-6 py-3 bg-slate-950 border-b relative overflow-hidden shrink-0 transition-all duration-500 ${
          isLoading || isDocGenerating || isSheetGenerating || isPptGenerating || isVizGenerating || isTaxAuditing
            ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
            : 'border-slate-800'
        }`}>
          {/* Subtle animated gradient overlay during AI generation */}
          {(isLoading || isDocGenerating || isSheetGenerating || isPptGenerating || isVizGenerating || isTaxAuditing) && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 animate-pulse pointer-events-none" />
          )}

          {/* Animated gradient bottom accent bar */}
          {(isLoading || isDocGenerating || isSheetGenerating || isPptGenerating || isVizGenerating || isTaxAuditing) && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />
          )}

          <div className="flex items-center gap-3 relative z-10">
            {/* Sidebar toggle button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(prev => !prev)}
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              title="Alternar painel de conversas"
            >
              <Menu className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold hidden sm:inline">Histórico</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <SparklingAiAura 
                  isActive={isLoading || isDocGenerating || isSheetGenerating || isPptGenerating || isVizGenerating || isTaxAuditing} 
                  label="Yohan AI a processar consulta contabilística"
                />
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 border border-indigo-500/40 p-1 shadow-md transition-all relative z-10 ${
                  isLoading || isDocGenerating || isSheetGenerating || isPptGenerating || isVizGenerating || isTaxAuditing
                    ? 'shadow-indigo-500/40 animate-pulse ring-2 ring-indigo-400/50'
                    : 'shadow-indigo-500/20'
                }`}>
                  <YohanLogo size={24} showGlow={true} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                    Yohan AI
                  </h1>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border transition-all flex items-center gap-1 ${
                    isLoading || isDocGenerating || isSheetGenerating
                      ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/60 shadow-xs shadow-indigo-500/30 animate-pulse'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {(isLoading || isDocGenerating || isSheetGenerating) && <span className="animate-spin text-[10px]">✨</span>}
                    PGC Angola
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  {isLoading ? '✨ A analisar o PGC Angola e a redigir...' : 'Consultor & Auditor Contabilístico Sénior'}
                </p>
              </div>
            </div>
          </div>

          {/* MODE SELECTOR TABS & TOOLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none relative z-10">
            <button
              type="button"
              onClick={() => setActiveMode('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === 'chat'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat PGC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('document')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === 'document'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('spreadsheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === 'spreadsheet'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('presentation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === 'presentation'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Slides</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('visualization')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === 'visualization'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Diagramas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('tax-review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === 'tax-review'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Auditoria</span>
            </button>

            {/* QUICK TOOLS MODAL TRIGGER */}
            <button
              type="button"
              onClick={() => setShowGlossaryModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800/90 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Pesquisar contas, regras e glossário do PGC"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Glossário & Contas PGC</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          {/* TAB 1: CHAT */}
          {activeMode === 'chat' && (
            <div className="ai-chat-area flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* TWO-PHASE GENERATION PROGRESS BANNER */}
              {docProgress && (
                <div className="px-4 py-2.5 bg-indigo-950/90 border-b border-indigo-500/30 flex flex-col gap-1.5 shrink-0 z-10 shadow-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-200 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>{docProgress.title}</span>
                    </span>
                    <span className="text-indigo-300 font-mono text-[11px]">
                      {docProgress.current} / {docProgress.total} seções ({Math.round((docProgress.current / Math.max(1, docProgress.total)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.round((docProgress.current / Math.max(1, docProgress.total)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* MESSAGES VIRTUALIZED / SCROLL LIST */}
              <VirtualizedChatMessagesList
                messages={messages.map(m => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  timestamp: m.timestamp,
                  rating: (m as any).feedback || undefined,
                  edited: m.edited,
                  editedAt: m.editedAt,
                  attachedFile: m.attachedFile
                }))}
                isGenerating={isLoading}
                copiedId={copiedId}
                speakingMsgId={speakingMessageId}
                onCopy={handleCopy}
                onSpeak={(text, id) => handleToggleSpeech(id, text)}
                onFeedback={handleFeedback}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onQuickSearchInsert={(term) => {
                  setInputMessage(prev => prev ? `${prev} ${term}` : term);
                }}
              />

              {/* PROMPT TEMPLATES QUICK CHIPS */}
              <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 overflow-x-auto scrollbar-none flex items-center gap-2 shrink-0">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 shrink-0">
                  Modelos:
                </span>
                {PROMPT_TEMPLATES.slice(0, 5).map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(undefined, t.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>{t.icon}</span>
                    <span>{t.title}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Ver Todos</span>
                </button>
              </div>

              {/* INPUT CONTAINER */}
              <div className="ai-input-container p-3 sm:p-4 bg-slate-950 border-t border-slate-800 mb-0">
                {/* ATTACHED FILE PREVIEW */}
                {attachedFile && (
                  <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between px-3 py-1.5 bg-indigo-950/70 border border-indigo-500/40 rounded-xl text-xs text-indigo-200">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold">{attachedFile.name}</span>
                      {attachedFile.size && (
                        <span className="text-[10px] text-indigo-400">({Math.round(attachedFile.size / 1024)} KB)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1 hover:text-white text-indigo-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
                  {/* File Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shrink-0"
                    title="Anexar documento (PDF, Word, Excel, TXT)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Microphone Voice Input */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                      isRecordingVoice
                        ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                        : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title={isRecordingVoice ? 'Parar gravação' : 'Falar por voz'}
                  >
                    {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Main text input textarea (Enter for newline, Ctrl+Enter / Cmd+Enter to send) */}
                  <div className="flex-1 flex flex-col">
                    <textarea
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        const isSendShortcut = e.key === 'Enter' && (e.ctrlKey || e.metaKey);
                        if (isSendShortcut) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                        // Enter alone creates a new line normally
                      }}
                      placeholder="Coloque a sua dúvida sobre lançamentos, PGC Angola, IVA, balancetes..."
                      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none min-h-[42px] max-h-32 font-sans leading-relaxed"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 self-end mb-0.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </form>

                {/* Visual shortcut hint */}
                <p className="text-[10px] text-slate-500 text-center mt-1.5 font-medium select-none">
                  <span className="font-semibold text-slate-400">Enter</span> para nova linha &middot; <span className="font-semibold text-slate-400">Ctrl+Enter</span> para enviar
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENT GENERATOR (WORD .DOCX) */}
          {activeMode === 'document' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Gerador de Relatórios & Pareceres Técnicos PGC</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Gere documentos formais estruturados para auditoria, relatórios de gestão, notas às contas ou justificações fiscais.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={docPrompt}
                    onChange={(e) => setDocPrompt(e.target.value)}
                    placeholder="Ex: Parecer técnico sobre amortização acelerada de imobilizações corpóreas"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateDoc}
                    disabled={isDocGenerating || !docPrompt.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    {isDocGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Gerar Documento</span>
                  </button>
                </div>

                {docProgress && (
                  <div className="bg-slate-900/90 border border-indigo-500/40 rounded-xl p-3.5 space-y-2 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>{docProgress.title}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {docProgress.current} / {docProgress.total} seções ({Math.round((docProgress.current / Math.max(1, docProgress.total)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.round((docProgress.current / Math.max(1, docProgress.total)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {generatedDoc && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-white">{generatedDoc.title}</h3>
                      <p className="text-xs text-indigo-300 font-medium">{generatedDoc.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportDOCX}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar DOCX</span>
                    </button>
                  </div>

                  <div className="space-y-4 text-sm text-slate-200 leading-relaxed">
                    {(generatedDoc.sections || []).map((sec: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <h4 className="font-bold text-white text-base border-l-2 border-indigo-500 pl-3">{sec.heading}</h4>
                        {(sec.paragraphs || []).map((p: string, pIdx: number) => (
                          <p key={pIdx} className="text-slate-300">{p}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 3: SPREADSHEET GENERATOR (EXCEL .XLSX) */}
          {activeMode === 'spreadsheet' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Grid className="w-4 h-4 text-indigo-400" />
                    <span>Gerador de Planilhas & Modelos Financeiros Excel</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Crie modelos de cálculo, mapas de amortização, apuramento de IVA e mapas de pessoal com fórmulas Excel nativas.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={sheetPrompt}
                    onChange={(e) => setSheetPrompt(e.target.value)}
                    placeholder="Ex: Balancete de Verificação de 6 colunas ou Mapa de Liquidação de IVA 14%"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateSheet}
                    disabled={isSheetGenerating || !sheetPrompt.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    {isSheetGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Gerar Planilha</span>
                  </button>
                </div>
              </div>

              {generatedSheet && generatedSheet.grid && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                    <div>
                      <h3 className="text-base font-black text-white">{generatedSheet.title}</h3>
                      <span className="text-xs text-indigo-300 font-mono">{generatedSheet.sheetName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportXLSX}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Exportar XLSX</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-xs text-left text-slate-200">
                      <tbody>
                        {generatedSheet.grid.map((row: any[], rIdx: number) => (
                          <tr key={rIdx} className="border-b border-slate-700/60 hover:bg-slate-750">
                            {row.map((cell: any, cIdx: number) => (
                              <td
                                key={cIdx}
                                className={`px-3 py-2 ${cell.isBold ? 'font-bold text-white' : ''} ${
                                  cell.align === 'right' ? 'text-right' : cell.align === 'center' ? 'text-center' : 'text-left'
                                }`}
                                style={{ backgroundColor: cell.bgColor ? `${cell.bgColor}33` : undefined }}
                              >
                                {cell.value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 4: PRESENTATION GENERATOR (POWERPOINT .PPTX) */}
          {activeMode === 'presentation' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-indigo-400" />
                    <span>Gerador de Slides & Apresentações Executivas PPTX</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Crie apresentações de formação, reuniões de fecho de contas ou análises de demonstrações financeiras.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={pptPrompt}
                    onChange={(e) => setPptPrompt(e.target.value)}
                    placeholder="Ex: Formação sobre Fecho de Contas e Determinação do Resultado Líquido"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePpt}
                    disabled={isPptGenerating || !pptPrompt.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    {isPptGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Gerar Slides</span>
                  </button>
                </div>
              </div>

              {generatedDeck && generatedDeck.slides && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                    <div>
                      <h3 className="text-base font-black text-white">{generatedDeck.title}</h3>
                      <p className="text-xs text-indigo-300">
                        Slide {currentSlideIndex + 1} de {generatedDeck.slides.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentSlideIndex(p => Math.max(0, p - 1))}
                        disabled={currentSlideIndex === 0}
                        className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-white cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentSlideIndex(p => Math.min(generatedDeck.slides.length - 1, p + 1))}
                        disabled={currentSlideIndex === generatedDeck.slides.length - 1}
                        className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-white cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleExportPPTX}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer ml-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar PPTX</span>
                      </button>
                    </div>
                  </div>

                  {generatedDeck.slides[currentSlideIndex] && (
                    <div className="aspect-video bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-700 rounded-xl p-8 flex flex-col justify-between shadow-inner">
                      <div className="space-y-3">
                        <h4 className="text-xl sm:text-2xl font-black text-white">
                          {generatedDeck.slides[currentSlideIndex].title}
                        </h4>
                        {generatedDeck.slides[currentSlideIndex].subtitle && (
                          <p className="text-sm text-indigo-300">
                            {generatedDeck.slides[currentSlideIndex].subtitle}
                          </p>
                        )}
                      </div>

                      {generatedDeck.slides[currentSlideIndex].bullets && (
                        <ul className="space-y-2 text-sm text-slate-200">
                          {generatedDeck.slides[currentSlideIndex].bullets.map((b: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="text-[10px] text-slate-500 font-mono text-right">
                        {generatedDeck.slides[currentSlideIndex].footerText || 'Yohan AI Presentation'}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 5: VISUALIZATION / DIAGRAM GENERATOR (SVG) */}
          {activeMode === 'visualization' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <span>Gerador de Diagramas Vetoriais & Fluxogramas PGC</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Gere diagramas SVG interativos, fluxogramas de compras/vendas e estruturas de contas.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={vizPrompt}
                    onChange={(e) => setVizPrompt(e.target.value)}
                    placeholder="Ex: Fluxograma do ciclo de compras e registo na Classe 2 (Existências) e Classe 3 (Fornecedores)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateViz}
                    disabled={isVizGenerating || !vizPrompt.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    {isVizGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Gerar Diagrama</span>
                  </button>
                </div>
              </div>

              {generatedViz && generatedViz.svgMarkup && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                    <h3 className="text-base font-black text-white">Diagrama Vetorial Interativo</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([generatedViz.svgMarkup], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'Diagrama_PGC_Yohan_AI.svg';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar SVG</span>
                    </button>
                  </div>

                  <div 
                    className="p-4 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: generatedViz.svgMarkup }}
                  />
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 6: TAX REVIEW & AUDITING */}
          {activeMode === 'tax-review' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Auditoria de Conformidade Fiscal & PGC Angola</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Cole o texto de faturas, contratos, extratos de diário ou ficheiros SAF-T para deteção de inconformidades e prazos AGT.
                  </p>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={taxText}
                    onChange={(e) => setTaxText(e.target.value)}
                    placeholder="Cole aqui o extrato contabilístico, dados da fatura ou transação a auditar..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRunTaxReview}
                      disabled={isTaxAuditing || !taxText.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isTaxAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Executar Auditoria Fiscal</span>
                    </button>
                  </div>
                </div>
              </div>

              {generatedTaxAudit && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                    <div>
                      <h3 className="text-base font-black text-white">Resultado da Auditoria Fiscal</h3>
                      <p className="text-xs text-slate-400">{generatedTaxAudit.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Score de Conformidade:</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-black rounded-lg border border-emerald-500/30">
                        {generatedTaxAudit.score}%
                      </span>
                    </div>
                  </div>

                  {generatedTaxAudit.findings && generatedTaxAudit.findings.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Apontamentos da Auditoria</h4>
                      <div className="space-y-2">
                        {generatedTaxAudit.findings.map((f: any, idx: number) => (
                          <div key={idx} className="p-3.5 bg-slate-900/90 border border-slate-700 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-white">{f.title}</span>
                              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                {f.legislation}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300">{f.description}</p>
                            {f.remediation && (
                              <p className="text-xs text-emerald-400 font-medium">💡 Ação recomendada: {f.remediation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: CLEAR ALL CONVERSATIONS CONFIRMATION */}
      <AnimatePresence>
        {showClearAllModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">Limpar Todas as Conversas?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Esta ação apagará permanentemente todo o histórico de consultas com o Yohan AI. Deseja continuar?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleClearAllConversations}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Sim, Limpar Tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: DYNAMIC PGC GLOSSARY & TOOLS LOOKUP */}
      <AnimatePresence>
        {showGlossaryModal && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-3xl w-full max-h-[88vh] flex flex-col space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Ferramentas: Glossário & Contas PGC Angola</h3>
                    <p className="text-xs text-slate-400">Decreto n.º 82/2001 e Código do IVA (Decreto Presidencial 180/19)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGlossaryModal(false);
                    setGlossarySearchQuery('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={glossarySearchQuery}
                  onChange={(e) => setGlossarySearchQuery(e.target.value)}
                  placeholder="Pesquisar conta (ex: 34.5, 21, 43, 71) ou termo (IVA, Imparidade, FST, Retenção)..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                />
                {glossarySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGlossarySearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Class Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedGlossaryClass(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                    selectedGlossaryClass === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  Todas as Classes
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((cNum) => (
                  <button
                    key={cNum}
                    type="button"
                    onClick={() => setSelectedGlossaryClass(cNum === selectedGlossaryClass ? null : cNum)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      selectedGlossaryClass === cNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    Classe {cNum}
                  </button>
                ))}
              </div>

              {/* Search Results / Content Area */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {/* When user searches */}
                {glossarySearchQuery.trim() ? (
                  (() => {
                    const q = glossarySearchQuery.toLowerCase();
                    const filteredAccounts = PGC_CHART_OF_ACCOUNTS.filter(acc => 
                      acc.codigo.toLowerCase().includes(q) ||
                      acc.nome.toLowerCase().includes(q) ||
                      (acc.descricao && acc.descricao.toLowerCase().includes(q))
                    );

                    if (filteredAccounts.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-400 space-y-2">
                          <p className="text-xs">Nenhuma conta encontrada para "{glossarySearchQuery}".</p>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage(undefined, `Como se classifica e contabiliza "${glossarySearchQuery}" no PGC Angola?`);
                              setShowGlossaryModal(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                          >
                            Perguntar ao Yohan AI no Chat
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Resultados encontrados: {filteredAccounts.length}</span>
                          <span className="text-[11px] text-slate-500">Clique em "Inserir" para usar no chat</span>
                        </div>
                        {filteredAccounts.map((acc) => (
                          <div
                            key={acc.codigo}
                            className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                                  {acc.codigo}
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">
                                  {acc.nome}
                                </h4>
                                {acc.tipo && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    ({acc.tipo})
                                  </span>
                                )}
                              </div>
                              {acc.descricao && (
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {acc.descricao}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const textToInsert = `[PGC ${acc.codigo} - ${acc.nome}]: ${acc.descricao || 'Conta oficial PGC'}`;
                                  setInputMessage(prev => prev ? `${prev}\n${textToInsert}` : textToInsert);
                                  setShowGlossaryModal(false);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Inserir definição na caixa de texto do chat"
                              >
                                <span>Inserir no Chat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage(undefined, `Explica a movimentação a débito e crédito da conta ${acc.codigo} (${acc.nome}) e exemplos práticos no PGC Angola.`);
                                  setShowGlossaryModal(false);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>Consultar</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  /* Display Classes Overview or selected class accounts */
                  selectedGlossaryClass ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1">
                        <h4 className="text-xs font-bold text-indigo-300">
                          {PGC_CLASSES.find(c => c.classNum === selectedGlossaryClass)?.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {PGC_CHART_OF_ACCOUNTS.filter(a => a.classe === selectedGlossaryClass).length} contas registadas
                        </span>
                      </div>
                      {PGC_CHART_OF_ACCOUNTS.filter(a => a.classe === selectedGlossaryClass).map((acc) => (
                        <div
                          key={acc.codigo}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                                {acc.codigo}
                              </span>
                              <span className="text-xs font-bold text-white group-hover:text-indigo-200">
                                {acc.nome}
                              </span>
                              {acc.tipo && (
                                <span className="text-[10px] text-slate-500">
                                  ({acc.tipo})
                                </span>
                              )}
                            </div>
                            {acc.descricao && <p className="text-xs text-slate-300">{acc.descricao}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const textToInsert = `[PGC ${acc.codigo} - ${acc.nome}]: ${acc.descricao || 'Conta oficial PGC'}`;
                                setInputMessage(prev => prev ? `${prev}\n${textToInsert}` : textToInsert);
                                setShowGlossaryModal(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                            >
                              Inserir
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSendMessage(undefined, `Explica o funcionamento e lançamentos típicos da conta ${acc.codigo} - ${acc.nome} no PGC Angola.`);
                                setShowGlossaryModal(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                            >
                              Consultar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PGC_CLASSES.map((cls) => (
                        <div
                          key={cls.classNum}
                          onClick={() => setSelectedGlossaryClass(cls.classNum)}
                          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">
                              {cls.name}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {cls.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ALL PROMPT TEMPLATES */}
      <AnimatePresence>
        {showTemplatesModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Modelos de Consultoria PGC & Fiscal</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {PROMPT_TEMPLATES.map((tpl, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      handleSendMessage(undefined, tpl.prompt);
                      setShowTemplatesModal(false);
                    }}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {tpl.title}
                        </h4>
                        <span className="text-[10px] text-indigo-400/80 font-medium">{tpl.category}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {tpl.prompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YohanAI;

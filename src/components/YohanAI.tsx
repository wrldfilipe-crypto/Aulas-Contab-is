import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, MessageSquare, FileText, Grid, BarChart3, Presentation, ShieldCheck, 
  Send, Sparkles, Download, Edit3, Trash2, ArrowRight, ArrowLeft, RefreshCw, 
  CheckCircle, AlertTriangle, Info, Upload, ChevronRight, ChevronLeft, 
  Share2, Plus, Volume2, VolumeX, Copy, Check, X, RotateCcw, RotateCw,
  Paperclip, Loader2, Calculator, BookOpen, Layers, Maximize2, FileSpreadsheet,
  Mic, MicOff, ThumbsUp, ThumbsDown, Search, SlidersHorizontal, ArrowUpRight,
  HelpCircle, Eye, FileCode, CheckSquare, Sparkle, History, Menu,
  Pin, PinOff, MoreVertical, ChevronUp, ChevronDown, Wrench
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
import { extrairTextoDocumento } from '../services/documentExtractor';
import { SparklingAiAura } from './SparklingAiAura';
import { YohanLogo } from './YohanLogo';
import {
  getLocalConversations,
  saveConversation,
  deleteConversation,
  syncConversationsWithFirestore,
  setupChatSyncListener,
  getUserChatPref,
  setUserChatPref,
  togglePinConversation,
  renameConversation,
  type ChatConversation
} from '../services/aiChatPersistenceService';

export interface YohanAIProps {
  currentLanguage?: string;
  onSaveToVault?: (type: string, title: string, content: any) => void;
  onBack?: () => void;
  onOpenNav?: () => void;
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
  uid?: string;
  title: string;
  updatedAt: number | string;
  tag?: string;
  standard?: string;
  date?: string;
  timestamp?: string;
  pinned?: boolean;
  synced?: boolean;
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
  onSaveToVault,
  onBack,
  onOpenNav
}) => {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.userId || (currentUser as any)?.id || 'default_user';

  const handleOpenNav = () => {
    if (onOpenNav) {
      onOpenNav();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ga-open-mobile-nav'));
    }
  };

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback: emit global event to navigate to dashboard
      window.dispatchEvent(new CustomEvent('navigate_tab', { detail: 'dashboard' }));
    }
  };

  const [activeMode, setActiveMode] = useState<YohanMode>('chat');
  const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [docProgress, setDocProgress] = useState<{ current: number; total: number; title: string } | null>(null);

  // Qualidade de resposta: rápido (budget 0) vs detalhado (budget 24576)
  const [qualityMode, setQualityMode] = useState<'fast' | 'detailed'>('fast');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [regeneratingMsgId, setRegeneratingMsgId] = useState<string | null>(null);
  const [menuOpenConvId, setMenuOpenConvId] = useState<string | null>(null);
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
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

  // Conversations Storage: fallback síncrono inicial + sincronização IndexedDB/Firestore
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const key = `ga_ai_accountant_history_${currentUserId}`;
    const legacyKey = `ga_yohan_conversations_${currentUserId}`;
    const saved = typeof window !== 'undefined' ? (localStorage.getItem(key) || localStorage.getItem(legacyKey)) : null;
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
      updatedAt: Date.now(),
      tag: '#Geral',
      pinned: false,
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

  // Sincronização offline-first persistente em IndexedDB e Firestore
  useEffect(() => {
    let isMounted = true;

    // Carregar preferências persistentes do utilizador
    getUserChatPref(currentUserId, 'isSidebarCollapsed', false).then((val) => {
      if (isMounted) {
        const collapsed = !!val;
        setIsSidebarCollapsed(collapsed);
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setIsHistoryOpen(!collapsed);
        }
      }
    });
    getUserChatPref(currentUserId, 'qualityMode', 'fast').then((val) => {
      if (isMounted) setQualityMode(val === 'detailed' ? 'detailed' : 'fast');
    });

    // 1. Carregar do IndexedDB local
    getLocalConversations(currentUserId).then((local) => {
      if (isMounted && local && local.length > 0) {
        setConversations(local as any);
        if (!local.some(c => c.id === activeConvId)) {
          setActiveConvId(local[0].id);
        }
      }
    });

    // 2. Sincronizar com Firestore
    syncConversationsWithFirestore(currentUserId, (synced) => {
      if (isMounted && synced && synced.length > 0) {
        setConversations(synced as any);
        if (!synced.some(c => c.id === activeConvId)) {
          setActiveConvId(synced[0].id);
        }
      }
    });

    // 3. Listener em tempo real e online
    const unsubscribe = setupChatSyncListener(currentUserId, (updated) => {
      if (isMounted && updated && updated.length > 0) {
        setConversations(updated as any);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUserId]);

  // Fechar menus dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      if (menuOpenConvId) setMenuOpenConvId(null);
      if (showQualityMenu) setShowQualityMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [menuOpenConvId, showQualityMenu]);

  // Current active conversation
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConvId) || conversations[0];
  }, [conversations, activeConvId]);

  const messages = activeConversation?.messages || [];

  // Indica se a conversa atual já tem mensagens do utilizador (para alternar entre estado vazio centrado e lista de mensagens)
  const hasUserMessages = useMemo(() => {
    return messages.some(m => m.role === 'user');
  }, [messages]);

  const getActiveModeLabel = (mode: YohanMode): string => {
    switch (mode) {
      case 'chat': return 'Chat PGC';
      case 'document': return 'Word (.docx)';
      case 'spreadsheet': return 'Excel (.xlsx)';
      case 'presentation': return 'Slides (.pptx)';
      case 'visualization': return 'Diagramas';
      case 'tax-review': return 'Auditoria AGT';
      default: return 'Chat PGC';
    }
  };

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

  // Save conversations to localStorage whenever they change as backup
  useEffect(() => {
    try {
      localStorage.setItem(`ga_ai_accountant_history_${currentUserId}`, JSON.stringify(conversations.slice(0, 50)));
      localStorage.setItem(`ga_yohan_chat_history`, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed saving Yohan AI conversations:', e);
    }
  }, [conversations, currentUserId, messages]);

  // Listen to Global Header Events
  useEffect(() => {
    const handleOpenHistory = () => {
      setIsHistoryOpen(prev => !prev);
    };
    const handleNewChat = () => handleCreateNewConversation();

    window.addEventListener('ga-open-ai-history', handleOpenHistory);
    window.addEventListener('ga-new-ai-chat', handleNewChat);

    return () => {
      window.removeEventListener('ga-open-ai-history', handleOpenHistory);
      window.removeEventListener('ga-new-ai-chat', handleNewChat);
    };
  }, [isDesktop]);

  // Atalhos de teclado locais do chat Yohan AI (Ctrl/Cmd+Shift+O e Ctrl/Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      // Ctrl/Cmd + Shift + O -> Nova conversa
      if (e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        handleCreateNewConversation();
        return;
      }

      // Ctrl/Cmd + K -> Abrir busca rápida de conversas
      if (!e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isDesktop) {
          handleToggleSidebarCollapse(false);
        } else {
          setIsHistoryOpen(true);
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop]);

  // Scroll to bottom gerido internamente pelo VirtualizedChatMessagesList

  // Alternar colapso da barra lateral (Desktop)
  const handleToggleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    setIsHistoryOpen(!collapsed);
    setUserChatPref(currentUserId, 'isSidebarCollapsed', collapsed).catch(() => {});
  };

  // Alternar histórico (drawer em mobile, sidebar em desktop via isHistoryOpen)
  const handleToggleHistory = () => {
    setIsHistoryOpen(prev => {
      const next = !prev;
      if (isDesktop) {
        setIsSidebarCollapsed(!next);
        setUserChatPref(currentUserId, 'isSidebarCollapsed', !next).catch(() => {});
      }
      return next;
    });
  };

  // Sincronizar isSidebarCollapsed quando isHistoryOpen muda no Desktop
  useEffect(() => {
    if (isDesktop) {
      const collapsed = !isHistoryOpen;
      if (isSidebarCollapsed !== collapsed) {
        setIsSidebarCollapsed(collapsed);
        setUserChatPref(currentUserId, 'isSidebarCollapsed', collapsed).catch(() => {});
      }
    }
  }, [isHistoryOpen, isDesktop, currentUserId]);

  // Alterar modo de resposta (Rápido vs Detalhado)
  const handleSetQualityMode = (mode: 'fast' | 'detailed') => {
    setQualityMode(mode);
    setShowQualityMenu(false);
    setUserChatPref(currentUserId, 'qualityMode', mode).catch(() => {});
  };

  // Create New Conversation
  const handleCreateNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'Nova Consulta PGC',
      updatedAt: Date.now(),
      tag: '#Geral',
      pinned: false,
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
    saveConversation(currentUserId, newConv as any).catch(err => console.warn('Error saving new conv:', err));
  };

  // Switch Conversation
  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setActiveMode('chat');
    setIsHistoryOpen(false);
    setMenuOpenConvId(null);
  };

  // Alternar fixação (Pin / Unpin)
  const handleTogglePin = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMenuOpenConvId(null);
    const target = conversations.find(c => c.id === id);
    if (!target) return;
    const newPinned = !target.pinned;
    const now = Date.now();

    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, pinned: newPinned, updatedAt: now } : c
    ));

    try {
      await togglePinConversation(currentUserId, id, newPinned);
    } catch (err) {
      console.warn('Error toggling pin:', err);
    }
  };

  // Rename Conversation
  const handleSaveRename = async (id: string) => {
    if (!editConvTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    const newTitle = editConvTitle.trim();
    setEditingConvId(null);
    setEditConvTitle('');
    const now = Date.now();

    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, title: newTitle, updatedAt: now } : c
    ));

    try {
      await renameConversation(currentUserId, id, newTitle);
    } catch (err) {
      console.warn('Error renaming conversation:', err);
    }
  };

  // Delete Single Conversation
  const handleDeleteConversation = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmDeleteConvId(null);
    setMenuOpenConvId(null);

    const updated = conversations.filter(c => c.id !== id);
    if (updated.length === 0) {
      const freshConv: Conversation = {
        id: `conv-${Date.now()}`,
        title: 'Nova Consulta PGC',
        updatedAt: Date.now(),
        tag: '#Geral',
        pinned: false,
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
      saveConversation(currentUserId, freshConv as any).catch(() => {});
    } else {
      setConversations(updated);
      if (activeConvId === id) {
        setActiveConvId(updated[0].id);
      }
    }

    try {
      await deleteConversation(currentUserId, id);
    } catch (err) {
      console.warn('Error deleting conversation:', err);
    }
  };

  // Clear All Conversations
  const handleClearAllConversations = () => {
    const freshConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'Nova Consulta PGC',
      updatedAt: Date.now(),
      tag: '#Geral',
      pinned: false,
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
    saveConversation(currentUserId, freshConv as any).catch(() => {});
  };

  // Regenerar resposta de mensagem do assistente
  const handleRegenerateMessage = async (msgId: string) => {
    if (isLoading || regeneratingMsgId) return;

    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const priorMessages = messages.slice(0, msgIndex);
    const lastUserMsg = [...priorMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) {
      console.warn('No user prompt found prior to message:', msgId);
      return;
    }

    const userPrompt = lastUserMsg.content;
    const lastUserIndex = priorMessages.lastIndexOf(lastUserMsg);
    const historyForModel = priorMessages.slice(0, lastUserIndex).map(m => ({
      role: m.role,
      content: m.content
    }));

    setRegeneratingMsgId(msgId);
    setIsLoading(true);

    const updateAssistantMsg = (fullText: string) => {
      setConversations(prev => prev.map(c => {
        if (c.id !== activeConvId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map(m => m.id === msgId ? { ...m, content: fullText, feedback: null } : m)
        };
      }));
    };

    updateAssistantMsg('');

    try {
      const thinkingBudget = qualityMode === 'detailed' ? 24576 : 0;
      const fullResponse = await perguntarYohanStreaming(
        userPrompt,
        historyForModel,
        (chunkText) => {
          updateAssistantMsg(chunkText);
        },
        { thinkingBudget }
      );
      updateAssistantMsg(fullResponse);

      const active = conversations.find(c => c.id === activeConvId);
      if (active) {
        const updatedMsgs = active.messages.map(m => m.id === msgId ? { ...m, content: fullResponse } : m);
        saveConversation(currentUserId, {
          ...active,
          messages: updatedMsgs,
          updatedAt: Date.now()
        } as any).catch(() => {});
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const friendlyError = errMsg.includes('429')
        ? '⚠️ Limite de quota da API Gemini atingido. Aguarde alguns instantes.'
        : `⚠️ Não foi possível regenerar a resposta: ${errMsg}`;
      updateAssistantMsg(friendlyError);
    } finally {
      setIsLoading(false);
      setRegeneratingMsgId(null);
    }
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

  // File Upload and Text Extraction with Client-First Extraction & Resilient OCR Fallback
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // 1. Ficheiros baseados em texto (txt, csv, json, md, tsv)
      if (file.type.includes('text') || ['txt', 'csv', 'json', 'md', 'tsv'].includes(ext)) {
        const text = await file.text();
        setAttachedFile({ name: file.name, content: text.slice(0, 20000), size: file.size });
        return;
      }

      // 2. Extração client-side para PDF e DOCX (rápido, sem rede, à prova de falhas)
      if (ext === 'pdf' || ext === 'docx') {
        try {
          const docData = await extrairTextoDocumento(file);
          if (docData && docData.texto && docData.texto.length > 20) {
            setAttachedFile({ name: file.name, content: docData.texto.slice(0, 25000), size: file.size });
            return;
          }
        } catch (clientErr) {
          console.warn('[Yohan AI] Client extraction notice, trying OCR backend:', clientErr);
        }
      }

      // 3. OCR no backend para PDFs digitalizados, Imagens (PNG, JPG, etc.) ou ficheiros complexos
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => reject(new Error('Falha ao codificar ficheiro'));
          reader.readAsDataURL(file);
        });

        if (base64) {
          const res = await fetch('/api/yohan/extract-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              language: currentLanguage || 'pt-AO'
            })
          });

          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            const extracted = data.extractedText || data.summary || data.text || '';
            if (extracted) {
              setAttachedFile({ name: file.name, content: extracted.slice(0, 25000), size: file.size });
              return;
            }
          }
        }
      } catch (backendErr) {
        console.warn('[Yohan AI] Backend OCR notice:', backendErr);
      }

      // 4. Fallback seguro para qualquer ficheiro: leitura em texto bruto ou descritor de anexo
      const fallbackText = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsText(file);
      });

      const cleanFallback = fallbackText && fallbackText.length > 20 && !fallbackText.includes('\u0000')
        ? fallbackText.slice(0, 10000)
        : `[Documento anexado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`;

      setAttachedFile({ name: file.name, content: cleanFallback, size: file.size });
    } catch (err) {
      console.warn('[Yohan AI] File extraction warning:', err);
      // Garante que o ficheiro fica anexado para o utilizador poder interagir
      setAttachedFile({ name: file.name, content: `[Ficheiro carregado: ${file.name}]`, size: file.size });
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
        const thinkingBudget = qualityMode === 'detailed' ? 24576 : 0;
        const fullResponse = await perguntarYohanStreaming(
          fullUserPrompt,
          recentHistory.slice(0, -1),
          (chunkText) => {
            updateAssistantMsg(chunkText);
          },
          { thinkingBudget }
        );
        updateAssistantMsg(fullResponse);

        // Guardar persistente em IndexedDB e Firestore
        const currentConv = conversations.find(c => c.id === activeConvId);
        if (currentConv) {
          saveConversation(currentUserId, {
            ...currentConv,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...updatedMessages, { id: botMsgId, role: 'assistant', content: fullResponse, timestamp: botTimestamp }]
          } as any).catch(err => console.warn('Error saving chat message to Firestore/IndexedDB:', err));
        }

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
      let friendlyError = rawErrMsg;

      if (rawErrMsg.includes('Incomplete JSON') || rawErrMsg.includes('JSON segment') || rawErrMsg.includes('STREAM_INCOMPLETE')) {
        friendlyError = 'Não consegui concluir a resposta. Tenta novamente ou divide a pergunta.';
      }

      const errorMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: friendlyError.startsWith('⚠️') || friendlyError.startsWith('❌') || friendlyError.startsWith('Não')
          ? (friendlyError.startsWith('Não') ? `⚠️ ${friendlyError}` : friendlyError)
          : `⚠️ Não foi possível obter resposta: ${friendlyError}\n\n*Sugestão:* Tente novamente ou formule a pergunta de forma mais direta.`,
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
      let friendlyError = rawErrMsg;

      if (rawErrMsg.includes('Incomplete JSON') || rawErrMsg.includes('JSON segment') || rawErrMsg.includes('STREAM_INCOMPLETE')) {
        friendlyError = 'Não consegui concluir a resposta. Tenta novamente ou divide a pergunta.';
      }

      const errorMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: `⚠️ Não foi possível obter resposta após a edição: ${friendlyError}`,
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

  // Data relativa formatada (Hoje, Ontem, ou dd/mm)
  const formatRelativeDate = (timestamp: number | string | undefined): string => {
    if (!timestamp) return 'Hoje';
    const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    if (isNaN(time) || time <= 0) return 'Hoje';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    if (time >= startOfToday) {
      return 'Hoje';
    } else if (time >= startOfYesterday) {
      return 'Ontem';
    } else {
      return new Date(time).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
  };

  // Separar conversas fixadas e recentes com filtro de busca (título, tag e 1ª mensagem)
  const { pinnedConversations, recentConversations } = useMemo(() => {
    const q = historySearchQuery.toLowerCase().trim();
    const filtered = conversations.filter(c => {
      if (!q) return true;
      const titleMatch = (c.title || '').toLowerCase().includes(q);
      const tagMatch = (c.tag || '').toLowerCase().includes(q);
      const firstMsg = c.messages?.[0]?.content || '';
      const firstMsgMatch = firstMsg.toLowerCase().includes(q);
      return titleMatch || tagMatch || firstMsgMatch;
    });

    const toTime = (v: any) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const parsed = new Date(v).getTime();
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const pinned = filtered
      .filter(c => !!c.pinned)
      .sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));

    const recent = filtered
      .filter(c => !c.pinned)
      .sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));

    return { pinnedConversations: pinned, recentConversations: recent };
  }, [conversations, historySearchQuery]);

  // Renderizador de item de conversa (com renomear inline, fixar/desafixar e apagar)
  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeConvId;
    const isEditing = editingConvId === conv.id;
    const isMenuOpen = menuOpenConvId === conv.id;
    const isConfirmingDelete = confirmDeleteConvId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => handleSelectConversation(conv.id)}
        className={`group relative flex flex-col p-2.5 rounded-xl transition-all cursor-pointer border ${
          isActive
            ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-xs'
            : 'bg-transparent border-transparent hover:bg-slate-900/90 text-slate-300 hover:text-white'
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
              className="flex-1 bg-slate-900 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleSaveRename(conv.id)}
              className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
              title="Guardar título"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditingConvId(null)}
              className="p-1 text-slate-400 hover:text-slate-300 cursor-pointer"
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isConfirmingDelete ? (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="p-2 bg-rose-950/80 border border-rose-500/50 rounded-lg flex items-center justify-between text-xs text-rose-200"
          >
            <span className="text-[11px] truncate">Apagar conversa?</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px] cursor-pointer"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteConvId(null)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] cursor-pointer"
              >
                Não
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold truncate flex-1 leading-snug">
                {conv.title}
              </span>

              {/* Ações rápidas (Pin & Menu More) */}
              <div className="flex items-center gap-0.5 shrink-0">
                {/* Botão Pin */}
                <button
                  type="button"
                  onClick={(e) => handleTogglePin(conv.id, e)}
                  className={`p-1 rounded-md transition-all cursor-pointer ${
                    conv.pinned
                      ? 'text-indigo-400 hover:text-indigo-300 opacity-100'
                      : 'text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100'
                  }`}
                  title={conv.pinned ? "Desafixar conversa" : "Fixar conversa"}
                >
                  {conv.pinned ? <Pin className="w-3 h-3 fill-indigo-400 rotate-45" /> : <Pin className="w-3 h-3 rotate-45" />}
                </button>

                {/* Botão Mais Opções */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenConvId(isMenuOpen ? null : conv.id);
                    }}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Mais opções"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>

                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-30 flex flex-col text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpenConvId(null);
                          setEditingConvId(conv.id);
                          setEditConvTitle(conv.title);
                        }}
                        className="px-2.5 py-1.5 text-left text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-400" />
                        <span>Renomear</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(conv.id, e)}
                        className="px-2.5 py-1.5 text-left text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        {conv.pinned ? <PinOff className="w-3 h-3 text-amber-400" /> : <Pin className="w-3 h-3 text-indigo-400" />}
                        <span>{conv.pinned ? 'Desafixar' : 'Fixar'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpenConvId(null);
                          setConfirmDeleteConvId(conv.id);
                        }}
                        className="px-2.5 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer border-t border-slate-800/80"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Apagar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
              <span className="font-mono">{formatRelativeDate(conv.updatedAt)}</span>
              <span>{conv.messages?.length || 0} msg{(conv.messages?.length || 0) !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Conteúdo unificado da barra lateral (reutilizado no desktop e drawer mobile)
  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200 select-none">
      {/* Topo com botão Nova Conversa e fechar/recolher */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCreateNewConversation}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer"
          title="Nova conversa (Ctrl+Shift+O)"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Nova conversa</span>
          <kbd className="hidden lg:inline-block ml-auto text-[10px] bg-indigo-700/60 px-1.5 py-0.5 rounded font-mono text-indigo-200">
            Ctrl+⇧+O
          </kbd>
        </button>

        {isDrawer ? (
          <button
            type="button"
            onClick={() => setIsHistoryOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Fechar gaveta"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleToggleSidebarCollapse(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Recolher barra lateral"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Campo de Busca de Conversas */}
      <div className="p-3 border-b border-slate-800/80 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={historySearchQuery}
            onChange={(e) => setHistorySearchQuery(e.target.value)}
            placeholder="Pesquisar conversas... (Ctrl+K)"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
          {historySearchQuery && (
            <button
              type="button"
              onClick={() => setHistorySearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Lista com scroll próprio: Fixados e Recentes */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3 scrollbar-thin">
        {/* 1. Secção FIXADOS */}
        {pinnedConversations.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              <Pin className="w-3 h-3 rotate-45" />
              <span>Fixados</span>
              <span className="text-[10px] text-slate-500 ml-auto font-mono">({pinnedConversations.length})</span>
            </div>
            {pinnedConversations.map(renderConversationItem)}
          </div>
        )}

        {/* 2. Secção RECENTES */}
        <div className="space-y-1">
          {pinnedConversations.length > 0 && (
            <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <History className="w-3 h-3" />
              <span>Recentes</span>
            </div>
          )}
          {recentConversations.length === 0 && pinnedConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {historySearchQuery ? 'Nenhuma conversa encontrada.' : 'Sem conversas anteriores.'}
            </div>
          ) : (
            recentConversations.map(renderConversationItem)
          )}
        </div>
      </div>

      {/* Rodapé da Sidebar */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <button
          type="button"
          onClick={() => setShowClearAllModal(true)}
          className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-1.5 rounded-lg hover:bg-slate-900"
        >
          <Trash2 className="w-3 h-3" />
          <span>Limpar histórico</span>
        </button>
        <span className="font-mono text-[10px]">PGC Angola</span>
      </div>
    </div>
  );

  return (
    <div 
      id="yohan-ai-workspace"
      className="ai-accountant-page bg-slate-900 text-slate-100 font-sans select-text relative w-full flex-1 h-full min-h-0"
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        boxSizing: 'border-box',
        minHeight: 0,
        flex: 1
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

      {/* SIDEBAR: DESKTOP (>=1024px) - Coluna lateral fixa à esquerda de ~280px */}
      {isDesktop && isHistoryOpen && (
        <aside
          style={{ width: 280, minWidth: 280, maxWidth: 280 }}
          className="h-full bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-200 ease-out z-20"
        >
          {renderSidebarContent(false)}
        </aside>
      )}

      {/* DRAWER: MOBILE (<1024px) - Gaveta deslizante 85% com animação suave */}
      {!isDesktop && (
        <AnimatePresence>
          {isHistoryOpen && (
            <>
              {/* Overlay / Backdrop que fecha ao tocar */}
              <motion.div
                key="drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={() => setIsHistoryOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
              />

              {/* Drawer Gaveta */}
              <motion.aside
                key="drawer-panel"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="fixed inset-y-0 left-0 z-50 shadow-2xl flex flex-col bg-slate-950 border-r border-slate-800"
                style={{ width: '85%', maxWidth: '340px' }}
              >
                {renderSidebarContent(true)}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}

      {/* MAIN CHAT COLUMN */}
      <div 
        className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative"
        style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >
        {/* TOP BAR WITH DYNAMIC GENERATION GRADIENT ANIMATION */}
        <header 
          style={{ flexShrink: 0 }}
          className={`w-full bg-slate-950 border-b relative overflow-hidden shrink-0 transition-all duration-500 py-2.5 sm:py-3 ${
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

          {/* MOBILE HEADER (<1024px): 1. MENU NAVEGAÇÃO, 2. ÍCONE HISTÓRICO, 3. LOGO + TÍTULO + BADGE PGC, 4. BOTÃO "+" NOVA CONVERSA */}
          <div className="flex lg:hidden items-center justify-between w-full px-2.5 py-1.5 relative z-10 min-w-0 select-none">
            {/* Esquerda: 1. Menu Navegação Principal + 2. Ícone de Histórico de Conversas */}
            <div className="flex items-center gap-1 shrink-0">
              {/* 1. Menu Navegação Principal (abre a sidebar mobile da app) */}
              <button
                type="button"
                onClick={handleOpenNav}
                className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px]"
                title="Menu de navegação"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="w-4 h-4 text-slate-200" />
              </button>

              {/* 2. Ícone de histórico (abre o drawer de histórico do Yohan) */}
              <button
                type="button"
                onClick={() => setIsHistoryOpen(prev => !prev)}
                className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px]"
                title="Histórico de conversas"
                aria-label="Abrir histórico de conversas"
              >
                <History className="w-4 h-4 text-indigo-400" />
              </button>
            </div>

            {/* Centro: 3. Avatar + "Yohan AI" + badge "PGC Angola" compacto centrado */}
            <div className="flex items-center gap-1.5 min-w-0 mx-auto justify-center px-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-900 border border-indigo-500/40 p-0.5 shadow-xs shrink-0">
                <YohanLogo size={16} showGlow={false} />
              </div>
              <h1 className="text-sm font-black tracking-tight text-white truncate">
                Yohan AI
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shrink-0">
                PGC Angola
              </span>
            </div>

            {/* Direita: 4. Botão "+" (nova conversa) */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={handleCreateNewConversation}
                className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px]"
                title="Nova conversa"
                aria-label="Nova conversa"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          </div>

          {/* DESKTOP HEADER (>=1024px) - MANTÉM TODAS AS ABAS E FERRAMENTAS VISÍVEIS NO TOPO */}
          <div className="hidden lg:flex chat-messages items-center justify-between gap-3 relative z-10 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(prev => !prev)}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                title={!isHistoryOpen ? "Expandir histórico (Ctrl+K)" : "Recolher histórico"}
                aria-label="Alternar histórico de conversas"
              >
                <History className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold">Histórico</span>
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <SparklingAiAura 
                    isActive={isLoading || isDocGenerating || isSheetGenerating || isPptGenerating || isVizGenerating || isTaxAuditing} 
                    label="Yohan AI a processar consulta contabilística"
                  />
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 border border-indigo-500/40 p-1 shadow-md relative z-10">
                    <YohanLogo size={24} showGlow={true} />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                      Yohan AI
                    </h1>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shrink-0">
                      PGC Angola
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {isLoading ? '✨ A analisar o PGC Angola e a redigir...' : 'Consultor & Auditor Contabilístico Sénior'}
                  </p>
                </div>
              </div>
            </div>

            {/* BARRA DE ABAS NO DESKTOP (>1024px) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveMode('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeMode === 'chat'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Chat PGC</span>
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
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Word</span>
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
                <Grid className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Excel</span>
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
                <Presentation className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Slides</span>
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
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Diagramas</span>
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
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Auditoria</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGlossaryModal(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800/90 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title="Pesquisar contas, regras e glossário do PGC"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Glossário & Contas PGC</span>
              </button>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <main 
          className="flex-1 min-h-0 overflow-hidden relative flex flex-col"
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          {/* TAB 1: CHAT */}
          {activeMode === 'chat' && (
            <div 
              className="ai-chat-area flex-1 flex flex-col min-h-0 overflow-hidden"
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            >
              {/* TWO-PHASE GENERATION PROGRESS BANNER */}
              {docProgress && (
                <div className="w-full bg-indigo-950/90 border-b border-indigo-500/30 py-2.5 shrink-0 z-10 shadow-md">
                  <div className="chat-messages flex flex-col gap-1.5">
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
                </div>
              )}

              {/* SELEÇÃO DE ESTADO: VAZIO CENTRADO (SEM MENSAGENS) VS VISTA DE CONVERSA */}
              {!hasUserMessages ? (
                /* 1. ESTADO VAZIO (<1024px E DESKTOP): ECRÃ CENTRADO VERTICALMENTE ESTILO CLAUDE */
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-2xl mx-auto w-full my-auto overflow-y-auto">
                  {/* Logo/Ícone do Yohan com Glow */}
                  <div className="relative mb-3.5">
                    <SparklingAiAura isActive={true} label="Yohan AI pronto para responder" />
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-slate-950 border border-indigo-500/50 p-2 shadow-xl shadow-indigo-500/20 relative z-10">
                      <YohanLogo size={40} showGlow={true} />
                    </div>
                  </div>

                  {/* Saudação Curta Oficial */}
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight mb-1.5">
                    Como posso ajudar com a contabilidade hoje?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                    Especialista no PGC Angola (Decreto n.º 82/01), IVA 14%, Imposto Industrial, fecho de contas e conformidade AGT.
                  </p>

                  {/* Barra de Input Estilo Claude Integrada no Centro */}
                  <div className="w-full max-w-xl text-left mb-6">
                    {/* Campo de Input Arredondado */}
                    <div className="bg-slate-900 border border-slate-700/80 hover:border-slate-650 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-xl shadow-black/30 transition-all">
                      {/* Topo do Input: Pill de Modo e Seletor Rápido/Detalhado */}
                      <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-slate-800/80 mb-2">
                        {/* Botão indicador de modo / gatilho de ferramentas */}
                        <button
                          type="button"
                          onClick={() => setShowToolsModal(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold transition-all cursor-pointer select-none"
                          title="Alterar ferramenta ou modo de trabalho"
                        >
                          <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{getActiveModeLabel(activeMode)}</span>
                          <ChevronUp className="w-3 h-3 text-indigo-400" />
                        </button>

                        {/* Seletor Rápido/Detalhado como pill pequena anexada ao input */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowQualityMenu(prev => !prev);
                            }}
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-all cursor-pointer select-none"
                            title="Modo de resposta: Rápido vs Detalhado (Raciocínio PGC profundo)"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span className="text-slate-400 font-normal hidden xs:inline">Modo:</span>
                            <span className={qualityMode === 'detailed' ? 'text-indigo-300 font-bold' : 'text-emerald-400 font-bold'}>
                              {qualityMode === 'detailed' ? 'Detalhado' : 'Rápido'}
                            </span>
                            <ChevronUp className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showQualityMenu ? 'rotate-180' : ''}`} />
                          </button>

                          {showQualityMenu && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-full mb-1.5 w-48 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md text-left"
                            >
                              <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 border-b border-slate-800">
                                Qualidade de Resposta
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSetQualityMode('fast')}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  qualityMode === 'fast' ? 'bg-indigo-600/25 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <div>
                                  <div className="font-semibold">Rápido</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Respostas imediatas</div>
                                </div>
                                {qualityMode === 'fast' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetQualityMode('detailed')}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  qualityMode === 'detailed' ? 'bg-indigo-600/25 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <div>
                                  <div className="font-semibold">Detalhado</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Raciocínio profundo PGC</div>
                                </div>
                                {qualityMode === 'detailed' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Attached file preview */}
                      {attachedFile && (
                        <div className="w-full mb-2 flex items-center justify-between px-3 py-1.5 bg-indigo-950/70 border border-indigo-500/40 rounded-xl text-xs text-indigo-200">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-semibold truncate">{attachedFile.name}</span>
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

                      {/* Main Textarea */}
                      <form onSubmit={handleSendMessage} className="w-full flex flex-col gap-2">
                        <textarea
                          rows={2}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => {
                            const isSendShortcut = e.key === 'Enter' && (e.ctrlKey || e.metaKey);
                            if (isSendShortcut) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Coloque a sua dúvida sobre lançamentos, PGC Angola, IVA, balancetes..."
                          className="w-full bg-transparent border-0 px-2 py-1 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-none min-h-[50px] max-h-36 font-sans leading-relaxed"
                          disabled={isLoading}
                        />

                        {/* Barra Inferior com Botão +, Ferramentas e Enviar */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                          <div className="flex items-center gap-1.5">
                            {/* Input Oculto de Ficheiro */}
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

                            {/* Botão "+" (Anexar) à esquerda */}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px]"
                              title="Anexar documento (PDF, Word, Excel, TXT)"
                              aria-label="Anexar documento"
                            >
                              <Plus className="w-4 h-4 text-indigo-400" />
                            </button>

                            {/* Botão "Ferramentas" */}
                            <button
                              type="button"
                              onClick={() => setShowToolsModal(true)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer text-xs font-semibold shrink-0"
                              title="Menu de Ferramentas e Modos PGC"
                              aria-label="Abrir menu de ferramentas"
                            >
                              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="hidden xs:inline">Ferramentas</span>
                            </button>

                            {/* Gravação de Voz */}
                            <button
                              type="button"
                              onClick={handleToggleVoiceInput}
                              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${
                                isRecordingVoice
                                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/80'
                              }`}
                              title={isRecordingVoice ? 'Parar gravação' : 'Falar por voz'}
                              aria-label={isRecordingVoice ? 'Parar gravação' : 'Falar por voz'}
                            >
                              {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Botão Enviar à direita */}
                          <button
                            type="submit"
                            disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer shrink-0"
                            aria-label="Enviar mensagem"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Enviar</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Sugestões Rápidas */}
                  <div className="w-full max-w-xl text-left">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 text-center">
                      Sugestões Rápidas PGC
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {PROMPT_TEMPLATES.slice(0, 4).map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(undefined, t.prompt)}
                          className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 hover:border-indigo-500/40 text-xs font-medium transition-all flex items-start gap-2.5 cursor-pointer active:scale-98 text-left group"
                        >
                          <span className="text-base shrink-0 group-hover:scale-110 transition-transform">{t.icon}</span>
                          <div className="min-w-0">
                            <span className="font-semibold block text-slate-200 truncate">{t.title}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{t.prompt}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* 2. VISTA DE CONVERSA COM MENSAGENS ACTIVAS */
                <>
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
                    regeneratingMsgId={regeneratingMsgId}
                    onCopy={handleCopy}
                    onSpeak={(text, id) => handleToggleSpeech(id, text)}
                    onFeedback={handleFeedback}
                    onRegenerate={handleRegenerateMessage}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onQuickSearchInsert={(term) => {
                      setInputMessage(prev => prev ? `${prev} ${term}` : term);
                    }}
                    onContinueMessage={() => {
                      handleSendMessage(undefined, 'Continua exactamente de onde paraste, sem repetir o que já foi dito.');
                    }}
                  />

                  {/* PROMPT TEMPLATES QUICK CHIPS (FILA MODELOS: SCROLL HORIZONTAL, ZERO CORTE A 360PX) */}
                  <div 
                    className="w-full bg-slate-950/80 border-t border-slate-800/60 shrink-0 py-2 select-none"
                    style={{ flexShrink: 0 }}
                  >
                    <div className="chat-messages relative min-w-0 max-w-full">
                      <div 
                        className="flex items-center gap-2 overflow-x-auto snap-x snap-proximity py-0.5 w-full max-w-full min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:[display:none]"
                        style={{
                          display: 'flex',
                          flexWrap: 'nowrap',
                          overflowX: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          scrollSnapType: 'x proximity',
                          gap: '8px',
                          maxWidth: '100%',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none'
                        }}
                      >
                        <span 
                          className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 shrink-0 snap-start select-none"
                          style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
                        >
                          Modelos:
                        </span>
                        {PROMPT_TEMPLATES.map((t, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(undefined, t.prompt)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium shrink-0 snap-start transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
                          >
                            <span className="shrink-0">{t.icon}</span>
                            <span className="whitespace-nowrap">{t.title}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowTemplatesModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold shrink-0 snap-start transition-all flex items-center gap-1 cursor-pointer"
                          style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
                        >
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span className="whitespace-nowrap">Ver Todos</span>
                        </button>

                        <div className="w-6 shrink-0 pr-6" style={{ flexShrink: 0, width: 24, paddingRight: 24 }} aria-hidden="true" />
                      </div>

                      {/* Fade na borda direita */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none z-10 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent" 
                        aria-hidden="true" 
                      />
                    </div>
                  </div>

                  {/* BARRA DE INPUT ESTILO CLAUDE NO FUNDO */}
                  <div 
                    className="ai-input-container w-full bg-slate-950 border-t border-slate-800 shrink-0 py-2.5 sm:py-3.5"
                    style={{ flexShrink: 0 }}
                  >
                    <div className="chat-messages">
                      {/* Campo Arredondado Estilo Claude */}
                      <div className="bg-slate-900 border border-slate-700/80 hover:border-slate-650 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-lg shadow-black/25 transition-all">
                        {/* Topo do Input: Pill de Modo e Seletor Rápido/Detalhado */}
                        <div className="flex items-center justify-between gap-2 px-1 pb-1.5 border-b border-slate-800/80 mb-2">
                          {/* Botão indicador de modo / ferramentas */}
                          <button
                            type="button"
                            onClick={() => setShowToolsModal(true)}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold transition-all cursor-pointer select-none"
                            title="Alterar ferramenta ou modo de trabalho"
                          >
                            <Wrench className="w-3 h-3 text-indigo-400" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{getActiveModeLabel(activeMode)}</span>
                            <ChevronUp className="w-2.5 h-2.5 text-indigo-400" />
                          </button>

                          {/* Seletor Rápido/Detalhado como pill pequena anexada ao input */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowQualityMenu(prev => !prev);
                              }}
                              className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-all cursor-pointer select-none"
                              title="Modo de resposta: Rápido vs Detalhado"
                            >
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span className="text-slate-400 font-normal hidden xs:inline">Modo:</span>
                              <span className={qualityMode === 'detailed' ? 'text-indigo-300 font-bold' : 'text-emerald-400 font-bold'}>
                                {qualityMode === 'detailed' ? 'Detalhado' : 'Rápido'}
                              </span>
                              <ChevronUp className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showQualityMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showQualityMenu && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 bottom-full mb-1.5 w-48 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md text-left"
                              >
                                <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 border-b border-slate-800">
                                  Qualidade de Resposta
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSetQualityMode('fast')}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                    qualityMode === 'fast' ? 'bg-indigo-600/25 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold">Rápido</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Respostas imediatas</div>
                                  </div>
                                  {qualityMode === 'fast' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetQualityMode('detailed')}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                    qualityMode === 'detailed' ? 'bg-indigo-600/25 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold">Detalhado</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Raciocínio profundo PGC</div>
                                  </div>
                                  {qualityMode === 'detailed' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Attached file preview */}
                        {attachedFile && (
                          <div className="w-full mb-2 flex items-center justify-between px-3 py-1.5 bg-indigo-950/70 border border-indigo-500/40 rounded-xl text-xs text-indigo-200">
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="font-semibold truncate">{attachedFile.name}</span>
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

                        {/* Main Textarea */}
                        <form onSubmit={handleSendMessage} className="w-full flex flex-col gap-2">
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
                            }}
                            placeholder="Coloque a sua dúvida sobre lançamentos, PGC Angola, IVA, balancetes..."
                            className="w-full bg-transparent border-0 px-2 py-1 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-none min-h-[44px] max-h-36 font-sans leading-relaxed"
                            disabled={isLoading}
                          />

                          {/* Barra Inferior com Botão +, Ferramentas e Enviar */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                            <div className="flex items-center gap-1.5">
                              {/* Botão "+" (Anexar) à esquerda */}
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px]"
                                title="Anexar documento (PDF, Word, Excel, TXT)"
                                aria-label="Anexar documento"
                              >
                                <Plus className="w-4 h-4 text-indigo-400" />
                              </button>

                              {/* Botão "Ferramentas" */}
                              <button
                                type="button"
                                onClick={() => setShowToolsModal(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer text-xs font-semibold shrink-0"
                                title="Menu de Ferramentas e Modos PGC"
                                aria-label="Abrir menu de ferramentas"
                              >
                                <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="hidden xs:inline">Ferramentas</span>
                              </button>

                              {/* Gravação de Voz */}
                              <button
                                type="button"
                                onClick={handleToggleVoiceInput}
                                className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${
                                  isRecordingVoice
                                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/80'
                                }`}
                                title={isRecordingVoice ? 'Parar gravação' : 'Falar por voz'}
                                aria-label={isRecordingVoice ? 'Parar gravação' : 'Falar por voz'}
                              >
                                {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                              </button>
                            </div>

                            {/* Botão Enviar à direita */}
                            <button
                              type="submit"
                              disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer shrink-0"
                              aria-label="Enviar mensagem"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Enviar</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENT GENERATOR (WORD .DOCX) */}
          {activeMode === 'document' && (
            <div 
              className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6 space-y-6 chat-messages"
              style={{ flex: 1, minHeight: 0 }}
            >
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
            <div 
              className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6 space-y-6 chat-messages"
              style={{ flex: 1, minHeight: 0 }}
            >
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
            <div 
              className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6 space-y-6 chat-messages"
              style={{ flex: 1, minHeight: 0 }}
            >
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
            <div 
              className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6 space-y-6 chat-messages"
              style={{ flex: 1, minHeight: 0 }}
            >
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
            <div 
              className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6 space-y-6 chat-messages"
              style={{ flex: 1, minHeight: 0 }}
            >
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
              <div 
                className="flex items-center gap-1.5 overflow-x-auto pb-1 snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x proximity',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedGlossaryClass(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 snap-start transition-colors cursor-pointer ${
                    selectedGlossaryClass === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                  style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
                >
                  Todas as Classes
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((cNum) => (
                  <button
                    key={cNum}
                    type="button"
                    onClick={() => setSelectedGlossaryClass(cNum === selectedGlossaryClass ? null : cNum)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 snap-start transition-colors cursor-pointer ${
                      selectedGlossaryClass === cNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                    style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
                  >
                    Classe {cNum}
                  </button>
                ))}
                <div className="w-6 shrink-0" style={{ flexShrink: 0, width: 24 }} aria-hidden="true" />
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
      {/* MODAL / BOTTOM-SHEET: FERRAMENTAS E MODOS PGC (<1024px E BOTÃO FERRAMENTAS) */}
      <AnimatePresence>
        {showToolsModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
            onClick={() => setShowToolsModal(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            >
              {/* Header do Menu */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Ferramentas & Modos PGC</h3>
                    <p className="text-[11px] text-slate-400">Selecione o ambiente de trabalho contabilístico</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowToolsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Fechar menu de ferramentas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lista das 7 Opções / Modos */}
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] pr-0.5">
                {/* 1. Chat PGC */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('chat');
                    setShowToolsModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeMode === 'chat'
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-xs'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeMode === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Chat PGC
                        {activeMode === 'chat' && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-extrabold uppercase">Ativo</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Consultoria contabilística, lançamentos e regras AGT</div>
                    </div>
                  </div>
                  {activeMode === 'chat' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>

                {/* 2. Word */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('document');
                    setShowToolsModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeMode === 'document'
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-xs'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeMode === 'document' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Word
                        {activeMode === 'document' && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-extrabold uppercase">Ativo</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Relatórios, pareceres técnicos e notas às contas</div>
                    </div>
                  </div>
                  {activeMode === 'document' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>

                {/* 3. Excel */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('spreadsheet');
                    setShowToolsModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeMode === 'spreadsheet'
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-xs'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeMode === 'spreadsheet' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      <Grid className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Excel
                        {activeMode === 'spreadsheet' && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-extrabold uppercase">Ativo</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Folhas de cálculo, balancetes e mapas fiscais</div>
                    </div>
                  </div>
                  {activeMode === 'spreadsheet' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>

                {/* 4. Slides */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('presentation');
                    setShowToolsModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeMode === 'presentation'
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-xs'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeMode === 'presentation' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      <Presentation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Slides
                        {activeMode === 'presentation' && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-extrabold uppercase">Ativo</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Apresentações para a administração e conselho fiscal</div>
                    </div>
                  </div>
                  {activeMode === 'presentation' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>

                {/* 5. Diagramas */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('visualization');
                    setShowToolsModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeMode === 'visualization'
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-xs'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeMode === 'visualization' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Diagramas
                        {activeMode === 'visualization' && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-extrabold uppercase">Ativo</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Fluxogramas de processos, esquemas e gráficos</div>
                    </div>
                  </div>
                  {activeMode === 'visualization' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>

                {/* 6. Auditoria */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('tax-review');
                    setShowToolsModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeMode === 'tax-review'
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-xs'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeMode === 'tax-review' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Auditoria
                        {activeMode === 'tax-review' && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-extrabold uppercase">Ativo</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Verificação de conformidade fiscal e validação PGC</div>
                    </div>
                  </div>
                  {activeMode === 'tax-review' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>

                {/* 7. Glossário */}
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsModal(false);
                    setShowGlossaryModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-indigo-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Glossário & Contas PGC
                      </div>
                      <div className="text-[11px] text-slate-400">Plano oficial de contas (Decreto n.º 82/01) e termos</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YohanAI;

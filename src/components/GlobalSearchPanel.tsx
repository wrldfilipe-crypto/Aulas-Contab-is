import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  FileText, 
  Building2, 
  User, 
  Clock, 
  Sparkles, 
  Zap, 
  ArrowRight,
  PlusCircle,
  HelpCircle,
  BookOpen,
  Calculator,
  MessageSquare,
  GraduationCap,
  Mic,
  MicOff
} from 'lucide-react';
import { DB, getCurrentUser } from '../lib/db';

interface SearchResult {
  id: string;
  type: 'learning' | 'transaction' | 'ai_chat' | 'document' | 'project' | 'page';
  categoryLabel: string;
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  action: () => void;
}

interface GlobalSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  onOpenNewDocModal?: () => void;
  onOpenNewTxModal?: () => void;
}

export default function GlobalSearchPanel({ 
  isOpen, 
  onClose, 
  onNavigateTab,
  onOpenNewDocModal,
  onOpenNewTxModal
}: GlobalSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.userId;

  // Voice Search Handler using Web Speech API
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('A pesquisa por comando de voz não é suportada pelo seu navegador.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-PT';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuery(transcript);
        }
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  // Load search history
  const loadSearchHistory = () => {
    if (!currentUser) return;
    const items = DB.list('searches');
    setHistory(items.slice(0, 10)); // Top 10 recent
  };

  useEffect(() => {
    if (isOpen) {
      loadSearchHistory();
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle global search query
  useEffect(() => {
    if (!currentUserId || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase().trim();
    const listResults: SearchResult[] = [];

    // 1. Search in MATERIAIS DE APRENDIZAGEM (LocalStorage)
    try {
      const storedLib = localStorage.getItem(`ga_learnings_lib_${currentUserId}`);
      if (storedLib) {
        const learnings: any[] = JSON.parse(storedLib);
        learnings
          .filter(l => 
            l.title?.toLowerCase().includes(searchQuery) ||
            l.category?.toLowerCase().includes(searchQuery) ||
            l.summary?.toLowerCase().includes(searchQuery) ||
            l.rawContent?.toLowerCase().includes(searchQuery)
          )
          .forEach(l => {
            listResults.push({
              id: 'learn_' + l.id,
              type: 'learning',
              categoryLabel: '📚 Materiais de Aprendizagem',
              icon: BookOpen,
              title: l.title || 'Material de Estudo',
              subtitle: `Categoria: ${l.category || 'Geral'} • ${l.userLevel || 'Didático'}`,
              action: () => {
                onNavigateTab('learning');
                onClose();
              }
            });
          });
      }
    } catch (e) {
      console.warn('Global search failed reading learnings library:', e);
    }

    // 2. Search in TRANSAÇÕES E FINANÇAS (DB)
    try {
      const transactions = DB.list('transactions');
      transactions
        .filter((t: any) => 
          t.description?.toLowerCase().includes(searchQuery) || 
          t.category?.toLowerCase().includes(searchQuery) ||
          t.clientName?.toLowerCase().includes(searchQuery) ||
          t.reference?.toLowerCase().includes(searchQuery) ||
          t.amount?.toString().includes(searchQuery)
        )
        .forEach((t: any) => {
          listResults.push({
            id: 'tx_' + t.id,
            type: 'transaction',
            categoryLabel: '💳 Transações & Finanças',
            icon: Calculator,
            title: t.description || 'Transação Financeira',
            subtitle: `${t.category || 'Geral'} • Value: Kz ${(t.amount || 0).toLocaleString()} • Ref: ${t.reference || 'N/A'}`,
            action: () => {
              onNavigateTab('dashboard');
              onClose();
            }
          });
        });
    } catch (e) {
      console.warn('Global search failed reading transactions:', e);
    }

    // 3. Search in HISTÓRICO DO CONSULTOR DE IA (LocalStorage)
    try {
      const storedHistory = localStorage.getItem(`ga_ai_accountant_history_${currentUserId}`);
      if (storedHistory) {
        const aiHistory: any[] = JSON.parse(storedHistory);
        aiHistory
          .filter(h => 
            h.title?.toLowerCase().includes(searchQuery) ||
            h.tag?.toLowerCase().includes(searchQuery) ||
            h.messages?.some((m: any) => m.text?.toLowerCase().includes(searchQuery))
          )
          .forEach(h => {
            listResults.push({
              id: 'aichat_' + h.id,
              type: 'ai_chat',
              categoryLabel: '🤖 Consultor de IA (Histórico)',
              icon: MessageSquare,
              title: h.title || 'Conversa com a IA',
              subtitle: `Etiqueta: ${h.tag || '#Geral'} • ${h.messages?.length || 0} mensagens`,
              action: () => {
                onNavigateTab('assistant');
                onClose();
              }
            });
          });
      }
    } catch (e) {
      console.warn('Global search failed reading AI history:', e);
    }

    // 4. Search in documents DO utilizador (DB)
    const docs = DB.list('documents');
    docs.filter((d: any) => 
      d.title?.toLowerCase().includes(searchQuery) || 
      d.content?.toLowerCase().includes(searchQuery)
    ).forEach((d: any) => {
      listResults.push({
        id: 'doc_' + d.id,
        type: 'document',
        categoryLabel: '📄 Documentos & Ficheiros',
        icon: FileText,
        title: d.title || 'Untitled Document',
        subtitle: 'Documento / AI Document',
        action: () => {
          onNavigateTab('assistant');
          onClose();
        }
      });
    });

    // 5. Search in pages e ações
    const pages = [
      { label: 'Consola de Painel / Dashboard', route: 'dashboard', keywords: 'home inicio dashboard console transacoes' },
      { label: 'Consultor de IA / AI Accountant', route: 'assistant', keywords: 'ia chat assistente documentos pgciva' },
      { label: 'Aprendizados / Materiais de Estudo & IA', route: 'learning', keywords: 'aprendizados estudo pdf word excel materias ia explicacoes exercicios' },
      { label: 'Exercícios & Quizzes / Quizzes', route: 'quizzes', keywords: 'quizzes questoes testes simulados exercicios contabilidade' },
      { label: 'Contabilidade & Diário / Journal', route: 'erp_accounting', keywords: 'contabilidade diario lancamentos balancete razao' },
      { label: 'Perfil de Conta / Account Settings', route: 'profile', keywords: 'perfil seguranca preferencias conta 2fa tema foco noturno' },
    ];

    pages.filter(p => p.label.toLowerCase().includes(searchQuery) || p.keywords.toLowerCase().includes(searchQuery))
         .forEach(p => {
           listResults.push({
             id: 'page_' + p.route,
             type: 'page',
             categoryLabel: '⚡ Atálhos de Navegação',
             icon: Zap,
             title: p.label,
             subtitle: 'Navegar / Navigation',
             action: () => {
               onNavigateTab(p.route);
               onClose();
             }
           });
         });

    setResults(listResults.slice(0, 15)); // Show top 15 results
  }, [query, currentUserId]);

  const saveSearchHistory = (searchVal: string) => {
    if (!searchVal || searchVal.length < 2) return;
    const id = Date.now().toString();
    DB.set('searches', id, {
      id,
      query: searchVal,
      timestamp: new Date().toISOString()
    });
    loadSearchHistory();
  };

  const handleResultClick = (res: SearchResult) => {
    saveSearchHistory(query || res.title);
    res.action();
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    DB.delete('searches', id);
    loadSearchHistory();
  };

  const handleClearHistory = () => {
    DB.list('searches').forEach((s: any) => DB.delete('searches', s.id));
    loadSearchHistory();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4 font-sans select-none"
          id="global-search-overlay"
        >
          <motion.div 
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col modal-bottom-sheet-mobile"
            id="global-search-modal"
          >
        {/* Search header input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 relative">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isListening ? "A escutar... Fale agora para pesquisar..." : "O que procura? (ex: 'IFRS 16', 'Fatura', 'Ir para Razão')"}
            className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none"
            id="search-palette-input"
          />

          {/* Voice Search Button (Web Speech API) */}
          <button
            onClick={handleVoiceSearch}
            title={isListening ? "A escutar... Clique para parar" : "Pesquisar por comando de voz (Web Speech API)"}
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-md ring-2 ring-red-300' 
                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">ESC</span>
        </div>

        {/* Content body */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-6" id="search-palette-body">
          
          {/* SEARCH RESULTS (IF ANY QUERY ENTERED) */}
          {query.trim().length >= 2 ? (
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Resultados da Pesquisa ({results.length})
              </h4>
              {results.length > 0 ? (
                <div className="divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                  {results.map((res) => {
                    const Icon = res.icon;
                    return (
                      <button
                        key={res.id}
                        onClick={() => handleResultClick(res)}
                        className="w-full flex items-center gap-3.5 px-4 py-3 text-left hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        <div className="p-2 bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-xl shrink-0 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 truncate">{res.title}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                              {res.categoryLabel}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">{res.subtitle}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs">Nenhum resultado encontrado para "{query}"</p>
                </div>
              )}
            </div>
          ) : (
            // DEFAULT VIEW (NO QUERY ENTERED): SHOW RECENT + QUICK ACTIONS
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* RECENT SEARCHES PANEL */}
              <div className="space-y-3" id="recent-searches-subpanel">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Pesquisas Recentes
                  </h4>
                  {history.length > 0 && (
                    <button 
                      onClick={handleClearHistory}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600"
                    >
                      Limpar Histórico
                    </button>
                  )}
                </div>

                {history.length > 0 ? (
                  <div className="space-y-1.5">
                    {history.map((h: any) => (
                      <div
                        key={h.id}
                        onClick={() => {
                          setQuery(h.query);
                          saveSearchHistory(h.query);
                        }}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          <span className="text-xs text-slate-700 font-medium truncate">{h.query}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteHistory(h.id, e)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic py-3">Sem pesquisas recentes.</p>
                )}
              </div>

              {/* QUICK ACTIONS PANEL */}
              <div className="space-y-3" id="quick-actions-subpanel">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Ações Rápidas
                </h4>
                
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      if (onOpenNewDocModal) onOpenNewDocModal();
                      else onNavigateTab('assistant');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-md">
                        <PlusCircle className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">+ Novo Documento IA</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenNewTxModal) onOpenNewTxModal();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-md">
                        <PlusCircle className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">+ Nova Transação</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>

            </div>
          )}
          
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}

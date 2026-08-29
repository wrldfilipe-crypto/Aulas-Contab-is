import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trophy, 
  RefreshCcw, 
  BookOpen, 
  Tag, 
  Layers, 
  Check, 
  X,
  Brain,
  HelpCircle,
  Lightbulb,
  Upload,
  FileText,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  Filter,
  Play,
  Share2,
  ChevronRight,
  AlertCircle,
  Flame,
  CheckCheck,
  Zap,
  Sliders,
  FileUp,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import { getCurrentUser } from '../lib/db';
import { 
  Baralho, 
  Cartao, 
  SessaoEstudo, 
  gerarFlashcards, 
  calcularProximaRevisao,
  CartaoGerado
} from '../services/flashcardService';
import { 
  extrairTextoDocumento, 
  dividirEmChunks, 
  ExtractionProgress 
} from '../services/documentExtractor';
import { 
  listarBaralhos, 
  obterBaralho, 
  criarBaralho, 
  atualizarBaralho, 
  eliminarBaralho, 
  atualizarCartao, 
  excluirCartao, 
  obterCartoesRevisarHoje, 
  salvarSessaoEstudo 
} from '../lib/flashcardDb';

interface FlashcardsProps {
  onNavigateTab?: (tabName: string) => void;
}

export const Flashcards: React.FC<FlashcardsProps> = ({ onNavigateTab }) => {
  // Current user info
  const user = useMemo(() => getCurrentUser(), []);
  const userId = (user as any)?.id || user?.email || 'default_user';

  // Navigation states: 'decks' | 'study' | 'review-today'
  const [currentView, setCurrentView] = useState<'decks' | 'study' | 'review-today'>('decks');

  // Decks list and stats
  const [decks, setDecks] = useState<Baralho[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [activeDeck, setActiveDeck] = useState<Baralho | null>(null);
  const [dueCards, setDueCards] = useState<{ cartao: Cartao; baralhoId: string; baralhoTitulo: string }[]>([]);

  // Study Session State
  const [studyCards, setStudyCards] = useState<Cartao[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ acertos: number; erros: number; quase: number }>({
    acertos: 0,
    erros: 0,
    quase: 0
  });
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editRef, setEditRef] = useState('');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isManualDeckModalOpen, setIsManualDeckModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Baralho | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [deckToRename, setDeckToRename] = useState<Baralho | null>(null);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [selectedDeckForNewCard, setSelectedDeckForNewCard] = useState<string>('');

  // Generation from Document Form
  const [selectedLibraryDoc, setSelectedLibraryDoc] = useState<any | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [genQuantity, setGenQuantity] = useState<number>(10);
  const [genFocus, setGenFocus] = useState<string>('');
  const [customDeckName, setCustomDeckName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Manual Deck Form
  const [manualTitle, setManualTitle] = useState('');
  const [manualDocName, setManualDocName] = useState('');
  const [manualFocus, setManualFocus] = useState('');

  // Manual Single Card Form
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardCategory, setNewCardCategory] = useState('PGC Angola');
  const [newCardDiff, setNewCardDiff] = useState<'facil' | 'medio' | 'dificil'>('medio');
  const [newCardRef, setNewCardRef] = useState('');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar lista de materiais já guardados no Workspace de Aprendizado
  const libraryMaterials = useMemo(() => {
    try {
      const raw = localStorage.getItem(`ga_learnings_lib_${userId}`) || localStorage.getItem('ga_user_learnings_library');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [userId, isGenerateModalOpen]);

  // Carregar baralhos do IndexedDB
  const carregarBaralhos = useCallback(async () => {
    try {
      setIsLoadingDecks(true);
      const list = await listarBaralhos(userId);
      setDecks(list);

      const due = await obterCartoesRevisarHoje(userId);
      setDueCards(due);
    } catch (err) {
      console.error('[Flashcards] Erro ao carregar baralhos:', err);
    } finally {
      setIsLoadingDecks(false);
    }
  }, [userId]);

  useEffect(() => {
    carregarBaralhos();
  }, [carregarBaralhos]);

  // Timer durante a sessão de estudo
  useEffect(() => {
    let timer: any = null;
    if ((currentView === 'study' || currentView === 'review-today') && !isSessionComplete) {
      timer = setInterval(() => {
        setSessionElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentView, isSessionComplete, sessionStartTime]);

  // INICIAR ESTUDO DE UM BARALHO
  const handleStartStudy = (deck: Baralho, onlyDueOrReview: boolean = false) => {
    let cards = [...deck.cartoes];
    if (onlyDueOrReview) {
      const agora = new Date().toISOString();
      cards = cards.filter(c => !c.proximaRevisao || c.proximaRevisao <= agora || c.caixa === 1);
      if (cards.length === 0) {
        showToast('Não há cartões pendentes de revisão para este baralho! A abrir baralho completo.');
        cards = [...deck.cartoes];
      }
    }

    if (cards.length === 0) {
      showToast('Este baralho ainda não tem cartões para estudar.');
      return;
    }

    setActiveDeck(deck);
    setStudyCards(cards);
    setStudyIndex(0);
    setIsFlipped(false);
    setIsSessionComplete(false);
    setSessionResults({ acertos: 0, erros: 0, quase: 0 });
    setSessionStartTime(Date.now());
    setSessionElapsedTime(0);
    setIsEditingInline(false);
    setCurrentView('study');
  };

  // INICIAR SESSÃO DE REVISÃO GLOBAL (REVISAR HOJE)
  const handleStartReviewToday = () => {
    if (dueCards.length === 0) {
      showToast('🎉 Parabéns! Não tem cartões pendentes de revisão para hoje.');
      return;
    }

    const cards = dueCards.map(item => item.cartao);
    setActiveDeck(null);
    setStudyCards(cards);
    setStudyIndex(0);
    setIsFlipped(false);
    setIsSessionComplete(false);
    setSessionResults({ acertos: 0, erros: 0, quase: 0 });
    setSessionStartTime(Date.now());
    setSessionElapsedTime(0);
    setIsEditingInline(false);
    setCurrentView('review-today');
  };

  // AVALIAÇÃO DO CARTÃO COM REPETIÇÃO ESPAÇADA LEITNER
  const handleEvaluateCard = async (resultado: 'errar' | 'quase' | 'acertar') => {
    if (studyCards.length === 0 || studyIndex >= studyCards.length) return;

    const currentCard = studyCards[studyIndex];
    const { caixa: novaCaixa, proximaRevisao } = calcularProximaRevisao(currentCard.caixa || 1, resultado);

    const novosAcertos = resultado === 'acertar' ? (currentCard.acertos || 0) + 1 : (currentCard.acertos || 0);
    const novosErros = resultado === 'errar' ? (currentCard.erros || 0) + 1 : (currentCard.erros || 0);

    // Atualizar no IndexedDB
    try {
      await atualizarCartao(currentCard.baralhoId, currentCard.id, {
        caixa: novaCaixa,
        proximaRevisao,
        acertos: novosAcertos,
        erros: novosErros
      });
    } catch (e) {
      console.warn('[Flashcards] Falha ao atualizar cartão no banco:', e);
    }

    // Atualizar estatísticas da sessão local
    setSessionResults(prev => ({
      acertos: prev.acertos + (resultado === 'acertar' ? 1 : 0),
      erros: prev.erros + (resultado === 'errar' ? 1 : 0),
      quase: prev.quase + (resultado === 'quase' ? 1 : 0)
    }));

    setIsFlipped(false);
    setIsEditingInline(false);

    // Próximo cartão ou finalizar
    if (studyIndex + 1 >= studyCards.length) {
      const finalAcertos = sessionResults.acertos + (resultado === 'acertar' ? 1 : 0);
      const finalErros = sessionResults.erros + (resultado === 'errar' ? 1 : 0);
      const finalQuase = sessionResults.quase + (resultado === 'quase' ? 1 : 0);
      const total = studyCards.length;
      const taxa = Math.round((finalAcertos / total) * 100);
      const tempo = Math.floor((Date.now() - sessionStartTime) / 1000);

      setIsSessionComplete(true);

      // Guardar histórico da sessão no IndexedDB
      const sessao: SessaoEstudo = {
        id: 'sess_' + Date.now(),
        userId,
        baralhoId: activeDeck?.id || 'revisao_hoje',
        baralhoTitulo: activeDeck?.titulo || 'Revisão Geral do Dia',
        dataConclusao: new Date().toISOString(),
        totalCartoes: total,
        acertos: finalAcertos,
        erros: finalErros,
        quase: finalQuase,
        tempoSegundos: tempo,
        taxaPrecisao: taxa
      };
      salvarSessaoEstudo(sessao);

      // Disparar confetti se taxa >= 80%
      if (taxa >= 80) {
        try {
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#10B981', '#6366F1', '#F59E0B', '#3B82F6']
          });
        } catch {}
      }

      // Recarregar baralhos em background
      carregarBaralhos();
    } else {
      setStudyIndex(prev => prev + 1);
    }
  };

  // Atalhos de teclado para navegação no estudo
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (currentView !== 'study' && currentView !== 'review-today') return;
    if (isSessionComplete || isEditingInline) return;

    if (e.code === 'Space') {
      e.preventDefault();
      setIsFlipped(prev => !prev);
    } else if (isFlipped) {
      if (e.key === '1') {
        e.preventDefault();
        handleEvaluateCard('errar');
      } else if (e.key === '2') {
        e.preventDefault();
        handleEvaluateCard('quase');
      } else if (e.key === '3') {
        e.preventDefault();
        handleEvaluateCard('acertar');
      }
    } else if (e.key === 'Escape') {
      setCurrentView('decks');
      carregarBaralhos();
    }
  }, [currentView, isSessionComplete, isFlipped, isEditingInline]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // EDITAR CARTÃO INLINE
  const handleStartInlineEdit = () => {
    const currentCard = studyCards[studyIndex];
    if (!currentCard) return;
    setEditFront(currentCard.frente);
    setEditBack(currentCard.verso);
    setEditRef(currentCard.referencia || '');
    setIsEditingInline(true);
  };

  const handleSaveInlineEdit = async () => {
    const currentCard = studyCards[studyIndex];
    if (!currentCard || !editFront.trim() || !editBack.trim()) return;

    await atualizarCartao(currentCard.baralhoId, currentCard.id, {
      frente: editFront.trim(),
      verso: editBack.trim(),
      referencia: editRef.trim() || undefined
    });

    setStudyCards(prev => prev.map((c, idx) => {
      if (idx === studyIndex) {
        return {
          ...c,
          frente: editFront.trim(),
          verso: editBack.trim(),
          referencia: editRef.trim() || undefined
        };
      }
      return c;
    }));

    setIsEditingInline(false);
    showToast('Cartão atualizado com sucesso!');
  };

  // EXCLUIR CARTÃO INDIVIDUAL
  const handleDeleteCurrentCard = async () => {
    const currentCard = studyCards[studyIndex];
    if (!currentCard) return;

    if (window.confirm('Tem a certeza que deseja eliminar este cartão de estudo?')) {
      await excluirCartao(currentCard.baralhoId, currentCard.id);
      showToast('Cartão eliminado.');
      
      const newStudy = studyCards.filter((_, idx) => idx !== studyIndex);
      if (newStudy.length === 0) {
        setCurrentView('decks');
        carregarBaralhos();
      } else {
        setStudyCards(newStudy);
        setStudyIndex(prev => Math.min(prev, newStudy.length - 1));
        setIsFlipped(false);
      }
    }
  };

  // GERAR FLASHCARDS A PARTIR DE DOCUMENTO (OU MATERIAL DA BIBLIOTECA)
  const handleGenerateFromDocument = async () => {
    setGenerationError(null);
    setIsGenerating(true);
    setGenerationStep('A preparar documento para extração de texto...');
    setExtractionProgress(null);

    try {
      let docText = '';
      let docName = '';

      if (uploadedFile) {
        setGenerationStep('A extrair texto completo do ficheiro carregado...');
        const extracted = await extrairTextoDocumento(uploadedFile, (p) => {
          setExtractionProgress(p);
          setGenerationStep(p.stage);
        });
        docText = extracted.texto;
        docName = extracted.nome;
      } else if (selectedLibraryDoc) {
        setGenerationStep('A carregar texto do material da biblioteca...');
        docText = selectedLibraryDoc.rawContent || selectedLibraryDoc.summary || '';
        if (selectedLibraryDoc.sections) {
          docText += '\n' + selectedLibraryDoc.sections.map((s: any) => `${s.title}:\n${s.explanation}`).join('\n\n');
        }
        docName = selectedLibraryDoc.fileName || selectedLibraryDoc.title;
      } else {
        throw new Error('Por favor selecione um documento existente ou faça o upload de um novo ficheiro (PDF, Word ou TXT).');
      }

      if (!docText || docText.trim().length < 30) {
        throw new Error('O conteúdo de texto do documento está vazio ou insuficiente.');
      }

      // Chunking se documento tiver > 40.000 caracteres
      let chunks = [docText];
      if (docText.length > 40000) {
        setGenerationStep(`Documento extenso (${(docText.length / 1000).toFixed(0)}k caracteres). A dividir em blocos de processamento...`);
        chunks = dividirEmChunks(docText, 12000, 500);
      }

      const deckId = 'deck_' + Date.now();
      const todosCartoesGerados: CartaoGerado[] = [];
      const cardsPerChunk = Math.max(5, Math.ceil(genQuantity / chunks.length));

      for (let i = 0; i < chunks.length; i++) {
        setGenerationStep(`A gerar perguntas e respostas com Gemini AI (bloco ${i + 1} de ${chunks.length})...`);
        const cartoesChunk = await gerarFlashcards(chunks[i], cardsPerChunk, genFocus);
        todosCartoesGerados.push(...cartoesChunk);
        if (todosCartoesGerados.length >= genQuantity) break;
      }

      const cartoesFinais: Cartao[] = todosCartoesGerados.slice(0, genQuantity).map((c, idx) => ({
        id: `c_${deckId}_${idx + 1}`,
        baralhoId: deckId,
        frente: c.frente,
        verso: c.verso,
        dificuldade: c.dificuldade || 'medio',
        tema: c.tema || 'PGC Angola',
        referencia: c.referencia || 'PGC Angola',
        caixa: 1,
        proximaRevisao: new Date().toISOString(),
        acertos: 0,
        erros: 0,
        criadoEm: new Date().toISOString()
      }));

      if (cartoesFinais.length === 0) {
        throw new Error('Não foi possível estruturar flashcards a partir deste conteúdo.');
      }

      const tituloBaralho = customDeckName.trim() || `Flashcards — ${docName.replace(/\.[^/.]+$/, '')}`;

      const novoBaralho: Baralho = {
        id: deckId,
        userId,
        titulo: tituloBaralho,
        documentoNome: docName,
        foco: genFocus.trim() || undefined,
        criadoEm: new Date().toISOString(),
        cartoes: cartoesFinais
      };

      await criarBaralho(novoBaralho);
      showToast(`🎉 Baralho "${tituloBaralho}" gerado com ${cartoesFinais.length} flashcards!`);

      // Reset modal state
      setIsGenerateModalOpen(false);
      setUploadedFile(null);
      setSelectedLibraryDoc(null);
      setGenFocus('');
      setCustomDeckName('');

      await carregarBaralhos();

      // Iniciar imediatamente o estudo do novo baralho
      handleStartStudy(novoBaralho);
    } catch (err: any) {
      console.error('[Flashcards] Falha na geração:', err);
      setGenerationError(err?.message || 'Falha ao processar a geração dos flashcards.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
      setExtractionProgress(null);
    }
  };

  // CRIAR BARALHO MANUALMENTE
  const handleCreateManualDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const deckId = 'deck_manual_' + Date.now();
    const novoBaralho: Baralho = {
      id: deckId,
      userId,
      titulo: manualTitle.trim(),
      documentoNome: manualDocName.trim() || 'Criação Manual',
      foco: manualFocus.trim() || undefined,
      criadoEm: new Date().toISOString(),
      cartoes: []
    };

    await criarBaralho(novoBaralho);
    showToast(`Baralho "${novoBaralho.titulo}" criado!`);
    setIsManualDeckModalOpen(false);
    setManualTitle('');
    setManualDocName('');
    setManualFocus('');

    await carregarBaralhos();
  };

  // ADICIONAR NOVO CARTÃO A UM BARALHO
  const handleAddNewCardToDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeckForNewCard || !newCardFront.trim() || !newCardBack.trim()) return;

    const deck = await obterBaralho(selectedDeckForNewCard);
    if (!deck) return;

    const novoCartao: Cartao = {
      id: `c_man_${Date.now()}`,
      baralhoId: deck.id,
      frente: newCardFront.trim(),
      verso: newCardBack.trim(),
      dificuldade: newCardDiff,
      tema: newCardCategory.trim() || 'PGC Angola',
      referencia: newCardRef.trim() || 'PGC Angola',
      caixa: 1,
      proximaRevisao: new Date().toISOString(),
      acertos: 0,
      erros: 0,
      criadoEm: new Date().toISOString()
    };

    await atualizarBaralho({
      ...deck,
      cartoes: [novoCartao, ...deck.cartoes]
    });

    showToast('Novo flashcard adicionado ao baralho!');
    setIsAddCardModalOpen(false);
    setNewCardFront('');
    setNewCardBack('');
    setNewCardRef('');

    await carregarBaralhos();
  };

  // RENOMEAR BARALHO
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckToRename || !newDeckTitle.trim()) return;

    await atualizarBaralho({
      ...deckToRename,
      titulo: newDeckTitle.trim()
    });

    showToast('Baralho renomeado com sucesso!');
    setIsRenameModalOpen(false);
    setDeckToRename(null);
    setNewDeckTitle('');
    await carregarBaralhos();
  };

  // EXCLUIR BARALHO
  const handleConfirmDelete = async () => {
    if (!deckToDelete) return;
    await eliminarBaralho(deckToDelete.id);
    showToast(`Baralho "${deckToDelete.titulo}" eliminado.`);
    setIsDeleteModalOpen(false);
    setDeckToDelete(null);
    await carregarBaralhos();
  };

  // Cálculos globais de estatísticas
  const totalCartoesGlobal = decks.reduce((acc, d) => acc + d.cartoes.length, 0);
  const totalDominadosGlobal = decks.reduce((acc, d) => acc + d.cartoes.filter(c => c.caixa === 3).length, 0);
  const taxaDominioGlobal = totalCartoesGlobal > 0 ? Math.round((totalDominadosGlobal / totalCartoesGlobal) * 100) : 0;

  const currentStudyCard = studyCards[studyIndex];

  // Obter cor da dificuldade
  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'facil':
        return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Fácil</span>;
      case 'dificil':
        return <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Difícil</span>;
      case 'medio':
      default:
        return <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Médio</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans" id="flashcards-component-root">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-indigo-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl border border-indigo-400 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VISTA 1: LISTA DE BARALHOS (DECKS GRID)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentView === 'decks' && (
        <div className="space-y-6">
          
          {/* HEADER PRINCIPAL COM ACÇÕES & REVISÃO DO DIA */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Repetição Espaçada & Flashcards Didáticos</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Cartões de Estudo & Memorização Ativa
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Gere baralhos automáticos a partir de qualquer documento (PDF, DOCX, TXT) com <strong className="text-indigo-300">Gemini AI</strong> e domine as normas do PGC Angola, lançamentos e fiscalidade com o método Leitner.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* BOTÃO REVISAR HOJE */}
                <button
                  onClick={handleStartReviewToday}
                  disabled={dueCards.length === 0}
                  className={`px-4 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg flex-1 sm:flex-none ${
                    dueCards.length > 0
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                  id="btn-revisar-hoje"
                >
                  <Flame className="w-4 h-4" />
                  <span>Revisar Hoje</span>
                  {dueCards.length > 0 && (
                    <span className="px-2 py-0.5 bg-slate-950 text-amber-400 rounded-full text-[10px]">
                      {dueCards.length}
                    </span>
                  )}
                </button>

                {/* BOTÃO GERAR DE DOCUMENTO */}
                <button
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 flex-1 sm:flex-none"
                  id="btn-gerar-flashcards-doc"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Gerar de Documento</span>
                </button>

                {/* BOTÃO NOVO BARALHO MANUAL */}
                <button
                  onClick={() => setIsManualDeckModalOpen(true)}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-2xl transition-all cursor-pointer"
                  title="Criar Baralho Manual"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BARRA DE ESTATÍSTICAS GLOBAIS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total de Baralhos</span>
                <span className="text-xl font-black text-white mt-1 block">{decks.length}</span>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total de Cartões</span>
                <span className="text-xl font-black text-indigo-300 mt-1 block">{totalCartoesGlobal}</span>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Dominados (Caixa 3)</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">{totalDominadosGlobal} ({taxaDominioGlobal}%)</span>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Para Revisão Hoje</span>
                <span className={`text-xl font-black mt-1 block ${dueCards.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {dueCards.length} cartões
                </span>
              </div>
            </div>
          </div>

          {/* GRELHA DE BARALHOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Os Seus Baralhos de Estudo ({decks.length})</span>
              </h2>
            </div>

            {isLoadingDecks ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
                <RotateCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">A carregar baralhos do IndexedDB...</p>
              </div>
            ) : decks.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-white">Nenhum baralho criado ainda</h3>
                  <p className="text-xs text-slate-400">
                    Carregue um PDF, Word ou documento de estudo para gerar cartões instantâneos com IA ou crie um baralho manualmente.
                  </p>
                </div>
                <button
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Gerar Primeiro Baralho com IA</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {decks.map((deck) => {
                  const total = deck.cartoes.length;
                  const c3Count = deck.cartoes.filter(c => c.caixa === 3).length;
                  const c2Count = deck.cartoes.filter(c => c.caixa === 2).length;
                  const c1Count = deck.cartoes.filter(c => c.caixa === 1).length;
                  const percentMastery = total > 0 ? Math.round((c3Count / total) * 100) : 0;
                  const agora = new Date().toISOString();
                  const dueInDeck = deck.cartoes.filter(c => !c.proximaRevisao || c.proximaRevisao <= agora || c.caixa === 1).length;

                  return (
                    <motion.div
                      key={deck.id}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                      className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4 group transition-all"
                    >
                      {/* Top bar do cartão */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 bg-slate-800 text-indigo-300 border border-slate-700 rounded-full text-[10px] font-mono font-bold truncate max-w-[180px]">
                            📄 {deck.documentoNome || 'Manual'}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setDeckToRename(deck);
                                setNewDeckTitle(deck.titulo);
                                setIsRenameModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Renomear Baralho"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeckToDelete(deck);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Baralho"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                          {deck.titulo}
                        </h3>

                        {deck.foco && (
                          <p className="text-[11px] text-slate-400 font-medium line-clamp-1">
                            🎯 Foco: <span className="text-slate-300">{deck.foco}</span>
                          </p>
                        )}
                      </div>

                      {/* Progresso Leitner */}
                      <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-400">Domínio (Caixa 3):</span>
                          <span className="text-emerald-400 font-black">{percentMastery}%</span>
                        </div>

                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                          <div style={{ width: `${total > 0 ? (c3Count / total) * 100 : 0}%` }} className="bg-emerald-500 h-full" title={`Caixa 3 (Dominados): ${c3Count}`} />
                          <div style={{ width: `${total > 0 ? (c2Count / total) * 100 : 0}%` }} className="bg-amber-500 h-full" title={`Caixa 2 (Em progresso): ${c2Count}`} />
                          <div style={{ width: `${total > 0 ? (c1Count / total) * 100 : 0}%` }} className="bg-rose-500 h-full" title={`Caixa 1 (A rever): ${c1Count}`} />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span className="font-semibold">{total} cartões</span>
                          {dueInDeck > 0 ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {dueInDeck} para rever
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Em dia
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleStartStudy(deck)}
                          className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Estudar ({total})</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedDeckForNewCard(deck.id);
                            setIsAddCardModalOpen(true);
                          }}
                          className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          title="Adicionar Cartão Manual"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VISTA 2: SESSÃO DE ESTUDO INTERACTIVA (3D FLIP + LEITNER)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(currentView === 'study' || currentView === 'review-today') && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          
          {/* Top Bar da Sessão */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentView('decks');
                  carregarBaralhos();
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Voltar aos Baralhos (Esc)"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div>
                <h2 className="text-sm sm:text-base font-black text-white line-clamp-1">
                  {currentView === 'review-today' ? 'Revisão Geral do Dia' : activeDeck?.titulo}
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Cartão {studyIndex + 1} de {studyCards.length}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {Math.floor(sessionElapsedTime / 60)}:{(sessionElapsedTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> {sessionResults.acertos}
              </span>
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                <X className="w-3 h-3" /> {sessionResults.erros}
              </span>
            </div>
          </div>

          {/* Barra de Progresso da Sessão */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((studyIndex) / Math.max(1, studyCards.length)) * 100}%` }}
            />
          </div>

          {!isSessionComplete && currentStudyCard ? (
            <div className="space-y-6">
              
              {/* CARTÃO 3D FLIPPABLE CONTAINER */}
              <div 
                className="perspective-1000 min-h-[340px] select-none"
                id="flashcard-study-card-container"
              >
                <motion.div 
                  className="w-full h-full min-h-[340px] relative rounded-3xl transition-all duration-500 shadow-2xl border border-slate-800 hover:border-indigo-500/40"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* FRENTE DO CARTÃO (Pergunta / Conceito) */}
                  <div 
                    onClick={() => {
                      if (!isEditingInline) setIsFlipped(true);
                    }}
                    className={`absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-white cursor-pointer ${
                      isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
                    }`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          {currentStudyCard.tema || 'PGC Angola'}
                        </span>
                        {getDifficultyBadge(currentStudyCard.dificuldade)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] font-mono">
                          Caixa {currentStudyCard.caixa || 1}
                        </span>
                        <span className="text-[11px] font-medium hidden sm:inline text-indigo-300">
                          Clique ou Espaço para virar ↺
                        </span>
                      </div>
                    </div>

                    <div className="my-auto py-6 text-center space-y-4">
                      <h3 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight leading-snug">
                        {currentStudyCard.frente}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                        Tente recordar mentalmente a resposta antes de virar a carta.
                      </p>
                    </div>

                    <div className="text-center text-[11px] text-indigo-300 font-bold bg-indigo-950/50 py-2.5 rounded-2xl border border-indigo-500/20">
                      💡 Clique na carta ou pressione <kbd className="px-1.5 py-0.5 bg-indigo-900/80 rounded text-[10px] font-mono border border-indigo-400/40">Espaço</kbd> para revelar a resposta
                    </div>
                  </div>

                  {/* VERSO DO CARTÃO (Resposta / Código PGC / Edição Inline) */}
                  <div 
                    className={`absolute inset-0 w-full h-full bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-white ${
                      !isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
                    }`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resposta & Fundamentação
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isEditingInline ? (
                          <>
                            <button
                              onClick={handleStartInlineEdit}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Editar cartão"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleDeleteCurrentCard}
                              className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Excluir este cartão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsEditingInline(false)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveInlineEdit}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo do Verso ou Modo de Edição */}
                    <div className="my-auto py-3 overflow-y-auto max-h-[220px] pr-2 space-y-3">
                      {isEditingInline ? (
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Frente (Pergunta):</label>
                            <textarea
                              value={editFront}
                              onChange={(e) => setEditFront(e.target.value)}
                              rows={2}
                              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Verso (Resposta):</label>
                            <textarea
                              value={editBack}
                              onChange={(e) => setEditBack(e.target.value)}
                              rows={3}
                              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs leading-relaxed"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Referência PGC / Norma:</label>
                            <input
                              type="text"
                              value={editRef}
                              onChange={(e) => setEditRef(e.target.value)}
                              className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-indigo-300 text-xs"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
                            {currentStudyCard.verso}
                          </p>

                          {currentStudyCard.referencia && (
                            <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-xs flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="font-bold text-indigo-200">
                                Enquadramento: <strong className="text-white">{currentStudyCard.referencia}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[10px] text-slate-400 font-medium">
                      Como foi a sua recordação? Avalie abaixo para atualizar a repetição espaçada.
                    </div>
                  </div>

                </motion.div>
              </div>

              {/* BOTÕES DE AUTO-AVALIAÇÃO LEITNER (Errar / Quase / Acertar) */}
              <div className="space-y-3">
                {isFlipped ? (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleEvaluateCard('errar')}
                      className="py-4 px-3 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group"
                      id="btn-eval-errar"
                    >
                      <XCircle className="w-5 h-5 text-rose-400 group-hover:text-white" />
                      <span>Errar (1)</span>
                      <span className="text-[10px] font-normal text-rose-400/80 group-hover:text-white/80">Rever hoje</span>
                    </button>

                    <button
                      onClick={() => handleEvaluateCard('quase')}
                      className="py-4 px-3 bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-slate-950 font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group"
                      id="btn-eval-quase"
                    >
                      <HelpCircle className="w-5 h-5 text-amber-400 group-hover:text-slate-950" />
                      <span>Quase (2)</span>
                      <span className="text-[10px] font-normal text-amber-400/80 group-hover:text-slate-950/80">+2 dias</span>
                    </button>

                    <button
                      onClick={() => handleEvaluateCard('acertar')}
                      className="py-4 px-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group"
                      id="btn-eval-acertar"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:text-white" />
                      <span>Acertar (3)</span>
                      <span className="text-[10px] font-normal text-emerald-400/80 group-hover:text-white/80">Sobe de caixa</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Virar Carta & Ver Resposta</span>
                    </button>
                  </div>
                )}

                {/* Keyboard Shortcuts Hint Bar */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 pt-2 font-mono">
                  <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Espaço</kbd> Virar</span>
                  <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">1</kbd> Errar</span>
                  <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">2</kbd> Quase</span>
                  <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">3</kbd> Acertar</span>
                  <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Esc</kbd> Sair</span>
                </div>
              </div>

            </div>
          ) : isSessionComplete ? (
            
            /* SESSÃO CONCLUÍDA — RESUMO DE RESULTADOS & ESTATÍSTICAS */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fade-in max-w-xl mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center mx-auto shadow-lg">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">
                  Sessão de Flashcards Concluída!
                </h3>
                <p className="text-xs text-slate-400">
                  Praticou {studyCards.length} cartões com o algoritmo de repetição espaçada Leitner.
                </p>
              </div>

              {/* Estatísticas da Sessão */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="block text-2xl font-black text-emerald-400">{sessionResults.acertos}</span>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Acertos</span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="block text-2xl font-black text-amber-400">{sessionResults.quase}</span>
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Quase</span>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <span className="block text-2xl font-black text-rose-400">{sessionResults.erros}</span>
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Erros</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-300 bg-slate-800/60 px-4 py-3 rounded-xl border border-slate-700/60">
                <span>Taxa de Precisão:</span>
                <span className="text-base font-black text-indigo-300">
                  {Math.round((sessionResults.acertos / Math.max(1, studyCards.length)) * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-300 bg-slate-800/60 px-4 py-3 rounded-xl border border-slate-700/60">
                <span>Tempo de Estudo:</span>
                <span className="text-sm font-mono text-white">
                  {Math.floor(sessionElapsedTime / 60)} min {sessionElapsedTime % 60} seg
                </span>
              </div>

              <div className="space-y-2 pt-2">
                {sessionResults.erros > 0 && activeDeck && (
                  <button
                    onClick={() => handleStartStudy(activeDeck, true)}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span>Revisar Cartões com Dificuldade ({sessionResults.erros})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setCurrentView('decks');
                    carregarBaralhos();
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Voltar aos Baralhos
                </button>
              </div>
            </div>

          ) : null}

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: GERAR FLASHCARDS DE DOCUMENTO / BIBLIOTECA          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Gerar Flashcards com Gemini IA</h3>
                  <p className="text-xs text-slate-400">Extração inteligente de perguntas a partir de documentos</p>
                </div>
              </div>

              <button
                onClick={() => !isGenerating && setIsGenerateModalOpen(false)}
                disabled={isGenerating}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generationError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Erro na Geração:</span>
                  <p>{generationError}</p>
                </div>
              </div>
            )}

            {isGenerating ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
                  <Brain className="w-7 h-7 animate-bounce" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-white">A processar documento com IA...</h4>
                  <p className="text-xs text-indigo-300 font-medium">{generationStep}</p>
                </div>

                {extractionProgress && (
                  <div className="max-w-xs mx-auto space-y-1.5 pt-2">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Progresso:</span>
                      <span>{extractionProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${extractionProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                
                {/* 1. SELETOR DE DOCUMENTO EXISTENTE NA BIBLIOTECA */}
                {libraryMaterials.length > 0 && (
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-300">
                      1. Selecionar Documento da Biblioteca ({libraryMaterials.length} disponíveis):
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                      {libraryMaterials.slice(0, 5).map((mat: any) => (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => {
                            setSelectedLibraryDoc(mat);
                            setUploadedFile(null);
                            setCustomDeckName(`Flashcards — ${mat.title}`);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedLibraryDoc?.id === mat.id
                              ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-xs'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="font-semibold truncate">{mat.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{mat.category || 'Estudo'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. OU UPLOAD DE NOVO FICHEIRO (PDF, DOCX, TXT) */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-300">
                    {libraryMaterials.length > 0 ? 'Ou Carregar Novo Ficheiro (PDF, DOCX, TXT — Máx 20MB):' : 'Carregar Ficheiro de Estudo (PDF, DOCX, TXT — Máx 20MB):'}
                  </label>
                  
                  <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-4 bg-slate-950/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.txt,.md,.csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setUploadedFile(e.target.files[0]);
                          setSelectedLibraryDoc(null);
                          setCustomDeckName(`Flashcards — ${e.target.files[0].name.replace(/\.[^/.]+$/, '')}`);
                        }
                      }}
                    />
                    <Upload className="w-6 h-6 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      {uploadedFile ? uploadedFile.name : 'Clique para selecionar ficheiro (PDF, DOCX ou TXT)'}
                    </span>
                    {uploadedFile && (
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {(uploadedFile.size / 1024).toFixed(1)} KB carregado
                      </span>
                    )}
                  </label>
                </div>

                {/* 3. QUANTIDADE DE CARTÕES */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-300">Quantidade de Flashcards a Gerar:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { qtd: 10, label: '10 (Rápido)' },
                      { qtd: 20, label: '20 (Equilibrado)' },
                      { qtd: 40, label: '40 (Completo)' }
                    ].map(item => (
                      <button
                        key={item.qtd}
                        type="button"
                        onClick={() => setGenQuantity(item.qtd)}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          genQuantity === item.qtd
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. CAMPO OPCIONAL DE FOCO */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-300">
                    Foco Específico da Avaliação (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Classe 2 — Existências, IVA contas 34.5, Balancete de Verificação..."
                    value={genFocus}
                    onChange={(e) => setGenFocus(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 5. NOME PERSONALIZADO DO BARALHO */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-300">
                    Título do Baralho:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Flashcards — Decreto n.º 82/01 PGC Angola"
                    value={customDeckName}
                    onChange={(e) => setCustomDeckName(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateFromDocument}
                    disabled={!uploadedFile && !selectedLibraryDoc}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Iniciar Geração IA</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CRIAR NOVO BARALHO MANUAL                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isManualDeckModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Criar Novo Baralho Manual</span>
              </h3>
              <button onClick={() => setIsManualDeckModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualDeck} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Título do Baralho *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PGC Angola — Classe 3 Terceiros"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nome do Documento / Fonte</label>
                <input
                  type="text"
                  placeholder="Ex: Manual de Contabilidade Financeira"
                  value={manualDocName}
                  onChange={(e) => setManualDocName(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Tema / Foco de Estudo</label>
                <input
                  type="text"
                  placeholder="Ex: Contas 31, 32, 34 e 37"
                  value={manualFocus}
                  onChange={(e) => setManualFocus(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualDeckModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Criar Baralho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: ADICIONAR CARTÃO MANUAL A UM BARALHO                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <span>Adicionar Novo Cartão de Estudo</span>
              </h3>
              <button onClick={() => setIsAddCardModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCardToDeck} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Frente (Pergunta ou Termo) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Como se contabiliza a regularização de IVA a favor do Estado?"
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Verso (Resposta Completa & Didática) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Regista-se a débito na conta 75/68 e a crédito na conta 34.5.6 (IVA - Regularizações a favor do Estado)..."
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Dificuldade</label>
                  <select
                    value={newCardDiff}
                    onChange={(e) => setNewCardDiff(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Referência PGC / Lei</label>
                  <input
                    type="text"
                    placeholder="Ex: Conta 34.5.6 / DP n.º 180/19"
                    value={newCardRef}
                    onChange={(e) => setNewCardRef(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCardModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Guardar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE BARALHO                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && deckToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Eliminar Baralho?</h3>
                <p className="text-xs text-slate-400">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              Tem a certeza de que deseja eliminar permanentemente o baralho <strong className="text-white">"{deckToDelete.titulo}"</strong> contendo <strong className="text-indigo-300">{deckToDelete.cartoes.length} cartões</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Confirmar e Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 5: RENOMEAR BARALHO                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isRenameModalOpen && deckToRename && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Renomear Baralho</span>
              </h3>
              <button onClick={() => setIsRenameModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRename} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Novo Título do Baralho *</label>
                <input
                  type="text"
                  required
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

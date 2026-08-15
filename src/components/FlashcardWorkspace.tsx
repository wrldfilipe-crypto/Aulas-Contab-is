import React, { useState, useEffect } from 'react';
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
  Lightbulb
} from 'lucide-react';

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  category: string;
  example?: string;
  status?: 'unseen' | 'known' | 'review';
}

const DEFAULT_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-1',
    term: 'Activo Não Corrente',
    category: 'PGC Angola',
    definition: 'Conjunto de bens e direitos detidos pela empresa destinados a permanecer por mais de 12 meses (Classe 1 no PGC).',
    example: 'Edifícios, viaturas, equipamentos informáticos e licenças de software.'
  },
  {
    id: 'fc-2',
    term: 'Passivo Corrente',
    category: 'Balanço',
    definition: 'Obrigações e dívidas operacionais com vencimento de curto prazo (até 12 meses).',
    example: 'Dívidas a fornecedores, Impostos a pagar (34.5) e encargos com pessoal.'
  },
  {
    id: 'fc-3',
    term: 'Demonstração de Resultados por Natureza',
    category: 'Demonstrações',
    definition: 'Mapa financeiro obrigatório no PGC Angola que discrimina proveitos e custos segundo a sua origem natural.',
    example: 'Custo das Mercadorias Vendidas (CMV), Fornecimentos e Serviços de Terceiros (FST).'
  },
  {
    id: 'fc-4',
    term: 'Retenção na Fonte de IRT',
    category: 'Fiscalidade',
    definition: 'Imposto sobre o Rendimento do Trabalho deduzido diretamente pela entidade patronal nos salários (Lei n.º 28/20).',
    example: 'Dedução progressiva na folha de pagamento enviada mensalmente à AGT.'
  },
  {
    id: 'fc-5',
    term: 'IVA Liquidável vs IVA Dedutível',
    category: 'Fiscalidade',
    definition: 'IVA Liquidável (34.5.2) é cobrado aos clientes. IVA Dedutível (34.5.1) é suportado nas compras a fornecedores.',
    example: 'Se IVA Liquidado = 1.400.000 AOA e IVA Dedutível = 400.000 AOA, a pagar à AGT é 1.000.000 AOA.'
  },
  {
    id: 'fc-6',
    term: 'Amortização Acumulada',
    category: 'Contabilidade',
    definition: 'Soma total da depreciação acumulada desde a aquisição do imobilizado, reduzindo o seu valor contabilístico líquido.',
    example: 'Máquina comprada por 10M AOA com 2M AOA de amortização acumulada tem Valor Líquido de 8M AOA.'
  },
  {
    id: 'fc-7',
    term: 'Balancete de Verificação',
    category: 'PGC Angola',
    definition: 'Relatório que lista os débitos, créditos e saldos de todas as contas do Razão para validar a igualdade patrimonial.',
    example: 'Permite detetar erros de lançamento antes da elaboração do Balanço final.'
  },
  {
    id: 'fc-8',
    term: 'Método do Custo Amortizado',
    category: 'IFRS / NIRF',
    definition: 'Critério de mensuração financeira de ativos e passivos considerando a taxa de juro efetiva ao longo do tempo.',
    example: 'Aplica-se na contabilização de empréstimos bancários e obrigações a longo prazo.'
  }
];

export const FlashcardWorkspace: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>(() => {
    try {
      const stored = localStorage.getItem('ga_user_flashcards');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_FLASHCARDS;
  });

  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // New Flashcard Form
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newCategory, setNewCategory] = useState('PGC Angola');
  const [newExample, setNewExample] = useState('');

  const activeDeck = cards.filter(c => filterCategory === 'Todas' || c.category === filterCategory);

  useEffect(() => {
    try {
      localStorage.setItem('ga_user_flashcards', JSON.stringify(cards));
    } catch {}
  }, [cards]);

  const handleMarkStatus = (status: 'known' | 'review') => {
    if (activeDeck.length === 0) return;
    const currentCard = activeDeck[currentIndex];
    
    // Update status for current card
    setCards(prev => prev.map(c => c.id === currentCard.id ? { ...c, status } : c));
    setIsFlipped(false);

    if (currentIndex + 1 >= activeDeck.length) {
      setSessionCompleted(true);
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#F59E0B']
        });
      } catch {}
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleRestartSession = (onlyReview: boolean = false) => {
    if (onlyReview) {
      // Reset statuses for cards marked 'review'
      setCards(prev => prev.map(c => c.status === 'review' ? { ...c, status: 'unseen' } : c));
    } else {
      // Reset all
      setCards(prev => prev.map(c => ({ ...c, status: 'unseen' })));
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  const handleAddCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newDefinition.trim()) return;

    const newCard: Flashcard = {
      id: 'fc_custom_' + Date.now(),
      term: newTerm.trim(),
      definition: newDefinition.trim(),
      category: newCategory,
      example: newExample.trim() || undefined,
      status: 'unseen'
    };

    setCards(prev => [newCard, ...prev]);
    setNewTerm('');
    setNewDefinition('');
    setNewExample('');
    setIsCreateModalOpen(false);
  };

  const knownCount = activeDeck.filter(c => c.status === 'known').length;
  const reviewCount = activeDeck.filter(c => c.status === 'review').length;
  const totalInDeck = activeDeck.length;

  const currentCard = activeDeck[currentIndex];

  const categories = ['Todas', ...Array.from(new Set(cards.map(c => c.category)))];

  return (
    <div className="space-y-6 animate-fade-in" id="flashcards-workspace-container">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Memorização Ativa & Flashcards</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Cartas de Estudo de Termos Contábeis
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Treine a sua memória com os conceitos fundamentais do PGC Angola, Fiscalidade e Normas Financeiras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            id="btn-create-flashcard"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Flashcard</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips & Progress Metrics */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setFilterCategory(cat);
                setCurrentIndex(0);
                setIsFlipped(false);
                setSessionCompleted(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {totalInDeck > 0 && (
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>{knownCount} Conhecidos</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-rose-600">
              <XCircle className="w-4 h-4" />
              <span>{reviewCount} A Revisar</span>
            </span>
          </div>
        )}
      </div>

      {/* FLASHCARD INTERACTIVE STAGE */}
      {!sessionCompleted && currentCard ? (
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>Carta {currentIndex + 1} de {totalInDeck}</span>
              <span>{Math.round(((currentIndex) / totalInDeck) * 100)}% Concluído</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex) / totalInDeck) * 100}%` }}
              />
            </div>
          </div>

          {/* 3D FLIPPABLE CARD CONTAINER */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 min-h-[320px] cursor-pointer group select-none"
            id="flashcard-interactive-card"
          >
            <motion.div 
              className="w-full h-full min-h-[320px] relative rounded-3xl transition-all duration-500 shadow-md border border-slate-200 hover:border-indigo-300"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* FRONT SIDE (Term) */}
              <div 
                className={`absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 flex flex-col justify-between text-white ${
                  isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
                }`}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex justify-between items-center">
                  <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    {currentCard.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 animate-spin-slow" /> Clique para girar
                  </span>
                </div>

                <div className="text-center space-y-3 my-auto">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight block text-amber-300">
                    {currentCard.term}
                  </span>
                  <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                    Consegue explicar o significado ou a regra contabilística deste termo?
                  </p>
                </div>

                <div className="text-center text-[11px] text-indigo-300 font-bold bg-white/5 py-2 rounded-xl border border-white/10">
                  💡 Clique na carta para revelar a definição completa
                </div>
              </div>

              {/* BACK SIDE (Definition & Examples) */}
              <div 
                className={`absolute inset-0 w-full h-full bg-white rounded-3xl p-8 flex flex-col justify-between text-slate-800 ${
                  !isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
                }`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="font-extrabold text-indigo-600 text-xs uppercase tracking-wider">
                    Definição & Conceito: {currentCard.term}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">PGC Angola</span>
                </div>

                <div className="space-y-4 my-auto overflow-y-auto max-h-[180px] pr-2">
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                    {currentCard.definition}
                  </p>

                  {currentCard.example && (
                    <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs space-y-1">
                      <span className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Exemplo Prático:
                      </span>
                      <p className="text-indigo-950 leading-relaxed">{currentCard.example}</p>
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-400 font-medium">
                  Avalie o seu conhecimento abaixo para prosseguir
                </div>
              </div>

            </motion.div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleMarkStatus('review')}
              className="flex-1 py-3.5 px-5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-2xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              id="flashcard-btn-review"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Preciso Revisar</span>
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
              title="Girar carta"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleMarkStatus('known')}
              className="flex-1 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-emerald-500/30"
              id="flashcard-btn-known"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Já Conheço!</span>
            </button>
          </div>

        </div>
      ) : sessionCompleted ? (
        
        /* SESSION COMPLETED SUMMARY CARD */
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">
              Sessão de Flashcards Concluída!
            </h3>
            <p className="text-xs text-slate-500">
              Revisou todas as {totalInDeck} cartas da categoria <strong className="text-slate-800">{filterCategory}</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 text-xs">
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-600">Taxa de Domínio dos Termos:</span>
              <span className="text-emerald-600 font-black text-sm">
                {Math.round((knownCount / totalInDeck) * 100)}%
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="block text-lg font-black text-emerald-700">{knownCount}</span>
                <span className="text-[10px] font-bold text-emerald-800">Conhecidos</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="block text-lg font-black text-rose-700">{reviewCount}</span>
                <span className="text-[10px] font-bold text-rose-800">A Revisar</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {reviewCount > 0 && (
              <button
                onClick={() => handleRestartSession(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Estudar Apenas Cartas a Revisar ({reviewCount})</span>
              </button>
            )}

            <button
              onClick={() => handleRestartSession(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Reiniciar Baralho Completo
            </button>
          </div>
        </div>

      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Nenhum flashcard disponível para a categoria selecionada.</p>
        </div>
      )}

      {/* CREATE NEW FLASHCARD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-black text-sm">
                <Brain className="w-5 h-5" />
                <span>Criar Novo Flashcard Personalizado</span>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Termo ou Conceito Contábil *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Custo das Mercadorias Vendidas (CMV)"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoria de Enquadramento *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PGC Angola">PGC Angola</option>
                  <option value="Fiscalidade">Fiscalidade</option>
                  <option value="Balanço">Balanço</option>
                  <option value="Demonstrações">Demonstrações Financeiras</option>
                  <option value="IFRS / NIRF">IFRS / NIRF</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Definição / Explicação Didática *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explicação clara do significado do termo segundo o PGC Angola..."
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Exemplo Prático / Aplicação (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Lançamento no Débito da Conta 61 e Crédito da Conta 21"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Guardar Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

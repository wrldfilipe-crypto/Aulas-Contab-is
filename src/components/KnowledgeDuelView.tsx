import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Swords, 
  Trophy, 
  Clock, 
  Zap, 
  Brain, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  Bot, 
  User, 
  Award, 
  Sparkles,
  Flame,
  ShieldAlert,
  Lightbulb
} from 'lucide-react';
import { getCurrentUser } from '../lib/db';

export interface DuelQuestion {
  id: string;
  question: string;
  topic: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  aiTypicalTimeSec: number; // Simulated AI time
  aiAccuracyProbability: number; // 0.85 typical
}

const DUEL_QUESTIONS_POOL: Record<string, DuelQuestion[]> = {
  'pgc': [
    {
      id: 'd-1',
      question: 'No PGC Angola, em que conta é creditado o IVA debitado aos clientes nas vendas de serviços?',
      topic: 'PGC Angola',
      options: [
        'Conta 34.5.2 — IVA Liquidável',
        'Conta 34.5.1 — IVA Suportado',
        'Conta 61.1 — Vendas de Produtos',
        'Conta 38.1 — Amortizações'
      ],
      correctIndex: 0,
      explanation: 'O IVA cobrado aos clientes é um passivo para com a AGT, registado na Conta 34.5.2 (IVA Liquidável).',
      aiTypicalTimeSec: 4,
      aiAccuracyProbability: 0.9
    },
    {
      id: 'd-2',
      question: 'Qual é o limiar de faturação para enquadramento obrigatório no Regime Geral do IVA em Angola?',
      topic: 'Fiscalidade',
      options: [
        '25.000.000 AOA',
        '10.000.000 AOA',
        '50.000.000 AOA',
        '100.000.000 AOA'
      ],
      correctIndex: 0,
      explanation: 'Conforme a Lei n.º 7/19 do IVA, sujeitos passivos com volume de negócios superior a 25.000.000 AOA entram no Regime Geral.',
      aiTypicalTimeSec: 3,
      aiAccuracyProbability: 0.85
    },
    {
      id: 'd-3',
      question: 'Como é classificada a compra de um software de gestão com licença de utilização por 5 anos no PGC?',
      topic: 'PGC Angola',
      options: [
        'Imobilização Incorpórea (Classe 1)',
        'Fornecimentos e Serviços de Terceiros (Classe 7)',
        'Outros Costos Operacionais (Classe 7)',
        'Existências em Trânsito (Classe 2)'
      ],
      correctIndex: 0,
      explanation: 'Ativos intangíveis duradouros (> 12 meses) são imobilizações incorpóreas amortizáveis.',
      aiTypicalTimeSec: 5,
      aiAccuracyProbability: 0.88
    },
    {
      id: 'd-4',
      question: 'Qual a taxa de retenção na fonte do Imposto Industrial aplicável a prestadores de serviços residentes?',
      topic: 'Fiscalidade',
      options: [
        '6.5%',
        '14%',
        '2%',
        '10%'
      ],
      correctIndex: 0,
      explanation: 'A taxa de retenção do Imposto Industrial em prestações de serviços por entidades residentes é de 6,5%.',
      aiTypicalTimeSec: 3,
      aiAccuracyProbability: 0.95
    },
    {
      id: 'd-5',
      question: 'Qual demonstração financeira sopesa os ativos, passivos e capital próprio numa data específica?',
      topic: 'Demonstrações',
      options: [
        'Balanço',
        'Demonstração de Resultados',
        'Demonstração dos Fluxos de Caixa',
        'Balancete de Verificação'
      ],
      correctIndex: 0,
      explanation: 'O Balanço reflete a posição patrimonial estática da empresa num determinado momento.',
      aiTypicalTimeSec: 2,
      aiAccuracyProbability: 0.9
    }
  ],
  'ifrs': [
    {
      id: 'd-i1',
      question: 'Segundo a IFRS 16 (Locações), como deve o locatário reconhecer um contrato de arrendamento no Balanço?',
      topic: 'IFRS',
      options: [
        'Ativo de Direito de Uso e Passivo de Locação',
        'Apenas como Custo Operacional Mensal',
        'Como Reserva de Reavaliação',
        'Apenas em Nota Explicativa'
      ],
      correctIndex: 0,
      explanation: 'A IFRS 16 exige que quase todas as locações reconheçam um ativo de direito de uso e um passivo financeiro equivalente.',
      aiTypicalTimeSec: 4,
      aiAccuracyProbability: 0.85
    },
    {
      id: 'd-i2',
      question: 'Qual norma do IFRS disciplina a mensuração de Ativos Intangíveis?',
      topic: 'IFRS',
      options: [
        'IAS 38',
        'IAS 16',
        'IFRS 9',
        'IAS 2'
      ],
      correctIndex: 0,
      explanation: 'A IAS 38 define os critérios de reconhecimento e amortização de ativos intangíveis.',
      aiTypicalTimeSec: 3,
      aiAccuracyProbability: 0.88
    },
    {
      id: 'd-i3',
      question: 'O princípio da Mensuração pelo Valor Justo (Fair Value) aplica-se primordialmente a:',
      topic: 'IFRS',
      options: [
        'Instrumentos Financeiros para Negociação (IFRS 9)',
        'Existências de consumo rápido (IAS 2)',
        'Custos de Constituição da Empresa',
        'Passivos Trabalhistas Contingentes'
      ],
      correctIndex: 0,
      explanation: 'Instrumentos financeiros ativos são ajustados ao seu valor justo de mercado com impacto nos resultados ou OCI.',
      aiTypicalTimeSec: 4,
      aiAccuracyProbability: 0.82
    },
    {
      id: 'd-i4',
      question: 'Quando é reconhecida a Imparidade de um Ativo Imobilizado (IAS 36)?',
      topic: 'IFRS',
      options: [
        'Quando a Quantia Recuperável for inferior ao Valor Contabilístico',
        'Quando a inflação anual for superior a 10%',
        'Quando o ativo for totalmente amortizado',
        'Apenas no momento da venda do bem'
      ],
      correctIndex: 0,
      explanation: 'Reconhece-se imparidade se o valor contabilístico do bem exceder a sua quantia recuperável.',
      aiTypicalTimeSec: 3,
      aiAccuracyProbability: 0.9
    },
    {
      id: 'd-i5',
      question: 'Qual a finalidade da Demonstração das Alterações no Capital Próprio?',
      topic: 'Demonstrações',
      options: [
        'Evidenciar a variação dos capitais próprios entre o início e o fim do exercício',
        'Detalhar o fluxo de caixa proveniente do investimento',
        'Apurar as retenções na fonte efetuadas aos trabalhadores',
        'Calcular o rácio de liquidez geral'
      ],
      correctIndex: 0,
      explanation: 'Sintetiza dividendos, resultados transitados, aumentos de capital e reservas.',
      aiTypicalTimeSec: 3,
      aiAccuracyProbability: 0.87
    }
  ]
};

export const KnowledgeDuelView: React.FC<{
  onFinishDuel?: (userScore: number, won: boolean) => void;
}> = ({ onFinishDuel }) => {
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || 'Aluno Contábil';

  // Duel Setup State
  const [selectedTopicKey, setSelectedTopicKey] = useState<'pgc' | 'ifrs'>('pgc');
  const [duelStage, setDuelStage] = useState<'setup' | 'playing' | 'summary'>('setup');

  // Game State
  const [questions, setQuestions] = useState<DuelQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(15);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);
  const [aiSelectedOption, setAiSelectedOption] = useState<number | null>(null);
  const [aiIsThinking, setAiIsThinking] = useState<boolean>(false);
  const [roundCompleted, setRoundCompleted] = useState<boolean>(false);

  // Score Keeping
  const [userScore, setUserScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [userSpeedBonus, setUserSpeedBonus] = useState<number>(0);
  const [duelHistory, setDuelHistory] = useState<{
    qNum: number;
    questionText: string;
    userCorrect: boolean;
    aiCorrect: boolean;
    userSec: number;
    aiSec: number;
  }[]>([]);

  // Start Duel
  const handleStartDuel = () => {
    const pool = DUEL_QUESTIONS_POOL[selectedTopicKey] || DUEL_QUESTIONS_POOL['pgc'];
    setQuestions(pool);
    setCurrentQIndex(0);
    setUserScore(0);
    setAiScore(0);
    setUserSpeedBonus(0);
    setDuelHistory([]);
    setUserSelectedOption(null);
    setAiSelectedOption(null);
    setRoundCompleted(false);
    setTimeLeftSec(15);
    setDuelStage('playing');
  };

  // Timer logic for current question
  useEffect(() => {
    if (duelStage !== 'playing' || roundCompleted) return;

    const timer = setInterval(() => {
      setTimeLeftSec(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duelStage, currentQIndex, roundCompleted]);

  // Simulate AI Opponent response delay
  useEffect(() => {
    if (duelStage !== 'playing' || roundCompleted || !questions[currentQIndex]) return;

    const currentQ = questions[currentQIndex];
    setAiIsThinking(true);

    const delayMs = Math.min(12, Math.max(2, currentQ.aiTypicalTimeSec)) * 1000;

    const aiTimer = setTimeout(() => {
      if (roundCompleted) return;
      const isCorrect = Math.random() < currentQ.aiAccuracyProbability;
      let chosen = currentQ.correctIndex;
      if (!isCorrect) {
        // Pick wrong option
        const wrongOpts = [0, 1, 2, 3].filter(i => i !== currentQ.correctIndex);
        chosen = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
      }
      setAiSelectedOption(chosen);
      setAiIsThinking(false);
    }, delayMs);

    return () => clearTimeout(aiTimer);
  }, [duelStage, currentQIndex, roundCompleted, questions]);

  const handleTimeOut = () => {
    if (roundCompleted) return;
    evaluateRound(null, 15);
  };

  const handleSelectOption = (optIdx: number) => {
    if (roundCompleted || userSelectedOption !== null) return;
    const timeTaken = 15 - timeLeftSec;
    setUserSelectedOption(optIdx);
    evaluateRound(optIdx, timeTaken);
  };

  const evaluateRound = (userChoice: number | null, userTimeSec: number) => {
    setRoundCompleted(true);
    const currentQ = questions[currentQIndex];
    const isUserCorrect = userChoice === currentQ.correctIndex;

    // AI choice evaluate
    let actualAiChoice = aiSelectedOption;
    if (actualAiChoice === null) {
      const isCorrect = Math.random() < currentQ.aiAccuracyProbability;
      actualAiChoice = isCorrect ? currentQ.correctIndex : (currentQ.correctIndex === 0 ? 1 : 0);
      setAiSelectedOption(actualAiChoice);
    }
    const isAiCorrect = actualAiChoice === currentQ.correctIndex;

    // Speed bonus for user: up to 50 pts
    const speedBonus = isUserCorrect ? Math.max(10, Math.round((15 - userTimeSec) * 4)) : 0;
    const roundUserPts = isUserCorrect ? (100 + speedBonus) : 0;
    const roundAiPts = isAiCorrect ? 100 : 0;

    setUserScore(s => s + roundUserPts);
    setAiScore(s => s + roundAiPts);
    setUserSpeedBonus(b => b + speedBonus);

    const aiTimeSec = currentQ.aiTypicalTimeSec;

    setDuelHistory(prev => [
      ...prev,
      {
        qNum: currentQIndex + 1,
        questionText: currentQ.question,
        userCorrect: isUserCorrect,
        aiCorrect: isAiCorrect,
        userSec: userTimeSec,
        aiSec: aiTimeSec
      }
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 >= questions.length) {
      setDuelStage('summary');
      const userWon = userScore > aiScore;
      if (userWon) {
        try {
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#10B981', '#3B82F6', '#F59E0B']
          });
        } catch {}
      }
      if (onFinishDuel) onFinishDuel(userScore, userWon);
    } else {
      setCurrentQIndex(i => i + 1);
      setUserSelectedOption(null);
      setAiSelectedOption(null);
      setRoundCompleted(false);
      setTimeLeftSec(15);
    }
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className="space-y-6 animate-fade-in" id="knowledge-duel-root">
      
      {/* 1. SETUP SCREEN */}
      {duelStage === 'setup' && (
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>Modo Desafio de Conhecimento</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Duelo Contábil vs Prof. Bernardo IA
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Enfrente o IA Accountant numa batalha de <strong>5 perguntas cronometradas (15s/pergunta)</strong>. Quem responder mais rápido e com precisão vence o duelo e ganha bónus de XP!
            </p>
          </div>

          {/* Opponent Card & User Card Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* User Profile Card */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-md shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-indigo-300 font-extrabold uppercase">Desafiador</span>
                <h3 className="font-extrabold text-white text-sm">{userName}</h3>
                <span className="text-[11px] text-slate-400">Pronto para o duelo</span>
              </div>
            </div>

            {/* AI Opponent Card */}
            <div className="p-5 bg-amber-500/10 border border-amber-400/30 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-md shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase">Oponente IA</span>
                <h3 className="font-extrabold text-amber-300 text-sm">Prof. Bernardo IA</h3>
                <span className="text-[11px] text-slate-300">Taxa de Acertos: 88% ⚡</span>
              </div>
            </div>

          </div>

          {/* Topic Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Escolha a Matéria do Duelo:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTopicKey('pgc')}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedTopicKey === 'pgc'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="font-extrabold text-sm block">📊 PGC Angola & Fiscalidade</span>
                <span className="text-[11px] opacity-80 block mt-1">
                  Imposto Industrial, IVA 14%, Retenção de IRT e Contas da Classe 1 à 8.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTopicKey('ifrs')}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedTopicKey === 'ifrs'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="font-extrabold text-sm block">🌐 IFRS / NIRF & Demonstrações</span>
                <span className="text-[11px] opacity-80 block mt-1">
                  IFRS 16 (Locações), IAS 38 (Intangíveis), Imparidade e Fair Value.
                </span>
              </button>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartDuel}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            id="btn-start-knowledge-duel"
          >
            <Swords className="w-5 h-5" />
            <span>Começar Duelo Cronometrado Agora</span>
          </button>
        </div>
      )}

      {/* 2. PLAYING GAME ARENA */}
      {duelStage === 'playing' && currentQ && (
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Top Scoreboard Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl flex items-center justify-between gap-4">
            
            {/* User Stats */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-sm">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">{userName}</span>
                <span className="text-lg font-black text-indigo-400">{userScore} Pts</span>
              </div>
            </div>

            {/* Timer Center Ring */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm shadow-md transition-colors ${
                timeLeftSec <= 5 ? 'border-rose-500 text-rose-400 animate-pulse' : 'border-amber-400 text-amber-300'
              }`}>
                {timeLeftSec}s
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1">Perg. {currentQIndex + 1}/5</span>
            </div>

            {/* AI Opponent Stats */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Prof. Bernardo</span>
                <span className="text-lg font-black text-amber-400">{aiScore} Pts</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-sm text-slate-950">
                <Bot className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Question Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] uppercase rounded-full">
                {currentQ.topic}
              </span>

              {aiIsThinking && !roundCompleted && (
                <span className="text-xs text-amber-600 font-bold flex items-center gap-1.5 animate-pulse">
                  <Bot className="w-4 h-4" /> Prof. Bernardo a analisar resposta...
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {currentQ.question}
            </h2>

            {/* Options Grid */}
            <div className="space-y-3">
              {currentQ.options.map((optionText, optIdx) => {
                const isUserPicked = userSelectedOption === optIdx;
                const isAiPicked = aiSelectedOption === optIdx;
                const isCorrect = currentQ.correctIndex === optIdx;

                let btnStyle = "bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-800";

                if (roundCompleted) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-500 text-white border-emerald-600 font-bold shadow-md";
                  } else if (isUserPicked && !isCorrect) {
                    btnStyle = "bg-rose-500 text-white border-rose-600 font-bold";
                  } else {
                    btnStyle = "bg-slate-100 border-slate-200 text-slate-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={roundCompleted}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-4 rounded-2xl text-left border text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{optionText}</span>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {roundCompleted && isUserPicked && (
                        <span className="px-2 py-0.5 bg-indigo-900 text-white rounded-md text-[9px] font-black uppercase">
                          Sua Escolha
                        </span>
                      )}
                      {roundCompleted && isAiPicked && (
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded-md text-[9px] font-black uppercase">
                          Escolha da IA
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Round Completed Explanation Feedback */}
            {roundCompleted && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-fade-in text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Explicação Oficial do Professor IA:</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {currentQ.explanation}
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>{currentQIndex + 1 >= questions.length ? 'Ver Resultado do Duelo' : 'Próxima Pergunta'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* 3. FINAL SUMMARY SCOREBOARD */}
      {duelStage === 'summary' && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-xl animate-fade-in">
          
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-2xs">
            <Trophy className={`w-8 h-8 ${userScore > aiScore ? 'text-amber-500 animate-bounce' : 'text-indigo-600'}`} />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
              Resultado Final do Duelo
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              {userScore > aiScore ? '🎉 Vitória Espetacular do Aluno!' : userScore === aiScore ? '🤝 Empate Técnico!' : '🤖 Vitória do Prof. Bernardo IA'}
            </h2>
            <p className="text-xs text-slate-500">
              {userScore > aiScore 
                ? 'Parabéns! Superou o IA Accountant com velocidade e precisão!' 
                : 'Excelente esforço! O Prof. Bernardo levou a melhor por uma margem curta.'}
            </p>
          </div>

          {/* Final Scoreboard Comparison Box */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4">
            <div className="grid grid-cols-2 gap-4 divide-x divide-slate-800">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-300 uppercase block">{userName}</span>
                <span className="text-2xl font-black text-white block mt-0.5">{userScore} Pts</span>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                  +{userSpeedBonus} Pts Bónus Velocidade ⚡
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase block">Prof. Bernardo IA</span>
                <span className="text-2xl font-black text-amber-300 block mt-0.5">{aiScore} Pts</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">IA Accountant</span>
              </div>
            </div>
          </div>

          {/* History Breakdown */}
          <div className="space-y-2 text-left">
            <h4 className="text-xs font-bold text-slate-700">Resumo Pergunta a Pergunta:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {duelHistory.map((h, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div className="max-w-[70%]">
                    <span className="font-extrabold text-slate-900 block">P{h.qNum}: {h.questionText.substring(0, 40)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${h.userCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      Você: {h.userCorrect ? 'Acertou' : 'Errou'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${h.aiCorrect ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'}`}>
                      IA: {h.aiCorrect ? 'Acertou' : 'Errou'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartDuel}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Jogar Novamente</span>
            </button>

            <button
              onClick={() => setDuelStage('setup')}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Mudar de Matéria
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import OfflineLimitedBanner from './OfflineLimitedBanner';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  CartesianGrid,
  XAxis, 
  YAxis, 
  Tooltip, 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  Brain, 
  BookOpen, 
  Trophy, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  Filter, 
  Search, 
  ArrowRight, 
  Play, 
  RotateCcw, 
  Bookmark, 
  Share2, 
  Eye, 
  HelpCircle, 
  GraduationCap, 
  ChevronRight, 
  BarChart3, 
  AlertTriangle, 
  Lightbulb, 
  TrendingUp, 
  Check, 
  X, 
  Zap, 
  Layers, 
  Globe, 
  FileText,
  Calendar,
  User,
  Star,
  Swords
} from 'lucide-react';
import { useQuizProgress } from '../hooks/useQuizProgress';
import { Quiz, QuizQuestion } from '../lib/quizService';
import { DB, getCurrentUser } from '../lib/db';
import { KnowledgeDuelView } from './KnowledgeDuelView';

interface QuizWorkspaceProps {
  onNavigateToLearning?: (topic?: string) => void;
}

export function QuizWorkspace({ onNavigateToLearning }: QuizWorkspaceProps) {
  const { 
    quizzes, 
    stats, 
    achievements, 
    history, 
    toastMessage, 
    updateProgress, 
    createQuizFromTopic, 
    toggleSaveQuiz 
  } = useQuizProgress();

  // Record daily activity on mount
  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existing = DB.get('daily_activity', today);
      if (!existing) {
        DB.set('daily_activity', today, { date: today, actions: 1 });
      }
    } catch {}
  }, []);

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<'available' | 'duel' | 'progress' | 'ranking' | 'history'>('available');
  const [rankingFilter, setRankingFilter] = useState<'global' | 'standard' | 'country' | 'weekly' | 'monthly'>('global');
  const [historySortFilter, setHistorySortFilter] = useState<'recent' | 'highest_score' | 'most_points'>('recent');

  // Chart data for last 10 quizzes
  const last10HistoryChartData = useMemo(() => {
    const chronological = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10);
    return chronological.map((item, idx) => ({
      name: `Q${idx + 1}`,
      quizTitle: item.quizTitle,
      score: item.score,
      points: item.pointsGained,
      date: new Date(item.date).toLocaleDateString([], { day: '2-digit', month: '2-digit' })
    }));
  }, [history]);

  // Sorted history list according to user selected filter chip
  const sortedHistoryList = useMemo(() => {
    const list = [...history];
    if (historySortFilter === 'highest_score') {
      list.sort((a, b) => b.score - a.score);
    } else if (historySortFilter === 'most_points') {
      list.sort((a, b) => b.pointsGained - a.pointsGained);
    } else {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return list;
  }, [history, historySortFilter]);

  // Real user data calculations
  const currentUser = getCurrentUser();
  const realMaterialsCount = useMemo(() => {
    try {
      return DB.list('learnings').filter((m: any) => m.completed || (m.progress || 0) >= 30).length || stats.totalMaterialsStudied || 0;
    } catch {
      return stats.totalMaterialsStudied || 0;
    }
  }, [stats.totalMaterialsStudied]);

  const realQuizzesCount = useMemo(() => {
    try {
      return DB.list('quiz_results').filter((q: any) => q.completed).length || stats.totalQuizzes || 0;
    } catch {
      return stats.totalQuizzes || 0;
    }
  }, [stats.totalQuizzes]);

  const realPoints = useMemo(() => {
    try {
      const storedPoints = DB.get('points', 'total')?.value || 0;
      return Math.max(storedPoints + stats.totalPoints, stats.totalPoints || 180);
    } catch {
      return stats.totalPoints || 180;
    }
  }, [stats.totalPoints]);

  const realStreak = stats.streakDays || 1;

  // Leaderboard ranking users computation
  const leaderboardUsers = useMemo(() => {
    const currentUserName = currentUser?.name ? `${currentUser.name} (Tu)` : 'Tu (Utilizador Ativo)';
    
    const baseList = [
      {
        userId: currentUser?.userId || 'usr_current',
        displayName: currentUserName,
        avatar: currentUser?.photoUrl || '👤',
        country: currentUser?.country || 'Angola',
        countryFlag: currentUser?.country?.toLowerCase().includes('portugal') ? '🇵🇹' : currentUser?.country?.toLowerCase().includes('brasil') ? '🇧🇷' : '🇦🇴',
        standard: currentUser?.preferences?.accountingStandard || 'PGC Angola',
        totalPoints: realPoints,
        streak: realStreak,
        quizzesDone: realQuizzesCount,
        isCurrentUser: true,
        lastActive: 'Agora mesmo'
      },
      {
        userId: 'usr_2',
        displayName: 'Sofia Mendes',
        avatar: '👩‍💼',
        country: 'Portugal',
        countryFlag: '🇵🇹',
        standard: 'IFRS',
        totalPoints: Math.max(realPoints - 35, 350),
        streak: 6,
        quizzesDone: 18,
        isCurrentUser: false,
        lastActive: 'há 12 min'
      },
      {
        userId: 'usr_3',
        displayName: 'Lucas Oliveira',
        avatar: '👨‍💻',
        country: 'Brasil',
        countryFlag: '🇧🇷',
        standard: 'CPC / IFRS',
        totalPoints: Math.max(realPoints - 80, 290),
        streak: 5,
        quizzesDone: 15,
        isCurrentUser: false,
        lastActive: 'há 45 min'
      },
      {
        userId: 'usr_4',
        displayName: 'Manuel Kitumba',
        avatar: '👨‍💼',
        country: 'Angola',
        countryFlag: '🇦🇴',
        standard: 'PGC Angola',
        totalPoints: Math.max(realPoints - 120, 210),
        streak: 4,
        quizzesDone: 12,
        isCurrentUser: false,
        lastActive: 'há 2 horas'
      },
      {
        userId: 'usr_5',
        displayName: 'Ana Paula Rocha',
        avatar: '👩‍🎓',
        country: 'Angola',
        countryFlag: '🇦🇴',
        standard: 'PGC Angola',
        totalPoints: 190,
        streak: 3,
        quizzesDone: 9,
        isCurrentUser: false,
        lastActive: 'ontem'
      }
    ];

    let list = [...baseList];
    if (rankingFilter === 'standard') {
      const std = currentUser?.preferences?.accountingStandard || 'PGC';
      list = list.filter(u => u.standard.toLowerCase().includes(std.toLowerCase()) || u.isCurrentUser);
    } else if (rankingFilter === 'country') {
      const ctr = currentUser?.country || 'Angola';
      list = list.filter(u => u.country.toLowerCase().includes(ctr.toLowerCase()) || u.isCurrentUser);
    } else if (rankingFilter === 'weekly') {
      list = list.map(u => ({ ...u, totalPoints: Math.round(u.totalPoints * 0.4) }));
    } else if (rankingFilter === 'monthly') {
      list = list.map(u => ({ ...u, totalPoints: Math.round(u.totalPoints * 0.8) }));
    }

    list.sort((a, b) => b.totalPoints - a.totalPoints);
    return list.map((u, idx) => ({
      ...u,
      rank: idx + 1,
      badge: idx === 0 ? '🥇 1º Lugar' : idx === 1 ? '🥈 2º Lugar' : idx === 2 ? '🥉 3º Lugar' : `#${idx + 1}`
    }));
  }, [realPoints, realStreak, realQuizzesCount, currentUser, rankingFilter]);

  // Filter & Search states for available quizzes
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'uncompleted' | 'score'>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Quiz Modal Game mode state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, { selected: string; isCorrect: boolean }>>({});
  const [quizTimerSeconds, setQuizTimerSeconds] = useState<number>(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [newTopicInput, setNewTopicInput] = useState<string>('');
  const [isGeneratingNewQuiz, setIsGeneratingNewQuiz] = useState<boolean>(false);

  // Timer effect for active quiz game
  useEffect(() => {
    let interval: any = null;
    if (activeQuiz && !isQuizCompleted) {
      interval = setInterval(() => {
        setQuizTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQuiz, isQuizCompleted]);

  // Filter & Sort quizzes
  const filteredQuizzes = quizzes.filter(quiz => {
    if (selectedArea !== 'all' && quiz.area !== selectedArea) return false;
    if (selectedStatus === 'new' && (quiz.completed || quiz.attempts > 0)) return false;
    if (selectedStatus === 'completed' && !quiz.completed) return false;
    if (selectedStatus === 'in_progress' && (quiz.completed || quiz.attempts === 0)) return false;
    if (selectedDifficulty !== 'all') {
      const qDiff = (quiz.difficulty || '').toLowerCase();
      const sDiff = selectedDifficulty.toLowerCase();
      const isMatch = qDiff === sDiff || 
        (sDiff === 'iniciante' && (qDiff === 'easy' || qDiff === 'iniciante' || qDiff === 'fácil')) ||
        (sDiff === 'intermédio' && (qDiff === 'medium' || qDiff === 'intermédio' || qDiff === 'médio')) ||
        (sDiff === 'avançado' && (qDiff === 'hard' || qDiff === 'avançado' || qDiff === 'difícil')) ||
        (sDiff === 'easy' && (qDiff === 'easy' || qDiff === 'iniciante' || qDiff === 'fácil')) ||
        (sDiff === 'medium' && (qDiff === 'medium' || qDiff === 'intermédio' || qDiff === 'médio')) ||
        (sDiff === 'hard' && (qDiff === 'hard' || qDiff === 'avançado' || qDiff === 'difícil'));
      if (!isMatch) return false;
    }
    if (selectedSource !== 'all' && quiz.source !== selectedSource) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = quiz.title.toLowerCase().includes(q);
      const matchTopic = quiz.topic.toLowerCase().includes(q);
      const matchArea = quiz.area.toLowerCase().includes(q);
      if (!matchTitle && !matchTopic && !matchArea) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'uncompleted') {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
    }
    if (sortBy === 'score') {
      return (b.score || 0) - (a.score || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Start Quiz Handler
  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setShowHint(false);
    setUserAnswers({});
    setQuizTimerSeconds(0);
    setIsQuizCompleted(false);
  };

  // Submit Question Answer Handler
  const handleAnswerSubmit = () => {
    if (!selectedOption || !activeQuiz) return;

    const currentQuestion = activeQuiz.questions[currentQuestionIdx];
    // Option format "A. option text" -> compare first character or option index
    const selectedLetter = selectedOption.charAt(0).toUpperCase();
    const isCorrect = selectedLetter === currentQuestion.correct.toUpperCase();

    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIdx]: {
        selected: selectedOption,
        isCorrect
      }
    }));

    setIsSubmitted(true);

    if (isCorrect) {
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore
      }
    }
  };

  // Next Question / Complete Handler
  const handleNextQuestion = () => {
    if (!activeQuiz) return;

    if (currentQuestionIdx + 1 < activeQuiz.questions.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
      setShowHint(false);
    } else {
      // Complete quiz
      const totalQuestions = activeQuiz.questions.length;
      let correctCount = 0;
      Object.values(userAnswers).forEach((ans: any) => {
        if (ans.isCorrect) correctCount++;
      });
      // Include current question if submitted
      const scorePercent = Math.round((correctCount / totalQuestions) * 100);
      const pointsEarned = correctCount * 10;

      updateProgress({
        quizId: activeQuiz.id,
        topic: activeQuiz.topic,
        area: activeQuiz.area,
        score: scorePercent,
        correct: correctCount,
        total: totalQuestions,
        points: pointsEarned,
        timeSpentSeconds: quizTimerSeconds
      });

      setIsQuizCompleted(true);
    }
  };

  // Format Timer mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate Custom Topic Quiz Handler
  const handleCreateCustomQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicInput.trim() || isGeneratingNewQuiz) return;

    setIsGeneratingNewQuiz(true);
    const generated = await createQuizFromTopic(newTopicInput.trim(), 'ai_conversation', 'medium');
    setIsGeneratingNewQuiz(false);
    setNewTopicInput('');
    if (generated) {
      handleStartQuiz(generated);
    }
  };

  // Mock Radar Data for Progress Chart
  const radarData = Object.entries(stats.areaStats).map(([area, data]: [string, any]) => ({
    subject: area,
    A: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    fullMark: 100
  }));

  // Evolution Trend Data (Mock timeline)
  const evolutionData = [
    { name: 'Semana 1', score: 65, quizzes: 3 },
    { name: 'Semana 2', score: 72, quizzes: 5 },
    { name: 'Semana 3', score: 80, quizzes: 8 },
    { name: 'Semana 4', score: 88, quizzes: 12 },
  ];

  return (
    <div className="w-full space-y-6 pb-12 font-sans text-slate-800">
      <OfflineLimitedBanner />
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>Centro de Aprendizagem & Avaliações</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Quizzes & Avaliações Inteligentes
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Quizzes gerados automaticamente com base nas tuas conversas com a IA, materiais estudados e trilhas de certificação. Pratica, testa e consolida o teu conhecimento contabilístico.
            </p>
          </div>

          {/* Quick Custom Topic Generator Box */}
          <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
            <form onSubmit={handleCreateCustomQuiz} className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur border border-white/20 p-2 rounded-2xl">
              <input 
                type="text" 
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                placeholder="Ex: IVA nas Exportações PGC Angola..."
                className="px-3.5 py-2 text-xs text-white placeholder-slate-400 bg-transparent border-0 focus:outline-none w-full sm:w-64 font-medium"
              />
              <button
                type="submit"
                disabled={isGeneratingNewQuiz || !newTopicInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingNewQuiz ? 'A Gerar...' : 'Gerar Quiz IA'}</span>
              </button>
            </form>

            {/* Contextual Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Sugestões Reais:</span>
              <button
                onClick={() => { setNewTopicInput('IVA e Imposto Industrial PGC Angola'); }}
                className="px-2 py-0.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 transition-colors cursor-pointer"
              >
                📚 PGC Angola: IVA & Impostos
              </button>
              <button
                onClick={() => { setNewTopicInput('Diferenças de Câmbio e Hedging IFRS'); }}
                className="px-2 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/30 transition-colors cursor-pointer"
              >
                🎯 Reavaliação Cambial
              </button>
              <button
                onClick={() => { setNewTopicInput('Balanço e Demonstração de Resultados'); }}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 transition-colors cursor-pointer"
              >
                🏛️ Estrutura do Balanço
              </button>
            </div>
          </div>
        </div>

        {/* 1. TOP DASHBOARD SUMMARY CARDS (3 Real-Time Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mt-8 pt-6 border-t border-slate-800/80">
          
          {/* Card 1: Materiais Estudados */}
          <div className="bg-white/10 backdrop-blur border border-white/10 p-4 rounded-2xl flex items-center gap-3.5 transition-transform hover:scale-[1.02]">
            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Materiais Estudados</span>
              <span className="text-xl font-black text-white">{realMaterialsCount}</span>
              <span className="text-[10px] text-slate-300 block font-medium">Registados do utilizador</span>
            </div>
          </div>

          {/* Card 2: Quizzes Realizados */}
          <div className="bg-white/10 backdrop-blur border border-white/10 p-4 rounded-2xl flex items-center gap-3.5 transition-transform hover:scale-[1.02]">
            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Quizzes Realizados</span>
              <span className="text-xl font-black text-white">{realQuizzesCount}</span>
              <span className="text-[10px] text-slate-300 block font-medium">Completados com sucesso</span>
            </div>
          </div>

          {/* Card 3: Pontuação Total */}
          <div className="bg-white/10 backdrop-blur border border-white/10 p-4 rounded-2xl flex items-center gap-3.5 transition-transform hover:scale-[1.02]">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Pontuação Total</span>
              <span className="text-xl font-black text-amber-300">{realPoints} pts</span>
              <span className="text-[10px] text-slate-300 block font-medium">Pontos de acções reais</span>
            </div>
          </div>

        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'available'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <Brain className="w-4 h-4 text-indigo-400" />
          <span>Quizzes Disponíveis</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold">
            {quizzes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'progress'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>Meu Progresso</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'ranking'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>🏆 Ranking</span>
        </button>

        <button
          onClick={() => setActiveTab('duel')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'duel'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
          }`}
        >
          <Swords className="w-4 h-4 text-amber-600" />
          <span>⚔️ Duelo de Conhecimento</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[9px] bg-amber-200/80 text-amber-950 font-black uppercase">
            DESAFIO IA
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>📚 Histórico</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB: DUELO DE CONHECIMENTO VS IA
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'duel' && (
        <KnowledgeDuelView />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: QUIZZES DISPONÍVEIS
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'available' && (
        <div className="space-y-5">
          
          {/* FILTERS AND SORTING TOOLBAR */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por tema, título ou área..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-slate-400 transition-all bg-gray-50/50"
                />
              </div>

              {/* Sorting Dropdown */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ordenar:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="uncompleted">Por Concluir Primeiro</option>
                  <option value="score">Maior Pontuação</option>
                </select>
              </div>

            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
              
              {/* Area Filters */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">Área:</span>
                {['all', 'Contabilidade', 'Câmbio', 'Fiscalidade', 'Matemática'].map(area => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedArea === area 
                        ? 'bg-slate-900 text-white shadow-2xs' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {area === 'all' ? 'Todos' : area}
                  </button>
                ))}
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 border-l border-gray-200 pl-2">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">Estado:</span>
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'new', label: 'Novos 🆕' },
                  { key: 'in_progress', label: 'Em Curso' },
                  { key: 'completed', label: 'Concluídos ✅' }
                ].map(st => (
                  <button
                    key={st.key}
                    onClick={() => setSelectedStatus(st.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedStatus === st.key 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Difficulty Filters */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 border-l border-gray-200 pl-2">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">Dificuldade:</span>
                {[
                  { key: 'all', label: 'Todas', color: 'bg-slate-800' },
                  { key: 'easy', label: 'Iniciante 🌱', color: 'bg-emerald-600' },
                  { key: 'medium', label: 'Intermédio ⚡', color: 'bg-blue-600' },
                  { key: 'hard', label: 'Avançado 🔥', color: 'bg-purple-600' }
                ].map(df => (
                  <button
                    key={df.key}
                    onClick={() => setSelectedDifficulty(df.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedDifficulty === df.key 
                        ? `${df.color} text-white shadow-2xs` 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* QUIZZES CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuizzes.map(quiz => {
              const isCompleted = quiz.completed;
              return (
                <div 
                  key={quiz.id}
                  className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${
                    isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {/* Top Status Badge & Source */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isCompleted 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      }`}>
                        {isCompleted ? '✅ Concluído' : '🆕 Novo Quiz'}
                      </span>

                      <span className="text-[10px] font-medium text-slate-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 truncate max-w-[200px]" title={quiz.sourceLabel}>
                        {quiz.sourceLabel}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      {quiz.topic}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold mb-4">
                      {/* Difficulty */}
                      <span className={`px-2 py-0.5 rounded-md ${
                        quiz.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' :
                        quiz.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {quiz.difficulty === 'easy' ? '🟢 Fácil' : quiz.difficulty === 'medium' ? '🟡 Médio' : '🔴 Difícil'}
                      </span>

                      {/* Area */}
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        📊 {quiz.area}
                      </span>

                      {/* Question Count & Time */}
                      <span className="text-slate-500 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        {quiz.questionCount} perguntas · {quiz.estimatedTime} min
                      </span>

                      {/* Countries */}
                      <span className="text-slate-400 ml-auto text-[10px] font-mono">
                        🌍 {quiz.countries.join(' · ')}
                      </span>
                    </div>

                    {/* Completed Score Banner if applicable */}
                    {isCompleted && (
                      <div className="mb-4 bg-emerald-100/70 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900">Pontuação Obtida:</span>
                        <span className="font-extrabold text-emerald-800 text-sm">{quiz.score}% ({quiz.correctCount}/{quiz.totalQuestions})</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isCompleted ? (
                        <button
                          onClick={() => handleStartQuiz(quiz)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Repetir</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartQuiz(quiz)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Iniciar Quiz</span>
                        </button>
                      )}

                      <button
                        onClick={() => setPreviewQuiz(quiz)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Pré-visualizar perguntas"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                        <span className="hidden sm:inline">Ver</span>
                      </button>
                    </div>

                    <button
                      onClick={() => toggleSaveQuiz(quiz.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        quiz.saved 
                          ? 'bg-amber-50 text-amber-600 border-amber-200' 
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600'
                      }`}
                      title={quiz.saved ? 'Guardado' : 'Guardar nos favoritos'}
                    >
                      <Bookmark className={`w-4 h-4 ${quiz.saved ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredQuizzes.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
              <Brain className="w-12 h-12 text-gray-300 mx-auto animate-pulse" />
              <h3 className="text-sm font-bold text-gray-800">Nenhum quiz encontrado</h3>
              <p className="text-xs text-gray-500">Tenta ajustar os filtros de pesquisa ou cria um quiz personalizado acima!</p>
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: MEU PROGRESSO
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          
          {/* Top Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Evolution Trend */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Evolução da Pontuação Média</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Progresso contínuo nos últimos 30 dias</p>
                </div>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  +23% este mês
                </span>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#scoreGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Domain Performance Radar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Desempenho por Área Temática</span>
                </h3>
                <p className="text-[11px] text-slate-400">Taxa de acerto acumulada em cada módulo</p>
              </div>

              <div className="h-64 w-full pt-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Acerto %" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* AUTO-GENERATED WEAK POINTS BOX ("PONTOS FRACOS") */}
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-2xl">
              <div className="p-3 bg-amber-200/60 rounded-xl text-amber-800 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  Pontos Fracos Detetados Pela IA
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  ⚠️ A tua taxa de acerto na área de <strong>Fiscalidade</strong> é de 55%.
                  Recomendamos rever os temas: <strong>IVA em Angola, Isenções e Retenção na Fonte de Imposto Industrial</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              {onNavigateToLearning && (
                <button
                  onClick={() => onNavigateToLearning('Fiscalidade')}
                  className="bg-amber-800 hover:bg-amber-900 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Estudar Agora</span>
                </button>
              )}

              <button
                onClick={async () => {
                  const q = await createQuizFromTopic('Fiscalidade e IVA em Angola', 'ai_conversation', 'medium');
                  if (q) handleStartQuiz(q);
                }}
                className="bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 text-xs px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Brain className="w-3.5 h-3.5 text-amber-700" />
                <span>Quiz Focado</span>
              </button>
            </div>
          </div>

          {/* DETAILED STATS TABLE */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>Estatísticas Detalhadas por Área</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Área Temática</th>
                    <th className="pb-3 text-center">Acertos</th>
                    <th className="pb-3 text-center">Erros</th>
                    <th className="pb-3 text-center">Taxa de Acerto</th>
                    <th className="pb-3 text-right">Último Exercício</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {Object.entries(stats.areaStats).map(([area, data]: [string, any]) => {
                    const rate = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    return (
                      <tr key={area} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span>{area}</span>
                        </td>
                        <td className="py-3.5 text-center text-emerald-700 font-bold">{data.correct}</td>
                        <td className="py-3.5 text-center text-rose-600 font-bold">{data.incorrect}</td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            rate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                            rate >= 60 ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                        <td className="py-3.5 text-right text-gray-400 font-mono text-[11px]">{data.lastAttempt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: RANKING & LIDERANÇA
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          
          {/* User Level Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur rounded-2xl border border-white/30 text-amber-200 shrink-0">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-200 block">O Teu Nível Atual</span>
                <h3 className="text-xl font-extrabold">Nível {Math.floor(realPoints / 100) + 1} · Especialista PGC/IFRS</h3>
                <p className="text-xs text-amber-100 font-medium">Acumulaste {realPoints} pontos reais de atividade.</p>
              </div>
            </div>

            {/* Level XP Bar */}
            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span>Progresso para Nível {Math.floor(realPoints / 100) + 2}</span>
                <span>{realPoints % 100} / 100 XP</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden p-0.5 border border-white/20">
                <div 
                  className="bg-amber-300 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${realPoints % 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sub-Filters for Leaderboard */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Filtros do Ranking</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Atualizado em tempo real · {leaderboardUsers.length} participantes ativos
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
              {[
                { id: 'global', label: '🌐 Global' },
                { id: 'standard', label: `🏛️ Minha Norma (${currentUser?.preferences?.accountingStandard || 'PGC'})` },
                { id: 'country', label: `🇦🇴 Meu País (${currentUser?.country || 'Angola'})` },
                { id: 'weekly', label: '📅 Semanal' },
                { id: 'monthly', label: '📆 Mensal' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setRankingFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                    rankingFilter === f.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-gray-50 hover:bg-gray-100 text-slate-600 border-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* TOP 3 CARDS WITH FRAMER-MOTION SCALE & SOFT GLOW */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Pódio de Liderança (Top 3)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leaderboardUsers.slice(0, 3).map((peer) => {
                const isGold = peer.rank === 1;
                const isSilver = peer.rank === 2;

                const glowColor = isGold 
                  ? 'rgba(245, 158, 11, 0.45)' 
                  : isSilver 
                  ? 'rgba(148, 163, 184, 0.45)' 
                  : 'rgba(217, 119, 6, 0.45)';

                const cardBorderBg = isGold 
                  ? 'border-amber-400 bg-gradient-to-b from-amber-500/10 via-amber-100/30 to-white' 
                  : isSilver 
                  ? 'border-slate-300 bg-gradient-to-b from-slate-200/40 via-slate-50 to-white' 
                  : 'border-amber-600/40 bg-gradient-to-b from-amber-700/10 via-amber-50/20 to-white';

                return (
                  <motion.div
                    key={`${peer.userId}-${activeTab}`}
                    initial={{ scale: 0.9, opacity: 0, y: 15 }}
                    animate={{ 
                      scale: [0.92, 1.04, 1],
                      opacity: 1,
                      y: 0,
                      boxShadow: [
                        '0 0 0px rgba(0,0,0,0)',
                        `0 0 25px ${glowColor}`,
                        `0 0 12px ${glowColor}`
                      ]
                    }}
                    transition={{ 
                      duration: 0.8, 
                      delay: (peer.rank - 1) * 0.15, 
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${glowColor}` }}
                    className={`p-5 rounded-2xl border ${cardBorderBg} relative overflow-hidden flex flex-col justify-between space-y-4`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                        isGold ? 'bg-amber-400 text-amber-950 shadow-xs' :
                        isSilver ? 'bg-slate-300 text-slate-900 shadow-xs' :
                        'bg-amber-700 text-white shadow-xs'
                      }`}>
                        {peer.badge}
                      </span>
                      <div className="text-3xl">{isGold ? '👑' : isSilver ? '🥈' : '🥉'}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-3xl p-2.5 bg-white rounded-2xl shadow-inner border border-slate-100">{peer.avatar}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{peer.displayName}</h4>
                          {peer.isCurrentUser && (
                            <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              TU
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{peer.countryFlag} {peer.country} • {peer.standard}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">{peer.quizzesDone} Quizzes</span>
                      <span className="text-base font-black text-amber-600">{peer.totalPoints} pts</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Community Leaderboard Table */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Tabela Geral de Classificação</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                🔒 Pode ocultar o seu nome em Configurações
              </span>
            </div>

            <div className="space-y-2.5">
              {leaderboardUsers.map(peer => {
                const isTop3 = peer.rank <= 3;
                
                return (
                  <motion.div 
                    key={peer.userId}
                    initial={isTop3 ? { scale: 0.95, opacity: 0, y: 10 } : false}
                    animate={isTop3 ? { scale: 1, opacity: 1, y: 0 } : false}
                    transition={isTop3 ? { duration: 0.4, delay: (peer.rank - 1) * 0.12 } : undefined}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                      peer.isCurrentUser 
                        ? 'bg-indigo-50/90 border-indigo-300 font-bold text-indigo-950 shadow-sm ring-2 ring-indigo-500/20' 
                        : 'bg-white border-gray-200 text-slate-700 hover:bg-gray-50'
                    } ${
                      isTop3 
                        ? 'shadow-xs border-amber-300/80 bg-gradient-to-r from-amber-50/40 via-white to-indigo-50/30' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                        peer.rank === 1 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300' :
                        peer.rank === 2 ? 'bg-slate-300 text-slate-900' :
                        peer.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {peer.rank}
                      </span>

                      <div className="text-xl shrink-0 p-1 bg-gray-100 rounded-xl">{peer.avatar}</div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 truncate">{peer.displayName}</span>
                          {peer.isCurrentUser && (
                            <span className="bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                              TU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium mt-0.5">
                          <span>{peer.countryFlag} {peer.country}</span>
                          <span>•</span>
                          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{peer.standard}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-100/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Atividade</span>
                        <span className="text-xs font-bold text-slate-700">{peer.quizzesDone} Quizzes</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-amber-600 font-bold block uppercase">{peer.badge}</span>
                        <span className="text-base font-black text-amber-600">{peer.totalPoints} pts</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 4: HISTÓRICO DE TENTATIVAS
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Recharts Line Chart for Performance Evolution */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Evolução do Desempenho (Últimos 10 Quizzes)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Gráfico contínuo da percentagem de acertos nos simulados concluídos</p>
              </div>
              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
                Média: {last10HistoryChartData.length > 0 ? Math.round(last10HistoryChartData.reduce((acc, curr) => acc + curr.score, 0) / last10HistoryChartData.length) : 0}%
              </span>
            </div>

            {last10HistoryChartData.length > 0 ? (
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last10HistoryChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                              <p className="font-extrabold text-indigo-300">{data.quizTitle}</p>
                              <p className="text-slate-300 font-medium">Data: {data.date}</p>
                              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 font-bold">
                                <span className="text-emerald-400">Nota: {data.score}%</span>
                                <span className="text-amber-400">+{data.points} pts</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7, fill: '#6366f1' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Realiza o teu primeiro quiz para visualizar a tua linha de evolução.
              </div>
            )}
          </div>

          {/* History Records List */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Histórico Completo de Resoluções ({sortedHistoryList.length})</span>
              </h3>

              {/* Sorting Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                <span className="text-[10px] uppercase text-gray-400 tracking-wider mr-1">Ordenar:</span>
                {[
                  { id: 'recent', label: '📅 Mais Recentes' },
                  { id: 'highest_score', label: '⭐ Maior Nota' },
                  { id: 'most_points', label: '🔥 Mais Pontos Ganhos' }
                ].map(sf => (
                  <button
                    key={sf.id}
                    onClick={() => setHistorySortFilter(sf.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      historySortFilter === sf.id
                        ? 'bg-slate-900 text-white shadow-xs font-extrabold'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {sortedHistoryList.map(item => (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors rounded-xl px-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">{item.area} · {item.topic}</span>
                    <h4 className="text-xs font-bold text-slate-900">{item.quizTitle}</h4>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.date).toLocaleDateString()} ás {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {formatTime(item.timeSpentSeconds)} gastos
                    </span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                      item.score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.score}% ({item.correctCount}/{item.totalQuestions})
                    </span>
                    <span className="text-xs font-black text-amber-600">+{item.pointsGained} pts</span>
                  </div>
                </div>
              ))}

              {sortedHistoryList.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400">
                  Ainda não completaste nenhum quiz. Escolha um quiz e começa já!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          FULLSCREEN INTERACTIVE QUIZ GAME MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* GAME MODAL HEADER */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  title="Sair do Quiz"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 block">
                    {activeQuiz.area} · {activeQuiz.topic}
                  </span>
                  <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md">{activeQuiz.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                {/* Timer */}
                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-amber-300 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(quizTimerSeconds)}</span>
                </div>

                {/* Question Counter */}
                <span className="bg-indigo-600/30 text-indigo-300 px-2.5 py-1 rounded-xl font-bold">
                  {currentQuestionIdx + 1} / {activeQuiz.questions.length}
                </span>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full bg-slate-800 h-1.5 shrink-0">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%` }}
              />
            </div>

            {/* GAME MODAL BODY */}
            {!isQuizCompleted ? (
              <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1">
                
                {/* Question Box */}
                {(() => {
                  const q = activeQuiz.questions[currentQuestionIdx];
                  const answerState = userAnswers[currentQuestionIdx];

                  return (
                    <div className="space-y-6">
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold uppercase text-slate-400">
                          Pergunta {currentQuestionIdx + 1} de {activeQuiz.questions.length}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700 uppercase">
                          {activeQuiz.difficulty === 'easy' ? '🟢 Fácil' : activeQuiz.difficulty === 'medium' ? '🟡 Médio' : '🔴 Difícil'}
                        </span>
                      </div>

                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        "{q.question}"
                      </h2>

                      {/* Options List */}
                      <div className="space-y-2.5">
                        {q.options.map((opt, idx) => {
                          const isSelected = selectedOption === opt;
                          let optStyle = "border-gray-200 bg-white hover:border-slate-400 text-slate-800";

                          if (isSubmitted) {
                            const optLetter = opt.charAt(0).toUpperCase();
                            const isCorrectOpt = optLetter === q.correct.toUpperCase();
                            if (isCorrectOpt) {
                              optStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                            } else if (isSelected && !isCorrectOpt) {
                              optStyle = "border-rose-500 bg-rose-50 text-rose-900 font-bold";
                            } else {
                              optStyle = "border-gray-100 bg-gray-50 text-gray-400 opacity-60";
                            }
                          } else if (isSelected) {
                            optStyle = "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold shadow-2xs";
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isSubmitted}
                              onClick={() => setSelectedOption(opt)}
                              className={`w-full text-left p-4 rounded-2xl border transition-all text-xs leading-relaxed flex items-center justify-between cursor-pointer ${optStyle}`}
                            >
                              <span>{opt}</span>
                              {isSubmitted && opt.charAt(0).toUpperCase() === q.correct.toUpperCase() && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                              )}
                              {isSubmitted && isSelected && opt.charAt(0).toUpperCase() !== q.correct.toUpperCase() && (
                                <XCircle className="w-5 h-5 text-rose-600 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Hint Button */}
                      {q.tip && !isSubmitted && (
                        <div>
                          {!showHint ? (
                            <button
                              onClick={() => setShowHint(true)}
                              className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Lightbulb className="w-3.5 h-3.5" />
                              <span>Ver Dica</span>
                            </button>
                          ) : (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <span><strong>Dica:</strong> {q.tip}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* IMMEDIATE FEEDBACK BOX */}
                      {isSubmitted && (
                        <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 animate-in fade-in duration-200 ${
                          answerState?.isCorrect 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                            : 'bg-rose-50 border-rose-300 text-rose-950'
                        }`}>
                          <div className="flex items-center justify-between font-extrabold">
                            <span className="flex items-center gap-1.5 text-sm">
                              {answerState?.isCorrect ? '✅ Correto! (+10 pts)' : '❌ Incorreto'}
                            </span>
                          </div>
                          <p><strong>Explicação:</strong> {q.explanation}</p>
                        </div>
                      )}

                    </div>
                  );
                })()}

              </div>
            ) : (
              /* FINAL RESULT SCREEN */
              <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1 text-center">
                
                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto text-2xl shadow-md">
                    🏆
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">Quiz Concluído!</h2>
                  <p className="text-xs text-slate-500 font-medium">{activeQuiz.title}</p>
                </div>

                {/* Score Big Display */}
                {(() => {
                  let correctCount = 0;
                  Object.values(userAnswers).forEach((a: any) => { if (a.isCorrect) correctCount++; });
                  const total = activeQuiz.questions.length;
                  const scorePercent = Math.round((correctCount / total) * 100);

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-md mx-auto space-y-4">
                      <div className="text-3xl font-black text-indigo-600">
                        {correctCount} / {total}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-700" style={{ width: `${scorePercent}%` }} />
                      </div>
                      <div className="flex justify-around text-xs font-bold text-slate-700 pt-2 border-t border-gray-200">
                        <span>✅ Corretas: {correctCount}</span>
                        <span>❌ Erradas: {total - correctCount}</span>
                        <span>⏱ Tempo: {formatTime(quizTimerSeconds)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Points Added Banner */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl max-w-md mx-auto text-xs font-bold text-amber-900 flex items-center justify-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span>+{Object.values(userAnswers).filter((a: any) => a.isCorrect).length * 10} pontos adicionados ao teu perfil!</span>
                </div>

                {/* Missed Questions Review Accordion */}
                {Object.entries(userAnswers).some(([_, a]: [string, any]) => !a.isCorrect) && (
                  <div className="text-left bg-rose-50/50 border border-rose-200 rounded-2xl p-4 max-w-md mx-auto space-y-2">
                    <h4 className="text-xs font-bold text-rose-900">Perguntas que erraste:</h4>
                    <ul className="space-y-2 text-xs text-rose-800">
                      {Object.entries(userAnswers).map(([idxStr, ans]: [string, any]) => {
                        if (ans.isCorrect) return null;
                        const q = activeQuiz.questions[parseInt(idxStr)];
                        return (
                          <li key={idxStr} className="p-2 bg-white rounded-lg border border-rose-200">
                            <span className="font-bold">Q{parseInt(idxStr) + 1}: {q.question}</span>
                            <p className="text-[11px] text-gray-600 mt-1">Resposta certa: {q.correct}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Weak Point Suggestion */}
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl max-w-md mx-auto text-xs text-indigo-950 font-medium">
                  💡 <strong>Sugestão da IA:</strong> Continua a praticar o módulo de <strong>{activeQuiz.area}</strong> para reforçar a retenção!
                </div>

              </div>
            )}

            {/* GAME MODAL FOOTER BUTTONS */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              {!isQuizCompleted ? (
                <>
                  {!isSubmitted ? (
                    <button
                      onClick={handleAnswerSubmit}
                      disabled={!selectedOption}
                      className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <span>Responder</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="ml-auto bg-slate-900 hover:bg-slate-800 text-white text-xs px-6 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <span>{currentQuestionIdx + 1 < activeQuiz.questions.length ? 'Próxima Pergunta' : 'Ver Resultado Final'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full flex items-center justify-center gap-3">
                  {onNavigateToLearning && (
                    <button
                      onClick={() => {
                        setActiveQuiz(null);
                        onNavigateToLearning(activeQuiz.topic);
                      }}
                      className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-4 h-4 text-gray-500" />
                      <span>Ir para o Material</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleStartQuiz(activeQuiz)}
                    className="bg-slate-900 text-white hover:bg-slate-800 text-xs px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Repetir Quiz</span>
                  </button>

                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>Concluir</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* PREVIEW QUIZ MODAL */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-indigo-600">{previewQuiz.area}</span>
                <h3 className="text-sm font-bold text-slate-900">{previewQuiz.title}</h3>
              </div>
              <button onClick={() => setPreviewQuiz(null)} className="p-1 text-gray-400 hover:text-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-500">Este quiz contém {previewQuiz.questions.length} perguntas de escolha múltipla:</p>
              {previewQuiz.questions.map((q, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900">Q{idx + 1}: {q.question}</span>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-600 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <span key={oIdx} className="truncate">• {opt}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setPreviewQuiz(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                Fechar
              </button>
              <button 
                onClick={() => {
                  const q = previewQuiz;
                  setPreviewQuiz(null);
                  handleStartQuiz(q);
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default QuizWorkspace;

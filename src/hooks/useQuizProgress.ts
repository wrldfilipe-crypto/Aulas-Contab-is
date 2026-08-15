import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  saveQuizProgress,
  saveQuizProgressCache, 
  enqueueOfflineAction 
} from '../services/dashboardCache';
import { 
  Quiz, 
  QuizStats, 
  Achievement, 
  QuizHistoryItem,
  getStoredQuizzes, 
  saveQuizzes, 
  getStoredQuizStats, 
  saveQuizStats, 
  getStoredAchievements, 
  saveAchievements, 
  getStoredQuizHistory, 
  addQuizHistoryItem, 
  generateQuizFromTopic 
} from '../lib/quizService';

export function useQuizProgress() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<QuizStats>(getStoredQuizStats());
  const [achievements, setAchievements] = useState<Achievement[]>(getStoredAchievements());
  const [history, setHistory] = useState<QuizHistoryItem[]>(getStoredQuizHistory());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load state on mount
  useEffect(() => {
    setQuizzes(getStoredQuizzes());
    setStats(getStoredQuizStats());
    setAchievements(getStoredAchievements());
    setHistory(getStoredQuizHistory());
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Check achievements after stats change
  const checkAchievements = useCallback((currentStats: QuizStats, currentQuizzes: Quiz[]) => {
    const updatedAchievements = getStoredAchievements().map(ach => {
      let isUnlocked = ach.unlocked;
      let progress = ach.progress;

      if (ach.id === 'ach_1') { // Primeiro Passo
        if (currentStats.totalQuizzes >= 1) {
          isUnlocked = true;
          progress = 100;
        }
      } else if (ach.id === 'ach_2') { // Chama do Conhecimento
        if (currentStats.streakDays >= 3) {
          isUnlocked = true;
          progress = 100;
        } else {
          progress = Math.min(100, Math.round((currentStats.streakDays / 3) * 100));
        }
      } else if (ach.id === 'ach_3') { // Especialista Fiscal
        const fiscalQuizzes = currentQuizzes.filter(q => q.area === 'Fiscalidade' && q.completed && (q.score || 0) >= 80);
        if (fiscalQuizzes.length >= 3) {
          isUnlocked = true;
          progress = 100;
        } else {
          progress = Math.min(100, Math.round((fiscalQuizzes.length / 3) * 100));
        }
      } else if (ach.id === 'ach_4') { // Mestre do Câmbio
        const cambioDone = currentQuizzes.some(q => q.area === 'Câmbio' && q.completed && (q.score || 0) >= 80);
        if (cambioDone) {
          isUnlocked = true;
          progress = 100;
        }
      } else if (ach.id === 'ach_5') { // Calculadora Humana
        const mathPerfect = currentQuizzes.some(q => q.area === 'Matemática' && q.completed && (q.score || 0) === 100);
        if (mathPerfect) {
          isUnlocked = true;
          progress = 100;
        }
      } else if (ach.id === 'ach_6') { // Perfeição Total
        const anyPerfect = currentQuizzes.some(q => q.completed && (q.score || 0) === 100);
        if (anyPerfect) {
          isUnlocked = true;
          progress = 100;
        }
      } else if (ach.id === 'ach_7') { // Cérebro em Ação
        const aiDone = currentQuizzes.some(q => q.source === 'ai_conversation' && q.completed);
        if (aiDone) {
          isUnlocked = true;
          progress = 100;
        }
      }

      return {
        ...ach,
        unlocked: isUnlocked,
        progress,
        unlockedAt: isUnlocked && !ach.unlocked ? 'Agora mesmo!' : ach.unlockedAt
      };
    });

    setAchievements(updatedAchievements);
    saveAchievements(updatedAchievements);
  }, []);

  // Schedule a review quiz (Spaced Repetition)
  const scheduleReviewQuiz = useCallback(async (topic: string, daysLater: number = 3) => {
    try {
      const reviewQuiz = await generateQuizFromTopic(
        `Revisão de Reforço: ${topic}`,
        'scheduled',
        'medium'
      );
      reviewQuiz.sourceLabel = `⏰ Quiz de Revisão Agendado (${daysLater} dias)`;
      
      const currentQuizzes = getStoredQuizzes();
      const updated = [reviewQuiz, ...currentQuizzes];
      setQuizzes(updated);
      saveQuizzes(updated);
      showToast(`📝 Quiz de revisão agendado sobre "${topic}"!`);
    } catch (e) {
      console.warn('Failed to schedule review quiz:', e);
    }
  }, [showToast]);

  // Main progress updater callback
  const updateProgress = useCallback(async (quizResult: {
    quizId: string;
    topic: string;
    area: string;
    score: number; // e.g. 80
    correct: number;
    total: number;
    points: number;
    timeSpentSeconds: number;
  }) => {
    // 1. Update quiz object state in list
    const currentQuizzes = getStoredQuizzes();
    const updatedQuizzes = currentQuizzes.map(q => {
      if (q.id === quizResult.quizId) {
        return {
          ...q,
          completed: true,
          score: quizResult.score,
          correctCount: quizResult.correct,
          attempts: (q.attempts || 0) + 1,
          lastAttemptDate: new Date().toISOString(),
          timeSpentSeconds: quizResult.timeSpentSeconds
        };
      }
      return q;
    });

    setQuizzes(updatedQuizzes);
    saveQuizzes(updatedQuizzes);

    // 2. Update stats object
    const currentStats = getStoredQuizStats();
    const areaCurrent = currentStats.areaStats[quizResult.area] || { correct: 0, incorrect: 0, total: 0, lastAttempt: 'Hoje' };
    
    const newStats: QuizStats = {
      ...currentStats,
      totalQuizzes: currentStats.totalQuizzes + 1,
      totalPoints: currentStats.totalPoints + quizResult.points,
      totalQuestionsAnswered: currentStats.totalQuestionsAnswered + quizResult.total,
      totalCorrectAnswers: currentStats.totalCorrectAnswers + quizResult.correct,
      areaStats: {
        ...currentStats.areaStats,
        [quizResult.area]: {
          correct: areaCurrent.correct + quizResult.correct,
          incorrect: areaCurrent.incorrect + (quizResult.total - quizResult.correct),
          total: areaCurrent.total + quizResult.total,
          lastAttempt: 'Hoje'
        }
      }
    };

    setStats(newStats);
    saveQuizStats(newStats);
    saveQuizProgress(newStats);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction('QUIZ_COMPLETED', {
        quizResult,
        newStats,
        completedAt: new Date().toISOString()
      });
    }

    // 3. Save to history log
    const quizObj = updatedQuizzes.find(q => q.id === quizResult.quizId);
    const historyItem: QuizHistoryItem = {
      id: `hist_${Date.now()}`,
      quizId: quizResult.quizId,
      quizTitle: quizObj?.title || `Quiz de ${quizResult.topic}`,
      topic: quizResult.topic,
      area: quizResult.area,
      score: quizResult.score,
      correctCount: quizResult.correct,
      totalQuestions: quizResult.total,
      pointsGained: quizResult.points,
      timeSpentSeconds: quizResult.timeSpentSeconds,
      date: new Date().toISOString()
    };
    addQuizHistoryItem(historyItem);
    setHistory(getStoredQuizHistory());

    // 4. Check achievements
    checkAchievements(newStats, updatedQuizzes);

    // 5. Spaced Repetition logic
    if (quizResult.score < 80) {
      scheduleReviewQuiz(quizResult.topic, 3);
      showToast(`💡 Registámos as dificuldades em "${quizResult.topic}". Agendámos um quiz de reforço!`);
    } else if (quizResult.score >= 90) {
      showToast(`🎉 Excelente desempenho! (${quizResult.score}%) +${quizResult.points} Pontos adicionados!`);
      // Unlock advanced quiz
      setTimeout(async () => {
        try {
          const advQuiz = await generateQuizFromTopic(
            `Aprofundamento Avançado: ${quizResult.topic}`,
            'ai_conversation',
            'hard'
          );
          advQuiz.sourceLabel = '🏆 Quiz Avançado Desbloqueado!';
          const latestQuizzes = getStoredQuizzes();
          const withAdv = [advQuiz, ...latestQuizzes];
          setQuizzes(withAdv);
          saveQuizzes(withAdv);
          showToast(`🌟 Novo Quiz Avançado desbloqueado para "${quizResult.topic}"!`);
        } catch (e) {
          console.warn('Could not generate advanced quiz:', e);
        }
      }, 1500);
    } else {
      showToast(`✅ Quiz Concluído com sucesso! +${quizResult.points} Pontos!`);
    }

    // Trigger confetti celebrating completion
    try {
      confetti({
        particleCount: quizResult.score >= 80 ? 80 : 40,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }
  }, [checkAchievements, scheduleReviewQuiz, showToast]);

  // Function to create a new quiz from AI Accountant or Study Material
  const createQuizFromTopic = useCallback(async (
    topic: string, 
    source: 'ai_conversation' | 'study_material' | 'certification' | 'scheduled' = 'ai_conversation',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ) => {
    try {
      showToast(`🧠 A gerar novo quiz automático sobre "${topic}"...`);
      const newQuiz = await generateQuizFromTopic(topic, source, difficulty);
      const currentQuizzes = getStoredQuizzes();
      const updated = [newQuiz, ...currentQuizzes];
      setQuizzes(updated);
      saveQuizzes(updated);
      showToast(`📝 Novo quiz disponível: "${newQuiz.title}"!`);
      return newQuiz;
    } catch (e) {
      console.error('Error creating quiz from topic:', e);
      return null;
    }
  }, [showToast]);

  // Function to save/unsave a quiz
  const toggleSaveQuiz = useCallback((quizId: string) => {
    const currentQuizzes = getStoredQuizzes();
    const updated = currentQuizzes.map(q => {
      if (q.id === quizId) {
        return { ...q, saved: !q.saved };
      }
      return q;
    });
    setQuizzes(updated);
    saveQuizzes(updated);
  }, []);

  return {
    quizzes,
    stats,
    achievements,
    history,
    toastMessage,
    updateProgress,
    createQuizFromTopic,
    toggleSaveQuiz,
    showToast
  };
}

import { getCurrentUser } from '../lib/db';

export interface StudentProgressData {
  materiaisEstudados: number;
  quizzesRealizados: number;
  pontuacaoTotal: number;
  sequenciaDias: number;
  cards: Array<{
    label: string;
    valor: string | number;
    subtexto: string;
    icone: string;
    cor: string;
  }>;
}

export function getStudentProgress(): StudentProgressData {
  const currentUser = getCurrentUser();
  const userId = currentUser?.userId || 'guest';

  // 1. Materiais estudados
  let materiaisCount = 0;
  try {
    const rawMaterials = localStorage.getItem(`ga_learnings_lib_${userId}`);
    if (rawMaterials) {
      const parsed = JSON.parse(rawMaterials);
      if (Array.isArray(parsed)) {
        materiaisCount = parsed.length;
      }
    }
    const topicosVisitados = JSON.parse(localStorage.getItem(`topicos_visitados_${userId}`) || "[]");
    if (Array.isArray(topicosVisitados)) {
      materiaisCount = Math.max(materiaisCount, topicosVisitados.length);
    }
  } catch (e) {
    console.warn("Failed fetching student materials count:", e);
  }

  // Fallback to default if empty
  if (materiaisCount === 0) {
    materiaisCount = 3; // Demo items
  }

  // 2. Quizzes realizados & Pontuação total
  let quizzesCount = 0;
  let scoreTotal = 0;
  try {
    const rawQuizStats = localStorage.getItem(`ga_user_quiz_stats_${userId}`);
    if (rawQuizStats) {
      const parsed = JSON.parse(rawQuizStats);
      quizzesCount = parsed.completed || 0;
      scoreTotal = parsed.totalScore || 0;
    }
    const quizzesFeitos = JSON.parse(localStorage.getItem(`quizzes_resultados_${userId}`) || "[]");
    if (Array.isArray(quizzesFeitos) && quizzesFeitos.length > 0) {
      quizzesCount = Math.max(quizzesCount, quizzesFeitos.length);
      const sum = quizzesFeitos.reduce((acc: number, q: any) => acc + (q.pontos || q.score || 0), 0);
      scoreTotal = Math.max(scoreTotal, sum);
    }
  } catch (e) {
    console.warn("Failed fetching quiz progress:", e);
  }

  // Fallback demo values if brand new
  if (quizzesCount === 0) {
    quizzesCount = 2;
    scoreTotal = 180;
  }

  // 3. Dias em sequência (streak)
  const streak = calculateStreak(userId);

  return {
    materiaisEstudados: materiaisCount,
    quizzesRealizados: quizzesCount,
    pontuacaoTotal: scoreTotal,
    sequenciaDias: streak,
    cards: [
      {
        label: "MATERIAIS ESTUDADOS",
        valor: materiaisCount,
        subtexto: "Registados no teu perfil",
        icone: "📖",
        cor: "#6366F1"
      },
      {
        label: "QUIZZES REALIZADOS",
        valor: quizzesCount,
        subtexto: "Simulados respondidos",
        icone: "🧠",
        cor: "#10B981"
      },
      {
        label: "PONTUAÇÃO EM QUIZZES",
        valor: `${scoreTotal} pts`,
        subtexto: "Acumulado de acertos",
        icone: "🏅",
        cor: "#F59E0B"
      },
      {
        label: "DIAS EM SEQUÊNCIA",
        valor: `${streak} ${streak === 1 ? 'dia' : 'dias'}`,
        subtexto: "Mantém o ritmo! 🔥",
        icone: "🔥",
        cor: "#EF4444"
      }
    ]
  };
}

export function calculateStreak(userId: string): number {
  try {
    const raw = localStorage.getItem(`historico_atividade_${userId}`);
    const historico: Array<{ data: string }> = raw ? JSON.parse(raw) : [];
    
    // Always log today's activity if not present
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!historico.some(h => h.data.startsWith(todayStr))) {
      historico.push({ data: new Date().toISOString() });
      localStorage.setItem(`historico_atividade_${userId}`, JSON.stringify(historico));
    }

    if (historico.length === 0) return 1;

    const datesSet = new Set(historico.map(h => h.data.slice(0, 10)));
    const sortedDates = Array.from(datesSet).sort().reverse();

    let sequence = 0;
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (datesSet.has(checkDate)) {
        sequence++;
      } else if (i === 0) {
        // Today not logged yet, keep checking yesterday
        continue;
      } else {
        break;
      }
    }

    return Math.max(1, sequence);
  } catch (e) {
    return 1;
  }
}

export function recordStudentActivity(actionType: string, detail?: string): void {
  const currentUser = getCurrentUser();
  const userId = currentUser?.userId || 'guest';
  try {
    const raw = localStorage.getItem(`historico_atividade_${userId}`);
    const historico = raw ? JSON.parse(raw) : [];
    historico.push({
      data: new Date().toISOString(),
      actionType,
      detail
    });
    localStorage.setItem(`historico_atividade_${userId}`, JSON.stringify(historico));
  } catch (e) {
    console.warn("Failed recording student activity:", e);
  }
}

export function recordQuizCompleted(quizId: string, score: number, maxScore: number = 100): void {
  const currentUser = getCurrentUser();
  const userId = currentUser?.userId || 'guest';
  try {
    const rawStats = localStorage.getItem(`ga_user_quiz_stats_${userId}`);
    const stats = rawStats ? JSON.parse(rawStats) : { completed: 0, totalScore: 0 };
    stats.completed = (stats.completed || 0) + 1;
    stats.totalScore = (stats.totalScore || 0) + score;
    localStorage.setItem(`ga_user_quiz_stats_${userId}`, JSON.stringify(stats));

    const rawResults = localStorage.getItem(`quizzes_resultados_${userId}`);
    const results = rawResults ? JSON.parse(rawResults) : [];
    results.push({
      quizId,
      score,
      maxScore,
      pontos: score,
      date: new Date().toISOString()
    });
    localStorage.setItem(`quizzes_resultados_${userId}`, JSON.stringify(results));

    recordStudentActivity('quiz_completed', `Quiz ${quizId} com ${score} pontos`);
  } catch (e) {
    console.warn("Failed recording quiz completed:", e);
  }
}

export function markTopicVisited(topicId: string, title: string): void {
  const currentUser = getCurrentUser();
  const userId = currentUser?.userId || 'guest';
  try {
    const key = `topicos_visitados_${userId}`;
    const raw = localStorage.getItem(key);
    const list: Array<{ id: string; title: string; visitedAt: string }> = raw ? JSON.parse(raw) : [];
    if (!list.some(item => item.id === topicId)) {
      list.push({ id: topicId, title, visitedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    }
    recordStudentActivity('topic_visited', title);
  } catch (e) {
    console.warn("Failed marking topic visited:", e);
  }
}

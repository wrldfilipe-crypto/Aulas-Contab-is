export interface LongtermMemoryProfile {
  name: string;
  country: string;
  profession: string;
  company: string;
  standard: string;
  level: string;
  language: string;
}

export interface ExerciseRecord {
  topic: string;
  result: 'correct' | 'incorrect' | 'partial';
  score: number;
  date: string;
}

export interface LongtermMemory {
  profile: LongtermMemoryProfile;
  topicsStudied: string[];
  documentsCreated: string[];
  exercisesDone: ExerciseRecord[];
  mistakesPatterns: string[];
  achievements: string[];
  preferences: {
    exampleStyle: string;
    detailLevel: string;
    practiceFreq: string;
  };
}

export interface SessionMemory {
  sessionId: string;
  date: string;
  topics: string[];
  standard: string;
  exercises: ExerciseRecord[];
  documents: string[];
  keyInsights: string[];
  summary: string;
  openQuestions: string[];
}

export interface CurrentMemory {
  messages: Array<{ role: 'user' | 'assistant'; text: string; date?: string }>;
  currentTopic: string;
  currentStandard: string;
  currentExercise?: any;
  pendingDoubt: string;
}

export interface ExtractedMemoryData {
  userName?: string;
  country?: string;
  profession?: string;
  company?: string;
  standardPreference?: string;
  topicStudied?: string;
  exerciseDone?: {
    topic: string;
    result: 'correct' | 'incorrect' | 'partial';
    score: number;
  };
  mistakeDetected?: string;
  preferenceSignal?: string;
  openQuestion?: string;
  keyPhrase?: string;
}

export interface SmartSuggestion {
  id: string;
  icon: string;
  text: string;
  color?: string;
  actionType: 'chat' | 'study' | 'compliance' | 'exercise';
  payload?: any;
}

const DEFAULT_USER_ID = 'default_user';

export function getLongtermMemory(userId: string = DEFAULT_USER_ID): LongtermMemory {
  try {
    const raw = localStorage.getItem(`ga:${userId}:memory:longterm`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        profile: {
          name: '',
          country: '',
          profession: '',
          company: '',
          standard: '',
          level: 'Intermédio',
          language: 'pt-PT',
          ...parsed.profile
        },
        topicsStudied: Array.isArray(parsed.topicsStudied) ? parsed.topicsStudied : [],
        documentsCreated: Array.isArray(parsed.documentsCreated) ? parsed.documentsCreated : [],
        exercisesDone: Array.isArray(parsed.exercisesDone) ? parsed.exercisesDone : [],
        mistakesPatterns: Array.isArray(parsed.mistakesPatterns) ? parsed.mistakesPatterns : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        preferences: {
          exampleStyle: 'numérico',
          detailLevel: 'equilibrado',
          practiceFreq: 'frequente',
          ...(parsed.preferences || {})
        }
      };
    }
  } catch (err) {
    console.warn('Error reading longterm memory:', err);
  }

  return {
    profile: {
      name: '',
      country: '',
      profession: '',
      company: '',
      standard: '',
      level: 'Intermédio',
      language: 'pt-PT'
    },
    topicsStudied: ['Conceitos Fundamentais de Contabilidade', 'IVA e Retenções na Fonte'],
    documentsCreated: [],
    exercisesDone: [],
    mistakesPatterns: [],
    achievements: ['Noções Básicas de Débito e Crédito'],
    preferences: {
      exampleStyle: 'numérico',
      detailLevel: 'equilibrado',
      practiceFreq: 'frequente'
    }
  };
}

export function saveLongtermMemory(memory: LongtermMemory, userId: string = DEFAULT_USER_ID): void {
  try {
    localStorage.setItem(`ga:${userId}:memory:longterm`, JSON.stringify(memory));
  } catch (err) {
    console.warn('Error saving longterm memory:', err);
  }
}

export function recordTopicStudied(topicName: string, userId: string = DEFAULT_USER_ID): void {
  if (!topicName) return;
  const lt = getLongtermMemory(userId);
  if (!lt.topicsStudied.includes(topicName)) {
    lt.topicsStudied.push(topicName);
    saveLongtermMemory(lt, userId);
  }
}

export function recordExerciseDone(record: ExerciseRecord, userId: string = DEFAULT_USER_ID): void {
  if (!record || !record.topic) return;
  const lt = getLongtermMemory(userId);
  lt.exercisesDone.push(record);
  saveLongtermMemory(lt, userId);
}

export function getSessionMemories(userId: string = DEFAULT_USER_ID): SessionMemory[] {
  try {
    const raw = localStorage.getItem(`ga:${userId}:memory:sessions`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading session memories:', err);
  }
  return [
    {
      sessionId: 'sess_prev_01',
      date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      topics: ['Lançamentos de IVA e Retenção na Fonte', 'PGC Angola'],
      standard: 'PGC Angola',
      exercises: [{ topic: 'Apuramento de IVA (Conta 34.5)', result: 'correct', score: 9, date: '2026-07-27' }],
      documents: ['Fatura FT2026/0894'],
      keyInsights: ['Utilizador domina o apuramento de IVA no PGC Angola'],
      summary: 'Sessão focada nos lançamentos de Fornecimentos e Serviços de Terceiros e retenção de IRT/II a 6.5%.',
      openQuestions: ['Como tratar a retenção na fonte quando o fornecedor é isento de IVA?']
    }
  ];
}

export function addSessionMemory(session: SessionMemory, userId: string = DEFAULT_USER_ID): void {
  try {
    const sessions = getSessionMemories(userId);
    const updated = [session, ...sessions.slice(0, 9)];
    localStorage.setItem(`ga:${userId}:memory:sessions`, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error adding session memory:', err);
  }
}

export function getCurrentMemory(userId: string = DEFAULT_USER_ID): CurrentMemory {
  try {
    const raw = localStorage.getItem(`ga:${userId}:memory:current`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading current memory:', err);
  }
  return {
    messages: [],
    currentTopic: 'Lançamentos Contabilísticos e Fiscalidade',
    currentStandard: 'PGC Angola',
    pendingDoubt: ''
  };
}

export function saveCurrentMemory(memory: CurrentMemory, userId: string = DEFAULT_USER_ID): void {
  try {
    localStorage.setItem(`ga:${userId}:memory:current`, JSON.stringify(memory));
  } catch (err) {
    console.warn('Error saving current memory:', err);
  }
}

export function updateMemoryFromExtraction(data: ExtractedMemoryData, userId: string = DEFAULT_USER_ID): void {
  const lt = getLongtermMemory(userId);

  if (data.userName && !lt.profile.name) lt.profile.name = data.userName;
  if (data.country && !lt.profile.country) lt.profile.country = data.country;
  if (data.profession && !lt.profile.profession) lt.profile.profession = data.profession;
  if (data.company && !lt.profile.company) lt.profile.company = data.company;
  if (data.standardPreference) lt.profile.standard = data.standardPreference;

  if (data.topicStudied && !lt.topicsStudied.includes(data.topicStudied)) {
    lt.topicsStudied.unshift(data.topicStudied);
  }

  if (data.exerciseDone) {
    lt.exercisesDone.unshift({
      ...data.exerciseDone,
      date: new Date().toISOString().split('T')[0]
    });
    if (data.exerciseDone.score >= 8 && data.exerciseDone.topic && !lt.achievements.includes(data.exerciseDone.topic)) {
      lt.achievements.push(data.exerciseDone.topic);
    }
  }

  if (data.mistakeDetected && !lt.mistakesPatterns.includes(data.mistakeDetected)) {
    lt.mistakesPatterns.unshift(data.mistakeDetected);
    if (lt.mistakesPatterns.length > 5) lt.mistakesPatterns.pop();
  }

  saveLongtermMemory(lt, userId);
}

export function buildMemorySystemPrompt(userId: string = DEFAULT_USER_ID): string {
  const lt = getLongtermMemory(userId);
  const sessions = getSessionMemories(userId);

  let prompt = `
You are a personal AI accountant and professor. You have natural memory of your
interactions with this user. Use this memory organically in conversation —
NEVER say "I remember that..." or "According to my memory..." or announce that
you have memory. Just USE it naturally, the way a professor who knows their
student would.

## WHAT YOU KNOW ABOUT THIS USER:
${lt.profile.name ? `- Their name is ${lt.profile.name}` : ''}
${lt.profile.country ? `- They are based in ${lt.profile.country}` : ''}
${lt.profile.profession ? `- They work as ${lt.profile.profession}` : ''}
${lt.profile.company ? `- Their company is ${lt.profile.company}` : ''}
${lt.profile.standard ? `- They prefer working with ${lt.profile.standard}` : ''}
${lt.profile.level ? `- Their accounting level appears to be: ${lt.profile.level}` : ''}

## TOPICS THEY HAVE ALREADY STUDIED:
${lt.topicsStudied.length > 0 ? lt.topicsStudied.map(t => `- ${t}`).join('\n') : '- No topics recorded yet'}

## COMMON MISTAKES THIS USER MAKES:
${lt.mistakesPatterns.length > 0 ? lt.mistakesPatterns.map(m => `- ${m}`).join('\n') : '- None detected yet'}

## RECENT SESSIONS SUMMARY:
${sessions.slice(0, 3).map(s => `
[${s.date}] Topics: ${s.topics.join(', ')}
Summary: ${s.summary}
${s.openQuestions.length > 0 ? 'Unresolved questions: ' + s.openQuestions.join(', ') : ''}
`).join('\n')}

## HOW TO USE THIS MEMORY NATURALLY:
- If the user refers to "the exercise we did before" — connect it to the exercises in memory
- If the user says "like last time" — refer to the most recent session naturally
- If the user is about to repeat a mistake they made before — gently pre-empt it
- If the user asks about a topic already studied — build on prior knowledge instead of re-explaining from scratch
- If there are open questions from a past session — address them proactively when relevant
- Adapt explanation depth to their observed level: ${lt.profile.level || 'intermediate'}
- Use examples relevant to their country: ${lt.profile.country || 'Angola'}
- Use their preferred standard: ${lt.profile.standard || 'PGC Angola'}

## CRITICAL RULE:
NEVER say "Based on our previous conversations", "I have memory of",
"According to my records", or any similar phrase that makes the memory
mechanism visible. Just naturally behave as a professor who knows their student.
`;

  return prompt;
}

export function getSmartSuggestions(userId: string = DEFAULT_USER_ID): SmartSuggestion[] {
  const lt = getLongtermMemory(userId);
  const sessions = getSessionMemories(userId);

  const suggestions: SmartSuggestion[] = [];

  // 1. Open doubts from recent sessions
  const lastSession = sessions[0];
  if (lastSession && lastSession.openQuestions && lastSession.openQuestions.length > 0) {
    const doubt = lastSession.openQuestions[0];
    suggestions.push({
      id: 'sug_doubt_1',
      icon: 'HelpCircle',
      text: `Retomar: "${doubt.length > 35 ? doubt.slice(0, 35) + '...' : doubt}"`,
      actionType: 'chat',
      payload: doubt
    });
  }

  // 2. Recommended next topic
  const nextTopic = getNextRecommendedTopic(userId);
  if (nextTopic) {
    suggestions.push({
      id: 'sug_next_topic',
      icon: 'BookOpen',
      text: `Estudar a seguir: ${nextTopic}`,
      actionType: 'study',
      payload: nextTopic
    });
  }

  // 3. Urgent compliance warning (or practice exercise)
  suggestions.push({
    id: 'sug_compliance_1',
    icon: 'AlertTriangle',
    color: 'amber',
    text: `IRT Angola: Vencimento em 4 dias`,
    actionType: 'compliance',
    payload: 'IRT_Angola'
  });

  // 4. Practice recommendation if needed
  if (lt.topicsStudied.length > 0) {
    const lastTopic = lt.topicsStudied[0];
    suggestions.push({
      id: 'sug_practice_1',
      icon: 'Edit3',
      text: `Praticar: ${lastTopic}`,
      actionType: 'exercise',
      payload: lastTopic
    });
  }

  return suggestions.slice(0, 3);
}

export function getNextRecommendedTopic(userId: string = DEFAULT_USER_ID): string {
  const lt = getLongtermMemory(userId);
  const studied = lt.topicsStudied;

  if (!studied.includes('Depreciação e Amortização de Ativos')) {
    return 'Depreciação e Amortização de Ativos';
  }
  if (!studied.includes('Apuramento do IVA (Conta 34.5)')) {
    return 'Apuramento do IVA (Conta 34.5)';
  }
  if (!studied.includes('Operações em Moeda Estrangeira & Hedging')) {
    return 'Operações em Moeda Estrangeira & Hedging';
  }
  return 'Balanço de Verificação e Fecho de Contas';
}

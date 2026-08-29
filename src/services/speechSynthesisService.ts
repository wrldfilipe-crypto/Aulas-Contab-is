/**
 * Speech Synthesis Service for AI Accountant
 * Provides high-quality Text-to-Speech (TTS) for accounting explanations,
 * turning complex double-entry bookkeeping, PGC standards, and tax rules
 * into crystal-clear spoken Portuguese audio.
 */

export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  activeMessageId: string | null;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let stateChangeListeners: Array<(state: SpeechState) => void> = [];

let currentState: SpeechState = {
  isSpeaking: false,
  isPaused: false,
  activeMessageId: null,
};

function notifyListeners() {
  stateChangeListeners.forEach(listener => {
    try {
      listener({ ...currentState });
    } catch (e) {
      console.warn('[Speech] Listener error:', e);
    }
  });
}

export function subscribeSpeechState(callback: (state: SpeechState) => void): () => void {
  stateChangeListeners.push(callback);
  callback({ ...currentState });
  return () => {
    stateChangeListeners = stateChangeListeners.filter(l => l !== callback);
  };
}

/**
 * Prepares accounting Markdown text for natural Portuguese speech:
 * - Expands accounting symbols and acronyms ([D] -> Débito, [C] -> Crédito)
 * - Expands PGC, AGT, IVA, IRT, INSS, DRE, DFC, etc.
 * - Strips code blocks, markdown hashes, asterisks, URLs, and table pipes.
 */
export function cleanTextForSpeech(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Remove SVGs and HTML tags
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
  });

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, '');

  // Accounting specific spoken pronunciations
  text = text.replace(/\[D\]/gi, 'Débito: ');
  text = text.replace(/\[C\]/gi, 'Crédito: ');
  text = text.replace(/\bD:(\s*)/gi, 'A Débito, ');
  text = text.replace(/\bC:(\s*)/gi, 'A Crédito, ');
  text = text.replace(/\bPGC\b/g, 'P.G.C.');
  text = text.replace(/\bAGT\b/g, 'A.G.T.');
  text = text.replace(/\bIVA\b/g, 'I.V.A.');
  text = text.replace(/\bIRT\b/g, 'I.R.T.');
  text = text.replace(/\bINSS\b/g, 'I.N.S.S.');
  text = text.replace(/\bDRE\b/g, 'D.R.E., Demonstração dos Resultados do Exercício,');
  text = text.replace(/\bDFC\b/g, 'D.F.C., Demonstração dos Fluxos de Caixa,');
  text = text.replace(/\bNIF\b/g, 'N.I.F.');
  text = text.replace(/\bKz\b/gi, 'Kwanzas');
  text = text.replace(/\bAKZ\b/gi, 'Kwanzas');
  text = text.replace(/%/g, ' por cento');

  // Strip Markdown syntax
  text = text.replace(/^#+\s+/gm, ''); // Headings
  text = text.replace(/(\*\*|\*|__|_)/g, ''); // Bold/Italics
  text = text.replace(/~~.*?~~/g, ''); // Strikethrough
  text = text.replace(/`([^`]+)`/g, '$1'); // Inline code
  text = text.replace(/^\s*[-*+]\s+/gm, '• '); // Bullets
  text = text.replace(/\|/g, ' '); // Tables
  text = text.replace(/-{3,}/g, ''); // Horizontal rules

  // Clean redundant whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Finds the best available voice matching the target language code
 */
export function getBestVoiceForLanguage(langCode: string = 'pt-PT'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const normalized = (langCode || 'pt-PT').toLowerCase();

  // 1. Exact match (e.g. pt-PT, pt-AO, pt-BR, en-US, es-ES)
  const exact = voices.find(v => v.lang.toLowerCase() === normalized || v.lang.toLowerCase().replace('_', '-') === normalized);
  if (exact) return exact;

  // 2. Language prefix match (e.g. pt, en, es, fr, de)
  const prefix = normalized.split('-')[0];
  const langMatch = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
  if (langMatch) return langMatch;

  // 3. Fallback to any Portuguese voice if pt requested
  if (prefix === 'pt') {
    const anyPt = voices.find(v => v.lang.toLowerCase().includes('pt') || v.name.toLowerCase().includes('portuguese'));
    if (anyPt) return anyPt;
  }

  return voices[0] || null;
}

/**
 * Speaks text using the SpeechSynthesis Web API
 */
export function speakAccountingExplanation(
  messageId: string,
  rawText: string,
  options?: {
    language?: string;
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[Speech] Web Speech Synthesis API não é suportada neste navegador.');
    return false;
  }

  const synth = window.speechSynthesis;

  // If already speaking this message, toggle pause/resume
  if (currentState.activeMessageId === messageId && currentState.isSpeaking) {
    if (synth.paused) {
      synth.resume();
      currentState = { ...currentState, isPaused: false };
      notifyListeners();
      return true;
    } else {
      synth.pause();
      currentState = { ...currentState, isPaused: true };
      notifyListeners();
      return true;
    }
  }

  // Cancel any ongoing speech before starting a new one
  synth.cancel();

  const spokenText = cleanTextForSpeech(rawText);
  if (!spokenText) {
    return false;
  }

  const targetLang = options?.language || 'pt-PT';
  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = targetLang;
  utterance.rate = options?.rate || 0.95; // Slightly measured rate for clear comprehension of accounting terms
  utterance.pitch = options?.pitch || 1.0;

  const matchedVoice = getBestVoiceForLanguage(targetLang);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onstart = () => {
    currentState = {
      isSpeaking: true,
      isPaused: false,
      activeMessageId: messageId,
    };
    notifyListeners();
  };

  utterance.onend = () => {
    currentState = {
      isSpeaking: false,
      isPaused: false,
      activeMessageId: null,
    };
    activeUtterance = null;
    notifyListeners();
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    // If cancelled manually, ignore error
    if (e.error === 'canceled' || e.error === 'interrupted') {
      currentState = {
        isSpeaking: false,
        isPaused: false,
        activeMessageId: null,
      };
      notifyListeners();
      return;
    }
    console.warn('[Speech] Utterance error:', e);
    currentState = {
      isSpeaking: false,
      isPaused: false,
      activeMessageId: null,
    };
    activeUtterance = null;
    notifyListeners();
    options?.onError?.(e);
  };

  activeUtterance = utterance;

  // Ensure voices are loaded
  if (synth.getVoices().length === 0) {
    synth.onvoiceschanged = () => {
      const v = getBestVoiceForLanguage(targetLang);
      if (v) utterance.voice = v;
      synth.speak(utterance);
    };
  } else {
    synth.speak(utterance);
  }

  return true;
}

/**
 * Stops any active speech
 */
export function stopAccountingSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentState = {
      isSpeaking: false,
      isPaused: false,
      activeMessageId: null,
    };
    activeUtterance = null;
    notifyListeners();
  }
}

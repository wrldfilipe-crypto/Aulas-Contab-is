import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Flame,
  CheckCircle2,
  BookOpen,
  FileText,
  Clock,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  PenTool,
  Save,
  Check,
  StickyNote,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { LearningItem } from './LearningWorkspace';
import { DB } from '../lib/db';

interface FocusedStudyModeProps {
  module?: LearningItem | null;
  allModules?: LearningItem[];
  onSelectModule?: (mod: LearningItem) => void;
  onExit: (stats: { focusedMinutes: number; completedCycles: number; notesTaken: number }) => void;
  currentLanguage?: string;
}

type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';
type MobileStudyTab = 'foco' | 'conteudo' | 'notas';

const DEFAULT_DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

export const FocusedStudyMode: React.FC<FocusedStudyModeProps> = ({
  module,
  allModules = [],
  onSelectModule,
  onExit,
  currentLanguage = 'pt-PT'
}) => {
  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<MobileStudyTab>('foco');

  // Timer State (Persists regardless of tab)
  const [currentMode, setCurrentMode] = useState<PomodoroMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [totalFocusedSeconds, setTotalFocusedSeconds] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Content Navigation & Notes
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number>(0);
  const [notesText, setNotesText] = useState<string>('');
  const [notesCount, setNotesCount] = useState<number>(0);
  const [isNoteSaved, setIsNoteSaved] = useState<boolean>(false);
  const [selectedModule, setSelectedModule] = useState<LearningItem | null>(module || (allModules[0] || null));

  const timerRef = useRef<any>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top whenever section index or active module changes
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [selectedSectionIdx, selectedModule?.id]);

  // Audio tone synthesizer for pomodoro completion
  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  // Timer Tick - Continuous background execution
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            playChime();
            if (currentMode === 'focus') {
              const newCycles = completedCycles + 1;
              setCompletedCycles(newCycles);
              const nextMode = newCycles % 4 === 0 ? 'longBreak' : 'shortBreak';
              setCurrentMode(nextMode);
              return DEFAULT_DURATIONS[nextMode];
            } else {
              setCurrentMode('focus');
              return DEFAULT_DURATIONS.focus;
            }
          }
          if (currentMode === 'focus') {
            setTotalFocusedSeconds(s => s + 1);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, currentMode, completedCycles, soundEnabled]);

  const toggleTimer = () => setIsRunning(prev => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(DEFAULT_DURATIONS[currentMode]);
  };

  const switchMode = (mode: PomodoroMode) => {
    setIsRunning(false);
    setCurrentMode(mode);
    setTimeLeft(DEFAULT_DURATIONS[mode]);
  };

  const skipTimer = () => {
    setIsRunning(false);
    if (currentMode === 'focus') {
      const nextMode = (completedCycles + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
      setCurrentMode(nextMode);
      setTimeLeft(DEFAULT_DURATIONS[nextMode]);
    } else {
      setCurrentMode('focus');
      setTimeLeft(DEFAULT_DURATIONS.focus);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Save quick note to local storage notes DB
  const handleSaveNote = async () => {
    if (!notesText.trim()) return;
    try {
      const newNote = {
        id: `note-${Date.now()}`,
        userId: 'standard-user-id-0002',
        title: `Nota de Estudo: ${selectedModule?.title || 'Contabilidade Geral'}`,
        content: notesText.trim(),
        tags: ['Estudo Focado', 'Pomodoro'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      DB.set('notes', newNote.id, newNote);
      setNotesCount(c => c + 1);
      setIsNoteSaved(true);
      setTimeout(() => setIsNoteSaved(false), 2500);
    } catch (e) {
      console.warn('Failed saving study note:', e);
    }
  };

  const currentSection = selectedModule?.sections?.[selectedSectionIdx];
  const progressPercent = ((DEFAULT_DURATIONS[currentMode] - timeLeft) / DEFAULT_DURATIONS[currentMode]) * 100;

  // Render Left Timer Panel (Re-usable for mobile & desktop)
  const renderTimerContent = () => (
    <div className="flex flex-col justify-between h-full space-y-6 p-4 sm:p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Mode Selector Buttons */}
        <div className="flex items-center justify-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => switchMode('focus')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              currentMode === 'focus'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Foco (25m)
          </button>
          <button
            type="button"
            onClick={() => switchMode('shortBreak')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              currentMode === 'shortBreak'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pausa (5m)
          </button>
          <button
            type="button"
            onClick={() => switchMode('longBreak')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              currentMode === 'longBreak'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Longa (15m)
          </button>
        </div>

        {/* Timer Dial Display */}
        <div className="relative flex flex-col items-center justify-center pt-2">
          <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-slate-900 border-4 border-slate-800 flex flex-col items-center justify-center shadow-2xl relative">
            {/* SVG Progress Circle */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="text-slate-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className={
                  currentMode === 'focus'
                    ? 'text-amber-500'
                    : currentMode === 'shortBreak'
                    ? 'text-emerald-500'
                    : 'text-blue-500'
                }
                strokeWidth="8"
                strokeDasharray="280%"
                strokeDashoffset={`${280 * (1 - progressPercent / 100)}%`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>

            {/* Digital Clock */}
            <span className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-white">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
              {currentMode === 'focus' ? '🎯 Sessão de Foco' : currentMode === 'shortBreak' ? '☕ Pausa Curta' : '🌿 Pausa Longa'}
            </span>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={resetTimer}
              className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Reiniciar Temporizador"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggleTimer}
              className={`px-8 h-14 rounded-2xl font-black text-sm flex items-center gap-3 transition-all cursor-pointer shadow-xl active:scale-95 ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/30'
              }`}
              id="btn-toggle-pomodoro"
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>PAUSAR</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>INICIAR FOCO</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={skipTimer}
              className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Pular Ciclo"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pomodoro Cycles Count */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400">Ciclos Concluídos</span>
            <span className="font-black text-amber-400">{completedCycles} concluídos</span>
          </div>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`flex-1 h-3 rounded-full transition-all ${
                  i < (completedCycles % 4)
                    ? 'bg-amber-500 shadow-md shadow-amber-500/40'
                    : completedCycles >= 4 && (completedCycles % 4 === 0)
                    ? 'bg-amber-500'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Session Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-xl font-black text-white">{Math.round(totalFocusedSeconds / 60)} min</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Tempo Focado</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-xl font-black text-emerald-400">{notesCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Notas Tomadas</div>
          </div>
        </div>
      </div>

      {/* Quick Module Switcher */}
      {allModules.length > 1 && (
        <div className="pt-4 border-t border-slate-800">
          <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
            Módulo Didático Ativo
          </label>
          <select
            value={selectedModule?.id || ''}
            onChange={(e) => {
              const found = allModules.find(m => m.id === e.target.value);
              if (found) {
                setSelectedModule(found);
                setSelectedSectionIdx(0);
                if (onSelectModule) onSelectModule(found);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            {allModules.map(m => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  // Render Content Reader Section
  const renderContentReading = () => {
    const totalSections = selectedModule?.sections?.length || 1;
    const anySection = currentSection as any;

    return (
      <div className="flex-1 flex flex-col overflow-hidden h-full bg-slate-950">
        {selectedModule ? (
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Section Navigation Header */}
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-xs font-black text-amber-400 shrink-0 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                    Seção {(selectedSectionIdx + 1)}/{totalSections}
                  </span>
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {currentSection?.title || selectedModule.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={selectedSectionIdx <= 0}
                    onClick={() => setSelectedSectionIdx(i => Math.max(0, i - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors"
                    title="Seção Anterior"
                    aria-label="Seção Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={selectedSectionIdx >= totalSections - 1}
                    onClick={() => setSelectedSectionIdx(i => Math.min(totalSections - 1, i + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors"
                    title="Próxima Seção"
                    aria-label="Próxima Seção"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Section Switcher Pills for multi-section modules */}
              {totalSections > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                  {selectedModule.sections.map((sec, idx) => (
                    <button
                      key={sec.id || idx}
                      type="button"
                      onClick={() => setSelectedSectionIdx(idx)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 transition-all ${
                        selectedSectionIdx === idx
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title={sec.title}
                    >
                      {idx + 1}. {sec.title.length > 22 ? `${sec.title.slice(0, 22)}...` : sec.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clean Section Reading Area with dedicated scroll and auto-reset */}
            <div ref={contentScrollRef} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <h3 className="text-lg font-black text-white leading-snug">
                {currentSection?.title || selectedModule.title}
              </h3>
              
              <div className="text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap">
                {anySection?.content || currentSection?.explanation || selectedModule.summary}
              </div>

              {currentSection?.practicalExample && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Exemplo Prático & Lançamento</span>
                  </div>
                  {currentSection.practicalExample.scenario && (
                    <p className="text-xs text-slate-300">
                      <strong className="text-amber-200">Cenário:</strong> {currentSection.practicalExample.scenario}
                    </p>
                  )}
                  {currentSection.practicalExample.stepByStep && (
                    <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                      <strong className="text-amber-200">Passo a Passo Contabilístico:</strong>
                      <div className="mt-1 pl-2 border-l-2 border-amber-500/40">
                        {currentSection.practicalExample.stepByStep}
                      </div>
                    </div>
                  )}
                  {Array.isArray(anySection?.practicalExample?.steps) && anySection.practicalExample.steps.length > 0 && (
                    <div className="text-xs text-slate-300 space-y-1 mt-1">
                      <strong className="text-amber-200">Etapas do Procedimento:</strong>
                      <ol className="list-decimal list-inside space-y-1 pl-1">
                        {anySection.practicalExample.steps.map((step: string, sIdx: number) => (
                          <li key={sIdx} className="text-slate-300">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {currentSection.practicalExample.conclusion && (
                    <p className="text-xs text-slate-300 border-t border-amber-500/20 pt-2 mt-2">
                      <strong className="text-amber-200">Conclusão:</strong> {currentSection.practicalExample.conclusion}
                    </p>
                  )}
                </div>
              )}

              {anySection?.commonMistake && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1.5 mt-3">
                  <div className="flex items-center gap-2 text-xs font-black text-rose-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Atenção & Erro Comum</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{anySection.commonMistake}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-bold">Nenhum módulo didático selecionado</p>
            <p className="text-xs text-slate-500 mt-1">
              Utilize o temporizador Pomodoro para focar ou selecione um conteúdo da lista.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render Scratchpad Notes Section
  const renderNotesArea = () => (
    <div className="p-4 sm:p-6 flex flex-col justify-between h-full bg-slate-900/30 overflow-hidden">
      <div className="space-y-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <PenTool className="w-4 h-4 text-amber-400" />
            <span>Anotações Rápidas da Sessão</span>
          </div>
          {isNoteSaved && (
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <Check className="w-3 h-3" /> Salva no Bloco de Notas
            </span>
          )}
        </div>

        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Registe aqui as suas dúvidas, fórmulas, contas ou conclusões da sessão de estudo..."
          className="w-full flex-1 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none font-mono leading-relaxed"
        />
      </div>

      <div className="pt-3">
        <button
          type="button"
          onClick={handleSaveNote}
          disabled={!notesText.trim()}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Guardar no Bloco de Notas</span>
        </button>
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans h-[100dvh] max-h-[100dvh]"
      id="focused-study-workspace"
    >
      {/* 1. TOP FOCUS BAR */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-white truncate">
                Modo de Estudo Focado
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {selectedModule ? selectedModule.title : 'Selecione um módulo didático'}
            </p>
          </div>
        </div>

        {/* Controls: Sound & Exit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(s => !s)}
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={soundEnabled ? 'Silenciar Notificações de Alarme' : 'Ativar Alarme Sonoro'}
            aria-label="Alternar som"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={() => {
              onExit({
                focusedMinutes: Math.round(totalFocusedSeconds / 60),
                completedCycles,
                notesTaken: notesCount
              });
            }}
            className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
            id="btn-exit-focus-study"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Encerrar Modo Foco</span>
          </button>
        </div>
      </header>

      {/* 2. MOBILE TAB SWITCHER (<768px / md:hidden) */}
      <div className="md:hidden flex items-center bg-slate-900 border-b border-slate-800 shrink-0 p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveMobileTab('foco')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === 'foco'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Foco</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('conteudo')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === 'conteudo'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Conteúdo</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('notas')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === 'notas'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>Notas</span>
        </button>
      </div>

      {/* 3. MOBILE VIEW CONTAINER (<768px) */}
      <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeMobileTab === 'foco' && renderTimerContent()}
        {activeMobileTab === 'conteudo' && renderContentReading()}
        {activeMobileTab === 'notas' && renderNotesArea()}
      </div>

      {/* 4. DESKTOP 2-COLUMN LAYOUT (≥768px / md:flex) (60% Conteúdo, 40% Foco & Notas) */}
      <div className="hidden md:grid flex-1 min-h-0 grid-cols-12 overflow-hidden">
        {/* 60% Left / Center: Conteúdo Didático */}
        <div className="col-span-7 border-r border-slate-800 flex flex-col overflow-hidden h-full">
          {renderContentReading()}
        </div>

        {/* 40% Right: Foco & Notas Split */}
        <div className="col-span-5 flex flex-col overflow-hidden h-full divide-y divide-slate-800 bg-slate-900/40">
          {/* Top Half: Timer & Progress */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {renderTimerContent()}
          </div>
          {/* Bottom Half: Scratchpad Notes */}
          <div className="h-64 shrink-0">
            {renderNotesArea()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusedStudyMode;

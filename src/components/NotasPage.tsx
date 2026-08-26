import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  StickyNote, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Pin, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  X, 
  Clock, 
  Sparkles, 
  FileText, 
  FileDown,
  FileCode,
  CheckCircle2, 
  Grid, 
  List, 
  SortAsc, 
  SortDesc, 
  Hash,
  ChevronDown,
  Layers,
  Wand2,
  RefreshCw,
  Maximize2,
  CheckCheck,
  CloudCheck,
  WifiOff,
  ArrowRight,
  Eye,
  Undo2,
  BookOpen
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { 
  exportNotesAsPDF, 
  exportSingleNoteAsPDF, 
  exportNotesAsMarkdown, 
  exportSingleNoteAsMarkdown,
  exportCategoryNotesAsPDF,
  exportCategoryNotesAsMarkdown
} from '../services/notesExportService';
import { generateLocalNotesAssist } from '../services/localNotesAiService';
import { 
  db, 
  firestoreDisponivel, 
  salvarNotaNoFirestore, 
  apagarNotaNoFirestore, 
  ouvirNotasDoFirestore 
} from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

export type NoteCategory = 
  | 'Geral' 
  | 'Mapa' 
  | 'Matéria' 
  | 'Especificação' 
  | 'Contabilidade' 
  | 'Estudo' 
  | 'Ideia';

export const NOTE_CATEGORIES: NoteCategory[] = [
  'Geral',
  'Mapa',
  'Matéria',
  'Especificação',
  'Contabilidade',
  'Estudo',
  'Ideia'
];

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  pinned: boolean;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

interface NotasPageProps {
  currentUserId?: string;
  onNavigateTab?: (tab: string) => void;
}

const CATEGORY_COLORS: Record<NoteCategory, { bg: string; text: string; border: string; badge: string }> = {
  Geral: { bg: 'bg-slate-500/10', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-500/20', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  Mapa: { bg: 'bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500/20', badge: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300' },
  Matéria: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20', badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
  Especificação: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/20', badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
  Contabilidade: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20', badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  Estudo: { bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-500/20', badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' },
  Ideia: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20', badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
};

const DEFAULT_SAMPLE_NOTES: NoteItem[] = [
  {
    id: 'note_demo_1',
    title: 'Regras de Ouro do PGC Angola (Decreto 82/01)',
    content: '1. As contas da Classe 1 a 3 são contas de Balanço patrimonial.\n2. Classe 6 (Proveitos) e Classe 7 (Custos) integram a Demonstração de Resultados.\n3. Lançamentos devem respeitar sempre o equilíbrio estrito entre Débito e Crédito.',
    category: 'Contabilidade',
    tags: ['pgc', 'angola', 'partidas-dobradas', 'decreto-82-01'],
    pinned: true,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 12
  },
  {
    id: 'note_demo_2',
    title: 'Roteiro de Revisão para Exame de Auditoria',
    content: 'Rever apuramento do IVA (Lei 7/19), retenção na fonte de Imposto Industrial (6.5%) e conciliações bancárias mensais com extratos do BNA.',
    category: 'Estudo',
    tags: ['auditoria', 'iva', 'imposto-industrial', 'exame'],
    pinned: true,
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now() - 3600000 * 6
  },
  {
    id: 'note_demo_3',
    title: 'Especificações Técnicas do Módulo de Exportação SAF-T AO',
    content: 'O ficheiro XML SAF-T AO deve cumprir o esquema da AGT, contendo as tabelas Header, MasterFiles (GeneralLedgerAccounts, Customers, Suppliers) e GeneralLedgerEntries.',
    category: 'Especificação',
    tags: ['saft', 'agt', 'xml', 'compliance'],
    pinned: false,
    createdAt: Date.now() - 3600000 * 72,
    updatedAt: Date.now() - 3600000 * 30
  }
];

/**
 * Multi-store cache helper (matching UserProfilePanel pattern)
 */
function saveNotesMultiStore(uid: string, notes: NoteItem[]): void {
  const key = `ga_notes_${uid}`;
  const serialized = JSON.stringify(notes);
  try {
    localStorage.setItem(key, serialized);
  } catch (e) {
    console.warn('[Notes MultiStore] localStorage error:', e);
  }
  try {
    sessionStorage.setItem(key, serialized);
  } catch (_) {}
}

function loadNotesMultiStore(uid: string): NoteItem[] | null {
  const key = `ga_notes_${uid}`;
  try {
    const rawLocal = localStorage.getItem(key);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawSession = sessionStorage.getItem(key);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[Notes MultiStore] load error:', e);
  }
  return null;
}

export default function NotasPage({ currentUserId, onNavigateTab }: NotasPageProps) {
  const effectiveUid = currentUserId || 'guest';

  // Core Notes State with Multi-Store initial cache
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const cached = loadNotesMultiStore(effectiveUid);
    return cached || DEFAULT_SAMPLE_NOTES;
  });

  // Sync state indication
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Firestore Realtime Synchronization (Matching UserProfilePanel pattern)
  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine && effectiveUid && effectiveUid !== 'guest') {
        syncAllLocalNotesToFirestore();
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    if (!effectiveUid || effectiveUid === 'guest') {
      setSyncStatus('offline');
      return () => {
        window.removeEventListener('online', handleOnlineStatus);
        window.removeEventListener('offline', handleOnlineStatus);
      };
    }

    setSyncStatus('syncing');

    let unsubscribe = () => {};
    const initFirestoreSync = async () => {
      const isAvailable = await firestoreDisponivel();
      if (!isAvailable) {
        setSyncStatus('offline');
        return;
      }

      try {
        unsubscribe = ouvirNotasDoFirestore(
          effectiveUid,
          (remoteDocs) => {
            if (remoteDocs && remoteDocs.length > 0) {
              setNotes((prevNotes) => {
                const mergedMap = new Map<string, NoteItem>();
                prevNotes.forEach((n) => mergedMap.set(n.id, n));
                remoteDocs.forEach((rn) => {
                  const existing = mergedMap.get(rn.id);
                  const remoteUpdated = rn.updatedAt || rn.atualizadaEm || 0;
                  const existingUpdated = existing?.updatedAt || (existing as any)?.atualizadaEm || 0;
                  if (!existing || remoteUpdated >= existingUpdated) {
                    mergedMap.set(rn.id, {
                      id: rn.id,
                      title: rn.title || 'Sem título',
                      content: rn.content || '',
                      category: rn.category || 'Geral',
                      tags: rn.tags || [],
                      pinned: !!rn.pinned,
                      color: rn.color,
                      createdAt: rn.createdAt || rn.criadaEm || Date.now(),
                      updatedAt: remoteUpdated || Date.now()
                    });
                  }
                });
                const nextList = Array.from(mergedMap.values());
                saveNotesMultiStore(effectiveUid, nextList);
                return nextList;
              });
            } else {
              // Se o Firestore estiver vazio e houver notas locais, faz a migração automática inicial
              const localNotes = loadNotesMultiStore(effectiveUid);
              if (localNotes && localNotes.length > 0) {
                localNotes.forEach((ln) => salvarNotaNoFirestore(effectiveUid, ln));
              }
            }
            setSyncStatus('synced');
            setLastSyncTime(new Date());
          },
          (error) => {
            console.warn('[NotasPage] Firestore listener em modo offline:', error?.message || error);
            setSyncStatus('offline');
          }
        );
      } catch (err) {
        console.warn('[NotasPage] Erro ao subscrever Firestore:', err);
        setSyncStatus('offline');
      }
    };

    initFirestoreSync();

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [effectiveUid]);

  // Persist to multi-store whenever notes state changes
  useEffect(() => {
    saveNotesMultiStore(effectiveUid, notes);
  }, [notes, effectiveUid]);

  // Manual or automatic background push to Firestore
  const syncAllLocalNotesToFirestore = async () => {
    if (!effectiveUid || effectiveUid === 'guest' || !navigator.onLine) return;
    try {
      setSyncStatus('syncing');
      for (const note of notes) {
        await salvarNotaNoFirestore(effectiveUid, note);
      }
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      showToast('Notas sincronizadas com a nuvem Firestore!');
    } catch (err) {
      console.warn('[NotasPage] Falha na sincronização em lote:', err);
      setSyncStatus('offline');
    }
  };

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Dropdown states
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [exportCategoryTarget, setExportCategoryTarget] = useState<string>('Todas');

  // Modal / Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<NoteCategory>('Geral');
  const [formTagInput, setFormTagInput] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formPinned, setFormPinned] = useState(false);
  const [lastUndoState, setLastUndoState] = useState<string | null>(null);

  // Auto-Save State (2-second debounce)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Delete modal state
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Assistant in Editor State
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTextInfo, setSelectedTextInfo] = useState<{ text: string; start: number; end: number } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    action: 'summarize' | 'correct' | 'expand';
    resultText: string;
    originalSelection: { text: string; start: number; end: number } | null;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (activeCardMenuId) {
        setActiveCardMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCardMenuId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Open modal for new note
  const handleOpenCreateModal = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    isInitialLoadRef.current = true;
    setAutoSaveStatus('idle');
    setLastAutoSavedTime(null);
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('Geral');
    setFormTags([]);
    setFormTagInput('');
    setFormPinned(false);
    setSelectedTextInfo(null);
    setAiResult(null);
    setAiError(null);
    setLastUndoState(null);
    setEditorTab('edit');
    setIsEditorOpen(true);
  };

  // Open modal for editing note
  const handleOpenEditModal = (note: NoteItem) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    isInitialLoadRef.current = true;
    setAutoSaveStatus('idle');
    setLastAutoSavedTime(new Date(note.updatedAt || note.createdAt));
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormTags([...note.tags]);
    setFormTagInput('');
    setFormPinned(note.pinned);
    setSelectedTextInfo(null);
    setAiResult(null);
    setAiError(null);
    setLastUndoState(null);
    setEditorTab('edit');
    setIsEditorOpen(true);
  };

  // Debounced 2-Second Auto-Save Effect
  useEffect(() => {
    if (!isEditorOpen) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    // Skip the initial opening trigger
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Don't auto-save completely blank empty notes
    if (!formTitle.trim() && !formContent.trim()) {
      setAutoSaveStatus('idle');
      return;
    }

    // Indicate that modifications are queued for auto-save
    setAutoSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const now = Date.now();
        let updatedNote: NoteItem;

        if (editingNote) {
          updatedNote = {
            ...editingNote,
            title: formTitle.trim() || 'Sem título',
            content: formContent,
            category: formCategory,
            tags: formTags,
            pinned: formPinned,
            updatedAt: now
          };
          setNotes(prev => prev.map(n => (n.id === editingNote.id ? updatedNote : n)));
        } else {
          // Generate an ID for the new note and promote it to editingNote so subsequent edits update this record
          const newId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          updatedNote = {
            id: newId,
            title: formTitle.trim() || 'Nova Nota',
            content: formContent,
            category: formCategory,
            tags: formTags,
            pinned: formPinned,
            createdAt: now,
            updatedAt: now
          };
          setEditingNote(updatedNote);
          setNotes(prev => {
            const exists = prev.some(n => n.id === newId);
            return exists ? prev.map(n => (n.id === newId ? updatedNote : n)) : [updatedNote, ...prev];
          });
        }

        // Persist directly to Firestore in background without interrupting user typing
        if (effectiveUid && effectiveUid !== 'guest') {
          await salvarNotaNoFirestore(effectiveUid, updatedNote);
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        }

        setAutoSaveStatus('saved');
        setLastAutoSavedTime(new Date());
      } catch (err) {
        console.warn('[NotasPage] Falha no auto-save debounced:', err);
        setAutoSaveStatus('error');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formTitle, formContent, formCategory, formTags, formPinned, isEditorOpen, effectiveUid]);

  // Add tag to form
  const handleAddTag = () => {
    const clean = formTagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !formTags.includes(clean)) {
      setFormTags([...formTags, clean]);
      setFormTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter(t => t !== tagToRemove));
  };

  // Save note (Optimistic local update + background Firestore save)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() && !formContent.trim()) {
      showToast('Por favor introduza um título ou conteúdo para a nota.');
      return;
    }

    const now = Date.now();
    let noteToSync: NoteItem;

    if (editingNote) {
      noteToSync = {
        ...editingNote,
        title: formTitle.trim() || 'Sem título',
        content: formContent,
        category: formCategory,
        tags: formTags,
        pinned: formPinned,
        updatedAt: now
      };

      setNotes(prev => prev.map(n => (n.id === editingNote.id ? noteToSync : n)));
      showToast('Nota atualizada com sucesso!');
    } else {
      noteToSync = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: formTitle.trim() || 'Nova Nota',
        content: formContent,
        category: formCategory,
        tags: formTags,
        pinned: formPinned,
        createdAt: now,
        updatedAt: now
      };

      setNotes(prev => [noteToSync, ...prev]);
      showToast('Nota criada com sucesso!');
    }

    setIsEditorOpen(false);

    // Sync to Firestore if authenticated
    if (effectiveUid && effectiveUid !== 'guest') {
      try {
        setSyncStatus('syncing');
        await salvarNotaNoFirestore(effectiveUid, noteToSync);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('[NotasPage] Falha na gravação remota do Firestore:', err);
      }
    }
  };

  // Toggle pin with smooth layout reordering
  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let targetNote: NoteItem | null = null;

    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        const nextPinned = !n.pinned;
        showToast(nextPinned ? 'Nota fixada no topo!' : 'Nota desafixada.');
        targetNote = { ...n, pinned: nextPinned, updatedAt: Date.now() };
        return targetNote;
      }
      return n;
    }));

    if (targetNote && effectiveUid && effectiveUid !== 'guest') {
      try {
        await salvarNotaNoFirestore(effectiveUid, targetNote);
      } catch (_) {}
    }
  };

  // Delete note
  const confirmDeleteNote = async () => {
    if (!deletingNoteId) return;
    const targetId = deletingNoteId;
    setNotes(prev => prev.filter(n => n.id !== targetId));
    setDeletingNoteId(null);
    showToast('Nota eliminada.');

    if (effectiveUid && effectiveUid !== 'guest') {
      try {
        await apagarNotaNoFirestore(effectiveUid, targetId);
      } catch (_) {}
    }
  };

  // Copy note content
  const handleCopyNote = (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${note.title}\n\n${note.content}\n\n[Categoria: ${note.category} | Tags: ${note.tags.join(', ')}]`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
      showToast('Conteúdo copiado para a área de transferência!');
    });
  };

  // Handle Textarea Selection for floating context menu
  const handleTextareaSelect = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = formContent.substring(start, end);

    if (selected && selected.trim().length > 0) {
      setSelectedTextInfo({ text: selected, start, end });
    } else {
      setSelectedTextInfo(null);
    }
  };

  // AI Assistant Action Handlers with auto-replace option
  const handleAiAction = async (action: 'summarize' | 'correct' | 'expand', autoReplace = false) => {
    const textToProcess = selectedTextInfo?.text || formContent;
    if (!textToProcess || !textToProcess.trim()) {
      showToast('Por favor escreva ou selecione algum texto para processar com a IA.');
      return;
    }

    setIsAiProcessing(true);
    setAiError(null);
    setAiResult(null);

    let generatedText = '';
    let usedFallback = false;

    try {
      const response = await fetch('/api/ai/notes-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess,
          action,
          context: formContent,
          category: formCategory
        })
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.result) {
        generatedText = data.result;
        usedFallback = Boolean(data.offline || data.fallback);
      } else {
        throw new Error('Resposta vazia do assistente.');
      }
    } catch (err: any) {
      console.warn('AI Notes Assist network/server issue, invoking local rule engine:', err?.message || err);
      // Seamless local rule-based fallback specifically calibrated for PGC Angola
      generatedText = generateLocalNotesAssist(textToProcess, action, formCategory, formContent);
      usedFallback = true;
    }

    try {
      if (!generatedText) {
        generatedText = textToProcess;
      }

      if (autoReplace) {
        // Save current content for instant undo
        setLastUndoState(formContent);

        if (selectedTextInfo && selectedTextInfo.text) {
          const { start, end } = selectedTextInfo;
          const newText = formContent.substring(0, start) + generatedText + formContent.substring(end);
          setFormContent(newText);
          showToast(
            usedFallback
              ? `Seleção substituída (${action === 'summarize' ? 'Resumo' : action === 'correct' ? 'Correção' : 'Expansão'} - Modo Local)!`
              : `Seleção substituída com sucesso (${action === 'summarize' ? 'Resumo' : action === 'correct' ? 'Correção' : 'Expansão'})!`
          );
        } else {
          setFormContent(generatedText);
          showToast(
            usedFallback
              ? `Texto atualizado (${action === 'summarize' ? 'Resumo' : action === 'correct' ? 'Correção' : 'Expansão'} - Modo Local)!`
              : `Texto da nota atualizado com sucesso (${action === 'summarize' ? 'Resumo' : action === 'correct' ? 'Correção' : 'Expansão'})!`
          );
        }
        setSelectedTextInfo(null);
      } else {
        setAiResult({
          action,
          resultText: generatedText,
          originalSelection: selectedTextInfo
        });
        showToast(
          usedFallback
            ? `Assistência (${action === 'summarize' ? 'Resumo' : action === 'correct' ? 'Correção' : 'Expansão'} - Motor Local PGC) gerada!`
            : `Assistência de IA (${action === 'summarize' ? 'Resumo' : action === 'correct' ? 'Correção' : 'Expansão'}) gerada!`
        );
      }
    } catch (innerErr: any) {
      console.error('Error applying AI text:', innerErr);
      setAiError('Ocorreu um erro ao aplicar o texto processado.');
      showToast('Erro ao aplicar o texto.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Revert AI changes
  const handleUndoAiAction = () => {
    if (lastUndoState !== null) {
      setFormContent(lastUndoState);
      setLastUndoState(null);
      showToast('Alteração da IA desfeita.');
    }
  };

  // Apply AI Result from preview box
  const handleApplyAiResult = (mode: 'replace' | 'append') => {
    if (!aiResult) return;
    const generated = aiResult.resultText;
    setLastUndoState(formContent);

    if (mode === 'replace') {
      if (aiResult.originalSelection && aiResult.originalSelection.text) {
        const { start, end } = aiResult.originalSelection;
        const newText = formContent.substring(0, start) + generated + formContent.substring(end);
        setFormContent(newText);
      } else {
        setFormContent(generated);
      }
      showToast('Texto substituído pelo resultado da IA!');
    } else if (mode === 'append') {
      const separator = formContent.trim() ? '\n\n' : '';
      setFormContent(prev => prev + separator + generated);
      showToast('Resultado adicionado ao final da nota!');
    }

    setAiResult(null);
    setSelectedTextInfo(null);
  };

  // Copy AI Result
  const handleCopyAiResult = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult.resultText).then(() => {
      showToast('Resultado copiado para a área de transferência!');
    });
  };

  // Export handlers (All, Category, and Single)
  const handleExportAllPDF = () => {
    if (notes.length === 0) {
      showToast('Não existem notas para exportar.');
      return;
    }
    exportNotesAsPDF(notes);
    setIsExportMenuOpen(false);
    showToast('Documento PDF com todas as notas exportado!');
  };

  const handleExportAllMarkdown = () => {
    if (notes.length === 0) {
      showToast('Não existem notas para exportar.');
      return;
    }
    exportNotesAsMarkdown(notes);
    setIsExportMenuOpen(false);
    showToast('Ficheiro Markdown (.md) com todas as notas transferido!');
  };

  const handleExportCategoryPDF = (category: string) => {
    const targetNotes = category === 'Todas' ? notes : notes.filter(n => n.category === category);
    if (targetNotes.length === 0) {
      showToast(`Não existem notas na categoria "${category}".`);
      return;
    }
    exportCategoryNotesAsPDF(targetNotes, category);
    setIsExportMenuOpen(false);
    showToast(`PDF da categoria "${category}" gerado (${targetNotes.length} notas)!`);
  };

  const handleExportCategoryMarkdown = (category: string) => {
    const targetNotes = category === 'Todas' ? notes : notes.filter(n => n.category === category);
    if (targetNotes.length === 0) {
      showToast(`Não existem notas na categoria "${category}".`);
      return;
    }
    exportCategoryNotesAsMarkdown(targetNotes, category);
    setIsExportMenuOpen(false);
    showToast(`Markdown da categoria "${category}" gerado (${targetNotes.length} notas)!`);
  };

  const handleExportSinglePDF = (note: NoteItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    exportSingleNoteAsPDF(note);
    setActiveCardMenuId(null);
    showToast(`PDF de "${note.title.slice(0, 20)}..." gerado!`);
  };

  const handleExportSingleMarkdown = (note: NoteItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    exportSingleNoteAsMarkdown(note);
    setActiveCardMenuId(null);
    showToast(`Markdown de "${note.title.slice(0, 20)}..." gerado!`);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `notas_contabilidade_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsExportMenuOpen(false);
    showToast('Backup JSON transferido.');
  };

  // Import notes
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const existingMap = new Map(notes.map(n => [n.id, n]));
          const importedItems: NoteItem[] = [];

          imported.forEach((item: any) => {
            if (item.title || item.content) {
              const id = item.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
              const noteObj: NoteItem = {
                id,
                title: item.title || 'Nota Importada',
                content: item.content || '',
                category: NOTE_CATEGORIES.includes(item.category) ? item.category : 'Geral',
                tags: Array.isArray(item.tags) ? item.tags : [],
                pinned: Boolean(item.pinned),
                createdAt: item.createdAt || Date.now(),
                updatedAt: item.updatedAt || Date.now()
              };
              existingMap.set(id, noteObj);
              importedItems.push(noteObj);
            }
          });

          const nextList = Array.from(existingMap.values());
          setNotes(nextList);
          showToast(`${importedItems.length} notas importadas com sucesso!`);

          // Sync to Firestore
          if (effectiveUid && effectiveUid !== 'guest') {
            for (const item of importedItems) {
              await setDoc(doc(db, 'users', effectiveUid, 'notes', item.id), item, { merge: true }).catch(() => {});
            }
          }
        } else {
          showToast('Ficheiro inválido: Formato JSON não reconhecido.');
        }
      } catch (err) {
        showToast('Erro ao ler o ficheiro JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter and sort notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Category filter
      if (selectedCategory !== 'Todas' && note.category !== selectedCategory) {
        return false;
      }
      // Tag filter
      if (selectedTag && !note.tags.includes(selectedTag)) {
        return false;
      }
      // Search query across title, content, category, tags
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesContent = note.content.toLowerCase().includes(q);
        const matchesCategory = note.category.toLowerCase().includes(q);
        const matchesTags = note.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesCategory && !matchesTags) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Pinned always first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      let comp = 0;
      if (sortBy === 'updated') {
        comp = (b.updatedAt || 0) - (a.updatedAt || 0);
      } else if (sortBy === 'created') {
        comp = (b.createdAt || 0) - (a.createdAt || 0);
      } else if (sortBy === 'title') {
        comp = a.title.localeCompare(b.title);
      }
      return sortOrder === 'asc' ? -comp : comp;
    });
  }, [notes, selectedCategory, selectedTag, searchQuery, sortBy, sortOrder]);

  const pinnedCount = notes.filter(n => n.pinned).length;

  // Parsed markdown HTML for preview tab
  const previewHtml = useMemo(() => {
    if (!formContent) return '<p class="text-slate-400 italic">Nenhum conteúdo para pré-visualizar.</p>';
    try {
      const rawHtml = marked.parse(formContent) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch {
      return formContent;
    }
  }, [formContent]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-16" id="notas-workspace-container">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HERO & HEADER BAR */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                <StickyNote className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Notas & Caderno</h1>
                  <button
                    onClick={syncAllLocalNotesToFirestore}
                    title="Clique para sincronizar manualmente com o Firestore"
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1 hover:bg-indigo-500/50 transition-colors cursor-pointer"
                  >
                    {syncStatus === 'synced' ? (
                      <>
                        <CloudCheck className="w-3 h-3 text-emerald-400" /> Sincronizado
                      </>
                    ) : syncStatus === 'syncing' ? (
                      <>
                        <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" /> A sincronizar
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-slate-400" /> Cache Local
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Organize apontamentos e estudos contabilísticos com IA contextual (Resumir, Corrigir, Expandir), transições fluidas e exportação individual ou por categoria.
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions: New Note + Export Dropdown + Backup Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenCreateModal}
              id="btn-new-note"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Nota</span>
            </button>

            {/* EXPORT DROPDOWN MENU */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(prev => !prev)}
                id="btn-export-notes-menu"
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold rounded-xl border border-white/10 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
                title="Exportar notas em PDF ou Markdown"
              >
                <FileDown className="w-4 h-4 text-indigo-300" />
                <span>Exportar</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isExportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-white space-y-1"
                  >
                    <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Exportação Completa ou por Categoria</span>
                    </div>

                    {/* All Notes Export */}
                    <div className="space-y-0.5 pt-1">
                      <button
                        onClick={handleExportAllPDF}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-600/30 text-xs font-semibold flex items-center gap-2.5 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-bold">Todas as Notas (PDF)</span>
                          <span className="text-[10px] text-slate-400">Caderno estruturado com paginação</span>
                        </div>
                      </button>

                      <button
                        onClick={handleExportAllMarkdown}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-600/30 text-xs font-semibold flex items-center gap-2.5 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                          <FileCode className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-bold">Todas as Notas (Markdown .md)</span>
                          <span className="text-[10px] text-slate-400">Ficheiro compilado em formato .md</span>
                        </div>
                      </button>
                    </div>

                    {/* Category Selector Export */}
                    <div className="pt-2 border-t border-slate-800">
                      <div className="px-3 py-1 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-indigo-300">
                          Exportar Categoria Específica
                        </span>
                      </div>

                      <div className="px-3 py-1.5">
                        <select
                          value={exportCategoryTarget}
                          onChange={(e) => setExportCategoryTarget(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Todas">Todas as Categorias</option>
                          {NOTE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c} ({notes.filter(n => n.category === c).length})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 px-2 pt-1 pb-1">
                        <button
                          onClick={() => handleExportCategoryPDF(exportCategoryTarget)}
                          className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded-xl text-[11px] font-bold text-red-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF Categoria</span>
                        </button>

                        <button
                          onClick={() => handleExportCategoryMarkdown(exportCategoryTarget)}
                          className="px-2.5 py-1.5 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/50 rounded-xl text-[11px] font-bold text-blue-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <FileCode className="w-3 h-3" />
                          <span>.MD Categoria</span>
                        </button>
                      </div>
                    </div>

                    {/* JSON Backup Option */}
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={handleExportJSON}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-600/30 text-xs font-semibold flex items-center gap-2.5 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Download className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-bold">Backup Completo (JSON)</span>
                          <span className="text-[10px] text-slate-400">Para importar em outro dispositivo</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Import Button */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10">
              <label 
                htmlFor="import-notes-file"
                title="Importar backup de notas (JSON)"
                aria-label="Importar notas JSON"
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer inline-flex items-center"
              >
                <Upload className="w-4 h-4" />
                <input 
                  id="import-notes-file"
                  ref={fileInputRef}
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportJSON}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total de Notas</span>
            <span className="text-lg font-black text-white">{notes.length}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Pin className="w-3 h-3" /> Fixadas
            </span>
            <span className="text-lg font-black text-white">{pinnedCount}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Categorias</span>
            <span className="text-lg font-black text-white">{NOTE_CATEGORIES.length}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Sincronização</span>
            <span className="text-xs font-bold text-white mt-1 block truncate">
              {effectiveUid !== 'guest' ? 'Firestore & Cache Multi-Store' : 'Cache Local Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH, CATEGORY TABS & FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" id="notas-toolbar">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              id="search-notes-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título, texto, categoria ou etiquetas..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                aria-label="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode & Sorting Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
                title="Modo Grelha"
                aria-label="Visualização em grelha"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
                title="Modo Lista"
                aria-label="Visualização em lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="updated">Modificado</option>
              <option value="created">Criado</option>
              <option value="title">Título</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={sortOrder === 'desc' ? "Ordem Descendente" : "Ordem Ascendente"}
              aria-label="Alternar ordem de ordenação"
            >
              {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Category Pills with Active Export Action */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'Todas'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todas ({notes.length})
          </button>

          {NOTE_CATEGORIES.map(cat => {
            const count = notes.filter(n => n.category === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Tag Filter Indicator */}
        {selectedTag && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">Filtrando por etiqueta:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/30">
              <Hash className="w-3 h-3" />
              <span>{selectedTag}</span>
              <button
                onClick={() => setSelectedTag(null)}
                className="p-0.5 hover:bg-indigo-500/20 rounded cursor-pointer"
                title="Remover filtro de etiqueta"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* NOTES LISTING / GRID WITH FLUID MOTION ANIMATIONS AND REORDERING */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/50">
            <StickyNote className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nenhuma nota encontrada</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery || selectedCategory !== 'Todas' || selectedTag
                ? 'Tente ajustar a sua pesquisa ou filtros de categoria.'
                : 'Comece por criar a sua primeira nota para registar os seus estudos ou apontamentos contabilísticos.'}
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeira Nota</span>
          </button>
        </div>
      ) : (
        <LayoutGroup id="notas-workspace-fluid-layout">
          <motion.div 
            layout
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'
                : 'space-y-3'
            }
            id="notes-items-container"
          >
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note) => {
                const catStyle = CATEGORY_COLORS[note.category] || CATEGORY_COLORS.Geral;
                const isMenuOpen = activeCardMenuId === note.id;

                return (
                  <motion.div
                    key={note.id}
                    layout
                    layoutId={note.id}
                    initial={{ opacity: 0, scale: 0.92, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88, y: -14 }}
                    transition={{ 
                      type: 'spring', 
                      damping: 24, 
                      stiffness: 320, 
                      mass: 0.55 
                    }}
                    onClick={() => handleOpenEditModal(note)}
                    id={`note-card-${note.id}`}
                    className={`group relative bg-white dark:bg-slate-900 rounded-3xl border ${
                      note.pinned 
                        ? 'border-amber-400/80 dark:border-amber-500/70 shadow-md shadow-amber-500/5 ring-1 ring-amber-400/30' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    } p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between`}
                  >
                    {/* Top Header inside Card */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border ${catStyle.badge} ${catStyle.border}`}>
                          {note.category}
                        </span>

                        <div className="flex items-center gap-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                          {/* Pin Toggle */}
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(note.id, e)}
                            title={note.pinned ? "Desafixar nota" : "Fixar nota no topo"}
                            aria-label={note.pinned ? "Desafixar nota" : "Fixar nota"}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              note.pinned 
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-amber-500' : ''}`} />
                          </button>

                          {/* Quick Export Single Note Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCardMenuId(isMenuOpen ? null : note.id);
                              }}
                              title="Exportar esta nota"
                              aria-label="Exportar nota"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>

                            <AnimatePresence>
                              {isMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 6 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 z-40 text-slate-800 dark:text-slate-100 space-y-0.5 text-xs font-semibold"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => handleExportSinglePDF(note, e)}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-red-500" />
                                    <span>Exportar PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleExportSingleMarkdown(note, e)}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors"
                                  >
                                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Exportar .MD</span>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Copy Content */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyNote(note, e)}
                            title="Copiar texto da nota"
                            aria-label="Copiar nota"
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            {copiedNoteId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete Note */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingNoteId(note.id);
                            }}
                            title="Eliminar nota"
                            aria-label="Eliminar nota"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {note.title}
                      </h3>

                      {/* Content Preview */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-normal whitespace-pre-line line-clamp-4 leading-relaxed mb-4">
                        {note.content || <span className="italic text-slate-400">Sem conteúdo de texto...</span>}
                      </p>
                    </div>

                    {/* Card Footer: Tags & Timestamp */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {note.tags.map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(t === selectedTag ? null : t);
                              }}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                                selectedTag === t
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300'
                              }`}
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Date format */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(note.updatedAt || note.createdAt).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        {note.pinned && (
                          <span className="text-amber-500 font-bold flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 fill-amber-500" /> Fixada
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}

      {/* CREATE / EDIT NOTE MODAL WITH CONTEXTUAL AI TOOLBAR & MARKDOWN PREVIEW */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" id="note-editor-modal-overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditorOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
              id="note-editor-modal-card"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {editingNote ? 'Editar Nota' : 'Nova Nota'}
                      </h2>
                      {/* Auto-Save Badge Indicator */}
                      {autoSaveStatus === 'saving' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60 animate-pulse">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>A guardar...</span>
                        </span>
                      )}
                      {autoSaveStatus === 'saved' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                          <CloudCheck className="w-3 h-3 text-emerald-500" />
                          <span>Guardado no Firestore</span>
                        </span>
                      )}
                      {autoSaveStatus === 'error' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60">
                          <WifiOff className="w-2.5 h-2.5 text-amber-500" />
                          <span>Guardado localmente</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Auto-save de 2s ativo · Assistente IA contextual, Markdown e exportação
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Tab Switcher: Editor vs Markdown Preview */}
                  <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl mr-1">
                    <button
                      type="button"
                      onClick={() => setEditorTab('edit')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editorTab === 'edit'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        editorTab === 'preview'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Pré-visualizar</span>
                    </button>
                  </div>

                  {editingNote && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleExportSinglePDF(editingNote)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                        title="Exportar esta nota para PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportSingleMarkdown(editingNote)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors cursor-pointer"
                        title="Exportar esta nota para Markdown (.md)"
                      >
                        <FileCode className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveNote} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div>
                  <label htmlFor="note-title-input" className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Título da Nota *
                  </label>
                  <input
                    id="note-title-input"
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Conciliação de Saldos Bancários (Conta 43 BNA)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Category & Pin Option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="note-category-select" className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Categoria
                    </label>
                    <select
                      id="note-category-select"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as NoteCategory)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {NOTE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5 sm:pt-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formPinned}
                        onChange={(e) => setFormPinned(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Pin className="w-3.5 h-3.5 text-amber-500" />
                        Fixar esta nota no topo
                      </span>
                    </label>
                  </div>
                </div>

                {/* Content & AI Floating / Inset Toolbar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="note-content-textarea" className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Conteúdo da Nota
                    </label>
                    <div className="flex items-center gap-3">
                      {lastUndoState !== null && (
                        <button
                          type="button"
                          onClick={handleUndoAiAction}
                          className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Undo2 className="w-3 h-3" /> Desfazer IA
                        </button>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formContent.length} caracteres
                      </span>
                    </div>
                  </div>

                  {/* CONTEXTUAL AI TOOLBAR */}
                  <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-indigo-500/10 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                          Menu Contextual de IA
                        </span>
                        <span className="text-[10px] text-indigo-700/80 dark:text-indigo-400 block">
                          {selectedTextInfo?.text
                            ? `Bloco selecionado (${selectedTextInfo.text.length} carateres) — substituirá a seleção`
                            : 'Selecione um excerto ou aplique a toda a nota'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Button: Resumir */}
                      <button
                        type="button"
                        disabled={isAiProcessing || !formContent.trim()}
                        onClick={() => handleAiAction('summarize', true)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer active:scale-95"
                        title="Resumir bloco selecionado e substituir no texto"
                      >
                        <Wand2 className="w-3 h-3 text-indigo-500" />
                        <span>Resumir</span>
                      </button>

                      {/* Button: Corrigir */}
                      <button
                        type="button"
                        disabled={isAiProcessing || !formContent.trim()}
                        onClick={() => handleAiAction('correct', true)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/80 rounded-xl text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer active:scale-95"
                        title="Corrigir gramática, ortografia e termos contabilísticos do PGC e substituir"
                      >
                        <CheckCheck className="w-3 h-3 text-emerald-500" />
                        <span>Corrigir</span>
                      </button>

                      {/* Button: Expandir */}
                      <button
                        type="button"
                        disabled={isAiProcessing || !formContent.trim()}
                        onClick={() => handleAiAction('expand', true)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/80 rounded-xl text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer active:scale-95"
                        title="Expandir com fundamentação técnica e lançamentos práticos"
                      >
                        <Maximize2 className="w-3 h-3 text-blue-500" />
                        <span>Expandir</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Loading indicator */}
                  <AnimatePresence>
                    {isAiProcessing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center gap-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                      >
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                        <span>O assistente de IA está a analisar e processar o texto com os critérios do PGC Angola...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* AI Error Alert */}
                  {aiError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
                      <span>{aiError}</span>
                      <button type="button" onClick={() => setAiError(null)} className="p-1 hover:bg-red-100 rounded-md">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Editor vs Markdown Preview */}
                  {editorTab === 'edit' ? (
                    <textarea
                      ref={textareaRef}
                      id="note-content-textarea"
                      rows={8}
                      value={formContent}
                      onSelect={handleTextareaSelect}
                      onKeyUp={handleTextareaSelect}
                      onMouseUp={handleTextareaSelect}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="Escreva aqui os seus apontamentos, equações contabilísticas, lembretes ou notas de estudo... (Selecione um bloco de texto para Resumir, Corrigir ou Expandir com IA)"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-normal text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 font-sans leading-relaxed resize-y"
                    />
                  ) : (
                    <div className="w-full min-h-[190px] max-h-[300px] overflow-y-auto px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 prose dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                  )}
                </div>

                {/* Tags Management */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Etiquetas (Tags)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formTagInput}
                      onChange={(e) => setFormTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Adicionar tag e premir Enter (ex: pgc, iva, aula1)..."
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>

                  {formTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {formTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-500/20"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-500 cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingNote ? 'Atualizar Nota' : 'Guardar Nota'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingNoteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="delete-note-modal-overlay">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingNoteId(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Eliminar Nota</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tem a certeza de que deseja apagar esta nota? Esta ação será sincronizada em todos os seus aparelhos.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingNoteId(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteNote}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Sim, Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

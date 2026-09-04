import React, { useRef, useEffect, useState } from 'react';
import { User, Copy, Check, Volume2, VolumeX, ThumbsUp, ThumbsDown, Sparkles, Edit3, Trash2, X, Send, FileText, FileSpreadsheet, Presentation, Download, Loader2 } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { YohanLogo } from './YohanLogo';
import { exportChatMessageToWord, generateExcelDoc, generatePptxDoc, parseDocumentData } from '../services/documentGenerator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rating?: 'up' | 'down';
  feedbackGiven?: boolean;
  edited?: boolean;
  editedAt?: string;
  attachedFile?: { name: string; size?: number };
}

interface VirtualizedChatMessagesListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  copiedId: string | null;
  speakingMsgId: string | null;
  onCopy: (text: string, id: string) => void;
  onSpeak: (text: string, id: string) => void;
  onFeedback: (messageId: string, rating: 'up' | 'down') => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onQuickSearchInsert?: (term: string) => void;
}

export const VirtualizedChatMessagesList: React.FC<VirtualizedChatMessagesListProps> = ({
  messages,
  isGenerating,
  copiedId,
  speakingMsgId,
  onCopy,
  onSpeak,
  onFeedback,
  onEditMessage,
  onDeleteMessage,
  onQuickSearchInsert
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inline editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Document download state
  const [exportingDocId, setExportingDocId] = useState<string | null>(null);

  const handleDownloadDocument = async (msg: ChatMessage, type: 'word' | 'excel' | 'pptx') => {
    setExportingDocId(`${msg.id}-${type}`);
    try {
      if (type === 'word') {
        // TAREFA 2 & 3: Usa o conversor de markdown livre preservando 100% dos títulos, listas, negritos e tabelas
        const firstLineTitle = msg.content.split('\n').find(l => l.trim().startsWith('#'))?.replace(/^[#\s*]+/, '') || 'explicacao_yohan_ai';
        await exportChatMessageToWord(msg.content, firstLineTitle.slice(0, 40));
      } else if (type === 'excel') {
        const parsedData = parseDocumentData(msg.content, type);
        await generateExcelDoc(parsedData, 'planilha_contabilistica_pgc');
      } else if (type === 'pptx') {
        const parsedData = parseDocumentData(msg.content, type);
        await generatePptxDoc(parsedData, 'apresentacao_pgc_angola');
      }
    } catch (e) {
      console.error('Document generation error:', e);
    } finally {
      setExportingDocId(null);
    }
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isGenerating]);

  // Strip complex markdown artifacts for pristine clipboard copy
  const getCleanTextToCopy = (rawText: string): string => {
    if (!rawText) return '';
    return rawText
      .replace(/```[a-z]*\n/gi, '')
      .replace(/```/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .trim();
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editContent.trim()) return;
    if (onEditMessage) {
      onEditMessage(msgId, editContent.trim());
    }
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleConfirmDelete = (msgId: string) => {
    if (onDeleteMessage) {
      onDeleteMessage(msgId);
    }
    setConfirmDeleteId(null);
  };

  return (
    <div 
      ref={containerRef}
      id="yohan-chat-messages-container"
      className="ai-messages-list flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent"
      style={{ minHeight: 0 }}
    >
      <div className="w-full max-w-[860px] mx-auto space-y-5 sm:space-y-6">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const isEditing = editingMessageId === msg.id;
          const isConfirmingDelete = confirmDeleteId === msg.id;

          return (
            <div
              key={msg.id}
              id={`chat-msg-${msg.id}`}
              className={`flex items-start gap-2.5 sm:gap-3.5 ${
                isAssistant ? 'justify-start' : 'justify-end'
              } group transition-all duration-300 relative`}
            >
              {/* AVATAR DO YOHAN AI: Símbolo Oficial 'Y' 3D */}
              {isAssistant && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl bg-slate-900/90 border border-indigo-500/40 p-1 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/10 mt-0.5">
                  <YohanLogo size={20} showGlow={true} />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm text-xs sm:text-sm leading-relaxed relative ${
                  isAssistant
                    ? 'bg-slate-900/95 border border-slate-800 text-slate-200'
                    : 'bg-indigo-600 text-white rounded-br-none shadow-indigo-500/10'
                }`}
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
              {isAssistant ? (
                /* ASSISTANT MESSAGE */
                <div className="space-y-3">
                  <div className="prose prose-invert prose-indigo max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed overflow-x-auto">
                    <MarkdownRenderer content={msg.content} className="text-slate-100 prose-invert" />
                  </div>

                  {/* Actions footer on assistant messages */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {msg.timestamp}
                      </span>

                      {/* SMART DOCUMENT DOWNLOAD BUTTONS */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Word .docx */}
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(msg, 'word')}
                          disabled={!!exportingDocId}
                          className="px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Baixar ficheiro formatado no Microsoft Word (.docx)"
                        >
                          {exportingDocId === `${msg.id}-word` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileText className="w-3 h-3 text-blue-400" />
                          )}
                          <span>Word (.docx)</span>
                        </button>

                        {/* Excel .xlsx */}
                        {(msg.content.includes('|') || msg.content.toLowerCase().includes('tabela') || msg.content.toLowerCase().includes('balancete') || msg.content.toLowerCase().includes('contas')) && (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(msg, 'excel')}
                            disabled={!!exportingDocId}
                            className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Baixar planilha no Microsoft Excel (.xlsx)"
                          >
                            {exportingDocId === `${msg.id}-excel` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                            )}
                            <span>Excel (.xlsx)</span>
                          </button>
                        )}

                        {/* PowerPoint .pptx */}
                        {(msg.content.toLowerCase().includes('slide') || msg.content.toLowerCase().includes('apresentação') || msg.content.includes('#')) && (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(msg, 'pptx')}
                            disabled={!!exportingDocId}
                            className="px-2 py-1 rounded-lg bg-orange-950/60 hover:bg-orange-900/80 text-orange-300 border border-orange-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Baixar apresentação no PowerPoint (.pptx)"
                          >
                            {exportingDocId === `${msg.id}-pptx` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Presentation className="w-3 h-3 text-orange-400" />
                            )}
                            <span>Slides (.pptx)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* MENU DE AÇÕES: ÁUDIO, COPIAR, APAGAR, FEEDBACK (18px, rgba(255,255,255,0.4), horizontal) */}
                    <div className="flex items-center gap-2.5">
                      {/* Read aloud / TTS */}
                      <button
                        type="button"
                        id={`btn-speak-${msg.id}`}
                        onClick={() => onSpeak(msg.content, msg.id)}
                        className={`p-1 rounded-lg transition-colors flex items-center gap-1.5 text-xs ${
                          speakingMsgId === msg.id
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-white/40 hover:text-white'
                        }`}
                        title={speakingMsgId === msg.id ? 'Parar leitura de voz' : 'Ouvir resposta'}
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-[18px] h-[18px] text-indigo-400" />
                            <span className="hidden sm:inline text-[11px]">Parar</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-[18px] h-[18px]" />
                            <span className="hidden sm:inline text-[11px]">Ouvir</span>
                          </>
                        )}
                      </button>

                      {/* 📋 Copiar Mensagem da IA */}
                      <button
                        type="button"
                        id={`btn-copy-${msg.id}`}
                        onClick={() => onCopy(getCleanTextToCopy(msg.content), msg.id)}
                        className="p-1 rounded-lg text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                        title="Copiar resposta"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-[18px] h-[18px] text-emerald-400" />
                            <span className="text-emerald-400 text-[11px] font-bold">Copiado ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-[18px] h-[18px]" />
                            <span className="hidden sm:inline text-[11px]">Copiar</span>
                          </>
                        )}
                      </button>

                      {/* 🗑️ Apagar Mensagem da IA */}
                      <button
                        type="button"
                        id={`btn-delete-${msg.id}`}
                        onClick={() => setConfirmDeleteId(confirmDeleteId === msg.id ? null : msg.id)}
                        className="p-1 rounded-lg text-white/40 hover:text-rose-400 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                        title="Apagar esta mensagem"
                      >
                        <Trash2 className="w-[18px] h-[18px]" />
                      </button>

                      {/* Feedback buttons 👍 / 👎 */}
                      <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800">
                        <button
                          type="button"
                          id={`btn-thumb-up-${msg.id}`}
                          onClick={() => onFeedback(msg.id, 'up')}
                          className={`p-1 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                            msg.rating === 'up'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium'
                              : 'text-white/40 hover:text-white'
                          }`}
                          title="Resposta útil e correta"
                        >
                          <ThumbsUp className="w-[18px] h-[18px]" />
                        </button>

                        <button
                          type="button"
                          id={`btn-thumb-down-${msg.id}`}
                          onClick={() => onFeedback(msg.id, 'down')}
                          className={`p-1 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                            msg.rating === 'down'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium'
                              : 'text-white/40 hover:text-white'
                          }`}
                          title="Resposta a rever"
                        >
                          <ThumbsDown className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confirmação Inline de Eliminação */}
                  {isConfirmingDelete && (
                    <div className="mt-2 p-2 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-200 animate-fadeIn">
                      <span className="font-medium">Apagar esta resposta da IA?</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(msg.id)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* USER MESSAGE */
                <div className="space-y-2">
                  {isEditing ? (
                    /* MODO EDIÇÃO INLINE DA MENSAGEM DO UTILIZADOR */
                    <div className="space-y-2.5">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={Math.min(6, Math.max(2, editContent.split('\n').length + 1))}
                        className="w-full bg-slate-950/90 text-white border border-indigo-300/40 rounded-xl p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 bg-indigo-700/60 hover:bg-indigo-700 text-xs font-semibold rounded-xl text-indigo-100 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-3.5 py-1.5 bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Guardar e Reenviar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* CONTEÚDO NORMAL DA MENSAGEM DO UTILIZADOR */
                    <>
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* RODAPÉ: TIMESTAMP + EDITADA + MENU DE AÇÕES (✏️ 📋 🗑️) */}
                      <div className="flex items-center justify-between gap-3 pt-1.5 text-indigo-100/90">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-indigo-200/80 font-mono">
                            {msg.timestamp}
                          </span>
                          {msg.edited && (
                            <span className="text-[10px] italic text-indigo-200/70 font-medium">
                              (editada)
                            </span>
                          )}
                        </div>

                        {/* MENU DE AÇÕES: EDITAR, COPIAR, APAGAR (18px, rgba(255,255,255,0.4), horizontal) */}
                        <div className="flex items-center gap-2">
                          {/* ✏️ Editar */}
                          <button
                            type="button"
                            id={`btn-edit-${msg.id}`}
                            onClick={() => handleStartEdit(msg)}
                            className="p-1 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
                            title="Editar mensagem e reenviar"
                          >
                            <Edit3 className="w-[18px] h-[18px]" />
                          </button>

                          {/* 📋 Copiar */}
                          <button
                            type="button"
                            id={`btn-copy-user-${msg.id}`}
                            onClick={() => onCopy(msg.content, msg.id)}
                            className="p-1 rounded-lg text-white/40 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            title="Copiar texto"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-[18px] h-[18px] text-emerald-300" />
                                <span className="text-[10px] text-emerald-300 font-bold">Copiado ✓</span>
                              </>
                            ) : (
                              <Copy className="w-[18px] h-[18px]" />
                            )}
                          </button>

                          {/* 🗑️ Apagar */}
                          <button
                            type="button"
                            id={`btn-delete-user-${msg.id}`}
                            onClick={() => setConfirmDeleteId(confirmDeleteId === msg.id ? null : msg.id)}
                            className="p-1 rounded-lg text-white/40 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Apagar mensagem"
                          >
                            <Trash2 className="w-[18px] h-[18px]" />
                          </button>
                        </div>
                      </div>

                      {/* Confirmação Inline de Eliminação do Utilizador */}
                      {isConfirmingDelete && (
                        <div className="mt-2 p-2 bg-slate-950/90 border border-rose-400/40 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-200 animate-fadeIn">
                          <span className="font-medium">Apagar esta mensagem e a resposta seguinte?</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(msg.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 rounded-lg transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* AVATAR DO UTILIZADOR */}
            {!isAssistant && (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-slate-300">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
          </div>
        );
      })}

        {/* Generating / Thinking indicator with Official Yohan AI Logo */}
        {isGenerating && (
          <div className="flex items-start gap-2.5 sm:gap-3.5 justify-start">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-indigo-500/40 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10 animate-pulse">
              <YohanLogo size={22} showGlow={true} />
            </div>
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-lg shadow-indigo-500/5 text-slate-300 flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-indigo-300 font-medium">
                Yohan AI a analisar o PGC Angola e a redigir a resposta...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

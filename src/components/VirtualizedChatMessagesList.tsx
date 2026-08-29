import React, { useRef, useEffect } from 'react';
import { Bot, User, Copy, Check, Volume2, VolumeX, ThumbsUp, ThumbsDown, Sparkles, BookOpen } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rating?: 'up' | 'down';
  feedbackGiven?: boolean;
}

interface VirtualizedChatMessagesListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  copiedId: string | null;
  speakingMsgId: string | null;
  onCopy: (text: string, id: string) => void;
  onSpeak: (text: string, id: string) => void;
  onFeedback: (messageId: string, rating: 'up' | 'down') => void;
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
  onQuickSearchInsert
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isGenerating]);

  return (
    <div 
      ref={containerRef}
      id="yohan-chat-messages-container"
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent"
    >
      {messages.map((msg) => {
        const isAssistant = msg.role === 'assistant';

        return (
          <div
            key={msg.id}
            id={`chat-msg-${msg.id}`}
            className={`flex items-start gap-3 sm:gap-4 ${
              isAssistant ? 'justify-start' : 'justify-end'
            } group transition-opacity duration-300`}
          >
            {isAssistant && (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-indigo-400">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}

            <div
              className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-sm text-sm sm:text-base leading-relaxed ${
                isAssistant
                  ? 'bg-slate-900/90 border border-slate-800 text-slate-200'
                  : 'bg-indigo-600 text-white rounded-br-none shadow-indigo-500/10'
              }`}
            >
              {isAssistant ? (
                <div className="space-y-3">
                  <div className="prose prose-invert prose-indigo max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed overflow-x-auto">
                    <MarkdownRenderer content={msg.content} className="text-slate-100 prose-invert" />
                  </div>

                  {/* Actions footer on assistant messages */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {msg.timestamp}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Read aloud / TTS */}
                      <button
                        type="button"
                        id={`btn-speak-${msg.id}`}
                        onClick={() => onSpeak(msg.content, msg.id)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] ${
                          speakingMsgId === msg.id
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title={speakingMsgId === msg.id ? 'Parar leitura de voz' : 'Ouvir resposta'}
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden sm:inline">Parar</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ouvir</span>
                          </>
                        )}
                      </button>

                      {/* Copy message */}
                      <button
                        type="button"
                        id={`btn-copy-${msg.id}`}
                        onClick={() => onCopy(msg.content, msg.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                        title="Copiar texto"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copiar</span>
                          </>
                        )}
                      </button>

                      {/* Feedback buttons 👍 / 👎 */}
                      <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                        <button
                          type="button"
                          id={`btn-thumb-up-${msg.id}`}
                          onClick={() => onFeedback(msg.id, 'up')}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] ${
                            msg.rating === 'up'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium'
                              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Resposta útil e correta"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {msg.rating === 'up' && <span className="text-[10px] hidden sm:inline">Útil</span>}
                        </button>

                        <button
                          type="button"
                          id={`btn-thumb-down-${msg.id}`}
                          onClick={() => onFeedback(msg.id, 'down')}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] ${
                            msg.rating === 'down'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium'
                              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Resposta imprecisa ou com erro"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {msg.rating === 'down' && <span className="text-[10px] hidden sm:inline">A rever</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className="block text-right text-[10px] text-indigo-200/80 mt-1.5 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              )}
            </div>

            {!isAssistant && (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-slate-300">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
          </div>
        );
      })}

      {/* Generating / Thinking indicator */}
      {isGenerating && (
        <div className="flex items-start gap-3 sm:gap-4 justify-start">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-sm text-indigo-400 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-lg shadow-indigo-500/5 text-slate-300 flex items-center gap-3">
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-indigo-300 font-medium">
              Yohan AI a consultar o PGC e a estruturar a resposta...
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  Download, 
  X, 
  ChevronLeft, 
  Users, 
  User, 
  Loader2, 
  Check, 
  CheckCheck,
  FileSpreadsheet,
  FileCode,
  Maximize2,
  Search,
  Smile,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  LogOut,
  Trash2,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { Conversation, Message, SocialUser } from '../../lib/social/types';
import { 
  ouvirMensagensConversa, 
  enviarMensagemTexto, 
  enviarMensagemArquivo,
  marcarMensagensComoLidas,
  alternarReacaoMensagem,
  atualizarDigitando,
  ouvirDigitando,
  sairDoGrupo,
  apagarGrupo,
  getCachedUserProfile
} from '../../lib/social/socialService';
import { enviarArquivoChat } from '../../lib/social/storageService';

const AVAILABLE_REACTIONS = ['👍', '❤️', '👏', '💡', '😂', '🔥'];

interface ChatViewProps {
  conversation: Conversation;
  meuUid: string;
  onBack?: () => void;
}

export default function ChatView({
  conversation,
  meuUid,
  onBack
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Typing indicator state
  const [digitandoUsers, setDigitandoUsers] = useState<{ uid: string; nome: string }[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const [meuNome, setMeuNome] = useState<string>('Utilizador');

  // Group Menu & Custom Confirmation Modal
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'sair' | 'apagar';
    title: string;
    message: string;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch current user name for typing indicator
  useEffect(() => {
    if (!meuUid) return;
    getCachedUserProfile(meuUid).then((prof) => {
      if (prof?.name) setMeuNome(prof.name);
    });
  }, [meuUid]);

  // Subscribe to real-time conversation messages
  useEffect(() => {
    if (!conversation?.id) return;
    setLoadingMsgs(true);

    const unsub = ouvirMensagensConversa(conversation.id, (list) => {
      setMessages(list);
      setLoadingMsgs(false);
      // Automatically mark messages as read
      marcarMensagensComoLidas(conversation.id, meuUid);
    });

    return () => unsub();
  }, [conversation.id, meuUid]);

  // Subscribe to real-time typing indicator
  useEffect(() => {
    if (!conversation?.id || !meuUid) return;
    const unsubTyping = ouvirDigitando(conversation.id, meuUid, (users) => {
      setDigitandoUsers(users);
    });
    return () => {
      unsubTyping();
      if (isTypingRef.current) {
        atualizarDigitando(conversation.id, meuUid, meuNome, false);
      }
    };
  }, [conversation.id, meuUid, meuNome]);

  // Auto-scroll to bottom on new messages or when someone starts typing
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, uploadProgress, searchQuery, digitandoUsers]);

  // Handle typing input change with 3-second timeout
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        atualizarDigitando(conversation.id, meuUid, meuNome, true);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        atualizarDigitando(conversation.id, meuUid, meuNome, false);
      }, 3000);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        atualizarDigitando(conversation.id, meuUid, meuNome, false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewImageUrl(url);
      } else {
        setPreviewImageUrl(null);
      }
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (sending || (!inputText.trim() && !selectedFile)) return;

    // Clear typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      atualizarDigitando(conversation.id, meuUid, meuNome, false);
    }

    const text = inputText.trim();
    const fileToSend = selectedFile;
    const isDirect = conversation.type === 'direct';
    const receiverId = isDirect ? conversation.members.find(m => m !== meuUid) : undefined;

    setSending(true);
    setInputText('');
    clearSelectedFile();

    try {
      if (fileToSend) {
        setUploadProgress(10);
        const uploaded = await enviarArquivoChat(
          conversation.id,
          fileToSend,
          (progress) => setUploadProgress(progress)
        );

        await enviarMensagemArquivo(
          conversation.id,
          meuUid,
          {
            url: uploaded.downloadUrl,
            nome: uploaded.name,
            tamanho: uploaded.size,
            tipo: uploaded.type
          },
          receiverId
        );
        setUploadProgress(null);
      }

      if (text) {
        await enviarMensagemTexto(conversation.id, meuUid, text, receiverId);
      }
    } catch (err) {
      console.error('[ChatView] Erro ao enviar mensagem/anexo:', err);
      // Restore input text if failed
      if (text) setInputText(text);
      setUploadProgress(null);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await alternarReacaoMensagem(conversation.id, msgId, emoji, meuUid);
    } catch (err) {
      console.error('[ChatView] Erro ao reagir:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewImageUrl(URL.createObjectURL(file));
      } else {
        setPreviewImageUrl(null);
      }
    }
  };

  // Group Action Confirmation Handler
  const handleExecuteConfirmedAction = async () => {
    if (!confirmModal) return;
    setIsProcessingAction(true);
    try {
      if (confirmModal.type === 'sair') {
        await sairDoGrupo(conversation.id, meuUid);
      } else if (confirmModal.type === 'apagar') {
        await apagarGrupo(conversation.id, meuUid);
      }
      setConfirmModal(null);
      onBack?.();
    } catch (err: any) {
      alert(`Erro: ${err?.message || 'Não foi possível concluir a ação.'}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const isGroup = conversation.type === 'group';
  const isAdmin = isGroup && ((conversation.adminIds || []).includes(meuUid) || conversation.createdBy === meuUid);
  const displayName = conversation.name || conversation.title || (conversation.otherUser?.name ?? 'Conversa');
  const displayAvatar = conversation.avatar || conversation.otherUser?.avatar || conversation.otherUser?.fotoUrl;
  const isOnline = conversation.otherUser?.status === 'online';

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <FileText className="w-5 h-5" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) {
      return <FileCode className="w-5 h-5 text-amber-500" />;
    }
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  // Filter messages if search query is active
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => (m.content || m.texto || m.arquivoNome || '').toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : messages;

  const renderHighlightedText = (text: string, queryText: string) => {
    if (!queryText.trim()) return text;
    const parts = text.split(new RegExp(`(${queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === queryText.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 dark:bg-amber-500 text-black px-0.5 rounded-xs font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative"
      id="chat-view-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-blue-900/30 dark:bg-blue-900/50 backdrop-blur-xs border-2 border-dashed border-blue-900 dark:border-blue-400 flex flex-col items-center justify-center text-white pointer-events-none">
          <Paperclip className="w-10 h-10 mb-2 animate-bounce" />
          <p className="font-bold text-sm">Solte o ficheiro para anexar ao chat</p>
        </div>
      )}

      {/* Chat Header */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Voltar para a lista"
              id="btn-voltar-conversas"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative shrink-0">
            {isGroup ? (
              <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Users className="w-5 h-5" />
              </div>
            ) : displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-black flex items-center justify-center text-sm uppercase shadow-xs">
                {displayName.substring(0, 2)}
              </div>
            )}

            {!isGroup && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
                title={isOnline ? 'Online agora' : 'Offline'}
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">
              {displayName}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
              {isGroup ? (
                `${conversation.members?.length || 0} participantes`
              ) : isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online agora</span>
                </>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSearchOpen 
                ? 'bg-blue-900 text-white' 
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Pesquisar mensagens na conversa"
            id="btn-pesquisar-chat"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Group Options Menu */}
          {isGroup && (
            <div className="relative">
              <button
                onClick={() => setIsGroupMenuOpen(!isGroupMenuOpen)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Opções do grupo"
                id="btn-opcoes-grupo"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isGroupMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setIsGroupMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-30 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setIsGroupMenuOpen(false);
                        setConfirmModal({
                          isOpen: true,
                          type: 'sair',
                          title: 'Sair do Grupo',
                          message: `Tens a certeza de que desejas sair de "${displayName}"? Deixarás de receber mensagens e ficheiros partilhados neste grupo.`
                        });
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                      id="btn-menu-sair-grupo"
                    >
                      <LogOut className="w-4 h-4 text-amber-500" />
                      <span>Sair do Grupo</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsGroupMenuOpen(false);
                          setConfirmModal({
                            isOpen: true,
                            type: 'apagar',
                            title: 'Apagar Grupo',
                            message: `Atenção: Tens a certeza de que queres apagar permanentemente o grupo "${displayName}"? Esta ação removerá a conversa e histórico de todos os membros.`
                          });
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-700/60"
                        id="btn-menu-apagar-grupo"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <span>Apagar Grupo</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar in Chat */}
      {isSearchOpen && (
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-in fade-in duration-150">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar texto ou ficheiro nesta conversa..."
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              {filteredMessages.length} {filteredMessages.length === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
          <button
            onClick={() => {
              setSearchQuery('');
              setIsSearchOpen(false);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" id="messages-scroll-area">
        {loadingMsgs ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-900 dark:text-blue-400" />
            <span className="text-xs">A carregar mensagens...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6">
            <div className="w-14 h-14 rounded-full bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 flex items-center justify-center mb-3">
              <Send className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              {searchQuery ? 'Nenhuma mensagem encontrada' : 'Inicie a conversa!'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {searchQuery 
                ? 'Tente pesquisar com outro termo.' 
                : `Envie uma mensagem ou partilhe ficheiros com ${displayName}.`}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === meuUid;
            const fileUrl = msg.arquivoUrl || msg.attachmentUrl;
            const fileName = msg.arquivoNome || msg.attachmentName || 'Ficheiro Anexo';
            const isImage = msg.tipo === 'imagem' || msg.attachmentType === 'image' || (msg.arquivoTipo && msg.arquivoTipo.startsWith('image/'));
            const timeStr = msg.createdAt || msg.criadoEm;
            const timeFormatted = timeStr
              ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            const reactions = msg.reactions || msg.reacoes || {};
            const isHovered = hoveredMsgId === msg.id;

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
                className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Floating Quick Reactions Toolbar */}
                <div 
                  className={`absolute -top-7 ${isMe ? 'right-0' : 'left-0'} z-20 flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-full px-2 py-0.5 transition-opacity ${
                    isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {AVAILABLE_REACTIONS.map((emoji) => {
                    const uids = reactions[emoji] || [];
                    const hasReacted = uids.includes(meuUid);
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReact(msg.id, emoji)}
                        className={`text-xs p-1 rounded-full hover:scale-125 transition-transform cursor-pointer ${
                          hasReacted ? 'bg-blue-100 dark:bg-blue-900/50' : ''
                        }`}
                        title={`Reagir com ${emoji}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs transition-all relative ${
                    isMe
                      ? 'bg-blue-900 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  {/* File / Image Attachment */}
                  {fileUrl && (
                    <div className="mb-2">
                      {isImage ? (
                        <div className="relative group/img rounded-xl overflow-hidden cursor-pointer">
                          <img
                            src={fileUrl}
                            alt={fileName}
                            referrerPolicy="no-referrer"
                            className="max-h-64 rounded-xl object-cover w-full"
                            onClick={() => setZoomedImage(fileUrl)}
                          />
                          <button
                            onClick={() => setZoomedImage(fileUrl)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                            title="Ampliar imagem"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={fileName}
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                            isMe
                              ? 'bg-blue-800/80 hover:bg-blue-800 text-white'
                              : 'bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-white/20 dark:bg-black/20 shrink-0">
                            {renderFileIcon(msg.arquivoTipo)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">
                              {renderHighlightedText(fileName, searchQuery)}
                            </p>
                            {msg.arquivoTamanho && (
                              <p className="text-[10px] opacity-80">{formatFileSize(msg.arquivoTamanho)}</p>
                            )}
                          </div>
                          <Download className="w-4 h-4 shrink-0 opacity-80" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                      {renderHighlightedText(msg.content, searchQuery)}
                    </p>
                  )}

                  {/* Timestamp & Smooth Animated Read Receipt status */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                      isMe ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    <span className="leading-none">{timeFormatted}</span>
                    {isMe && (
                      <span 
                        className="inline-flex items-center leading-none transition-all"
                        title={msg.readAt ? `Lida às ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : msg.delivered ? 'Entregue' : 'Enviada'}
                      >
                        {msg.readAt ? (
                          <span className="animate-in fade-in zoom-in-95 duration-300 inline-flex items-center">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        ) : msg.delivered ? (
                          <span className="animate-in fade-in duration-200 inline-flex items-center">
                            <CheckCheck className="w-3.5 h-3.5 text-blue-300 opacity-80" />
                          </span>
                        ) : (
                          <Check className="w-3 h-3 text-blue-300 opacity-70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Emoji Reactions List Display */}
                {Object.keys(reactions).length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(reactions).map(([emoji, uids]) => {
                      if (!uids || uids.length === 0) return null;
                      const hasReacted = uids.includes(meuUid);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            hasReacted
                              ? 'bg-blue-100 dark:bg-blue-900/60 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-200'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                          title={`${uids.length} ${uids.length === 1 ? 'reação' : 'reações'}`}
                        >
                          <span>{emoji}</span>
                          <span>{uids.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Real-Time "a escrever..." (Typing Indicator) Visual Bar */}
      {digitandoUsers.length > 0 && (
        <div 
          className="px-4 py-1.5 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 font-medium animate-in fade-in slide-in-from-bottom-1 duration-200 shrink-0"
          id="typing-indicator-bar"
        >
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          <span>
            {digitandoUsers.map(u => u.nome).join(', ')} {digitandoUsers.length === 1 ? 'está a escrever...' : 'estão a escrever...'}
          </span>
        </div>
      )}

      {/* Attachment Staged Preview Bar */}
      {selectedFile && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-slate-800/90 border-t border-blue-200/80 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt="Preview"
                className="w-10 h-10 rounded-lg object-cover border border-blue-200"
              />
            ) : (
              <div className="p-2 rounded-lg bg-blue-900/10 text-blue-900 dark:text-blue-300">
                <Paperclip className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <button
            onClick={clearSelectedFile}
            className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 overflow-hidden">
          <div
            className="bg-blue-900 dark:bg-blue-500 h-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Message Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2 shrink-0"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Anexar ficheiro ou imagem"
          id="btn-anexar-ficheiro"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma mensagem... (Enter para enviar)"
          rows={1}
          className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 resize-none min-h-[40px] max-h-32"
          id="chat-input-textarea"
        />

        <button
          type="submit"
          disabled={sending || (!inputText.trim() && !selectedFile)}
          className="p-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Enviar Mensagem"
          id="btn-enviar-mensagem"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Full Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={zoomedImage}
              alt="Zoomed"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for sairDoGrupo & apagarGrupo */}
      {confirmModal && confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          id="modal-confirmacao-grupo"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5 mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                confirmModal.type === 'apagar' 
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400' 
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}>
                {confirmModal.type === 'apagar' ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <LogOut className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                id="btn-cancelar-modal-grupo"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                disabled={isProcessingAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                  confirmModal.type === 'apagar'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
                id="btn-confirmar-modal-grupo"
              >
                {isProcessingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A processar...</span>
                  </>
                ) : (
                  <span>{confirmModal.type === 'apagar' ? 'Apagar permanentemente' : 'Confirmar saída'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

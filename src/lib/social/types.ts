export interface SocialUser {
  id: string;
  name: string;
  nomeLower: string;
  nameLower?: string;
  email: string;
  username?: string;
  avatar?: string;
  fotoUrl?: string;
  roleTitle?: string;
  company?: string;
  country?: string;
  status?: 'online' | 'offline';
  bio?: string;
  updatedAt?: string;
  createdAt?: string;
}

export type FriendRequestStatus = 'pendente' | 'aceito' | 'recusado';

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  fromUserId?: string;
  toUserId?: string;
  status: FriendRequestStatus;
  criadoEm?: string;
  createdAt?: string;
  updatedAt?: string;
  fromUser?: SocialUser;
  toUser?: SocialUser;
}

export interface Friendship {
  id: string;
  members: string[];
  criadoEm?: string;
  createdAt?: string;
}

export interface MessageSummary {
  id: string;
  senderId: string;
  content: string;
  texto?: string;
  tipo?: string;
  createdAt: string;
  criadoEm?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface Conversation {
  id: string;
  type?: 'direct' | 'group';
  name?: string;
  title?: string;
  description?: string;
  avatar?: string;
  members: string[];
  adminIds?: string[];
  createdBy?: string;
  lastMessage?: MessageSummary;
  ultimaMensagem?: string;
  updatedAt?: string;
  atualizadoEm?: any;
  unreadCount?: number;
  otherUser?: SocialUser;
}

export interface Message {
  id: string;
  convId: string;
  conversationId?: string;
  senderId: string;
  receiverId?: string;
  content: string;
  texto?: string;
  tipo?: 'texto' | 'arquivo' | 'imagem';
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'file' | 'code' | string | null;
  attachmentName?: string | null;
  arquivoUrl?: string | null;
  arquivoNome?: string | null;
  arquivoTipo?: string | null;
  arquivoTamanho?: number | null;
  criadoEm?: string;
  createdAt?: string;
  readAt?: string | null;
  delivered?: boolean;
  senderName?: string;
  senderAvatar?: string;
  reactions?: Record<string, string[]>;
  reacoes?: Record<string, string[]>;
}

export interface FileAttachment {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

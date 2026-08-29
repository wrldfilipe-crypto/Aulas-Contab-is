import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getCurrentUser } from '../lib/db';

export interface AuditLogPayload {
  action: string;
  entityId: string | number;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Envia um log de atividade do utilizador para a subcoleção do Firestore `/users/{userId}/audit_logs`
 * ou `/audit_logs` global se o utilizador não estiver autenticado.
 */
export async function logActivity(payload: AuditLogPayload): Promise<void> {
  try {
    const firebaseUser = auth.currentUser;
    const localUser = getCurrentUser();
    const userId = firebaseUser?.uid || localUser?.userId || 'anonymous_user';
    const userEmail = firebaseUser?.email || localUser?.email || 'utilizador@globalaccount.com';

    const logData = {
      action: payload.action,
      entityId: String(payload.entityId),
      details: payload.details || '',
      metadata: payload.metadata || {},
      userEmail,
      userId,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    // Se o utilizador tem ID, grava na subcoleção do utilizador `/users/{userId}/audit_logs`
    if (userId && userId !== 'anonymous_user') {
      const userAuditColRef = collection(db, 'users', userId, 'audit_logs');
      await addDoc(userAuditColRef, logData);
      console.log(`[useAuditLog] Log gravado em /users/${userId}/audit_logs:`, payload);
    } else {
      const globalAuditColRef = collection(db, 'audit_logs');
      await addDoc(globalAuditColRef, logData);
      console.log(`[useAuditLog] Log gravado em /audit_logs:`, payload);
    }
  } catch (error: any) {
    console.warn('[useAuditLog] Base de dados Firestore indisponível para registo de audit log:', error?.message || error);
  }
}

/**
 * Atalho para submissão de formulários, capturando o ID da entidade e a ação executada
 */
export async function logFormSubmit(
  entityId: string | number, 
  actionName: string, 
  formData?: Record<string, any>
): Promise<void> {
  await logActivity({
    action: actionName || 'form_submit',
    entityId,
    details: `Submissão de formulário efetuada para a entidade ${entityId}`,
    metadata: formData ? { fieldKeys: Object.keys(formData) } : undefined
  });
}

/**
 * Wrapper HOF para submissão de formulários React (e.g. onSubmit)
 */
export function handleFormSubmitWithAudit(
  entityId: string | number,
  actionName: string,
  onSubmitCallback?: (e?: any) => void | Promise<void>
) {
  return async (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    // Regista audit log da submissão
    await logFormSubmit(entityId, actionName);

    // Executa callback original do formulário
    if (onSubmitCallback) {
      await onSubmitCallback(e);
    }
  };
}

export function useAuditLog() {
  return {
    logActivity,
    logFormSubmit,
    handleFormSubmitWithAudit
  };
}


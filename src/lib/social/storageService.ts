import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => {
      console.error('[storageService] Erro ao converter ficheiro para DataURL:', err);
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload da foto de perfil para o Firebase Storage com fallback automático para DataURL
 */
export async function uploadFotoPerfil(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!uid || !file) {
    const err = new Error('UID ou ficheiro inválido para upload de perfil.');
    console.error('[storageService:uploadFotoPerfil]', err);
    throw err;
  }

  let downloadUrl = '';

  try {
    const storagePath = `profilePhotos/${uid}/avatar_${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file);

    downloadUrl = await new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        try { task.cancel(); } catch (_) {}
        reject(new Error('Timeout no upload para Firebase Storage'));
      }, 8000);

      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('[storageService:uploadFotoPerfil] Erro na tarefa de upload:', error);
          reject(error);
        },
        async () => {
          clearTimeout(timeoutId);
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            console.error('[storageService:uploadFotoPerfil] Erro ao obter Download URL:', e);
            reject(e);
          }
        }
      );
    });
  } catch (err: any) {
    console.warn('[storageService:uploadFotoPerfil] Storage indisponível, recorrendo a DataURL local:', err?.message || err);
    if (onProgress) onProgress(50);
    downloadUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(100);
  }

  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      avatar: downloadUrl,
      fotoUrl: downloadUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (dbErr) {
    console.error('[storageService:uploadFotoPerfil] Erro ao persistir URL no perfil Firestore:', dbErr);
  }

  return downloadUrl;
}

/**
 * Upload de arquivo no chat para o Firebase Storage com fallback automático para DataURL
 */
export async function enviarArquivoChat(
  convId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; name: string; size: number; type: string }> {
  if (!convId || !file) {
    const err = new Error('Parâmetros inválidos para envio de ficheiro no chat.');
    console.error('[storageService:enviarArquivoChat]', err);
    throw err;
  }

  let downloadUrl = '';
  const ext = file.name.split('.').pop() || 'bin';
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const nomeUnico = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;

  try {
    const storagePath = `conversations/${convId}/files/${nomeUnico}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file);

    downloadUrl = await new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        try { task.cancel(); } catch (_) {}
        reject(new Error('Timeout de upload no chat'));
      }, 10000);

      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('[storageService:enviarArquivoChat] Erro no upload:', error);
          reject(error);
        },
        async () => {
          clearTimeout(timeoutId);
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            console.error('[storageService:enviarArquivoChat] Erro ao obter Download URL:', e);
            reject(e);
          }
        }
      );
    });
  } catch (err: any) {
    console.warn('[storageService:enviarArquivoChat] Storage indisponível, usando DataURL base64:', err?.message || err);
    if (onProgress) onProgress(50);
    downloadUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(100);
  }

  return {
    downloadUrl,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream'
  };
}

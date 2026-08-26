import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface StorageUploadResult {
  url: string;
  path: string;
  error: string | null;
}

/**
 * Upload de Avatar com transformação de imagem para 512x512
 */
export async function uploadAvatarImage(
  userId: string,
  file: File | Blob,
  fileName?: string
): Promise<StorageUploadResult> {
  const extension = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
  const cleanName = fileName || `avatar_${Date.now()}.${extension}`;
  const filePath = `${userId}/${cleanName}`;

  if (!isSupabaseConfigured) {
    // In-memory / data URL fallback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          path: filePath,
          error: null,
        });
      };
      reader.onerror = () => {
        resolve({
          url: '',
          path: filePath,
          error: 'Falha ao converter imagem localmente.',
        });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    // 1. Upload to Supabase Storage avatars bucket
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (error) {
      return { url: '', path: '', error: error.message };
    }

    // 2. Get Public URL with image transformation (512x512 resize & crop)
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path, {
        transform: {
          width: 512,
          height: 512,
          resize: 'cover',
          quality: 85,
        }
      });

    const finalUrl = publicUrlData.publicUrl;

    // 3. Update user profile with new avatar URL
    await supabase.from('profiles').update({
      avatar_url: finalUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    return {
      url: finalUrl,
      path: data.path,
      error: null,
    };
  } catch (err: any) {
    console.error('[SupabaseStorage:uploadAvatar] Erro:', err);
    return { url: '', path: '', error: err?.message || 'Falha no upload do avatar.' };
  }
}

/**
 * Upload de Documentos Contabilísticos Privados (Balanço, DRE, mapas PGC, Excel)
 */
export async function uploadPrivateDocument(
  userId: string,
  fileName: string,
  fileData: Blob | File | ArrayBuffer,
  mimeType: string = 'application/pdf'
): Promise<StorageUploadResult> {
  const filePath = `${userId}/${Date.now()}_${fileName}`;

  if (!isSupabaseConfigured) {
    return {
      url: URL.createObjectURL(fileData instanceof Blob ? fileData : new Blob([fileData])),
      path: filePath,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, fileData, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType,
      });

    if (error) {
      return { url: '', path: '', error: error.message };
    }

    // Create a secure signed URL valid for 2 hours for private download
    const { data: signedData, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(data.path, 7200);

    if (signError || !signedData) {
      return { url: '', path: data.path, error: signError?.message || 'Erro ao gerar URL assinado.' };
    }

    return {
      url: signedData.signedUrl,
      path: data.path,
      error: null,
    };
  } catch (err: any) {
    console.error('[SupabaseStorage:uploadPrivateDocument] Erro:', err);
    return { url: '', path: '', error: err?.message || 'Falha no upload do documento privado.' };
  }
}

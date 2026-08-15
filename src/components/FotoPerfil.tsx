import React, { useState, useRef } from 'react';
import { Camera, Upload, User, Loader2, Check, AlertCircle } from 'lucide-react';
import { uploadFotoPerfil } from '../lib/firebase';
import { UserSession } from '../lib/db';

interface FotoPerfilProps {
  user: UserSession | { id?: string; userId?: string; name?: string; nome?: string; photoUrl?: string; fotoUrl?: string; avatar?: string } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onFotoAlterada?: (newUrl: string) => void;
  className?: string;
}

export const FotoPerfil: React.FC<FotoPerfilProps> = ({
  user,
  size = 'md',
  editable = true,
  onFotoAlterada,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uid = user?.userId || (user as any)?.id || '';
  const currentPhoto = user?.photoUrl || user?.fotoUrl || (user as any)?.avatar;
  const name = user?.name || (user as any)?.nome || 'Utilizador';
  const initial = name.charAt(0).toUpperCase() || '?';

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-28 h-28 text-4xl'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }[size];

  const handleSelectFile = () => {
    if (!editable || uploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Selecione um ficheiro de imagem válido.');
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 5 MB.');
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    if (!uid) {
      setErrorMsg('Utilizador não autenticado.');
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    setUploading(true);
    setProgress(0);
    setErrorMsg(null);

    try {
      const downloadUrl = await uploadFotoPerfil(uid, file, (p) => setProgress(p));
      if (onFotoAlterada) {
        onFotoAlterada(downloadUrl);
      }
    } catch (err: any) {
      console.error('Erro no upload da foto de perfil:', err);
      setErrorMsg('Erro ao enviar foto. Verifique a consola.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div 
        onClick={handleSelectFile}
        className={`${sizeClasses} rounded-full overflow-hidden flex items-center justify-center font-bold transition-all shadow-md ${
          editable ? 'cursor-pointer hover:opacity-90 group' : ''
        } ${
          currentPhoto ? 'bg-slate-800' : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
        }`}
      >
        {currentPhoto && !uploading ? (
          <img 
            src={currentPhoto} 
            alt={name} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              // Fallback to initial if image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          !uploading && <span>{initial}</span>
        )}

        {/* Uploading Spinner & Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10 p-1">
            <Loader2 className={`${iconSizes} animate-spin mb-1 text-blue-400`} />
            <span className="text-[10px] font-mono font-bold">{progress}%</span>
          </div>
        )}

        {/* Editable Overlay Badge */}
        {editable && !uploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-full">
            <Camera className={iconSizes} />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      {editable && (
        <input 
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          title="Alterar foto de perfil"
        />
      )}

      {/* Error Popup */}
      {errorMsg && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1 bg-red-600 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 flex items-center gap-1.5 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

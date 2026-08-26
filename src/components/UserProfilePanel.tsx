import React, { useState, useEffect, useRef } from 'react';
import { i18n } from '../translations';
import { SUPPORTED_CURRENCIES } from '../lib/currencyUtils';
import { 
  User, 
  Shield, 
  Settings, 
  Award, 
  Trash2, 
  Check, 
  Upload, 
  QrCode, 
  Download, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  LogOut,
  Sparkles,
  BookOpen,
  Camera,
  Crop,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sliders,
  Briefcase,
  Building,
  FileText,
  X,
  RefreshCw,
  GraduationCap,
  Users,
  MessageSquare,
  Globe,
  Moon,
  Clock,
  BellOff,
  Filter,
  Laptop,
  Smartphone,
  Tablet
} from 'lucide-react';
import { 
  subscribeUserSessions, 
  terminateUserSession, 
  terminateAllOtherUserSessions, 
  getDeviceId, 
  DeviceSession 
} from '../lib/firebase';
import { 
  PROFILE_CONFIGS, 
  UserProfileRole, 
  saveUserProfileMultiStore, 
  loadUserProfileMultiStore 
} from '../lib/userProfiles';
import { 
  DB, 
  getCurrentUser, 
  logout, 
  deleteUserAccount,
  UserSession, 
  UserPreferences,
  logAuditEvent,
  createNotification
} from '../lib/db';
import { useAuditLog } from '../hooks/useAuditLog';
import { clearRuntimeCache, estimateCacheUsage } from '../services/appCacheService';
import ThemeCustomizationDrawer from './ThemeCustomizationDrawer';

interface UserProfilePanelProps {
  onUpdateUser: (user: UserSession) => void;
  onLogout: (message?: string) => void;
  onNavigateTab: (tabId: string, extraData?: any) => void;
}

export default function UserProfilePanel({ onUpdateUser, onLogout, onNavigateTab }: UserProfilePanelProps) {
  const { logFormSubmit } = useAuditLog();
  const [activeSubSection, setActiveSubSection] = useState<'info' | 'security' | 'prefs' | 'edu' | 'privacy'>('info');
  const [user, setUser] = useState<UserSession | null>(null);

  // Success/error statuses
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Section 1: Info State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('Angola');
  const [profile, setProfile] = useState<any>('accountant');
  const [prefLang, setPrefLang] = useState('en');
  const [avatarColor, setAvatarColor] = useState('bg-blue-600');
  
  // Custom Profile & Photo Crop State
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [bio, setBio] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [company, setCompany] = useState('');
  
  // Camera & Image Editing
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setFileValidationError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 640 } });
      setCameraStream(stream);
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setFileValidationError("Não foi possível aceder à câmara. Por favor, verifique as permissões no browser.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureCameraPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoUrl(dataUrl);
        stopCamera();
        setSuccessMsg("Foto capturada com sucesso pela câmara!");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation 1: Size check <= 5MB
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      setFileValidationError(`O ficheiro excede o tamanho máximo permitido de 5 MB. (Tamanho atual: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Escolha uma imagem menor.`);
      return;
    }

    // Validation 2: Format check
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setFileValidationError("Formato não suportado. Utilize apenas imagens nos formatos JPG, PNG ou WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoUrl(result);
        setZoomLevel(100);
        setSuccessMsg("Foto carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Section 2: Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorQR, setShowTwoFactorQR] = useState(false);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const currentDeviceId = getDeviceId();

  useEffect(() => {
    if (!user?.userId) return;
    const unsubscribe = subscribeUserSessions(user.userId, (activeSessions) => {
      if (activeSessions && activeSessions.length > 0) {
        setSessions(activeSessions.filter(s => s.active !== false));
      } else {
        // Fallback default current session
        setSessions([{
          id: currentDeviceId,
          userId: user.userId,
          device: 'Navegador Web (Este Dispositivo)',
          type: 'desktop',
          location: 'Luanda, AO',
          ip: '197.231.42.18',
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          active: true
        }]);
      }
    });
    return () => unsubscribe();
  }, [user?.userId]);

  const handleDisconnectOtherSessions = async () => {
    if (user?.userId) {
      await terminateAllOtherUserSessions(user.userId);
    }
    setSessions(prev => prev.filter(s => s.id === currentDeviceId));
    triggerAlert('success', 'Todas as outras sessões foram encerradas com sucesso.');
    logAuditEvent('Segurança', 'Outras sessões encerradas remotamente', 'seguranca');
  };

  const handleTerminateSingleSession = async (sessionId: string) => {
    if (user?.userId) {
      await terminateUserSession(user.userId, sessionId);
    }
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    triggerAlert('success', 'Sessão encerrada com sucesso.');
    logAuditEvent('Segurança', `Sessão ${sessionId} encerrada remotamente`, 'seguranca');
  };

  // Section 3: Preferences State
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    try {
      const stored = localStorage.getItem('app_theme');
      if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
    } catch (e) {}
    return 'light';
  });

  const applyThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('app_theme', newTheme);
      const isDark = newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed saving theme:', e);
    }
  };
  const [nightFocusMode, setNightFocusMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ga_night_focus_mode');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });
  const [nightFocusTheme, setNightFocusTheme] = useState<'ocean' | 'forest' | 'twilight'>(() => {
    try {
      const saved = localStorage.getItem('ga_night_focus_theme');
      if (saved === 'forest' || saved === 'twilight') return saved;
      return 'ocean';
    } catch (e) {
      return 'ocean';
    }
  });

  const handleSelectNightFocusTheme = (newTheme: 'ocean' | 'forest' | 'twilight') => {
    setNightFocusTheme(newTheme);
    try {
      localStorage.setItem('ga_night_focus_theme', newTheme);
      window.dispatchEvent(new CustomEvent('night_focus_theme_changed', { detail: { theme: newTheme } }));
    } catch (e) {
      console.warn('Failed saving night focus theme:', e);
    }
  };
  const [background, setBackground] = useState('dots');
  const [documentLang, setDocumentLang] = useState('pt-PT');
  const [defaultTaxCountry, setDefaultTaxCountry] = useState('Angola');
  const [accountingStandard, setAccountingStandard] = useState('PGC Angola');
  const [defaultCurrency, setDefaultCurrency] = useState('AOA');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [notifCompliance, setNotifCompliance] = useState(true);
  const [notifAi, setNotifAi] = useState(true);
  const [notifWorkspace, setNotifWorkspace] = useState(true);
  const [notifEducation, setNotifEducation] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);

  // Work Hours Focus Mode State
  const [workHoursEnabled, setWorkHoursEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ga_work_hours_focus');
      if (saved) return JSON.parse(saved).enabled ?? false;
    } catch (e) {}
    return false;
  });
  const [workHoursStart, setWorkHoursStart] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ga_work_hours_focus');
      if (saved) return JSON.parse(saved).startTime || '08:00';
    } catch (e) {}
    return '08:00';
  });
  const [workHoursEnd, setWorkHoursEnd] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ga_work_hours_focus');
      if (saved) return JSON.parse(saved).endTime || '17:00';
    } catch (e) {}
    return '17:00';
  });
  const [workHoursDays, setWorkHoursDays] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('ga_work_hours_focus');
      if (saved && Array.isArray(JSON.parse(saved).workDays)) {
        return JSON.parse(saved).workDays;
      }
    } catch (e) {}
    return [1, 2, 3, 4, 5]; // Mon - Fri
  });

  // Section 5: Account deletion & Logout confirmation
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [runtimeCacheStats, setRuntimeCacheStats] = useState<{ count: number; formattedSize: string } | null>(null);

  const loadCacheUsageStats = async () => {
    try {
      const stats = await estimateCacheUsage();
      setRuntimeCacheStats({ count: stats.count, formattedSize: stats.formattedSize });
    } catch {
      setRuntimeCacheStats(null);
    }
  };

  useEffect(() => {
    loadCacheUsageStats();
  }, []);

  const countries = [
    'Portugal', 'Brasil', 'Angola', 'Moçambique', 'Cabo Verde', 
    'Guiné-Bissau', 'São Tomé e Príncipe', 'Timor-Leste', 'Estados Unidos', 
    'Alemanha', 'França', 'Reino Unido'
  ];

  const languages = [
    { code: 'pt-PT', label: 'Português (Portugal)', flag: '🇵🇹' },
    { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en',    label: 'English',              flag: '🇺🇸' },
    { code: 'fr',    label: 'Français',              flag: '🇫🇷' },
    { code: 'de',    label: 'Deutsch',               flag: '🇩🇪' },
    { code: 'ru',    label: 'Русский',               flag: '🇷🇺' },
    { code: 'es',    label: 'Español',               flag: '🇪🇸' },
  ];

  const standards = ['PGC Angola'];
  const currencies = ['EUR', 'USD', 'BRL', 'AOA', 'MZN', 'GBP'];

  const backgrounds = [
    { id: 'dots', label: 'Pontilhado / Dots', preview: 'bg-slate-50 border-slate-200' },
    { id: 'grid', label: 'Grelha / Grid', preview: 'bg-slate-100 border-slate-300' },
    { id: 'solid', label: 'Sólido / Solid', preview: 'bg-slate-200 border-slate-400' },
    { id: 'cosmic', label: 'Cósmico / Cosmic', preview: 'bg-indigo-950 border-indigo-900' },
    { id: 'emerald', label: 'Esmeralda / Emerald', preview: 'bg-emerald-950 border-emerald-900' },
    { id: 'dark-slate', label: 'Ardósia / Slate', preview: 'bg-slate-900 border-slate-800' },
    { id: 'warm-cream', label: 'Creme / Warm Cream', preview: 'bg-orange-50 border-orange-100' },
    { id: 'minimalist', label: 'Minimal / Minimalist', preview: 'bg-white border-slate-100' },
    { id: 'matrix', label: 'Matriz / Digital Matrix', preview: 'bg-black border-green-950' },
    { id: 'executive', label: 'Executivo / Executive', preview: 'bg-blue-950 border-blue-900' }
  ];

  const avatarColors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 
    'bg-amber-600', 'bg-rose-600', 'bg-indigo-600', 'bg-teal-600'
  ];

  const [autoSaveBadge, setAutoSaveBadge] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSavedBadge = () => {
    setAutoSaveBadge(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveBadge(false);
    }, 2500);
  };

  useEffect(() => {
    const activeUser = getCurrentUser();
    if (activeUser) {
      setUser(activeUser);
      const uid = activeUser.userId || (activeUser as any).id || (activeUser.email ? activeUser.email.toLowerCase().trim() : '');
      
      // Check multi-store persistence (localStorage, sessionStorage, cookie in order)
      const cached = uid ? loadUserProfileMultiStore(uid) : null;
      
      setName(cached?.name || activeUser.name || '');
      setEmail(cached?.email || activeUser.email || '');
      setCountry(cached?.country || activeUser.country || 'Angola');
      setProfile(cached?.profile || activeUser.profile || 'accountant');
      setPrefLang(cached?.preferredLanguage || cached?.language || activeUser.language || 'en');

      // Load extra profile fields
      const u = activeUser as any;
      setPhotoUrl(cached?.fotoUrl || cached?.photoUrl || cached?.avatar || u.photoUrl || '');
      setBio(cached?.bio || u.bio || '');
      setRoleTitle(cached?.roleTitle || u.roleTitle || '');
      setCompany(cached?.company || u.company || '');

      // Load preferences
      const prefs = activeUser.preferences;
      if (prefs) {
        setTheme(prefs.theme || 'light');
        if (prefs.nightFocusMode !== undefined) {
          setNightFocusMode(prefs.nightFocusMode);
        }
        setBackground(prefs.background || 'dots');
        setDocumentLang(prefs.documentLang || 'en');
        setDefaultTaxCountry(prefs.defaultTaxCountry || 'Angola');
        setAccountingStandard(prefs.accountingStandard || 'PGC Angola');
        setDefaultCurrency(prefs.defaultCurrency || 'AOA');
        setDateFormat(prefs.dateFormat || 'DD/MM/YYYY');
        
        if (prefs.notifications) {
          setNotifCompliance(prefs.notifications.compliance ?? true);
          setNotifAi(prefs.notifications.ai ?? true);
          setNotifWorkspace(prefs.notifications.workspace ?? true);
          setNotifEducation(prefs.notifications.education ?? true);
          setNotifSystem(prefs.notifications.system ?? true);
        }

        if (prefs.workHoursFocus) {
          setWorkHoursEnabled(prefs.workHoursFocus.enabled ?? false);
          setWorkHoursStart(prefs.workHoursFocus.startTime || '08:00');
          setWorkHoursEnd(prefs.workHoursFocus.endTime || '17:00');
          if (Array.isArray(prefs.workHoursFocus.workDays)) {
            setWorkHoursDays(prefs.workHoursFocus.workDays);
          }
        }
      }
      setTwoFactorEnabled(activeUser.twoFactorEnabled || false);
    }
  }, []);

  const triggerAlert = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setErrorMsg(null);
    } else {
      setErrorMsg(msg);
      setSuccessMsg(null);
    }
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4000);
  };

  /**
   * Grava imediatamente em 3 locais: localStorage, sessionStorage e cookie (365 dias)
   */
  const persistProfileData = (overrides?: Partial<UserSession>) => {
    const activeUser = user || getCurrentUser();
    if (!activeUser) return;

    const uid = activeUser.userId || (activeUser as any).id || (activeUser.email ? activeUser.email.toLowerCase().trim() : 'anonymous');
    const profilePayload = {
      name: overrides?.name ?? name,
      email: overrides?.email ?? email,
      country: overrides?.country ?? country,
      profile: overrides?.profile ?? profile,
      language: overrides?.language ?? prefLang,
      photoUrl: overrides?.photoUrl ?? photoUrl,
      bio: overrides?.bio ?? bio,
      roleTitle: overrides?.roleTitle ?? roleTitle,
      company: overrides?.company ?? company,
    };

    // 1. Tripla gravação (localStorage, sessionStorage, cookie)
    saveUserProfileMultiStore(uid, profilePayload);
    if (activeUser.email) {
      saveUserProfileMultiStore(activeUser.email.toLowerCase().trim(), profilePayload);
    }

    // 2. Sincronizar sessão em memória e storage
    const updated: UserSession = {
      ...activeUser,
      ...profilePayload
    };
    onUpdateUser(updated);

    // 3. Notificar todos os componentes da aplicação
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: profilePayload }));
    }

    // 4. Feedback discreto
    showSavedBadge();
  };

  const handleFieldBlur = () => {
    persistProfileData();
  };

  // Section 1: Save Personal Info
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    persistProfileData();
    logAuditEvent('Alterar Perfil', 'Informações de perfil pessoal e foto atualizadas', 'perfil');
    logFormSubmit(user.userId, 'update_user_profile', { name, email, country, roleTitle, company });
    triggerAlert('success', 'Perfil guardado com sucesso em todos os armazenamentos!');
  };

  // Section 2: Save Security (Password)
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentPassword) {
      triggerAlert('error', 'Por favor insira a sua palavra-passe atual.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      triggerAlert('error', 'A nova palavra-passe e a confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      triggerAlert('error', 'A nova palavra-passe tem de ter pelo menos 6 caracteres.');
      return;
    }

    // Update user record with new auth details
    // For local mockup safety
    triggerAlert('success', 'Palavra-passe alterada com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    logAuditEvent('Segurança', 'Palavra-passe de utilizador redefinida', 'seguranca');
  };

  const handleToggle2FA = () => {
    if (!twoFactorEnabled) {
      setShowTwoFactorQR(true);
    } else {
      setTwoFactorEnabled(false);
      setShowTwoFactorQR(false);
      if (user) {
        const updated = { ...user, twoFactorEnabled: false };
        localStorage.setItem('ga_session', JSON.stringify(updated));
        onUpdateUser(updated);
      }
      triggerAlert('success', 'Autenticação de 2 fatores desativada.');
      logAuditEvent('Segurança', 'Autenticação de dois fatores desativada', 'seguranca');
    }
  };

  const handleConfirm2FA = () => {
    setTwoFactorEnabled(true);
    setShowTwoFactorQR(false);
    if (user) {
      const updated = { ...user, twoFactorEnabled: true };
      localStorage.setItem('ga_session', JSON.stringify(updated));
      onUpdateUser(updated);
    }
    triggerAlert('success', 'Autenticação de 2 fatores ativada com sucesso!');
    logAuditEvent('Segurança', 'Autenticação de dois fatores ativada', 'seguranca');
  };

  const handleToggleNightFocusMode = (enabled: boolean) => {
    setNightFocusMode(enabled);
    localStorage.setItem('ga_night_focus_mode', String(enabled));
    window.dispatchEvent(new CustomEvent('night_focus_mode_changed', { detail: { nightFocusMode: enabled } }));
    if (enabled) {
      triggerAlert('success', 'Modo Foco Noturno ativado: Esquema de cores em tons pastéis escuros aplicados para reduzir a fadiga ocular.');
      logAuditEvent('Preferências', 'Modo Foco Noturno ativado', 'preferencias');
    } else {
      triggerAlert('success', 'Modo Foco Noturno desativado.');
      logAuditEvent('Preferências', 'Modo Foco Noturno desativado', 'preferencias');
    }
  };

  // Section 3: Save Preferences
  const handleSavePreferences = () => {
    if (!user) return;

    const workHoursConfig = {
      enabled: workHoursEnabled,
      startTime: workHoursStart,
      endTime: workHoursEnd,
      workDays: workHoursDays,
      blockNonEssential: true
    };

    localStorage.setItem('ga_work_hours_focus', JSON.stringify(workHoursConfig));

    const prefs: UserPreferences = {
      theme,
      nightFocusMode,
      background,
      language: prefLang,
      documentLang,
      defaultTaxCountry,
      accountingStandard,
      defaultCurrency,
      dateFormat,
      notifications: {
        compliance: notifCompliance,
        ai: notifAi,
        workspace: notifWorkspace,
        education: notifEducation,
        system: notifSystem
      },
      workHoursFocus: workHoursConfig
    };

    const updated: UserSession = {
      ...user,
      preferences: prefs,
      language: prefLang // keeping top level in sync
    };

    localStorage.setItem('ga_session', JSON.stringify(updated));
    localStorage.setItem(`ga:user_record:${email.toLowerCase().trim()}`, JSON.stringify(updated));
    
    // Save in user local database preference namespace
    DB.set('preferences', 'all', prefs);
    
    onUpdateUser(updated);
    
    logAuditEvent('Preferências', 'Preferências pessoais de utilizador guardadas', 'preferencias');
    triggerAlert('success', 'Preferências guardadas com sucesso!');

    // Trigger visual refits
    const event = new CustomEvent('preferencesChanged', { detail: prefs });
    window.dispatchEvent(event);
    window.dispatchEvent(new CustomEvent('work_hours_changed', { detail: workHoursConfig }));
  };

  // Section 5: Data Actions
  const handleExportData = () => {
    if (!user) return;
    
    // Compile all user namespaces into one exportable JSON format (as we are in iframe, downloading a structured zip/json)
    const exportObject: Record<string, any> = {};
    const namespaces = [
      'profile', 'preferences', 'searches', 'ai_history', 'ai_memory', 
      'documents', 'favorites', 'notes', 'quiz_results', 'trail_progress', 
      'certificates', 'simulations', 'transactions', 'projects', 'invoices', 
      'contacts', 'reports', 'audit_log', 'kpi_data', 'notifications'
    ];

    namespaces.forEach(ns => {
      exportObject[ns] = DB.list(ns);
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `globalaccount_backup_${user.userId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    logAuditEvent('Privacidade', 'Backup global de dados exportado', 'dados');
    triggerAlert('success', 'Dados compilados e exportados com sucesso!');
  };

  const handleClearSearches = () => {
    DB.list('searches').forEach((s: any) => DB.delete('searches', s.id));
    logAuditEvent('Privacidade', 'Histórico de pesquisas limpo', 'dados');
    triggerAlert('success', 'Histórico de pesquisas eliminado.');
  };

  const handleClearAiHistory = () => {
    DB.list('ai_history').forEach((h: any) => DB.delete('ai_history', h.id));
    logAuditEvent('Privacidade', 'Histórico de conversas IA limpo', 'dados');
    triggerAlert('success', 'Histórico de conversas com a IA eliminado.');
  };

  const handleClearOfflineContent = () => {
    try {
      let count = 0;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ga_offline_learning_') || key === 'dashboard_cache')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
        count++;
      });
      logAuditEvent('Privacidade', 'Conteúdo offline de Aprendizados limpo', 'dados');
      triggerAlert('success', `Conteúdo offline limpo com sucesso (${count} registos removidos).`);
      window.dispatchEvent(new CustomEvent('learnings_updated'));
    } catch (e) {
      triggerAlert('error', 'Falha ao limpar conteúdo offline.');
    }
  };

  const handleClearRuntimeCache = async () => {
    try {
      const stats = await estimateCacheUsage();
      const confirmed = window.confirm(
        `Tem a certeza de que deseja limpar o cache de rede (contaglobal-runtime-v5)?\n\nEspaço aproximado a libertar: ${stats.formattedSize} (${stats.count} recursos).\nOs seus dados locais e notas não serão apagados.`
      );
      if (!confirmed) return;

      const result = await clearRuntimeCache();
      if (result.success) {
        await loadCacheUsageStats();
        logAuditEvent('Privacidade', 'Cache de rede (contaglobal-runtime-v5) limpo', 'dados');
        triggerAlert(
          'success', 
          `Cache de rede (contaglobal-runtime-v5) limpo com sucesso! ${result.deletedCount > 0 ? `(${result.deletedCount} recursos libertados)` : ''}`
        );
      } else {
        triggerAlert('error', `Falha ao limpar o cache de runtime: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (e) {
      console.error('[Cache Clean Error]:', e);
      triggerAlert('error', 'Falha ao limpar o cache de runtime da rede.');
    }
  };

  const handleExecuteDeleteAccount = () => {
    if (!user) return;
    const typed = deleteConfirmInput.trim();
    const isWordMatch = typed.toUpperCase() === 'ELIMINAR';
    const isEmailMatch = typed.toLowerCase() === user.email.toLowerCase().trim();

    if (!isWordMatch && !isEmailMatch) {
      triggerAlert('error', 'Por favor introduza "ELIMINAR" ou o email da sua conta para confirmar.');
      return;
    }

    // Wipe all account records and logout
    deleteUserAccount(user);
    setIsDeleteModalOpen(false);
    onLogout("A tua conta foi eliminada com sucesso");
  };

  // Helper to extract initials
  const getInitials = (fullName: string) => {
    if (!fullName) return 'GA';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden font-sans" id="user-profile-panel-wrapper">
      
      {/* LEFT NAVIGATION COLUMN */}
      <aside className="w-full md:w-64 bg-white p-6 shrink-0 flex flex-col justify-between" id="profile-aside">
        <div className="space-y-6">
          {/* Top User Summary */}
          <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
            <div className={`w-11 h-11 rounded-full ${avatarColor} text-white flex items-center justify-center font-extrabold text-sm border shadow-inner`}>
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 truncate">{name || 'Utilizador Global'}</h3>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold uppercase px-1.5 py-0.5 rounded">
                Plano {user?.plan?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Nav buttons */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSubSection('info')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                activeSubSection === 'info'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              Informação Pessoal
            </button>

            <button
              onClick={() => setActiveSubSection('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                activeSubSection === 'security'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              Segurança e Acesso
            </button>

            <button
              onClick={() => setActiveSubSection('prefs')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                activeSubSection === 'prefs'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              Preferências do App
            </button>

            <button
              onClick={() => setActiveSubSection('privacy')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                activeSubSection === 'privacy'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Dados e Privacidade
            </button>
          </nav>
        </div>

        <button 
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2.5 px-4 rounded-xl mt-6 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Terminar Sessão
        </button>
      </aside>

      {/* RIGHT WORKSPACE DETAILS/PANEL PANEL */}
      <section className="flex-1 bg-white p-8 overflow-y-auto" id="profile-content-area">
        
        {/* Visual Alerts */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-3 animate-fade-in" id="profile-success-alert">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-xl flex items-center gap-3 animate-shake" id="profile-error-alert">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SUBSECTION: 1 — PERSONAL INFO & PROFILE CUSTOMIZATION */}
        {activeSubSection === 'info' && (
          <div className="space-y-6 animate-fade-in" id="profile-info-section">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">Perfil & Personalização de Conta</h2>
              <p className="text-xs text-slate-500">Personalize a sua foto de perfil, dados profissionais e preferências de privacidade social.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Form */}
              <form onSubmit={handleSaveInfo} className="lg:col-span-2 space-y-6">
                
                {/* Photo Upload & Camera Section */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        Foto de Perfil & Câmara
                      </h3>
                      <p className="text-[11px] text-slate-500">Carregue um ficheiro do dispositivo (máx 5 MB) ou tire foto com a câmara.</p>
                    </div>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Usar Iniciais
                      </button>
                    )}
                  </div>

                  {fileValidationError && (
                    <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-xs rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{fileValidationError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Avatar Preview Box with Crop/Zoom effect */}
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md flex items-center justify-center bg-slate-200 relative">
                        {photoUrl ? (
                          <img 
                            src={photoUrl} 
                            alt={name} 
                            className="w-full h-full object-cover transition-transform duration-200"
                            style={{ transform: `scale(${zoomLevel / 100})` }}
                          />
                        ) : (
                          <div className={`w-full h-full ${avatarColor} text-white font-extrabold text-2xl flex items-center justify-center`}>
                            {getInitials(name)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 flex-1 w-full">
                      <div className="flex flex-wrap gap-2">
                        <label className="flex-1 min-w-[140px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Carregar Ficheiro</span>
                          <input 
                            type="file" 
                            accept="image/jpeg,image/png,image/webp" 
                            onChange={handleFileUpload} 
                            className="hidden" 
                          />
                        </label>

                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex-1 min-w-[140px] px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-emerald-400" />
                          <span>Tirar com Câmara</span>
                        </button>
                      </div>

                      {/* Zoom & Adjustment Controls */}
                      {photoUrl && (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span className="flex items-center gap-1">
                              <ZoomIn className="w-3.5 h-3.5 text-blue-500" />
                              Ajustar Zoom / Recorte:
                            </span>
                            <span>{zoomLevel}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="100" 
                            max="250" 
                            value={zoomLevel} 
                            onChange={(e) => setZoomLevel(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      )}

                      <div className="flex gap-1.5 items-center">
                        <span className="text-[10px] text-slate-400 font-medium">Cores do avatar sem foto:</span>
                        {avatarColors.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setAvatarColor(color)}
                            className={`w-5 h-5 rounded-full ${color} border border-white focus:ring-2 focus:ring-blue-500 transition-all ${
                              avatarColor === color ? 'scale-110 shadow-md ring-2 ring-blue-500/30' : 'opacity-80'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Camera WebCam Live Stream Modal / Box */}
                  {isCameraOpen && (
                    <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-700 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Câmara Ativa — Alinhe o seu rosto
                        </span>
                        <button type="button" onClick={stopCamera} className="text-slate-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-black rounded-xl overflow-hidden border border-slate-700">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={captureCameraPhoto}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capturar Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Profile Info Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={handleFieldBlur}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Profissional</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleFieldBlur}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                {/* Professional Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cargo / Título Profissional</label>
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      onBlur={handleFieldBlur}
                      placeholder="Ex: Contador Sénior, Auditor, Consultor Fiscal"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Empresa / Instituição</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      onBlur={handleFieldBlur}
                      placeholder="Ex: Global Audit, Deloitte, Ministério das Finanças"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Biografia Curta / Especialidades</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={handleFieldBlur}
                    placeholder="Escreva um breve resumo da sua experiência contabilística..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Standard Profile Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Categoria de Perfil
                    </label>
                    <select
                      value={profile}
                      onChange={(e) => {
                        setProfile(e.target.value);
                        persistProfileData({ profile: e.target.value as any });
                      }}
                      onBlur={handleFieldBlur}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                    >
                      <option value="accountant">💼 Contabilista / Auditor Certificado</option>
                      <option value="student">🎓 Estudante / Académico</option>
                      <option value="manager">👔 Gestor / Diretor Financeiro (CFO)</option>
                      <option value="company">🏢 Empresa / Corporativo</option>
                      <option value="other">🌐 Outro Perfil / Consultor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">País de Atuação</label>
                    <select
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        persistProfileData({ country: e.target.value });
                      }}
                      onBlur={handleFieldBlur}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      {countries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Norma Contabilística</label>
                    <select
                      value={accountingStandard}
                      onChange={(e) => {
                        setAccountingStandard(e.target.value);
                        persistProfileData();
                      }}
                      onBlur={handleFieldBlur}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      {standards.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 px-6 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Alterações do Perfil</span>
                  </button>
                  {autoSaveBadge && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-fadeIn">
                      <Check className="w-3.5 h-3.5" />
                      <span>Dados guardados ✓</span>
                    </span>
                  )}
                </div>
              </form>

              {/* Right Col: Live Card Preview */}
              <div className="space-y-4">
                <div className="sticky top-4">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-2">
                    Pré-visualização em Tempo Real (Live Card)
                  </span>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg space-y-4 pb-5">
                    {/* Header Banner */}
                    <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-700 relative p-3 flex justify-between items-start">
                      <span className="bg-white/20 backdrop-blur-md text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                        {accountingStandard}
                      </span>
                    </div>

                    {/* Profile Details */}
                    <div className="px-5 pt-0 relative space-y-3">
                      <div className="flex items-end justify-between -mt-12 mb-2">
                        <div className="w-20 h-20 bg-slate-100 border-4 border-white rounded-2xl flex items-center justify-center text-3xl shadow-md overflow-hidden">
                          {photoUrl ? (
                            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full ${avatarColor} text-white font-extrabold flex items-center justify-center text-xl`}>
                              {getInitials(name)}
                            </div>
                          )}
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">{name || 'Seu Nome'}</h3>
                        <p className="text-xs font-semibold text-blue-600">{roleTitle || 'Título Profissional'}</p>
                        <p className="text-[11px] text-slate-500">{company || 'Empresa'}</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 italic">
                        "{bio || 'Sem biografia.'}"
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>📍 {country}</span>
                        <span>🏆 Certificado PGC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBSECTION: 2 — SECURITY */}
        {activeSubSection === 'security' && (
          <div className="space-y-8 max-w-xl animate-fade-in" id="profile-security-section">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">Segurança de Acesso</h2>
              <p className="text-xs text-slate-500">Controle o acesso à sua conta, configure autenticação forte e encerre sessões.</p>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleSavePassword} className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Alterar Palavra-passe</h3>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Palavra-passe Atual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 text-xs rounded-xl focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Nova Palavra-passe</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 text-xs rounded-xl focus:outline-none"
                      placeholder="Min. 6 caracteres"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Confirmar Nova Palavra-passe</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 text-xs rounded-xl focus:outline-none"
                      placeholder="Repita a palavra-passe"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Atualizar Palavra-passe
              </button>
            </form>

            {/* 2FA Section */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-500" />
                    Autenticação de Dois Fatores (2FA)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Adiciona uma camada extra de segurança gerando códigos pelo seu telemóvel.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggle2FA}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    twoFactorEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {showTwoFactorQR && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                  <div className="bg-white p-2.5 border rounded-xl shrink-0">
                    <QrCode className="w-24 h-24 text-slate-800" />
                  </div>
                  <div className="space-y-2 text-center sm:text-left">
                    <h4 className="text-xs font-black text-slate-800">Configure com o Google Authenticator</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Escaneie o código QR acima ou introduza a chave manual <span className="font-mono text-slate-800 font-bold bg-slate-200 px-1 py-0.5 rounded">GACC SECURE 2FA 2026</span> no seu telemóvel contendo o autenticador.
                    </p>
                    <button
                      type="button"
                      onClick={handleConfirm2FA}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition-all"
                    >
                      Confirmar Configuração
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Session Management */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Dispositivos Ligados &amp; Sessões Ativas</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sessões independentes em tempo real. Pode terminar a sessão remotamente em qualquer aparelho.</p>
                </div>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDisconnectOtherSessions}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 hover:underline transition-all cursor-pointer"
                  >
                    Terminar todas as outras sessões
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {sessions.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic text-center">
                    A carregar lista de dispositivos sincronizados...
                  </div>
                ) : (
                  sessions.map((s) => {
                    const isCurrent = s.id === currentDeviceId;
                    const isMobile = s.type === 'mobile';
                    const isTablet = s.type === 'tablet';

                    return (
                      <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl text-xs border transition-all ${
                        isCurrent ? 'bg-blue-50/70 border-blue-200 shadow-2xs' : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {isMobile ? (
                              <Smartphone className="w-4 h-4" />
                            ) : isTablet ? (
                              <Tablet className="w-4 h-4" />
                            ) : (
                              <Laptop className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{s.device}</span>
                              {isCurrent ? (
                                <span className="bg-blue-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  ESTE DISPOSITIVO
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                  LIGADO
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{s.location || 'Luanda, AO'}</span>
                              <span>•</span>
                              <span>IP: {s.ip || '197.231.xx.xx'}</span>
                              <span>•</span>
                              <span>Ativo: {s.lastActive ? new Date(s.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Agora'}</span>
                            </div>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleTerminateSingleSession(s.id)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-all cursor-pointer shrink-0"
                            title="Terminar a sessão neste dispositivo remotamente"
                          >
                            Terminar Sessão
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBSECTION: 3 — APP PREFERENCES */}
        {activeSubSection === 'prefs' && (
          <div className="space-y-6 max-w-xl animate-fade-in" id="profile-prefs-section">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">Preferências Globais</h2>
              <p className="text-xs text-slate-500">Configure o tema visual, formato de cálculos, idiomas dos relatórios e canais de notificação.</p>
            </div>

            {/* Theme & Background */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Personalização Visual & Estilo do App</h3>
              
              {/* Embedded Visual Customization Panel */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
                <ThemeCustomizationDrawer isEmbedded={true} isOpen={true} onClose={() => {}} />
              </div>

              {/* Modo Foco Noturno Switch Card */}
              <div 
                className={`p-4 rounded-2xl border transition-all shadow-sm ${
                  nightFocusMode 
                    ? 'bg-slate-900 text-white border-indigo-500/50 ring-1 ring-indigo-500/30' 
                    : 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-slate-800'
                }`}
                id="night-focus-mode-card"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
                      <Moon className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-100">Modo Foco Noturno</h4>
                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full">
                          Proteção Ocular
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        Ajusta o esquema de cores da aplicação para tons pastéis escuros, reduzindo a fadiga ocular durante sessões de estudo prolongadas.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleNightFocusMode(!nightFocusMode)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      nightFocusMode ? 'bg-indigo-500' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={nightFocusMode}
                    id="night-focus-toggle-btn"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        nightFocusMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* PALETA DE CORES PERSONALIZADA PARA MODO FOCO NOTURNO */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                      Paleta de Tons Pastéis (Modo Foco Noturno)
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 font-bold">
                      {nightFocusTheme === 'ocean' ? '🌊 Oceano Profundo' : nightFocusTheme === 'forest' ? '🌲 Floresta Suave' : '🌆 Crepúsculo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'ocean',
                        label: 'Oceano Profundo',
                        subtitle: 'Pastel Azul & Marinho',
                        activeRing: 'ring-2 ring-sky-400 bg-sky-950/60 border-sky-400 text-white',
                        dot: 'bg-sky-400',
                        swatch: ['#0f172a', '#1e293b', '#38bdf8']
                      },
                      {
                        id: 'forest',
                        label: 'Floresta Suave',
                        subtitle: 'Pastel Verde Esmeralda',
                        activeRing: 'ring-2 ring-emerald-400 bg-emerald-950/60 border-emerald-400 text-white',
                        dot: 'bg-emerald-400',
                        swatch: ['#0b1913', '#13261e', '#34d399']
                      },
                      {
                        id: 'twilight',
                        label: 'Crepúsculo',
                        subtitle: 'Pastel Violeta & Ameixa',
                        activeRing: 'ring-2 ring-purple-400 bg-purple-950/60 border-purple-400 text-white',
                        dot: 'bg-purple-400',
                        swatch: ['#150e20', '#211633', '#c084fc']
                      }
                    ].map((pal) => (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => handleSelectNightFocusTheme(pal.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                          nightFocusTheme === pal.id 
                            ? pal.activeRing 
                            : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{pal.label}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${pal.dot} ${nightFocusTheme === pal.id ? 'animate-pulse' : ''}`} />
                        </div>
                        <p className="text-[10px] text-slate-300">{pal.subtitle}</p>
                        
                        {/* Swatch dots */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {pal.swatch.map((color, idx) => (
                            <div 
                              key={idx} 
                              className="w-4 h-4 rounded-full border border-white/20 shadow-xs shrink-0" 
                              style={{ backgroundColor: color }} 
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'auto'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => applyThemeChange(t)}
                    className={`p-3 border rounded-xl text-xs font-bold capitalize transition-all ${
                      theme === t 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Background Picker */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500">Padrão / Fundo do App (10 opções)</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {backgrounds.map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => setBackground(bg.id)}
                      className={`p-2 border rounded-xl text-[9px] font-bold text-center flex flex-col items-center gap-1.5 transition-all ${
                        background === bg.id
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-full h-6 rounded-md ${bg.preview} border shadow-inner`} />
                      <span className="truncate w-full">{bg.label.split('/')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculations & Standards */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Formatos e Legislação Padrão</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Norma Contabilística Ativa</label>
                  <select
                    value={accountingStandard}
                    onChange={(e) => setAccountingStandard(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    {standards.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Moeda Principal da Conta / Empresa</label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 text-xs rounded-xl focus:outline-none font-bold"
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">País para Cálculos de Impostos</label>
                  <select
                    value={defaultTaxCountry}
                    onChange={(e) => setDefaultTaxCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Formato de Data</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Portugal/Brasil)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (USA Style)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Idioma dos Relatórios da IA</label>
                  <select
                    value={documentLang}
                    onChange={(e) => setDocumentLang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 text-xs rounded-xl focus:outline-none cursor-pointer"
                  >
                    {languages.map(l => (
                      <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications panel */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Configurações de Notificação</h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer py-1.5 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Notificações Fiscais e Compliance</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Alertas de prazos de IVA, Modelo 22, relatórios urgentes.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifCompliance}
                    onChange={(e) => setNotifCompliance(e.target.checked)}
                    className="rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-blue-500/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1.5 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Inteligência Artificial (IA)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Confirmação de documentos gerados, revisões concluídas.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifAi}
                    onChange={(e) => setNotifAi(e.target.checked)}
                    className="rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-blue-500/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1.5 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Equipa e Workspace</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Notificações de convites aceites, criação de novas subsidiárias.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifWorkspace}
                    onChange={(e) => setNotifWorkspace(e.target.checked)}
                    className="rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-blue-500/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1.5 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Educação e Cursos</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Badges recebidos, conclusão de trilhas de auditoria.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifEducation}
                    onChange={(e) => setNotifEducation(e.target.checked)}
                    className="rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-blue-500/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1.5">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Avisos do Sistema</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Atualizações legislativas globais e manutenção agendada.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifSystem}
                    onChange={(e) => setNotifSystem(e.target.checked)}
                    className="rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-blue-500/20"
                  />
                </label>
              </div>
            </div>

            {/* WORK HOURS FOCUS MODE SECTION */}
            <div className="pt-6 border-t border-slate-100 space-y-4" id="work-hours-settings-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">Período de Trabalho & Foco</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Defina o seu horário laboral para bloquear notificações não essenciais automaticamente.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={workHoursEnabled} 
                    onChange={(e) => setWorkHoursEnabled(e.target.checked)} 
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {workHoursEnabled && (
                <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-4 space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hora de Início</label>
                      <input 
                        type="time" 
                        value={workHoursStart}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkHoursStart(val);
                          const cfg = { enabled: workHoursEnabled, startTime: val, endTime: workHoursEnd, workDays: workHoursDays, blockNonEssential: true };
                          localStorage.setItem('ga_work_hours_focus', JSON.stringify(cfg));
                          window.dispatchEvent(new CustomEvent('work_hours_changed', { detail: cfg }));
                        }}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hora de Fim</label>
                      <input 
                        type="time" 
                        value={workHoursEnd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkHoursEnd(val);
                          const cfg = { enabled: workHoursEnabled, startTime: workHoursStart, endTime: val, workDays: workHoursDays, blockNonEssential: true };
                          localStorage.setItem('ga_work_hours_focus', JSON.stringify(cfg));
                          window.dispatchEvent(new CustomEvent('work_hours_changed', { detail: cfg }));
                        }}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-2">Dias de Trabalho Ativos</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 1, label: 'Seg' },
                        { id: 2, label: 'Ter' },
                        { id: 3, label: 'Qua' },
                        { id: 4, label: 'Qui' },
                        { id: 5, label: 'Sex' },
                        { id: 6, label: 'Sáb' },
                        { id: 0, label: 'Dom' }
                      ].map((day) => {
                        const isSelected = workHoursDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setWorkHoursDays(prev => prev.filter(d => d !== day.id));
                              } else {
                                setWorkHoursDays(prev => [...prev, day.id]);
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-indigo-600 text-white shadow-xs' 
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 bg-white/90 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs">
                    <BellOff className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="text-slate-600 text-[11px] leading-relaxed">
                      <strong className="text-slate-800">Modo de Bloqueio de Distrações:</strong> Durante o seu período de trabalho (<span className="font-mono font-bold text-slate-800">{workHoursStart} — {workHoursEnd}</span>), a aplicação bloqueia automaticamente notificações de Cursos, Comunidades e Sugestões Gerais da IA. Notificações urgentes de Compliance Fiscal permanecem ativas.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-5 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Guardar Preferências
            </button>
          </div>
        )}

        {/* SUBSECTION: 5 — DATA & PRIVACY */}
        {activeSubSection === 'privacy' && (
          <div className="space-y-6 max-w-xl animate-fade-in" id="profile-privacy-section">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">Dados e Privacidade</h2>
              <p className="text-xs text-slate-500">Controle total sobre a persistência dos seus dados. Transparência completa e eliminação permanente conforme diretrizes RGPD / LGPD.</p>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Ações de Limpeza e Exportação</h3>
              
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Exportar Todos os Meus Dados</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Transfira um ficheiro JSON estruturado contendo todos os dados, pesquisas, e documentos.</span>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-xl text-[10px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar Backup
                  </button>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Eliminar Histórico de Pesquisas</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Apaga todas as pesquisas e palavras-chave armazenadas localmente no seu histórico.</span>
                  </div>
                  <button
                    onClick={handleClearSearches}
                    className="bg-transparent hover:bg-red-50 border border-red-200 text-red-600 font-bold px-3 py-2 rounded-xl text-[10px]"
                  >
                    Eliminar Histórico
                  </button>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Eliminar Histórico de Conversas com a IA</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Apaga de forma permanente todas as mensagens enviadas e recebidas com o consultor IA.</span>
                  </div>
                  <button
                    onClick={handleClearAiHistory}
                    className="bg-transparent hover:bg-red-50 border border-red-200 text-red-600 font-bold px-3 py-2 rounded-xl text-[10px]"
                  >
                    Limpar Histórico Chat
                  </button>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Limpar Conteúdo Offline (Aprendizados)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Remove os módulos e caches locais guardados para estudo sem acesso à internet.</span>
                  </div>
                  <button
                    onClick={handleClearOfflineContent}
                    className="bg-transparent hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold px-3 py-2 rounded-xl text-[10px] cursor-pointer"
                  >
                    Limpar Cache Offline
                  </button>
                </div>

                <div className="flex items-center justify-between py-3.5 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Limpar Cache de Rede (contaglobal-runtime-v5)</span>
                      {runtimeCacheStats && (
                        <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                          {runtimeCacheStats.formattedSize} (~{runtimeCacheStats.count} recursos)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">Liberta armazenamento do dispositivo removendo requisições HTTP em cache dinâmico sem apagar os seus dados ou notas locais.</span>
                  </div>
                  <button
                    onClick={handleClearRuntimeCache}
                    className="bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold px-3 py-2 rounded-xl text-[10px] cursor-pointer shrink-0 ml-2"
                  >
                    Limpar Cache de Rede {runtimeCacheStats ? `(${runtimeCacheStats.formattedSize})` : ''}
                  </button>
                </div>
              </div>
            </div>

            {/* ZONA DE PERIGO / DANGER ZONE */}
            <div className="p-5 border-2 border-red-300 bg-red-50/40 rounded-2xl space-y-4 relative overflow-hidden" id="danger-zone-section">
              <div className="flex items-center gap-2.5 text-red-700 font-extrabold text-xs uppercase tracking-wider pb-2 border-b border-red-200/80">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Zona de Perigo</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-800">Eliminar Conta Permanentemente</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  A eliminação da conta é uma ação definitiva e irreversível. Todos os seus dados pessoais, documentos, relatórios e históricos serão apagados permanentemente de acordo com as diretivas do RGPD.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmInput('');
                  setIsDeleteModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar Conta
              </button>
            </div>
          </div>
        )}

      </section>

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="logout-confirm-modal">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">Terminar Sessão</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Tens a certeza que queres terminar a sessão?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                  onLogout("Sessão terminada com sucesso.");
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-red-600/15"
              >
                Terminar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-account-modal">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 text-red-600">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Eliminar Conta Permanentemente</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Ação Irreversível • Proteção de Dados RGPD</span>
              </div>
            </div>

            {/* Irreversible explanation */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Atenção: Esta ação é <strong className="text-slate-900">permanente e irreversível</strong>. Ao confirmar, a sua conta será completamente apagada e não será possível recuperar qualquer informação.
            </p>

            {/* Itemized list of what will be deleted */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">O que será eliminado permanentemente:</span>
              <ul className="space-y-1.5 text-slate-700 text-[11px]">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Dados da conta e perfil:</strong> Nome, email, fotos de perfil e credenciais de acesso.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Documentos e relatórios:</strong> Relatórios contabilísticos gerados, ficheiros exportados e certificados.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Histórico e interações:</strong> Conversas com o consultor IA, pesquisas guardadas e registos de atividade.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Registos financeiros:</strong> Lançamentos no livro de razões, conciliações e empresas do utilizador.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Workspaces e definições:</strong> Preferências personalizadas e associações a equipas.</span>
                </li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Para confirmar, digite a palavra <span className="font-mono text-red-600 font-extrabold bg-red-50 px-1 py-0.5 rounded border border-red-200">ELIMINAR</span> ou o seu email (<span className="font-semibold text-slate-800">{user?.email}</span>):
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Digite ELIMINAR para confirmar"
                className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 font-mono"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmInput('');
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  deleteConfirmInput.trim().toUpperCase() !== 'ELIMINAR' &&
                  deleteConfirmInput.trim().toLowerCase() !== user?.email.toLowerCase().trim()
                }
                onClick={handleExecuteDeleteAccount}
                className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 ${
                  deleteConfirmInput.trim().toUpperCase() === 'ELIMINAR' ||
                  deleteConfirmInput.trim().toLowerCase() === user?.email.toLowerCase().trim()
                    ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-md shadow-red-600/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Conta Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

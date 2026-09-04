import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { i18n } from './translations';
import { sairConta } from './lib/auth/authService';
import { trocarDeConta } from './lib/auth/trocarConta';
import { formatCurrency, SUPPORTED_CURRENCIES, convertCurrency } from './lib/currencyUtils';
import { getStoredSessionContext, SessionContext } from './lib/accountingStandards';
import AppLogo from './components/AppLogo';
import { PageSkeleton } from './components/PageSkeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ComponentErrorBoundary } from './components/ComponentErrorBoundary';
import { preloadNextLikelyRoutes } from './services/preloadService';
import { cancelPendingRequests } from './services/appCacheService';
import YohanAI from './components/YohanAI';
import { YohanLogo } from './components/YohanLogo';
import { AccountingLogo } from './components/AccountingLogo';
import { getPendingOfflineActions, syncOfflineDataWithServer, clearStaleCache, getQuizProgress, notifyDataChanged } from './services/dashboardCache';
import { processOfflineQueue } from './services/offlineQueue';
import LanguageSelector from './components/LanguageSelector';
import ThemeSelector from './components/ThemeSelector';
import ThemeCustomizerFloatingButton from './components/ThemeCustomizerFloatingButton';
import { loadAppearance, applyAppearanceToDOM } from './lib/themeAppearance';
import SyncBanner from './components/SyncBanner';
import OfflineStatusBanner from './components/OfflineStatusBanner';
import OfflineBlockedView from './components/OfflineBlockedView';
import { OnboardingTour } from './components/OnboardingTour';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { FirestoreStatusModal } from './components/FirestoreStatusModal';
import OfflineSyncManagerModal from './components/OfflineSyncManagerModal';
import { MobileBottomNavigation } from './components/MobileBottomNavigation';
import { SmartSuggestionsWidget } from './components/SmartSuggestionsWidget';
import { 
  trackUserPresence 
} from './lib/supabase/supabaseRealtime';
import { 
  registerDeviceSession as registerSupabaseSession 
} from './lib/supabase/supabaseAuth';
import { 
  registerDeviceSession, 
  subscribeUserSessions, 
  subscribeUserPreferences, 
  subscribeToFirestoreEntities, 
  subscribeToFirestoreTransactions, 
  getDeviceId,
  iniciarSyncAutomatico,
  ouvirOutrasAbas
} from './lib/firebase';
import { 
  DB, 
  getCurrentUser, 
  getActiveWorkspace, 
  logout, 
  logAuditEvent, 
  createNotification, 
  getNotifications, 
  markNotificationsAsRead, 
  getUserWorkspaces,
  ensureDemoUsers,
  isWithinWorkHours
} from './lib/db';
import { loadUserProfileMultiStore, saveUserProfileMultiStore } from './lib/userProfiles';
import { obterPerfilDoFirestore } from './lib/auth/authService';

import AuthScreen from './components/AuthScreen';
import { LoginPage } from './pages/Login/LoginPage';
import SupabaseSyncManagerModal from './components/SupabaseSyncManagerModal';
import LearningWorkspace from './components/LearningWorkspace';
import { QuizWorkspace } from './components/QuizWorkspace';
import AdminDashboard from './components/AdminDashboard';
import ErpAccountingWorkspace from './components/ErpAccountingWorkspace';
import NotasPage from './components/NotasPage';
import { StudentDashboardView } from './components/StudentDashboardView';
import UserProfilePanel from './components/UserProfilePanel';
import GlobalSearchPanel from './components/GlobalSearchPanel';

import { 
  LayoutDashboard, 
  Building2, 
  BookOpen, 
  CheckSquare, 
  Bot, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Calculator, 
  GraduationCap,
  Briefcase, 
  Send, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  RefreshCw, 
  Globe, 
  Check, 
  X, 
  Info,
  Calendar,
  Filter,
  User,
  Users,
  Shield,
  Bell,
  BellOff,
  Clock,
  ChevronDown,
  LogOut,
  Newspaper,
  Menu,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
  Compass,
  MoreVertical,
  MessageSquare,
  StickyNote,
  Database,
  Wifi
} from 'lucide-react';

// Strict allowlist for application tabs
export type AppTab = 
  | 'dashboard' 
  | 'assistant' 
  | 'learning' 
  | 'quizzes' 
  | 'profile' 
  | 'admin' 
  | 'accounting' 
  | 'notes' 
  | 'find-users';

export const ACTIVE_TABS = new Set<string>([
  'dashboard',
  'assistant',
  'learning',
  'quizzes',
  'profile',
  'admin',
  'accounting',
  'notes',
  'find-users'
]);

export function isAppTab(tab: string): tab is AppTab {
  return ACTIVE_TABS.has(tab);
}

// Interfaces
interface LegalEntity {
  id: string;
  name: string;
  region: string;
  status: 'Active' | 'Review' | 'Idle';
  lastSync: string;
  revenue: number;
  complianceScore: number;
  currency: string;
  taxId: string;
}

interface Transaction {
  id: string;
  entityId: string;
  entityName: string;
  date: string;
  description: string;
  account: string;
  type: 'Debit' | 'Credit';
  amount: number;
  currency: string;
  exchangeRate?: number;
  baseAmount?: number;
  status: 'Reconciled' | 'Pending';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Initial Data
const INITIAL_ENTITIES: LegalEntity[] = [
  { id: '1', name: 'Luanda Comercial & Serviços LDA', region: 'Angola (Luanda)', status: 'Active', lastSync: '2 mins ago', revenue: 450000000, complianceScore: 98, currency: 'AOA', taxId: 'AO-50493821' },
  { id: '2', name: 'Benguela Distribuição SA', region: 'Angola (Benguela)', status: 'Active', lastSync: '14 mins ago', revenue: 180000000, complianceScore: 99, currency: 'AOA', taxId: 'AO-50123490' },
  { id: '3', name: 'Cabinda Energia & Logística', region: 'Angola (Cabinda)', status: 'Review', lastSync: 'Yesterday', revenue: 320000000, complianceScore: 89, currency: 'AOA', taxId: 'AO-50987654' },
  { id: '4', name: 'Huambo Indústria S.A.', region: 'Angola (Huambo)', status: 'Active', lastSync: '1 hour ago', revenue: 95000000, complianceScore: 95, currency: 'AOA', taxId: 'AO-50765432' },
  { id: '5', name: 'Vertex Global Holdings (Subsidiária AO)', region: 'Angola (Internacional)', status: 'Active', lastSync: '12 mins ago', revenue: 650000000, complianceScore: 96, currency: 'AOA', taxId: 'AO-9832049' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', entityId: '1', entityName: 'Luanda Comercial & Serviços LDA', date: '2026-07-01', description: 'Venda de Equipamentos e Prestação de Serviços em Luanda', account: '61.1 — Vendas de Produtos / Proveitos', type: 'Credit', amount: 150000000, currency: 'AOA', exchangeRate: 1.0, status: 'Reconciled' },
  { id: 't2', entityId: '2', entityName: 'Benguela Distribuição SA', date: '2026-07-02', description: 'Fornecimento e Serviços de Terceiros (FST)', account: '75.2 — Serviços de Terceiros / Custos', type: 'Debit', amount: 25000000, currency: 'AOA', exchangeRate: 1.0, status: 'Reconciled' },
  { id: 't3', entityId: '1', entityName: 'Luanda Comercial & Serviços LDA', date: '2026-07-03', description: 'Apuramento do IVA (Lei 7/19)', account: '34.5.2 — IVA Liquidável', type: 'Credit', amount: 21000000, currency: 'AOA', exchangeRate: 1.0, status: 'Reconciled' },
  { id: 't4', entityId: '3', entityName: 'Cabinda Energia & Logística', date: '2026-07-04', description: 'Pagamento de Retenção do Imposto Industrial', account: '34.1 — Estado Imposto Industrial', type: 'Debit', amount: 9750000, currency: 'AOA', exchangeRate: 1.0, status: 'Pending' },
  { id: 't5', entityId: '4', entityName: 'Huambo Indústria S.A.', date: '2026-07-05', description: 'Aquisição de Matérias-Primas (Existências)', account: '21.1 — Compras de Matérias-Primas', type: 'Debit', amount: 18000000, currency: 'AOA', exchangeRate: 1.0, status: 'Reconciled' },
];

// Helper functions for region-based rates
const getRegionTaxRate = (region: string): number => {
  switch (region) {
    case 'North America': return 0.25; // US Combined Federal + State Est.
    case 'Europe (DACH)': return 0.30; // Germany combined
    case 'Asia Pacific': return 0.17; // Singapore flat
    case 'Latin America': return 0.34; // Brazil combined
    case 'MEA': return 0.09; // UAE Corporate rate
    case 'Scandinavia': return 0.22; // Sweden/Denmark
    default: return 0.20;
  }
};

export default function App({ firebaseUser, firebaseUid }: { firebaseUser?: any; firebaseUid?: string } = {}) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentLang, setCurrentLang] = useState(i18n.currentLang);
  const [sessionContext, setSessionContext] = useState<SessionContext>(() => getStoredSessionContext());
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isFirestoreModalOpen, setIsFirestoreModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(true);

  // Retractable & Responsive Sidebar State
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    return localStorage.getItem('ga_sidebar_pinned') === 'true';
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Supabase Realtime Presence & Device registration
  useEffect(() => {
    if (!currentUser?.id) return;
    registerSupabaseSession(currentUser.id);
    const unsubPresence = trackUserPresence(currentUser.id, currentUser.name || 'Utilizador', false);
    return () => {
      unsubPresence();
    };
  }, [currentUser?.id, currentUser?.name]);

  // Custom Sidebar Width & Drag Resize State
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('ga_sidebar_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 200 && parsed <= 480) return parsed;
    }
    return 256;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const [isSidebarPulse, setIsSidebarPulse] = useState<boolean>(false);

  // Firestore sync pulse animation effect on sidebar
  useEffect(() => {
    const handleSyncPulse = () => {
      setIsSidebarPulse(true);
      setTimeout(() => setIsSidebarPulse(false), 2000);
    };
    window.addEventListener('ga_firestore_sync', handleSyncPulse);
    return () => {
      window.removeEventListener('ga_firestore_sync', handleSyncPulse);
    };
  }, []);

  // Global visual theme & appearance initialization
  useEffect(() => {
    const appearance = loadAppearance(currentUser?.id || 'global');
    applyAppearanceToDOM(appearance);
  }, [currentUser?.id]);

  const handleNavClick = (tabId: string) => {
    if (!isAppTab(tabId)) {
      console.warn(`[Navigation] Disallowed tab identifier: ${tabId}, defaulting to dashboard.`);
      setActiveTab('dashboard');
      return;
    }
    setActiveTab(tabId);
    setIsMobileOpen(false);
    // Auto-collapse if on tablet screen size (768px - 1024px)
    if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
      setIsSidebarPinned(false);
      localStorage.setItem('ga_sidebar_pinned', 'false');
    }
  };

  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(480, Math.max(200, startWidth + deltaX));
      setSidebarWidth(newWidth);
      localStorage.setItem('ga_sidebar_width', String(newWidth));
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  // Dynamic scroll ratio for frosted glass backdrop blur intensity
  const [scrollRatio, setScrollRatio] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isWorkHoursActive, setIsWorkHoursActive] = useState<boolean>(() => isWithinWorkHours());

  useEffect(() => {
    const checkWorkHours = () => {
      setIsWorkHoursActive(isWithinWorkHours());
    };
    checkWorkHours();
    const interval = setInterval(checkWorkHours, 30000);
    window.addEventListener('work_hours_changed', checkWorkHours);
    window.addEventListener('preferencesChanged', checkWorkHours);
    return () => {
      clearInterval(interval);
      window.removeEventListener('work_hours_changed', checkWorkHours);
      window.removeEventListener('preferencesChanged', checkWorkHours);
    };
  }, []);

  useEffect(() => {
    const scrollArea = document.getElementById('workspace-scroll-area');
    if (!scrollArea) return;
    const handleScroll = () => {
      const top = scrollArea.scrollTop;
      const ratio = Math.min(1, Math.max(0, top / 200));
      setScrollRatio(ratio);
    };
    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard navigation handler for #sidebar-nav menu buttons
  const handleSidebarKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const nav = document.getElementById('sidebar-nav');
      if (!nav) return;
      const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>('button[id^="nav-btn-"]'));
      if (buttons.length === 0) return;

      const activeElement = document.activeElement as HTMLButtonElement;
      let currentIndex = buttons.indexOf(activeElement);

      if (e.key === 'ArrowDown') {
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % buttons.length;
        buttons[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        const prevIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
        buttons[prevIndex].focus();
      } else if (e.key === 'Home') {
        buttons[0].focus();
      } else if (e.key === 'End') {
        buttons[buttons.length - 1].focus();
      }
    }
  };

  // Touch gesture listener for mobile swipe left-to-right (open) and right-to-left (close)
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const startX = touchStartRef.current.x;

    touchStartRef.current = null;

    if (Math.abs(deltaY) > 70) return;

    if (deltaX > 50 && startX < 50 && !isMobileOpen) {
      setIsMobileOpen(true);
    } else if (deltaX < -50 && isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const toggleSidebarPin = () => {
    setIsSidebarPinned(prev => {
      const next = !prev;
      localStorage.setItem('ga_sidebar_pinned', String(next));
      return next;
    });
  };

  const isSidebarExpanded = isSidebarPinned || isSidebarHovered;

  // Verify user and workspace on mount & sync with Firebase Auth / Firestore
  const lastSyncedUserRef = useRef<string>('');
  useEffect(() => {
    ensureDemoUsers();
    if (firebaseUid && firebaseUser) {
      const targetUid = firebaseUid;
      const emailKey = firebaseUser.email ? firebaseUser.email.toLowerCase().trim() : '';
      let savedProfile = loadUserProfileMultiStore(targetUid) || (emailKey ? loadUserProfileMultiStore(emailKey) : null);

      const effectiveName = savedProfile?.name || firebaseUser.nome || firebaseUser.displayName || 'Utilizador';
      const effectiveRole = savedProfile?.roleTitle || savedProfile?.profile || firebaseUser.role || 'Senior Accountant';

      const userKey = `${targetUid}:${firebaseUser.email || ''}:${effectiveName}:${effectiveRole}`;
      if (lastSyncedUserRef.current !== userKey) {
        lastSyncedUserRef.current = userKey;

        const authUser: any = {
          userId: targetUid,
          uid: targetUid,
          id: targetUid,
          email: savedProfile?.email || firebaseUser.email || '',
          name: effectiveName,
          role: effectiveRole,
          avatar: savedProfile?.fotoUrl || savedProfile?.photoUrl || savedProfile?.avatar || firebaseUser.avatar || firebaseUser.photoURL || firebaseUser.fotoUrl,
          fotoUrl: savedProfile?.fotoUrl || firebaseUser.fotoUrl || firebaseUser.photoURL,
          status: 'online'
        };
        setCurrentUser(authUser);
        DB.set('users', authUser.userId, authUser);
        const ws = getActiveWorkspace();
        setActiveWorkspace(ws);
        setWorkspaces(getUserWorkspaces(authUser.userId));
        setNotifications(getNotifications());
      }

      // Background Firestore profile fetch to ensure latest saved profile is synchronized
      obterPerfilDoFirestore(targetUid).then((fsProfile) => {
        if (fsProfile && (fsProfile.name || fsProfile.nome || fsProfile.roleTitle)) {
          const profileName = fsProfile.name || fsProfile.nome || effectiveName;
          const profileRole = fsProfile.roleTitle || fsProfile.cargo || fsProfile.role || effectiveRole;
          const merged = {
            name: profileName,
            email: fsProfile.email || firebaseUser.email,
            roleTitle: profileRole,
            fotoUrl: fsProfile.photoURL || fsProfile.avatar || fsProfile.fotoUrl,
            country: fsProfile.country,
            company: fsProfile.company || fsProfile.empresa,
          };
          saveUserProfileMultiStore(targetUid, merged);
          if (emailKey) saveUserProfileMultiStore(emailKey, merged);
          setCurrentUser((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              name: profileName,
              role: profileRole,
              avatar: merged.fotoUrl || prev.avatar,
              fotoUrl: merged.fotoUrl || prev.fotoUrl,
            };
          });
        }
      }).catch(() => {});
    } else {
      const user = getCurrentUser();
      if (user) {
        const uid = user.userId || (user as any).id || (user.email ? user.email.toLowerCase().trim() : '');
        const savedProfile = uid ? loadUserProfileMultiStore(uid) : null;
        
        const effectiveName = savedProfile?.name || user.name || 'Utilizador';
        const effectiveRole = savedProfile?.roleTitle || savedProfile?.profile || user.role || 'Senior Accountant';

        const userKey = `${user.userId}:${user.email || ''}:${effectiveName}:${effectiveRole}`;
        if (lastSyncedUserRef.current !== userKey) {
          lastSyncedUserRef.current = userKey;
          const mergedUser = {
            ...user,
            name: effectiveName,
            role: effectiveRole,
            avatar: savedProfile?.fotoUrl || savedProfile?.photoUrl || (user as any).avatar,
            fotoUrl: savedProfile?.fotoUrl || (user as any).fotoUrl
          };
          setCurrentUser(mergedUser);
          const ws = getActiveWorkspace();
          setActiveWorkspace(ws);
          setWorkspaces(getUserWorkspaces(user.userId));
          setNotifications(getNotifications());
        }

        if (uid) {
          obterPerfilDoFirestore(uid).then((fsProfile) => {
            if (fsProfile && (fsProfile.name || fsProfile.nome)) {
              const profileName = fsProfile.name || fsProfile.nome;
              const profileRole = fsProfile.roleTitle || fsProfile.cargo || fsProfile.role;
              setCurrentUser((prev: any) => prev ? { ...prev, name: profileName, role: profileRole || prev.role } : prev);
            }
          }).catch(() => {});
        }
      }
    }
  }, [firebaseUid, firebaseUser?.email, firebaseUser?.nome, firebaseUser?.displayName, firebaseUser?.role]);

  // Real-time listener for profile changes across components, custom events and storage
  useEffect(() => {
    const handleProfileUpdate = (e?: any) => {
      const profileData = e?.detail;
      setCurrentUser((prev: any) => {
        if (!prev) return prev;
        const uid = prev.userId || prev.id || firebaseUid || (prev.email ? prev.email.toLowerCase().trim() : '');
        const saved = profileData || (uid ? loadUserProfileMultiStore(uid) : null);
        if (!saved) return prev;
        return {
          ...prev,
          name: saved.name || prev.name,
          email: saved.email || prev.email,
          role: saved.roleTitle || saved.profile || prev.role,
          avatar: saved.fotoUrl || saved.photoUrl || saved.avatar || prev.avatar,
          fotoUrl: saved.fotoUrl || prev.fotoUrl
        };
      });
    };

    const handleOpenMobileSidebar = () => {
      setIsMobileOpen(true);
    };

    window.addEventListener('user_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('ga-open-mobile-sidebar', handleOpenMobileSidebar);
    return () => {
      window.removeEventListener('user_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('ga-open-mobile-sidebar', handleOpenMobileSidebar);
    };
  }, [firebaseUid]);

  // Update workspaces and notifications dynamically
  const refreshWorkspaceState = () => {
    const user = getCurrentUser();
    if (user) {
      const ws = getActiveWorkspace();
      setActiveWorkspace(ws);
      setWorkspaces(getUserWorkspaces(user.userId));
      setNotifications(getNotifications());
    }
  };

  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);

  const handleTrocarConta = async () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ga_user_logged_out', 'true');
    }
    await trocarDeConta();
  };

  // Multi-Device Session Management, Sync Engine & Preferences Real-Time Sync
  useEffect(() => {
    if (!currentUser?.userId) return;

    // Register active device session in Firestore
    registerDeviceSession(currentUser.userId);

    // Iniciar motor de sincronização offline e escuta entre abas
    const stopSync = iniciarSyncAutomatico(currentUser.userId);
    const stopMultiAba = ouvirOutrasAbas((eventData: any) => {
      console.log('[App Multi-Aba] Evento sincronizado de outra aba:', eventData);
      setRefreshCount(c => c + 1);
    });

    // Listen to device sessions in Firestore
    const currentDeviceId = getDeviceId();
    const unsubSessions = subscribeUserSessions(currentUser.userId, (sessions) => {
      const mySession = sessions?.find(s => s.id === currentDeviceId);
      if (mySession && mySession.active === false) {
        handleLogout("A sua sessão foi terminada remotamente a partir de outro dispositivo.");
      }
    });

    // Listen to real-time user preference updates across devices
    const unsubPrefs = subscribeUserPreferences(currentUser.userId, (data) => {
      if (data && data.updatedAt) {
        if (data.theme && data.theme !== localStorage.getItem('app_theme')) {
          localStorage.setItem('app_theme', data.theme);
          if (data.theme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
      }
    });

    return () => {
      unsubSessions();
      unsubPrefs();
      stopSync();
      stopMultiAba();
    };
  }, [currentUser?.userId]);

  // Real-Time Workspace Data Sync across multiple connected devices
  useEffect(() => {
    if (!activeWorkspace?.id) return;

    const unsubEntities = subscribeToFirestoreEntities(activeWorkspace.id, (remoteEntities) => {
      if (remoteEntities && remoteEntities.length > 0) {
        remoteEntities.forEach(e => {
          if (e && e.id) DB.setWorkspace(activeWorkspace.id, 'entities', e.id, e);
        });
        setRefreshCount(c => c + 1);
      }
    });

    const unsubTxs = subscribeToFirestoreTransactions(activeWorkspace.id, (remoteTransactions) => {
      if (remoteTransactions && remoteTransactions.length > 0) {
        remoteTransactions.forEach(t => {
          if (t && t.id) DB.setWorkspace(activeWorkspace.id, 'transactions', t.id, t);
        });
        setRefreshCount(c => c + 1);
      }
    });

    return () => {
      unsubEntities();
      unsubTxs();
    };
  }, [activeWorkspace?.id]);

  // Online / Offline tracking & Sync
  const [isAppOnline, setIsAppOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const wasOfflineRef = useRef<boolean>(false);
  const [isSyncingOfflineData, setIsSyncingOfflineData] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => {
    const pending = getPendingOfflineActions();
    const quizProgress = getQuizProgress();
    return pending.length + (quizProgress ? 1 : 0);
  });

  // Online restore non-intrusive toast state
  const [onlineRestoreToast, setOnlineRestoreToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    isSyncing: boolean;
    syncedCount?: number;
    success?: boolean;
  } | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSync = async (isNetworkReconnected: boolean = false) => {
    clearStaleCache();
    const pending = getPendingOfflineActions();
    const quizProgress = getQuizProgress();
    const count = pending.length + (quizProgress ? 1 : 0);
    setPendingSyncCount(count);

    if (count > 0) {
      setIsSyncingOfflineData(true);
      
      if (isNetworkReconnected) {
        setOnlineRestoreToast({
          show: true,
          title: 'Ligação à Internet Restaurada',
          message: `A sincronização pendente foi iniciada automaticamente (${count} registo${count > 1 ? 's' : ''} a sincronizar).`,
          isSyncing: true,
          syncedCount: count
        });
      }

      console.log(`[App] A iniciar sincronização automática de ${count} item(s) pendente(s)...`);
      const res = await syncOfflineDataWithServer();
      setIsSyncingOfflineData(false);
      
      const newPending = getPendingOfflineActions();
      const newQuiz = getQuizProgress();
      setPendingSyncCount(newPending.length + (newQuiz ? 1 : 0));

      if (res.success) {
        setSyncSuccess(true);
        if (isNetworkReconnected) {
          setOnlineRestoreToast({
            show: true,
            title: 'Sincronização Concluída',
            message: `${count} registo${count > 1 ? 's' : ''} sincronizado${count > 1 ? 's' : ''} com sucesso com a nuvem.`,
            isSyncing: false,
            success: true,
            syncedCount: count
          });
        }
        setTimeout(() => setSyncSuccess(false), 5000);
      } else {
        if (isNetworkReconnected) {
          setOnlineRestoreToast({
            show: true,
            title: 'Sincronização Parcial',
            message: 'Alguns registos permanecem em fila para tentativa posterior.',
            isSyncing: false,
            success: false
          });
        }
      }
    } else if (isNetworkReconnected) {
      setOnlineRestoreToast({
        show: true,
        title: 'Ligação à Internet Restaurada',
        message: 'O sistema está online e todas as alterações estão sincronizadas.',
        isSyncing: false,
        success: true
      });
    }

    if (isNetworkReconnected) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setOnlineRestoreToast(null);
      }, 5500);
    }
  };

  // Monitor pendingSyncCount changes and trigger autoSync with 2-second stability delay if online
  useEffect(() => {
    if (isAppOnline && pendingSyncCount > 0 && !isSyncingOfflineData) {
      const timer = setTimeout(() => {
        if (navigator.onLine) {
          triggerAutoSync(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingSyncCount, isAppOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsAppOnline(true);
      const pending = getPendingOfflineActions();
      const quizProgress = getQuizProgress();
      const count = pending.length + (quizProgress ? 1 : 0);
      setPendingSyncCount(count);

      // Immediately display non-intrusive restore notification with exact item count
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setOnlineRestoreToast({
        show: true,
        title: 'Ligação à Internet Restaurada',
        message: count > 0 
          ? `A sincronização pendente foi iniciada automaticamente (${count} registo${count > 1 ? 's' : ''} a sincronizar).`
          : 'O sistema está online e todas as alterações estão sincronizadas.',
        isSyncing: count > 0,
        syncedCount: count,
        success: count === 0
      });

      triggerAutoSync(true);
      wasOfflineRef.current = false;
    };

    const handleOffline = () => {
      setIsAppOnline(false);
      wasOfflineRef.current = true;
      setOnlineRestoreToast(null);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on load
    if (navigator.onLine) {
      triggerAutoSync(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  // Night Focus Mode state & document level class toggle
  const [nightFocusMode, setNightFocusMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ga_night_focus_mode');
      if (saved !== null) return saved === 'true';
      const user = getCurrentUser();
      return user?.preferences?.nightFocusMode ?? false;
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

  useEffect(() => {
    document.documentElement.classList.remove('night-theme-ocean', 'night-theme-forest', 'night-theme-twilight');
    if (nightFocusMode) {
      document.documentElement.classList.add('night-focus-mode');
      document.documentElement.classList.add(`night-theme-${nightFocusTheme}`);
    } else {
      document.documentElement.classList.remove('night-focus-mode');
    }
  }, [nightFocusMode, nightFocusTheme]);

  useEffect(() => {
    const handleNightFocusChange = (e: any) => {
      const active = e?.detail?.nightFocusMode ?? (localStorage.getItem('ga_night_focus_mode') === 'true');
      setNightFocusMode(active);
    };
    const handleNightThemeChange = (e: any) => {
      const theme = e?.detail?.theme || localStorage.getItem('ga_night_focus_theme') || 'ocean';
      setNightFocusTheme(theme);
    };
    window.addEventListener('night_focus_mode_changed', handleNightFocusChange);
    window.addEventListener('night_focus_theme_changed', handleNightThemeChange);
    return () => {
      window.removeEventListener('night_focus_mode_changed', handleNightFocusChange);
      window.removeEventListener('night_focus_theme_changed', handleNightThemeChange);
    };
  }, []);

  // Online status listener: auto-sync IndexedDB offline queue on connection restore
  useEffect(() => {
    const handleOnlineEvent = async () => {
      console.log("[App.tsx] Ligação à Internet restabelecida. A processar fila offline do IndexedDB...");
      try {
        const res = await processOfflineQueue();
        if (res.syncedCount > 0) {
          console.log(`[App.tsx] Sincronizados ${res.syncedCount} itens guardados offline.`);
        }
      } catch (err) {
        console.error("[App.tsx] Erro ao sincronizar acções offline:", err);
      }
    };

    window.addEventListener('online', handleOnlineEvent);
    return () => window.removeEventListener('online', handleOnlineEvent);
  }, []);

  const handleLogout = async (message?: string) => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ga_user_logged_out', 'true');
    }
    try {
      await sairConta();
    } catch (e) {
      console.warn("Erro ao terminar sessão do Firebase Auth:", e);
    }
    logout();
    setLogoutMessage(typeof message === 'string' ? message : "Sessão terminada com sucesso.");
    setCurrentUser(null);
    setActiveWorkspace(null);
  };

  // Keyboard shortcut listener for global search & tab navigation & shortcuts modal
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K (Search)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // Check if user is typing inside an input/textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || (e.target as HTMLElement)?.isContentEditable;

      // Shift + ? or ? (when not inside typing input)
      if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '?') || (e.key === '/' && e.shiftKey))) {
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
        return;
      }

      // Esc closes help modal
      if (e.key === 'Escape') {
        setIsShortcutsHelpOpen(false);
      }

      // Alt + 1..9, Alt+A, Alt+N tab navigation shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        const navMap: Record<string, string> = {
          '1': 'dashboard',
          '2': 'assistant',
          '3': 'learning',
          '4': 'quizzes',
          '5': 'accounting',
          'a': 'accounting',
          '6': 'notes',
          'n': 'notes',
          '7': 'rh',
          '8': 'exchange_rates'
        };
        if (navMap[key]) {
          e.preventDefault();
          setActiveTab(navMap[key]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCurrentLang(customEvent.detail.lang);
    };
    document.addEventListener('languageChanged', handleLangChange);
    return () => {
      document.removeEventListener('languageChanged', handleLangChange);
    };
  }, []);

  const [refreshCount, setRefreshCount] = useState(0);

  // Sync workspace-specific entities and transactions
  const entities = useMemo(() => {
    if (!activeWorkspace) return [];
    const list = DB.listWorkspace(activeWorkspace.id, 'entities');
    if (list.length === 0) {
      // Seed default corporate records for active workspace on first load
      INITIAL_ENTITIES.forEach(e => {
        DB.setWorkspace(activeWorkspace.id, 'entities', e.id, e);
      });
      return INITIAL_ENTITIES;
    }
    return list;
  }, [activeWorkspace, refreshCount]);

  const transactions = useMemo(() => {
    if (!activeWorkspace) return [];
    const list = DB.listWorkspace(activeWorkspace.id, 'transactions');
    if (list.length === 0) {
      // Seed default transactions for active workspace on first load
      INITIAL_TRANSACTIONS.forEach(t => {
        DB.setWorkspace(activeWorkspace.id, 'transactions', t.id, t);
      });
      return INITIAL_TRANSACTIONS;
    }
    return list;
  }, [activeWorkspace, refreshCount]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('assistente') || path.includes('assistant') || path.includes('ai_accountant') || hash.includes('assistant') || hash.includes('contador-ia')) {
        return 'assistant';
      }
      if (path.includes('estudos') || path.includes('learning') || hash.includes('learning') || hash.includes('estudos')) {
        return 'learning';
      }
      if (path.includes('quizzes') || hash.includes('quizzes')) {
        return 'quizzes';
      }
      if (path.includes('contabilidade') || path.includes('accounting') || hash.includes('accounting') || hash.includes('contabilidade')) {
        return 'accounting';
      }
      if (path.includes('notas') || path.includes('notes') || hash.includes('notes') || hash.includes('notas')) {
        return 'notes';
      }
      if (hash.includes('find-users')) {
        return 'find-users';
      }
      if (path.includes('perfil') || path.includes('profile') || hash.includes('profile')) {
        return 'profile';
      }
      if (path.includes('admin') || hash.includes('admin')) {
        return 'admin';
      }
    }
    return 'dashboard';
  });
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => {
    const initial = typeof window !== 'undefined' ? (
      window.location.pathname.toLowerCase().includes('estudos') ? 'learning' :
      window.location.pathname.toLowerCase().includes('quizzes') ? 'quizzes' :
      window.location.pathname.toLowerCase().includes('contabilidade') ? 'accounting' :
      window.location.pathname.toLowerCase().includes('assistente') ? 'assistant' : 'dashboard'
    ) : 'dashboard';
    return new Set([initial, 'dashboard']);
  });

  useEffect(() => {
    // Cancel pending API requests from the previous route
    cancelPendingRequests();

    // Track visited tabs
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });

    // Silently preload next 2-3 likely target routes via requestIdleCallback
    preloadNextLikelyRoutes(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (hash === '#/find-users' || hash === '#find-users') {
        setActiveTab('find-users');
      } else if (path.includes('assistente') || path.includes('assistant') || path.includes('ai_accountant') || hash === '#/assistant' || hash === '#assistant' || hash.includes('contador-ia')) {
        setActiveTab('assistant');
      } else if (path.includes('estudos') || path.includes('learning') || hash === '#/learning' || hash === '#learning' || hash.includes('estudos')) {
        setActiveTab('learning');
      } else if (path.includes('quizzes') || hash === '#/quizzes' || hash === '#quizzes') {
        setActiveTab('quizzes');
      } else if (path.includes('contabilidade') || path.includes('accounting') || hash === '#/accounting' || hash === '#accounting') {
        setActiveTab('accounting');
      } else if (path.includes('notas') || path.includes('notes') || hash === '#/notes' || hash === '#notes' || hash.includes('notas')) {
        setActiveTab('notes');
      } else if (path.includes('perfil') || path.includes('profile') || hash.includes('profile')) {
        setActiveTab('profile');
      } else if (path.includes('admin') || hash.includes('admin')) {
        setActiveTab('admin');
      }
    };
    handleLocationChange();
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);
  
  // Custom tax overrides saved by the user via the tax calculator
  const [taxOverrides, setTaxOverrides] = useState<Record<string, number>>({});

  // Navigation panel active state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Add Entity Form State
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false);
  const [newEntity, setNewEntity] = useState({
    name: '',
    region: 'North America',
    status: 'Active' as const,
    revenue: '',
    complianceScore: '95',
    currency: 'USD',
    taxId: ''
  });

  // Edit Entity State
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Add Transaction Form State
  const TX_DRAFT_KEY = 'ga_add_tx_form_draft';
  const defaultNewTx = {
    entityId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    account: '4000 - General Sales',
    type: 'Credit' as const,
    amount: '',
    currency: 'EUR',
    exchangeRate: '1.0',
    isCustomRate: false,
    status: 'Pending' as const
  };

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [newTx, setNewTx] = useState(() => {
    try {
      const savedDraft = localStorage.getItem(TX_DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          return { ...defaultNewTx, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Error loading transaction draft:", e);
    }
    return defaultNewTx;
  });

  // Auto-save form draft to localStorage as the user types
  useEffect(() => {
    try {
      localStorage.setItem(TX_DRAFT_KEY, JSON.stringify(newTx));
    } catch (e) {
      console.warn("Error saving transaction draft:", e);
    }
  }, [newTx]);

  // Display currency mode for reports & general ledger: 'original' vs 'reporting'
  const [displayCurrencyMode, setDisplayCurrencyMode] = useState<'original' | 'reporting'>('reporting');
  const [reportBaseCurrency, setReportBaseCurrency] = useState<string>('EUR');

  // Tax Calculator State
  const [selectedTaxEntityId, setSelectedTaxEntityId] = useState<string>('custom');
  
  // Update tax calculation selection on workspace sync
  useEffect(() => {
    if (entities && entities.length > 0) {
      setSelectedTaxEntityId(prev => {
        if (prev === 'custom') return prev;
        if (!entities.some(e => e.id === prev)) {
          return entities[0].id;
        }
        return prev;
      });
    }
  }, [entities?.length, activeWorkspace?.id]);

  const currentSelectedEntity = useMemo(() => {
    if (!entities || entities.length === 0) return null;
    if (selectedTaxEntityId !== 'custom') {
      const found = entities.find(e => e.id === selectedTaxEntityId);
      if (found) return found;
    }
    return entities[0] || null;
  }, [entities, selectedTaxEntityId]);

  const isSelectedEntityActive = useMemo(() => {
    if (!currentSelectedEntity) return false;
    return currentSelectedEntity.status === 'Active';
  }, [currentSelectedEntity]);

  const [taxCalcInputs, setTaxCalcInputs] = useState({
    revenue: '1000000',
    expenses: '350000',
    region: 'North America',
    nonDeductible: '25000'
  });
  const [taxResult, setTaxResult] = useState<any>(null);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: i18n.t('extra.welcomeMsg'),
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    setChatMessages(prev => prev.map(m => {
      if (m.id === 'welcome') {
        return { ...m, content: i18n.t('extra.welcomeMsg') };
      }
      return m;
    }));
  }, [currentLang]);

  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Dynamic Dashboard Statistics
  const activeEntitiesCount = useMemo(() => {
    return entities.filter(e => e.status === 'Active').length;
  }, [entities]);

  const pendingReconciliationsCount = useMemo(() => {
    return transactions.filter(t => t.status === 'Pending').length;
  }, [transactions]);

  const globalTaxLiability = useMemo(() => {
    return entities.reduce((sum, e) => {
      // If user saved a custom projection, use that. Otherwise compute default estimate based on regional rate.
      if (taxOverrides[e.id] !== undefined) {
        return sum + taxOverrides[e.id];
      }
      const rate = getRegionTaxRate(e.region);
      return sum + (e.revenue * rate * 0.7); // assume 70% taxable income ratio
    }, 0);
  }, [entities, taxOverrides]);

  const averageComplianceScore = useMemo(() => {
    if (entities.length === 0) return 0;
    const sum = entities.reduce((acc, e) => acc + e.complianceScore, 0);
    return Math.round((sum / entities.length) * 10) / 10;
  }, [entities]);

  // Handle entity actions
  const handleAddEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.name || !newEntity.taxId || !activeWorkspace) return;

    const added: LegalEntity = {
      id: String(Date.now()),
      name: newEntity.name,
      region: newEntity.region,
      status: newEntity.status,
      lastSync: 'Just now',
      revenue: parseFloat(newEntity.revenue) || 0,
      complianceScore: parseFloat(newEntity.complianceScore) || 95,
      currency: newEntity.currency,
      taxId: newEntity.taxId
    };

    DB.setWorkspace(activeWorkspace.id, 'entities', added.id, added);
    logAuditEvent('Entidade Registada', `Registou nova entidade legal "${added.name}" no workspace`, 'workspace');
    createNotification('workspace', 'Entidade Criada', `A entidade legal ${added.name} foi adicionada com sucesso.`);
    notifyDataChanged();
    setIsAddEntityOpen(false);
    
    // Reset form
    setNewEntity({
      name: '',
      region: 'North America',
      status: 'Active',
      revenue: '',
      complianceScore: '95',
      currency: 'USD',
      taxId: ''
    });
    setRefreshCount(c => c + 1);
  };

  const handleDeleteEntity = (id: string) => {
    if (!activeWorkspace) return;
    if (confirm('Are you sure you want to delete this legal entity? All associated ledger data remains historical.')) {
      DB.deleteWorkspace(activeWorkspace.id, 'entities', id);
      logAuditEvent('Entidade Eliminada', `Removeu entidade de ID ${id} do workspace`, 'workspace');
      createNotification('workspace', 'Entidade Removida', `Uma entidade foi eliminada do seu workspace corporativo.`);
      notifyDataChanged();
      if (selectedTaxEntityId === id) {
        setSelectedTaxEntityId('custom');
      }
      setRefreshCount(c => c + 1);
    }
  };

  // Handle transaction actions
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.entityId || !newTx.description || !newTx.amount || !activeWorkspace) return;

    const targetEntity = entities.find(ent => ent.id === newTx.entityId);
    if (!targetEntity) return;

    const amountNum = parseFloat(newTx.amount) || 0;
    const txCurrency = newTx.currency || targetEntity.currency || 'EUR';
    const rateNum = parseFloat(newTx.exchangeRate) || 1.0;

    // Calculate base amount converted to EUR
    const baseAmountEur = convertCurrency(amountNum, txCurrency, 'EUR');

    const added: Transaction = {
      id: 't_' + Date.now(),
      entityId: newTx.entityId,
      entityName: targetEntity.name,
      date: newTx.date,
      description: newTx.description,
      account: newTx.account,
      type: newTx.type,
      amount: amountNum,
      currency: txCurrency,
      exchangeRate: rateNum,
      baseAmount: baseAmountEur,
      status: newTx.status
    };

    // Update entity revenue dynamically if it is Credit (Inflow)
    if (newTx.type === 'Credit') {
      // Convert transaction amount to entity's native currency
      const entityAmount = convertCurrency(amountNum, txCurrency, targetEntity.currency);
      const updatedEntity = {
        ...targetEntity,
        revenue: targetEntity.revenue + entityAmount,
        lastSync: 'Just now'
      };
      DB.setWorkspace(activeWorkspace.id, 'entities', targetEntity.id, updatedEntity);
    }

    DB.setWorkspace(activeWorkspace.id, 'transactions', added.id, added);
    logAuditEvent('Lançamento Contabilístico', `Registou lançamento de ${added.type} no valor de ${added.amount} ${added.currency}`, 'workspace');
    createNotification('workspace', 'Novo Lançamento Multimoeda', `Transação registada: ${added.description} (${added.currency} ${added.amount.toLocaleString()})`);
    notifyDataChanged();
    setIsAddTxOpen(false);
    
    // Reset form and remove draft from localStorage
    setNewTx(defaultNewTx);
    try {
      localStorage.removeItem(TX_DRAFT_KEY);
    } catch (e) {
      console.warn("Error clearing tx draft:", e);
    }
    setRefreshCount(c => c + 1);
  };

  const handleReconcileTransaction = (txId: string) => {
    if (!activeWorkspace) return;
    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      const updated = { ...tx, status: 'Reconciled' as const };
      DB.setWorkspace(activeWorkspace.id, 'transactions', txId, updated);
      logAuditEvent('Conciliação Registada', `Reconciliou o lançamento "${tx.description}"`, 'workspace');
      createNotification('compliance', 'Lançamento Conciliado', `O lançamento "${tx.description}" foi reconciliado com sucesso.`);
      setRefreshCount(c => c + 1);
    }
  };

  // Perform tax calculation based on input or selected entity
  const handleRunTaxCalculation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    let rev = 0;
    let exp = 0;
    let reg = 'North America';
    let nonDed = 0;
    let entityName = 'Custom Sandbox';

    if (selectedTaxEntityId === 'custom') {
      rev = parseFloat(taxCalcInputs.revenue) || 0;
      exp = parseFloat(taxCalcInputs.expenses) || 0;
      reg = taxCalcInputs.region;
      nonDed = parseFloat(taxCalcInputs.nonDeductible) || 0;
    } else {
      const ent = entities.find(e => e.id === selectedTaxEntityId);
      if (ent) {
        rev = ent.revenue;
        // Mock expense as 40% of revenue for standard entities
        exp = Math.round(ent.revenue * 0.45);
        reg = ent.region;
        nonDed = Math.round(ent.revenue * 0.03);
        entityName = ent.name;
      }
    }

    const taxableIncome = Math.max(0, rev - exp + nonDed);
    const nominalRate = getRegionTaxRate(reg);
    
    // Complex region tax rules mapping
    let computedTax = 0;
    let detailedSteps: string[] = [];

    if (reg === 'North America') {
      // US style: 21% Federal, 8.7% State (Delaware) assuming state tax is deductible for federal
      const stateTax = taxableIncome * 0.087;
      const federalTaxable = Math.max(0, taxableIncome - stateTax);
      const federalTax = federalTaxable * 0.21;
      computedTax = stateTax + federalTax;
      detailedSteps = [
        `Base Taxable Income: $${taxableIncome.toLocaleString()}`,
        `State Corporate Income Tax (e.g. Delaware at 8.7%): $${stateTax.toLocaleString()}`,
        `Federal Deductibility adjustment: -$${stateTax.toLocaleString()}`,
        `Adjusted Federal Taxable Income: $${federalTaxable.toLocaleString()}`,
        `Federal Corporate Income Tax (at 21%): $${federalTax.toLocaleString()}`,
        `Total Estimated Tax: $${computedTax.toLocaleString()}`
      ];
    } else if (reg === 'Europe (DACH)') {
      // German style: Corp tax 15% + Solidarity 5.5% on Corp tax + Trade tax ~14%
      const corpTax = taxableIncome * 0.15;
      const solidaritySurcharge = corpTax * 0.055;
      const tradeTax = taxableIncome * 0.14;
      computedTax = corpTax + solidaritySurcharge + tradeTax;
      detailedSteps = [
        `Base Taxable Income: €${taxableIncome.toLocaleString()}`,
        `German Corporate Tax (Körperschaftsteuer at 15.0%): €${corpTax.toLocaleString()}`,
        `Solidarity Surcharge (Solidaritätszuschlag at 5.5% of Corp tax): €${solidaritySurcharge.toLocaleString()}`,
        `Local Trade Tax (Gewerbesteuer at approx 14.0%): €${tradeTax.toLocaleString()}`,
        `Total German Corporate Tax Burden (effective ~29.8%): €${computedTax.toLocaleString()}`
      ];
    } else if (reg === 'Asia Pacific') {
      // Singapore style: 17% with start-up exemptions (partial)
      // First 100k: 75% exempt. Next 100k: 50% exempt. Balance taxed at 17%
      const firstSlabExempt = Math.min(taxableIncome, 100000) * 0.75;
      const secondSlabExempt = Math.max(0, Math.min(taxableIncome - 100000, 100000)) * 0.50;
      const totalExemption = firstSlabExempt + secondSlabExempt;
      const SGtaxable = Math.max(0, taxableIncome - totalExemption);
      computedTax = SGtaxable * 0.17;
      detailedSteps = [
        `Base Taxable Income: S$${taxableIncome.toLocaleString()}`,
        `Slab 1 exemption (75% of first S$100,000): -S$${firstSlabExempt.toLocaleString()}`,
        `Slab 2 exemption (50% of next S$100,000): -S$${secondSlabExempt.toLocaleString()}`,
        `Total Partial Exemption Benefit: -S$${totalExemption.toLocaleString()}`,
        `Effective Taxable Income: S$${SGtaxable.toLocaleString()}`,
        `Singapore Corporate Tax (at 17%): S$${computedTax.toLocaleString()}`
      ];
    } else if (reg === 'Latin America') {
      // Brazil style: IRPJ (15% + 10% on profit exceeding 240k/yr) + CSLL (9%) = 34%
      const baseIRPJ = taxableIncome * 0.15;
      const surchargeIRPJ = taxableIncome > 240000 ? (taxableIncome - 240000) * 0.10 : 0;
      const csllTax = taxableIncome * 0.09;
      computedTax = baseIRPJ + surchargeIRPJ + csllTax;
      detailedSteps = [
        `Base Taxable Income: R$${taxableIncome.toLocaleString()}`,
        `Standard Corporate Tax (IRPJ at 15.0%): R$${baseIRPJ.toLocaleString()}`,
        `Additional IRPJ Surcharge (10% on profits exceeding R$240,000): R$${surchargeIRPJ.toLocaleString()}`,
        `Social Contribution on Net Profit (CSLL at 9.0%): R$${csllTax.toLocaleString()}`,
        `Total Combined Brazilian Corporate Tax Burden (~34%): R$${computedTax.toLocaleString()}`
      ];
    } else {
      computedTax = taxableIncome * nominalRate;
      detailedSteps = [
        `Base Taxable Income: $${taxableIncome.toLocaleString()}`,
        `Nominal Corporate Rate (${(nominalRate * 100).toFixed(1)}%): $${computedTax.toLocaleString()}`,
        `Estimated Corporate Liability: $${computedTax.toLocaleString()}`
      ];
    }

    const effectiveRate = taxableIncome > 0 ? (computedTax / taxableIncome) * 100 : 0;
    const netMargin = rev > 0 ? ((rev - exp - computedTax) / rev) * 100 : 0;

    setTaxResult({
      entityId: selectedTaxEntityId,
      entityName,
      revenue: rev,
      expenses: exp,
      nonDeductible: nonDed,
      taxableIncome,
      computedTax,
      effectiveRate,
      netMargin,
      steps: detailedSteps,
      region: reg
    });
  };

  const handleApplyTaxProjection = () => {
    if (!taxResult || taxResult.entityId === 'custom') return;
    setTaxOverrides({
      ...taxOverrides,
      [taxResult.entityId]: taxResult.computedTax
    });
    logAuditEvent('Simulação Fiscal Aplicada', `Aplicou provisão fiscal calculada de $${taxResult.computedTax.toLocaleString()} para ${taxResult.entityName}`, 'workspace');
    createNotification('compliance', 'Simulação Aplicada', `A provisão estimada de $${taxResult.computedTax.toLocaleString()} foi aplicada com sucesso.`);
    alert(`Successfully applied estimated tax projection of $${taxResult.computedTax.toLocaleString()} to ${taxResult.entityName}'s global tax liability.`);
  };

  // AI Consultant API message sending
  const handleSendPrompt = async (presetText?: string) => {
    const promptToSend = presetText || currentPrompt;
    if (!promptToSend.trim() || isAiLoading) return;

    // Create unique user message ID
    const userMsgId = 'msg_' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: promptToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!presetText) setCurrentPrompt('');
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: promptToSend,
          history: chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          language: i18n.currentLang
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        let errMessage = 'Server returned error response';
        if (contentType.includes('application/json')) {
          try {
            const errJson = await response.json();
            if (errJson.error) errMessage = errJson.error;
          } catch (_) {}
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      
      const assistantMsg: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: data.text || "I was unable to formulate a response. Please check your setup.",
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: currentLang.startsWith('pt') 
          ? '⚠️ Não foi possível contactar o serviço de IA autónomo neste momento. Tenta novamente em alguns instantes; não é necessário configurar uma chave Google no dispositivo.' 
          : '⚠️ The autonomous AI service is temporarily unavailable. Please try again shortly; no Google key is required on your device.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Filtered lists
  const filteredEntities = useMemo(() => {
    return entities.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            e.taxId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = regionFilter === 'All' || e.region === regionFilter;
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [entities, searchQuery, regionFilter, statusFilter]);

  // Unique lists of regions/status for filters
  const regionOptions = useMemo(() => {
    const set = new Set(entities.map(e => e.region));
    return ['All', ...Array.from(set)];
  }, [entities]);

  // Bar chart calculations for Entity revenues
  const maxRevenue = useMemo(() => {
    if (entities.length === 0) return 100000;
    return Math.max(...entities.map(e => e.revenue));
  }, [entities]);

  if (!currentUser) {
    return (
      <motion.div
        key="app-login-view"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full min-h-[100dvh] relative z-10 pointer-events-auto select-auto"
        style={{ pointerEvents: 'auto', touchAction: 'pan-y' }}
      >
        <Suspense fallback={<PageSkeleton />}>
          <LoginPage />
        </Suspense>
      </motion.div>
    );
  }

  return (
    <motion.div 
      key="app-main-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-[100dvh] min-h-0 w-full max-w-full font-sans text-slate-100 overflow-hidden relative" 
      style={{
        background: 'var(--app-bg-gradient)',
        backgroundImage: 'var(--app-bg-pattern)'
      }}
      id="app-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative Halo 1: Blue in top-left */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: '-10%',
          left: '-10%',
          width: '560px',
          height: '560px',
          borderRadius: '50%',
          background: 'var(--halo-primary-color, rgba(74, 144, 226, 0.15))',
          filter: 'blur(80px)',
          zIndex: 0,
          display: 'var(--halo-display, block)'
        }}
        aria-hidden="true"
      />

      {/* Decorative Halo 2: Violet in bottom-right */}
      <div 
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%',
          right: '-10%',
          width: '560px',
          height: '560px',
          borderRadius: '50%',
          background: 'var(--halo-secondary-color, rgba(139, 92, 246, 0.12))',
          filter: 'blur(80px)',
          zIndex: 0,
          display: 'var(--halo-display, block)'
        }}
        aria-hidden="true"
      />
      
      {/* Edge Hover Sensor for Desktop (Left 20px edge) */}
      <div 
        className="hidden md:block fixed left-0 top-0 bottom-0 w-5 z-30" 
        onMouseEnter={() => setIsSidebarHovered(true)}
      />

      {/* MOBILE DRAWER BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div 
          className="mobile-menu-overlay md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1050] animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* MOBILE OFF-CANVAS SIDEBAR (<768px) */}
      <aside 
        className={`mobile-menu-drawer md:hidden fixed inset-y-0 left-0 z-[1051] w-72 bg-slate-900 dark:bg-[var(--bg-sidebar)] flex flex-col text-slate-300 shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        id="sidebar-panel-mobile"
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-800 h-16 shrink-0">
          <AppLogo isExpanded={true} />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileOpen(false); }}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="mr-3 w-5 h-5 shrink-0" />
            {i18n.t('nav.dashboard')}
          </button>

          <button 
            onClick={() => { setActiveTab('notes'); setIsMobileOpen(false); }}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'notes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <StickyNote className="mr-3 w-5 h-5 shrink-0" />
            Notas
            <span className="ml-auto bg-blue-500/20 text-blue-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              LOCAL
            </span>
          </button>

          <button 
            onClick={() => { setActiveTab('assistant'); setIsMobileOpen(false); }}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'assistant' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Bot className="mr-3 w-5 h-5 shrink-0" />
            {i18n.t('nav.aiAccountant')}
            <span className="ml-auto bg-blue-500/20 text-blue-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              {i18n.t('extra.active')}
            </span>
          </button>

          <button 
            onClick={() => { setActiveTab('accounting'); setIsMobileOpen(false); }}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'accounting' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="mr-3 w-5 h-5 shrink-0 flex items-center justify-center">
              <AccountingLogo size={20} showGlow={activeTab === 'accounting'} />
            </div>
            Contabilidade
            <span className="ml-auto bg-blue-500/20 text-blue-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              PGC
            </span>
          </button>

          <button 
            onClick={() => { setActiveTab('learning'); setIsMobileOpen(false); }}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'learning' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="mr-3 w-5 h-5 shrink-0" />
            Aprendizados
            <span className="ml-auto bg-blue-500/15 text-blue-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              IA
            </span>
          </button>

          <button 
            onClick={() => { setActiveTab('quizzes'); setIsMobileOpen(false); }}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'quizzes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <GraduationCap className="mr-3 w-5 h-5 shrink-0 text-amber-400" />
            Quizzes & Avaliações
            <span className="ml-auto bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              NOVO
            </span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={() => { setIsLogoutModalOpen(true); setIsMobileOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-xl border border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* DESKTOP & TABLET RETRACTABLE SIDEBAR (>=768px) */}
      <aside 
        id="sidebar-panel-desktop"
        tabIndex={0}
        aria-label="Painel de Navegação Lateral"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        data-expanded={isSidebarExpanded}
        className={`hidden md:flex bg-slate-900/95 dark:bg-[var(--bg-sidebar)] backdrop-blur-md rounded-r-2xl flex-col shrink-0 text-slate-300 ${
          isResizingSidebar ? 'transition-none select-none cursor-col-resize' : 'transition-all duration-300 ease-in-out'
        } relative z-40 border-r border-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 hover:scale-[1.02] focus-within:scale-[1.02] hover:[filter:brightness(1.05)] focus-within:[filter:brightness(1.05)] origin-left ${
          isSidebarPulse ? 'ring-2 ring-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse' : ''
        } ${
          isSidebarExpanded ? '' : 'w-16'
        }`}
        style={{
          width: isSidebarExpanded ? `${sidebarWidth}px` : undefined,
          backdropFilter: `blur(${Math.round(8 + scrollRatio * 16)}px) saturate(${Math.round(140 + scrollRatio * 60)}%)`,
          WebkitBackdropFilter: `blur(${Math.round(8 + scrollRatio * 16)}px) saturate(${Math.round(140 + scrollRatio * 60)}%)`,
        }}
      >
        {/* Hidden Resizable Drag Handle & Live Width Indicator */}
        {isSidebarExpanded && (
          <div
            onMouseDown={handleSidebarResizeStart}
            className={`absolute top-0 right-0 w-2.5 h-full cursor-col-resize z-50 group/resize transition-colors ${
              isResizingSidebar ? 'bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'hover:bg-blue-500/50'
            }`}
            title="Arrastar para redimensionar largura da barra lateral (guardado no browser)"
            aria-label="Redimensionar largura da barra lateral"
          >
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-10 w-1 bg-slate-600/60 group-hover/resize:bg-blue-300 rounded-full opacity-0 group-hover/resize:opacity-100 transition-opacity"></div>
            {/* Live Width Indicator during dragging */}
            {isResizingSidebar && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-mono font-bold rounded-xl shadow-2xl z-50 pointer-events-none flex items-center gap-1.5 border border-blue-400 animate-in fade-in">
                <span>Largura:</span>
                <span className="text-amber-300 font-extrabold">{sidebarWidth}px</span>
              </div>
            )}
          </div>
        )}

        {/* App Branding & Pin Button */}
        <div className="p-3 flex items-center justify-between border-b border-slate-800 h-16 shrink-0 overflow-hidden min-h-[64px]">
          <div 
            onClick={toggleSidebarPin}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                toggleSidebarPin();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Alternar fixação da barra lateral"
            title="Clique no logotipo para alternar expansão da barra lateral"
            className="flex items-center min-w-0 flex-1 cursor-pointer group/logo hover:opacity-90 active:scale-98 transition-all p-1 -ml-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <AppLogo isExpanded={isSidebarExpanded} />
          </div>
          {isSidebarExpanded && (
            <div className="relative group/pin shrink-0 ml-1 flex items-center justify-center my-auto">
              <button
                id="sidebar-pin-btn"
                onClick={toggleSidebarPin}
                data-pinned={isSidebarPinned}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    toggleSidebarPin();
                  }
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 text-slate-300 hover:text-white hover:bg-slate-800/90 rounded-xl transition-all duration-200 ease-out cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                title={isSidebarPinned ? "Desafixar barra lateral (auto-retrair ao afastar o cursor)" : "Fixar barra lateral sempre expandida (mantém o painel visível)"}
                aria-label={isSidebarPinned ? "Desafixar barra lateral (auto-retrair)" : "Fixar barra lateral (sempre visível)"}
              >
                {isSidebarPinned ? (
                  <PinOff className="w-4.5 h-4.5 text-blue-400" />
                ) : (
                  <Pin className="w-4.5 h-4.5 text-slate-300" />
                )}
              </button>
              {/* Tooltip explaining functionality on hover */}
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover/pin:flex items-center gap-1.5 bg-slate-900 border border-slate-700/90 text-slate-100 text-[11px] font-medium py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none transition-all">
                <span>{isSidebarPinned ? "Desafixar barra lateral (auto-retrair)" : "Fixar barra lateral (sempre visível)"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav 
          className={`flex-1 px-2.5 py-6 space-y-1.5 ${isSidebarExpanded ? 'overflow-y-auto overflow-x-hidden' : 'overflow-visible'}`} 
          id="sidebar-nav"
          data-entity-active={isSelectedEntityActive}
          data-syncing={isSyncing || refreshCount % 2 === 1}
          onKeyDown={handleSidebarKeyDown}
          tabIndex={0}
          role="navigation"
          aria-label="Navegação Principal"
        >
          {/* Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.22, delay: 0.02, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative group"
          >
            <button 
              id="nav-btn-dashboard"
              onClick={() => handleNavClick('dashboard')}
              aria-label={i18n.t('nav.dashboard')}
              data-active={activeTab === 'dashboard'}
              className={`w-full flex items-center ${isSidebarExpanded ? 'px-3.5 py-2.5 justify-start' : 'p-2.5 justify-center relative'} text-sm font-medium rounded-xl transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-md hover:shadow-black/20 ${
                activeTab === 'dashboard' 
                  ? 'text-white shadow-md shadow-blue-600/20 active border-l-4 border-l-blue-300 scale-[1.01]' 
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border-l-4 border-l-transparent'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 text-slate-300 group-hover:text-blue-300 ${isSidebarExpanded ? 'mr-3' : ''}`} />
              {isSidebarExpanded ? (
                <div className="w-full flex items-center justify-between min-w-0">
                  <span className="truncate text-slate-200 group-hover:text-white font-medium">{i18n.t('nav.dashboard')}</span>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/80 font-semibold">
                      Alt+1
                    </span>
                    {isSelectedEntityActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0 ml-1" title="Entidade Ativa" />
                    )}
                  </div>
                </div>
              ) : null}
            </button>
            {!isSidebarExpanded && (
              <div 
                role="tooltip"
                className="sidebar-tooltip pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700/90 text-white text-xs font-semibold rounded-xl shadow-2xl shadow-black/80 whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50 flex items-center gap-2"
              >
                <span>{i18n.t('nav.dashboard')}</span>
                <span className="text-[10px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Alt+1</span>
                {isSelectedEntityActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" title="Entidade Ativa" />
                )}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/90 rotate-45"></div>
              </div>
            )}
          </motion.div>

          {/* Yohan AI Suite */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.22, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative group"
          >
            <button 
              id="nav-btn-assistant"
              onClick={() => handleNavClick('assistant')}
              aria-label={i18n.t('nav.aiAccountant')}
              data-active={activeTab === 'assistant'}
              className={`w-full flex items-center ${isSidebarExpanded ? 'px-3.5 py-2.5 justify-start' : 'p-2.5 justify-center relative'} text-sm font-medium rounded-xl transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-md hover:shadow-black/20 ${
                activeTab === 'assistant' 
                  ? 'text-white shadow-md shadow-indigo-600/20 active border-l-4 border-l-indigo-400 scale-[1.01]' 
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border-l-4 border-l-transparent'
              }`}
            >
              <div className={`shrink-0 ${isSidebarExpanded ? 'mr-3' : ''}`}>
                <YohanLogo size={18} showGlow={activeTab === 'assistant'} />
              </div>
              {isSidebarExpanded ? (
                <div className="w-full flex items-center justify-between min-w-0">
                  <span className="truncate text-slate-200 group-hover:text-white font-medium">{i18n.t('nav.aiAccountant')}</span>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/80 font-semibold">
                      Alt+2
                    </span>
                    <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                      {i18n.t('extra.active')}
                    </span>
                    {isSelectedEntityActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0 ml-1" title="Entidade Ativa" />
                    )}
                  </div>
                </div>
              ) : null}
            </button>
            {!isSidebarExpanded && (
              <div 
                role="tooltip"
                className="sidebar-tooltip pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700/90 text-white text-xs font-semibold rounded-xl shadow-2xl shadow-black/80 whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50 flex items-center gap-2"
              >
                <span>{i18n.t('nav.aiAccountant')}</span>
                <span className="text-[10px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Alt+2</span>
                <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                  {i18n.t('extra.active')}
                </span>
                {isSelectedEntityActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" title="Entidade Ativa" />
                )}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/90 rotate-45"></div>
              </div>
            )}
          </motion.div>

          {/* Contabilidade (PGC - Lançamentos & Balancete) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.22, delay: 0.065, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative group"
          >
            <button 
              id="nav-btn-accounting"
              onClick={() => handleNavClick('accounting')}
              aria-label="Contabilidade"
              data-active={activeTab === 'accounting'}
              className={`w-full flex items-center ${isSidebarExpanded ? 'px-3.5 py-2.5 justify-start' : 'p-2.5 justify-center relative'} text-sm font-medium rounded-xl transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-md hover:shadow-black/20 ${
                activeTab === 'accounting' 
                  ? 'text-white shadow-md shadow-blue-600/20 active border-l-4 border-l-blue-300 scale-[1.01]' 
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border-l-4 border-l-transparent'
              }`}
            >
              <div className={`shrink-0 flex items-center justify-center ${isSidebarExpanded ? 'mr-3' : ''}`}>
                <AccountingLogo size={18} showGlow={activeTab === 'accounting'} />
              </div>
              {isSidebarExpanded ? (
                <div className="w-full flex items-center justify-between min-w-0">
                  <span className="truncate text-slate-200 group-hover:text-white font-medium">Contabilidade</span>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/80 font-semibold" title="Atalho: Alt+A ou Alt+5">
                      Alt+A
                    </span>
                    <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                      PGC
                    </span>
                    {isSelectedEntityActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0 ml-1" title="Entidade Ativa" />
                    )}
                  </div>
                </div>
              ) : null}
            </button>
            {!isSidebarExpanded && (
              <div 
                role="tooltip"
                className="sidebar-tooltip pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700/90 text-white text-xs font-semibold rounded-xl shadow-2xl shadow-black/80 whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50 flex items-center gap-2"
              >
                <span>Contabilidade</span>
                <span className="text-[10px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Alt+A</span>
                <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                  PGC
                </span>
                {isSelectedEntityActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" title="Entidade Ativa" />
                )}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/90 rotate-45"></div>
              </div>
            )}
          </motion.div>

          {/* Aprendizados */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.22, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative group"
          >
            <button 
              id="nav-btn-learnings"
              onClick={() => handleNavClick('learning')}
              aria-label="Aprendizados"
              data-active={activeTab === 'learning'}
              className={`w-full flex items-center ${isSidebarExpanded ? 'px-3.5 py-2.5 justify-start' : 'p-2.5 justify-center relative'} text-sm font-medium rounded-xl transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-md hover:shadow-black/20 ${
                activeTab === 'learning' 
                  ? 'text-white shadow-md shadow-blue-600/20 active border-l-4 border-l-blue-300 scale-[1.01]' 
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border-l-4 border-l-transparent'
              }`}
            >
              <BookOpen className={`w-4 h-4 shrink-0 text-slate-300 group-hover:text-blue-300 ${isSidebarExpanded ? 'mr-3' : ''}`} />
              {isSidebarExpanded ? (
                <div className="w-full flex items-center justify-between min-w-0">
                  <span className="truncate text-slate-200 group-hover:text-white font-medium">Aprendizados</span>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/80 font-semibold">
                      Alt+3
                    </span>
                    <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                      IA
                    </span>
                    {isSelectedEntityActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0 ml-1" title="Entidade Ativa" />
                    )}
                  </div>
                </div>
              ) : null}
            </button>
            {!isSidebarExpanded && (
              <div 
                role="tooltip"
                className="sidebar-tooltip pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700/90 text-white text-xs font-semibold rounded-xl shadow-2xl shadow-black/80 whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50 flex items-center gap-2"
              >
                <span>Aprendizados</span>
                <span className="text-[10px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Alt+3</span>
                <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                  IA
                </span>
                {isSelectedEntityActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" title="Entidade Ativa" />
                )}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/90 rotate-45"></div>
              </div>
            )}
          </motion.div>

          {/* Quizzes & Avaliações */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.22, delay: 0.11, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative group"
          >
            <button 
              id="nav-btn-quizzes"
              onClick={() => handleNavClick('quizzes')}
              aria-label="Quizzes & Avaliações"
              data-active={activeTab === 'quizzes'}
              className={`w-full flex items-center ${isSidebarExpanded ? 'px-3.5 py-2.5 justify-start' : 'p-2.5 justify-center relative'} text-sm font-medium rounded-xl transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-md hover:shadow-black/20 ${
                activeTab === 'quizzes' 
                  ? 'text-white shadow-md shadow-indigo-600/20 active border-l-4 border-l-amber-400 scale-[1.01]' 
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border-l-4 border-l-transparent'
              }`}
            >
              <GraduationCap className={`w-4 h-4 shrink-0 text-amber-400 ${isSidebarExpanded ? 'mr-3' : ''}`} />
              {isSidebarExpanded ? (
                <div className="w-full flex items-center justify-between min-w-0">
                  <span className="truncate text-slate-200 group-hover:text-white font-medium">Quizzes & Avaliações</span>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/80 font-semibold">
                      Alt+4
                    </span>
                    <span className="bg-amber-500/25 text-amber-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-amber-400/30">
                      NOVO
                    </span>
                  </div>
                </div>
              ) : null}
            </button>
            {!isSidebarExpanded && (
              <div 
                role="tooltip"
                className="sidebar-tooltip pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700/90 text-white text-xs font-semibold rounded-xl shadow-2xl shadow-black/80 whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50 flex items-center gap-2"
              >
                <span>Quizzes & Avaliações</span>
                <span className="text-[10px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Alt+4</span>
                <span className="bg-amber-500/25 text-amber-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-amber-400/30">
                  NOVO
                </span>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/90 rotate-45"></div>
              </div>
            )}
          </motion.div>

          {/* Notas & Caderno */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.22, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative group"
          >
            <button 
              id="nav-btn-notes"
              onClick={() => handleNavClick('notes')}
              aria-label="Notas e Caderno"
              data-active={activeTab === 'notes'}
              className={`w-full flex items-center ${isSidebarExpanded ? 'px-3.5 py-2.5 justify-start' : 'p-2.5 justify-center relative'} text-sm font-medium rounded-xl transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-md hover:shadow-black/20 ${
                activeTab === 'notes' 
                  ? 'text-white shadow-md shadow-blue-600/20 active border-l-4 border-l-blue-300 scale-[1.01]' 
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border-l-4 border-l-transparent'
              }`}
            >
              <StickyNote className={`w-4 h-4 shrink-0 text-slate-300 group-hover:text-blue-300 ${isSidebarExpanded ? 'mr-3' : ''}`} />
              {isSidebarExpanded ? (
                <div className="w-full flex items-center justify-between min-w-0">
                  <span className="truncate text-slate-200 group-hover:text-white font-medium">Notas</span>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/80 font-semibold" title="Atalho: Alt+N ou Alt+6">
                      Alt+N
                    </span>
                    <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                      NOTAS
                    </span>
                  </div>
                </div>
              ) : null}
            </button>
            {!isSidebarExpanded && (
              <div 
                role="tooltip"
                className="sidebar-tooltip pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700/90 text-white text-xs font-semibold rounded-xl shadow-2xl shadow-black/80 whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50 flex items-center gap-2"
              >
                <span>Notas</span>
                <span className="text-[10px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Alt+N</span>
                <span className="bg-blue-500/25 text-blue-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                  NOTAS
                </span>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/90 rotate-45"></div>
              </div>
            )}
          </motion.div>
        </nav>

        {/* Keyboard Shortcut Discovery Badge when expanded */}
        {isSidebarExpanded && (
          <div className="mx-2.5 mb-2 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between text-[11px] text-slate-200 font-medium">
            <span className="font-semibold text-slate-300">Atalhos:</span>
            <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-blue-300 font-bold">
              Alt+1..9
            </span>
          </div>
        )}

        {/* Account Plan Info & Logout */}
        <div className="p-3 border-t border-slate-800 shrink-0" id="sidebar-footer">
          {isSidebarExpanded ? (
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold rounded-xl border border-red-500/30 transition-all cursor-pointer mb-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Terminar Sessão</span>
            </button>
          ) : (
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full flex items-center justify-center p-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-xl border border-red-500/30 transition-all cursor-pointer relative group mb-2"
              title={undefined}
            >
              <LogOut className="w-4 h-4" />
              <div className="absolute left-full ml-3.5 px-3 py-1.5 bg-slate-900 border border-slate-700/80 text-red-300 text-xs font-semibold rounded-lg shadow-xl shadow-black/60 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 delay-200 z-50 translate-x-1 group-hover:translate-x-0 flex items-center gap-1.5">
                <span>Terminar Sessão</span>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/80 rotate-45"></div>
              </div>
            </button>
          )}

          {/* Chevron expand/collapse toggle indicator at bottom of sidebar */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <button
              id="sidebar-bottom-chevron-btn"
              onClick={toggleSidebarPin}
              className="w-full flex items-center justify-between p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer group"
              title={isSidebarPinned ? "Desafixar barra lateral" : "Fixar barra lateral expandida"}
            >
              {isSidebarExpanded && (
                <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white truncate">
                  {isSidebarPinned ? 'Barra Lateral Fixada' : 'Modo Expansível'}
                </span>
              )}
              <ChevronRight 
                className={`w-4 h-4 shrink-0 transition-transform duration-300 text-slate-300 group-hover:text-blue-300 ${
                  isSidebarExpanded ? 'rotate-180' : 'rotate-0'
                }`} 
              />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <main 
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden w-full max-w-full" 
        id="main-content-panel"
      >

        {/* UPPER HEADER - FIXED & PERMANENT ON DESKTOP & TABLET (>=768px) - HIDDEN COMPLETELY ON MOBILE (<768px) */}
        <header 
          className="topbar hidden md:flex h-16 shrink-0 z-[999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 lg:px-6 items-center justify-between gap-2 sm:gap-4 select-none" 
          style={{ zIndex: 999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          id="header-panel"
        >
          
          {/* LEFT GROUP: NAVIGATION & ACTIVE WORKSPACE TITLE */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            {/* Mobile Hamburger Toggle (Min 44x44px touch area) */}
            <button
              id="btn-open-mobile-navigation"
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="mobile-header-action md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0 -ml-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Abrir Menu de Navegação"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Active Workspace / Page Title */}
            <span className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm tracking-tight truncate max-w-[150px] sm:max-w-[200px] lg:max-w-xs sm:text-left text-center">
              {activeTab === 'dashboard' && 'Painel Principal'}
              {activeTab === 'notes' && 'Notas'}
              {activeTab === 'accounting' && 'Contabilidade & Razão'}
              {activeTab === 'assistant' && 'AI Assistant'}
              {activeTab === 'learning' && 'Estudos & Módulos'}
              {activeTab === 'quizzes' && 'Quizzes & Avaliações'}
              {activeTab === 'profile' && 'O Meu Perfil'}
              {activeTab === 'admin' && 'Painel Admin'}
            </span>

            {/* Sync Status Indicator (Full on Desktop >1200px, Dot on Tablet, Hidden on Mobile <640px) */}
            <div className="hidden xl:block shrink-0">
              <SyncBanner 
                onOpenModal={() => setIsOfflineModalOpen(true)} 
                onOpenFirestoreModal={() => setIsFirestoreModalOpen(true)} 
              />
            </div>
            <div className="hidden sm:block xl:hidden shrink-0">
              <SyncBanner 
                compact 
                onOpenModal={() => setIsOfflineModalOpen(true)} 
                onOpenFirestoreModal={() => setIsFirestoreModalOpen(true)} 
              />
            </div>
          </div>

          {/* CENTER GROUP: GLOBAL SEARCH BAR */}
          <div className="flex-1 max-w-xs lg:max-w-sm mx-1 hidden sm:block transition-all duration-300 ease-in-out group">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 hover:border-slate-300 dark:border-slate-700/80 rounded-xl py-2 px-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 transition-all cursor-pointer shadow-2xs group-hover:shadow-md group-hover:scale-[1.01] focus:ring-2 focus:ring-blue-500/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                <span className="truncate text-slate-600 dark:text-slate-300 font-medium">Pesquisa rápida...</span>
              </div>
              <kbd className="hidden md:inline-flex items-center gap-0.5 text-[9px] font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* RIGHT GROUP: ACTIONS, PREFERENCES & USER AVATAR */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" id="header-user-badge">
            
            {/* Work Hours Focus Badge - Desktop (>1200px) */}
            {isWorkHoursActive && (
              <div 
                onClick={() => setActiveTab('profile')}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-indigo-700 dark:text-indigo-300 text-[11px] font-bold cursor-pointer hover:bg-indigo-100/80 dark:hover:bg-indigo-900/80 transition-all shadow-2xs"
                title="Modo Período de Trabalho Ativo. Notificações silenciadas."
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <span>Horário de Trabalho</span>
              </div>
            )}

            {/* Notifications System Button (Hidden on Mobile <640px to maintain max 3 items) */}
            <div className="relative hidden sm:block">
              <button 
                onClick={() => {
                  setIsNotifOpen(prev => !prev);
                  markNotificationsAsRead();
                  setNotifications(getNotifications());
                }}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer relative ${
                  isWorkHoursActive 
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50' 
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700'
                }`}
                title={isWorkHoursActive ? "Notificações (Modo Foco Ativo)" : "Notificações"}
                aria-label="Notificações"
              >
                {isWorkHoursActive ? (
                  <BellOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-600 dark:text-slate-200" />
                )}
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-white dark:ring-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.9)]"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 w-72 sm:w-80 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Notificações</span>
                      <button 
                        onClick={() => setIsNotifOpen(false)}
                        className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>

                    {isWorkHoursActive && (
                      <div className="px-3 py-2 bg-indigo-50/90 border-b border-indigo-100/80 flex items-start gap-2 text-[10px] text-indigo-800">
                        <BellOff className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Modo Foco Ativo:</strong> Notificações secundárias estão silenciadas.
                        </div>
                      </div>
                    )}
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-400 italic">Nenhuma notificação recente.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-3 hover:bg-slate-50 text-xs transition-colors">
                            <div className="font-bold text-slate-800">{n.title}</div>
                            <div className="text-slate-500 mt-0.5 leading-relaxed">{n.message}</div>
                            <div className="text-[9px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tablet Secondary Options Group ("Mais opções" Dropdown for 768px - 1200px) */}
            <div className="relative hidden md:block xl:hidden">
              <button
                onClick={() => setIsMoreOptionsOpen(prev => !prev)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-600 transition-all cursor-pointer"
                title="Mais Opções"
                aria-label="Mais Opções"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isMoreOptionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 space-y-3 z-50"
                  >
                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-100 pb-1.5">
                      Opções da Aplicação
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Idioma:</span>
                      <LanguageSelector isTopbar={true} />
                    </div>

                    {isWorkHoursActive && (
                      <div 
                        onClick={() => {
                          setActiveTab('profile');
                          setIsMoreOptionsOpen(false);
                        }}
                        className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Horário de Trabalho Ativo</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Visual Theme Selector (Claro / Escuro / Auto) - Hidden on Mobile */}
            <div className="hidden sm:block">
              <Suspense fallback={<div className="w-20 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
                <ThemeSelector />
              </Suspense>
            </div>

            {/* Language Selector - Visible on Desktop (>1200px) */}
            <div className="hidden xl:block">
              <Suspense fallback={<div className="w-16 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
                <LanguageSelector isTopbar={true} />
              </Suspense>
            </div>
            
            {/* User Profile Avatar Button (Min 44x44px touch target) */}
            <div className="relative flex items-center gap-1.5">
              {/* Mobile Quick New Chat Button for AI Accountant (visible on mobile <768px when on assistant tab) */}
              {activeTab === 'assistant' && (
                <div className="md:hidden flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('ga-open-ai-history'))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
                    title="Histórico de Conversas"
                    aria-label="Histórico de Conversas IA"
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('ga-new-ai-chat'))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer shadow-xs border border-indigo-500"
                    title="Nova Conversa IA"
                    aria-label="Nova Conversa IA"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* User Profile Avatar & Tools Dropdown Button */}
              <div className="relative flex items-center">
                <button 
                  id="header-user-badge"
                  onClick={() => {
                    // Conditional debug log for mobile screen verification
                    if (typeof window !== 'undefined') {
                      console.debug('[Header Debug] Screen width:', window.innerWidth, 'isToolsMenuOpen toggling. Active tab:', activeTab, 'Z-Index: 9999');
                    }
                    setIsUserMenuOpen(prev => !prev);
                    setIsToolsMenuOpen(prev => !prev);
                  }}
                  className="mobile-header-action min-w-[44px] min-h-[44px] flex items-center justify-center space-x-2 text-left focus:outline-none cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  title="Aceder ao Meu Perfil & Ferramentas"
                  aria-label="Perfil do Utilizador e Ferramentas"
                  aria-expanded={isUserMenuOpen || isToolsMenuOpen}
                >
                  <div className="hidden xl:block text-right mr-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[100px]">{currentUser?.name || 'Utilizador'}</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wide">{currentUser?.role || 'Membro'}</div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-black text-xs border border-blue-200 dark:border-blue-400 shadow-2xs shrink-0 relative">
                    {(currentUser?.name || 'U').substring(0, 2).toUpperCase()}
                    {notifications.some(n => !n.read) && (
                      <span className="sm:hidden absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse shadow-xs"></span>
                    )}
                  </div>
                </button>

                {/* Native Responsive DropdownMenu with highest z-index */}
                <AnimatePresence>
                  {(isUserMenuOpen || isToolsMenuOpen) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      style={{ zIndex: 9999 }}
                      className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 w-64 z-[9999]"
                    >
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser?.name || 'Utilizador'}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-300 truncate">{currentUser?.email || 'membro@estudos.ao'}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[9px] font-mono bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60 font-semibold">
                            {currentUser?.role || 'Membro'}
                          </span>
                          <span className="text-[9px] font-mono bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                          </span>
                        </div>
                      </div>

                      {/* Mobile Fast Action Buttons (⚡, ⚙️, ⋯) */}
                      <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-around gap-1 bg-slate-50/30 dark:bg-slate-800/20">
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('ga-open-quick-actions'));
                            setIsUserMenuOpen(false);
                            setIsToolsMenuOpen(false);
                          }}
                          className="flex-1 flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                          title="Ações Rápidas"
                        >
                          <span className="text-sm">⚡</span>
                          <span>Ações</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('profile');
                            setIsUserMenuOpen(false);
                            setIsToolsMenuOpen(false);
                          }}
                          className="flex-1 flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                          title="Definições"
                        >
                          <span className="text-sm">⚙️</span>
                          <span>Definições</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsUserMenuOpen(false);
                            setIsMobileDrawerOpen(true);
                          }}
                          className="flex-1 flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                          title="Mais Ferramentas"
                        >
                          <span className="text-sm">⋯</span>
                          <span>Menu</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setIsUserMenuOpen(false);
                          setIsToolsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50/60 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer mt-1"
                      >
                        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        O meu Perfil & Segurança
                      </button>

                      <button
                        onClick={() => {
                          setIsTourOpen(true);
                          setIsUserMenuOpen(false);
                          setIsToolsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                        id="btn-open-pgc-tutorial-user-menu"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Tutorial PGC Angola
                      </button>

                      <button
                        onClick={() => {
                          setIsSupabaseModalOpen(true);
                          setIsUserMenuOpen(false);
                          setIsToolsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                        id="btn-open-supabase-manager"
                      >
                        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Supabase Cloud & Dispositivos
                      </button>
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setActiveTab('admin');
                            setIsUserMenuOpen(false);
                            setIsToolsMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Painel Admin
                        </button>
                      )}
                      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsToolsMenuOpen(false);
                          handleTrocarConta();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-2"
                        id="btn-trocar-conta-menu"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        Trocar de Conta Google
                      </button>
                      <button
                        onClick={() => {
                          setIsLogoutModalOpen(true);
                          setIsUserMenuOpen(false);
                          setIsToolsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        Sair do Sistema
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </header>

        {/* MOBILE DRAWER OVERLAY PANEL (<768px) */}
        <AnimatePresence>
          {isMobileDrawerOpen && (
            <div className="mobile-profile-overlay fixed inset-0 z-[250] flex justify-end bg-slate-950/60 backdrop-blur-xs md:hidden">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-80 max-w-[88vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-y-auto text-slate-800 dark:text-slate-100"
              >
                {/* Mobile Drawer Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm border border-blue-400 shadow-xs shrink-0">
                      {(currentUser?.name || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{currentUser?.name || 'Utilizador'}</p>
                      <p className="text-[10px] text-slate-300 truncate">{currentUser?.email || 'membro@estudos.ao'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-2 text-slate-300 hover:text-white rounded-xl cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Fechar Painel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Drawer Body */}
                <div className="p-4 space-y-5 flex-1">
                  
                  {/* Quick Actions: Search & Notifications */}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider mb-2">Ações Rápidas</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setIsSearchOpen(true);
                          setIsMobileDrawerOpen(false);
                        }}
                        className="p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 border border-blue-200/80 dark:border-blue-800/80 rounded-xl text-left flex flex-col items-start gap-1 text-xs font-bold text-blue-900 dark:text-blue-200 cursor-pointer shadow-2xs"
                      >
                        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Pesquisa</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsNotifOpen(true);
                          setIsMobileDrawerOpen(false);
                        }}
                        className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-left flex flex-col items-start gap-1 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer relative"
                      >
                        <div className="flex items-center justify-between w-full">
                          <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          {notifications.some(n => !n.read) && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                        <span>Notificações</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time sync status card */}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider mb-2">Estado de Sincronização</p>
                    <SyncBanner onOpenModal={() => {
                      setIsOfflineModalOpen(true);
                      setIsMobileDrawerOpen(false);
                    }} />
                  </div>

                  {/* Work Hours Focus Mode */}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider mb-2">Período de Trabalho</p>
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setIsMobileDrawerOpen(false);
                      }}
                      className="w-full p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-left flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Modo Foco no Trabalho</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isWorkHoursActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {isWorkHoursActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </button>
                  </div>

                  {/* Theme Selector Section */}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider mb-2">Tema Visual</p>
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <ThemeSelector />
                    </div>
                  </div>

                  {/* Language Selector Section */}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider mb-2">Idioma do Sistema</p>
                    <div className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <LanguageSelector isTopbar={true} />
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setIsMobileDrawerOpen(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-2.5 cursor-pointer min-h-[44px]"
                    >
                      <User className="w-4 h-4 text-blue-600" />
                      <span>O meu Perfil & Segurança</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setActiveTab('admin');
                          setIsMobileDrawerOpen(false);
                        }}
                        className="w-full text-left p-3 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-2.5 cursor-pointer min-h-[44px]"
                      >
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>Painel Admin</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        handleTrocarConta();
                      }}
                      className="w-full text-left p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-2.5 cursor-pointer min-h-[44px]"
                      id="btn-trocar-conta-mobile-drawer"
                    >
                      <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Trocar de Conta Google</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsLogoutModalOpen(true);
                        setIsMobileDrawerOpen(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2.5 cursor-pointer min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* WORKSPACE AREA */}
        <div 
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden ${activeTab === 'assistant' ? 'overflow-hidden p-0 m-0 h-full w-full' : 'overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8'}`} 
          id="workspace-scroll-area"
        >
          <Suspense fallback={<PageSkeleton />}>

          {/* OFFLINE BLOCKED PAGE REDIRECT */}
          {!isAppOnline && !['dashboard', 'learning', 'quizzes'].includes(activeTab) ? (
            <OfflineBlockedView 
              onGoToDashboard={() => setActiveTab('dashboard')} 
              onGoToEstudos={() => setActiveTab('learning')} 
            />
          ) : (
            <AnimatePresence mode="wait">
              {/* TAB 1: DASHBOARD OVERVIEW */}
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar o Dashboard">
                    <StudentDashboardView
                      onNavigateTab={(tab) => {
                        if (tab === 'knowledge_center' || tab === 'learning') {
                          setActiveTab('learning');
                        } else if (tab === 'ai_accountant' || tab === 'assistant') {
                          setActiveTab('assistant');
                        } else {
                          setActiveTab(tab);
                        }
                      }}
                      onOpenAiAssistant={() => setActiveTab('assistant')}
                    />
                  </ErrorBoundary>
                </motion.div>
              )}

              {/* TAB: NOTAS & APONTAMENTOS */}
              {activeTab === 'notes' && (
                <motion.div 
                  key="notes"
                  className="w-full h-full"
                  id="tab-content-notes"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar Notas">
                    <NotasPage 
                      currentUserId={currentUser?.id || (currentUser as any)?.uid || (currentUser as any)?.userId || ''} 
                      onNavigateTab={setActiveTab} 
                    />
                  </ErrorBoundary>
                </motion.div>
              )}

              {/* TAB: CONTABILIDADE (ERP) */}
              {activeTab === 'accounting' && (
                <motion.div 
                  key="accounting"
                  className="w-full" 
                  id="tab-content-accounting"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar Contabilidade PGC">
                    <ErpAccountingWorkspace onNavigateTab={setActiveTab} />
                  </ErrorBoundary>
                </motion.div>
              )}

              {/* TAB 6: AI CONSULTANT */}
              {activeTab === 'assistant' && (
                <motion.div 
                  key="assistant"
                  className="flex min-h-0 min-w-0 w-full max-w-full flex-1 h-full flex-col overflow-hidden ai-accountant-page" 
                  id="tab-content-assistant"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar o Yohan AI">
                    <div className="flex min-h-0 min-w-0 h-full w-full flex-1 flex-col overflow-hidden">
                      <YohanAI 
                        currentLanguage={i18n.currentLang} 
                        onSaveToVault={(type, title, content) => {
                          if (!activeWorkspace) return;
                          const txId = `tx-vault-${Date.now()}`;
                          const docTx: any = {
                            id: txId,
                            entityId: entities[0]?.id || 'custom',
                            entityName: entities[0]?.name || 'Vertex Holdings',
                            date: new Date().toISOString().split('T')[0],
                            description: `[AI Vault: ${type}] ${title.substring(0, 30)}`,
                            account: 'AI Document Vault',
                            amount: 0,
                            type: 'Debit',
                            status: 'Reconciled'
                          };
                          DB.setWorkspace(activeWorkspace.id, 'transactions', txId, docTx);
                          logAuditEvent('AI Vault Salvo', `Guardou relatório "${title}" no workspace`, 'ai');
                          createNotification('ai', 'Relatório Salvo', `O relatório de tipo "${type}" foi arquivado no ledger com sucesso.`);
                          setRefreshCount(c => c + 1);
                        }} 
                      />
                    </div>
                  </ErrorBoundary>

                  {/* FLOATING MOBILE SIDEBAR BUTTON (Visible only on mobile <= 767px / md:hidden) */}
                  <button
                    type="button"
                    onClick={() => setIsMobileOpen(true)}
                    className="md:hidden fixed bottom-5 left-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white shadow-xl shadow-blue-950/40 border border-white/20 backdrop-blur-md transition-all cursor-pointer select-none"
                    aria-label="Abrir Menu de Navegação"
                    title="Abrir Menu de Navegação"
                    id="mobile-sidebar-assistant-fab"
                  >
                    <Menu className="w-4 h-4 text-white shrink-0" />
                    <span className="text-xs font-bold tracking-tight">Menu</span>
                  </button>
                </motion.div>
              )}

              {/* TAB 7: APRENDIZADOS */}
              {activeTab === 'learning' && (
                <motion.div 
                  key="learning"
                  className="w-full" 
                  id="tab-content-learning"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar Aprendizados">
                    <LearningWorkspace 
                      currentLanguage={i18n.currentLang} 
                      onNavigateTab={setActiveTab}
                    />
                  </ErrorBoundary>
                </motion.div>
              )}

              {/* TAB: QUIZZES & AVALIAÇÕES */}
              {activeTab === 'quizzes' && (
                <motion.div 
                  key="quizzes"
                  className="w-full" 
                  id="tab-content-quizzes"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar Quizzes">
                    <QuizWorkspace 
                      onNavigateToLearning={(topic) => setActiveTab('learning')}
                    />
                  </ErrorBoundary>
                </motion.div>
              )}

              {/* TAB 9: USER PROFILE */}
              {activeTab === 'profile' && (
                <motion.div 
                  key="profile"
                  className="space-y-8" 
                  id="tab-content-profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar Perfil de Utilizador">
                    <UserProfilePanel 
                      onUpdateUser={(user) => {
                        setCurrentUser(user);
                        refreshWorkspaceState();
                      }}
                      onLogout={handleLogout}
                      onNavigateTab={setActiveTab}
                    />
                  </ErrorBoundary>
                </motion.div>
              )}

              {/* TAB 10: ADMIN DASHBOARD */}
              {activeTab === 'admin' && (
                <motion.div 
                  key="admin"
                  className="space-y-8" 
                  id="tab-content-admin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary fallbackTitle="Erro ao carregar Painel de Administração">
                    <AdminDashboard />
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          </Suspense>

        </div>
      </main>



      {/* QUICK ACTION BUTTONS TRIGGER MODALS IF DESIRED */}
      
      {/* POPUP MODAL: ADD LEGAL ENTITY */}
      <AnimatePresence>
        {isAddEntityOpen && (
          <div 
            className="app-modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[10000] pointer-events-auto" 
            style={{ zIndex: 10000, pointerEvents: 'auto' }}
            id="modal-add-entity"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-add-entity-title"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 id="modal-add-entity-title" className="font-bold text-slate-800 text-sm">Adicionar Entidade Legal</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Cadastrar nova empresa ou subsidiária no workspace</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsAddEntityOpen(false)} 
                  aria-label="Fechar modal de adição de entidade"
                  className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddEntity} className="p-6 space-y-4">
                
                <div>
                  <label htmlFor="entity-name-input" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                    Nome da Entidade *
                  </label>
                  <input 
                    id="entity-name-input"
                    type="text" 
                    required
                    aria-label="Nome da Entidade Legal ou Empresa"
                    value={newEntity.name}
                    onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                    placeholder="ex: Luanda Comercial & Serviços LDA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="entity-region-select" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Região / Jurisdição
                    </label>
                    <select 
                      id="entity-region-select"
                      aria-label="Região ou Jurisdição da Entidade"
                      value={newEntity.region}
                      onChange={(e) => setNewEntity({ ...newEntity, region: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium cursor-pointer"
                    >
                      <option value="Angola (Luanda)">Angola (Luanda)</option>
                      <option value="Angola (Benguela)">Angola (Benguela)</option>
                      <option value="Angola (Cabinda)">Angola (Cabinda)</option>
                      <option value="Angola (Huambo)">Angola (Huambo)</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Brasil">Brasil</option>
                      <option value="North America">North America</option>
                      <option value="Europe (DACH)">Europe (DACH)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="entity-taxid-input" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      NIF / Tax ID *
                    </label>
                    <input 
                      id="entity-taxid-input"
                      type="text" 
                      required
                      aria-label="Número de Identificação Fiscal (NIF ou Tax ID)"
                      value={newEntity.taxId}
                      onChange={(e) => setNewEntity({ ...newEntity, taxId: e.target.value })}
                      placeholder="ex: AO-50493821"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="entity-currency-select" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Moeda Principal
                    </label>
                    <select 
                      id="entity-currency-select"
                      aria-label="Moeda Principal de Operação da Entidade"
                      value={newEntity.currency}
                      onChange={(e) => setNewEntity({ ...newEntity, currency: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono font-bold cursor-pointer"
                    >
                      {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="entity-status-select" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Estado Operacional
                    </label>
                    <select 
                      id="entity-status-select"
                      aria-label="Estado Operacional da Entidade"
                      value={newEntity.status}
                      onChange={(e) => setNewEntity({ ...newEntity, status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium cursor-pointer"
                    >
                      <option value="Active">Ativa / Active</option>
                      <option value="Review">Em Revisão / Review</option>
                      <option value="Idle">Inativa / Idle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="entity-revenue-input" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Receita Estimada
                    </label>
                    <input 
                      id="entity-revenue-input"
                      type="number" 
                      step="any"
                      aria-label="Receita Anual Estimada ou Atual em moeda local"
                      value={newEntity.revenue}
                      onChange={(e) => setNewEntity({ ...newEntity, revenue: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="entity-compliance-input" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Conformidade (%)
                    </label>
                    <input 
                      id="entity-compliance-input"
                      type="number" 
                      min="0"
                      max="100"
                      aria-label="Pontuação de Conformidade Fiscal de 0 a 100"
                      value={newEntity.complianceScore}
                      onChange={(e) => setNewEntity({ ...newEntity, complianceScore: e.target.value })}
                      placeholder="95"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddEntityOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors cursor-pointer"
                  >
                    {i18n.t('actions.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Criar Entidade Legal
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: LOG JOURNAL ENTRY */}
      <AnimatePresence>
        {isAddTxOpen && (
          <div 
            className="app-modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[10000] pointer-events-auto" 
            style={{ zIndex: 10000, pointerEvents: 'auto' }}
            id="modal-add-tx"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-add-tx-title"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 id="modal-add-tx-title" className="font-bold text-slate-800 text-sm">{i18n.t('extra.postLedgerTitle')}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Rascunho guardado automaticamente</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(newTx.description || newTx.amount || newTx.entityId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTx(defaultNewTx);
                        try {
                          localStorage.removeItem(TX_DRAFT_KEY);
                        } catch (e) {
                          console.warn(e);
                        }
                      }}
                      className="text-[10px] text-slate-500 hover:text-red-700 underline font-semibold transition-colors cursor-pointer mr-1 focus:outline-none focus:ring-1 focus:ring-red-500 rounded px-1"
                      title="Limpar Rascunho Guardado"
                      aria-label="Limpar Rascunho de Transação Guardado"
                    >
                      Limpar Rascunho
                    </button>
                  )}
                  <button 
                    onClick={() => setIsAddTxOpen(false)} 
                    aria-label="Fechar modal de lançamento contabilístico"
                    className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                
                <div>
                  <label htmlFor="tx-entity-select" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                    {i18n.currentLang === 'pt-BR' || i18n.currentLang === 'pt-PT' ? 'Entidade Alvo' : i18n.currentLang === 'es' ? 'Entidad Destino' : i18n.currentLang === 'fr' ? 'Entité Cible' : i18n.currentLang === 'de' ? 'Zielunternehmen' : i18n.currentLang === 'ru' ? 'Целевая компания' : 'Target Entity'} *
                  </label>
                  <select 
                    id="tx-entity-select"
                    required
                    aria-label="Entidade Alvo do Lançamento Contabilístico"
                    value={newTx.entityId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const ent = entities.find(item => item.id === selectedId);
                      setNewTx({ 
                        ...newTx, 
                        entityId: selectedId,
                        currency: ent ? ent.currency : newTx.currency
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium cursor-pointer"
                  >
                    <option value="">{i18n.t('extra.chooseEntity')}</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.region} — {e.currency})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tx-date-input" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{i18n.t('extra.postingDate')} *</label>
                    <input 
                      id="tx-date-input"
                      type="date" 
                      required
                      aria-label="Data do Lançamento Contabilístico"
                      value={newTx.date}
                      onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium cursor-pointer"
                    />
                  </div>

                  <div>
                    <label htmlFor="tx-account-input" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{i18n.t('extra.accountCategory')} *</label>
                    <input 
                      id="tx-account-input"
                      type="text" 
                      required
                      aria-label="Categoria ou Código da Conta do Plano Geral de Contabilidade"
                      value={newTx.account}
                      onChange={(e) => setNewTx({ ...newTx, account: e.target.value })}
                      placeholder="ex: 61.1 - Vendas de Produtos"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tx-desc-input" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{i18n.t('extra.journalDesc')} *</label>
                  <input 
                    id="tx-desc-input"
                    type="text" 
                    required
                    aria-label="Descrição do Lançamento no Diário Contabilístico"
                    value={newTx.description}
                    onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    placeholder="ex: Prestação de Serviços de Consultoria Fiscal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Multi-Currency Selection & Amount */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Gestão Multimoeda da Transação</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md font-bold">Auto Câmbio</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="tx-currency-select" className="block text-[10px] font-bold text-slate-600 mb-1">Moeda da Operação</label>
                      <select
                        id="tx-currency-select"
                        aria-label="Moeda de Operação da Transação"
                        value={newTx.currency}
                        onChange={(e) => setNewTx({ ...newTx, currency: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer"
                      >
                        {SUPPORTED_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tx-amount-input" className="block text-[10px] font-bold text-slate-600 mb-1">{i18n.t('extra.amountLabel')} *</label>
                      <input 
                        id="tx-amount-input"
                        type="number" 
                        step="any"
                        required
                        aria-label="Valor Monetário da Transação"
                        value={newTx.amount}
                        onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                        placeholder="ex: 15000"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Conversion Preview Card */}
                  {newTx.amount && parseFloat(newTx.amount) > 0 && (
                    <div className="text-[11px] bg-blue-50/90 p-2.5 rounded-lg border border-blue-200/80 text-blue-950 font-mono space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>Conversão em EUR (Base):</span>
                        <span>{formatCurrency(convertCurrency(parseFloat(newTx.amount), newTx.currency, 'EUR'), 'EUR')}</span>
                      </div>
                      {newTx.entityId && (
                        <div className="flex justify-between text-[10px] text-blue-800 font-semibold">
                          <span>Lançamento na Entidade ({entities.find(e => e.id === newTx.entityId)?.currency}):</span>
                          <span>
                            {formatCurrency(
                              convertCurrency(parseFloat(newTx.amount), newTx.currency, entities.find(e => e.id === newTx.entityId)?.currency || 'EUR'),
                              entities.find(e => e.id === newTx.entityId)?.currency || 'EUR'
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tx-type-select" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{i18n.t('extra.postingType')}</label>
                    <select 
                      id="tx-type-select"
                      aria-label="Tipo de Lançamento: Crédito ou Débito"
                      value={newTx.type}
                      onChange={(e) => setNewTx({ ...newTx, type: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium cursor-pointer"
                    >
                      <option value="Credit">{i18n.t('extra.creditOption')}</option>
                      <option value="Debit">{i18n.t('extra.debitOption')}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tx-status-select" className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{i18n.t('extra.auditStatusLabel')}</label>
                    <select 
                      id="tx-status-select"
                      aria-label="Estado de Auditoria e Reconciliação"
                      value={newTx.status}
                      onChange={(e) => setNewTx({ ...newTx, status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium cursor-pointer"
                    >
                      <option value="Pending">{i18n.t('extra.pendingAudit')}</option>
                      <option value="Reconciled">{i18n.t('extra.approvedReconciled')}</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddTxOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors cursor-pointer"
                  >
                    {i18n.t('actions.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {i18n.t('extra.postLedgerBtn')}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL SEARCH DIALOG PALETTE OVERLAY */}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearchPanel 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              setIsSearchOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* GLOBAL LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="app-modal-overlay fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="global-logout-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5 text-center modal-bottom-sheet-mobile"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-title"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 id="logout-title" className="text-base font-black text-slate-900">Terminar Sessão</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Tens a certeza que queres terminar a sessão no sistema?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutModalOpen(false);
                    handleLogout("Sessão terminada com sucesso.");
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-red-600/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  Terminar Sessão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ONBOARDING GUIDED OVERLAY TOUR */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        currentLanguage={currentLang}
      />

      {/* KEYBOARD SHORTCUTS HELP MODAL (Shift + ?) */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* REAL-TIME OFFLINE SYNC MANAGER MODAL */}
      <AnimatePresence>
        {isOfflineModalOpen && (
          <OfflineSyncManagerModal onClose={() => setIsOfflineModalOpen(false)} />
        )}
      </AnimatePresence>

      {/* SUPABASE CLOUD & CONNECTED DEVICES MANAGER MODAL */}
      <AnimatePresence>
        {isSupabaseModalOpen && (
          <Suspense fallback={null}>
            <SupabaseSyncManagerModal 
              userId={currentUser?.id || 'usr_local'} 
              onClose={() => setIsSupabaseModalOpen(false)} 
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* FIRESTORE HEALTH & STATUS MODAL */}
      <FirestoreStatusModal
        isOpen={isFirestoreModalOpen}
        onClose={() => setIsFirestoreModalOpen(false)}
      />

      {/* RESTORED CONNECTION & AUTO-SYNC NOTIFICATION TOAST */}
      <AnimatePresence>
        {onlineRestoreToast && onlineRestoreToast.show && (
          <motion.aside
            key="online-restore-toast"
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 25 }}
            className="fixed top-4 right-4 sm:right-6 z-[99999] max-w-sm w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl shadow-xl p-3.5 flex items-start gap-3 pointer-events-auto"
            role="status"
            aria-live="polite"
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              onlineRestoreToast.isSyncing 
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' 
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              {onlineRestoreToast.isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {onlineRestoreToast.title}
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {onlineRestoreToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOnlineRestoreToast(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FLOATING VISUAL THEME & ACCENT CUSTOMIZER 🎨 */}
      <ThemeCustomizerFloatingButton userId={currentUser?.id || 'global'} />

      {/* MOBILE & TABLET BOTTOM NAVIGATION BAR (<1024px) */}
      <MobileBottomNavigation 
        activeTab={activeTab as AppTab}
        onNavigate={(tab) => setActiveTab(tab)}
        currentUser={currentUser}
        onLogout={() => setIsLogoutModalOpen(true)}
        onOpenMenu={() => setIsMobileDrawerOpen(true)}
        unreadNotificationsCount={notifications.filter(n => !n.read).length}
      />

    </motion.div>
  );
}

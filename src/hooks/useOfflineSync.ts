import { useState, useEffect, useCallback } from 'react';
import { offlineSyncService, SyncStatus } from '../services/offlineSyncService';
import {
  saveOfflineInvoice,
  saveOfflineAccountingEntry,
  saveDraft,
  getDrafts,
  deleteDraft,
  getOfflineInvoices,
  getOfflineAccountingEntries,
  setCacheData,
  getCacheData,
  OfflineInvoice,
  OfflineAccountingEntry,
  OfflineDraft
} from '../lib/offlineDb';

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineSyncService.getStatus());
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = offlineSyncService.subscribe(setSyncStatus);

    // Load initial offline drafts
    getDrafts().then(setDrafts).catch(() => {});

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check standalone state
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    return await offlineSyncService.syncNow();
  }, []);

  const promptPWAInstall = useCallback(async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
      return true;
    }
    return false;
  }, [installPrompt]);

  const addOfflineInvoice = useCallback(async (invoice: Omit<OfflineInvoice, 'id' | 'createdAt' | 'synced'>) => {
    const saved = await saveOfflineInvoice(invoice);
    await offlineSyncService.refreshPendingCount();
    if (navigator.onLine) {
      offlineSyncService.syncNow();
    }
    return saved;
  }, []);

  const addOfflineEntry = useCallback(async (entry: Omit<OfflineAccountingEntry, 'id' | 'createdAt' | 'synced'>) => {
    const saved = await saveOfflineAccountingEntry(entry);
    await offlineSyncService.refreshPendingCount();
    if (navigator.onLine) {
      offlineSyncService.syncNow();
    }
    return saved;
  }, []);

  const saveOfflineDraft = useCallback(async (id: string, entityType: OfflineDraft['entityType'], title: string, content: any) => {
    const saved = await saveDraft(id, entityType, title, content);
    const updatedDrafts = await getDrafts();
    setDrafts(updatedDrafts);
    return saved;
  }, []);

  const removeDraft = useCallback(async (id: string) => {
    await deleteDraft(id);
    const updatedDrafts = await getDrafts();
    setDrafts(updatedDrafts);
  }, []);

  const syncSingleItem = useCallback(async (actionId: string) => {
    return await offlineSyncService.syncSingleAction(actionId);
  }, []);

  return {
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    pendingCount: syncStatus.pendingCount,
    failedCount: syncStatus.failedCount,
    lastSyncTime: syncStatus.lastSyncTime,
    lastSyncError: syncStatus.lastSyncError,
    successfulSyncCount: syncStatus.successfulSyncCount,
    drafts,
    installPrompt,
    isInstalled,
    triggerSync,
    syncSingleItem,
    promptPWAInstall,
    addOfflineInvoice,
    addOfflineEntry,
    saveOfflineDraft,
    removeDraft,
    getOfflineInvoices,
    getOfflineAccountingEntries,
    setCacheData,
    getCacheData
  };
}

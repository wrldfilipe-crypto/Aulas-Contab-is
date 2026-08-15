/**
 * Watchdog para integridade de armazenamento e mitigação de erros de quota
 */

export function limparMutacoesPresas(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let removidas = 0;
  try {
    const chavesParaRemover: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('__firestore_mutations_') ||
         key.startsWith('firestore_zombie_') ||
         key.startsWith('firestore_offline_queue'))
      ) {
        chavesParaRemover.push(key);
      }
    }

    chavesParaRemover.forEach((k) => {
      try {
        localStorage.removeItem(k);
        removidas++;
      } catch (_) {}
    });
  } catch (_) {}
  return removidas;
}

export function instalarWatchdogFirestore(): void {
  if (typeof window === 'undefined') return;

  // Escuta erros de QuotaExceeded para evitar que o navegador trave
  window.addEventListener('error', (e) => {
    const msg = e.message || (e.error && e.error.message) || '';
    if (
      msg.includes('QuotaExceededError') ||
      msg.includes('exceeded the quota')
    ) {
      console.warn('[Watchdog] QuotaExceeded detectado no navegador.');
      limparMutacoesPresas();
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const msg = (reason && (reason.message || reason.toString())) || '';
    if (
      msg.includes('QuotaExceededError') ||
      msg.includes('exceeded the quota')
    ) {
      console.warn('[Watchdog] Rejeição com QuotaExceeded.');
      limparMutacoesPresas();
    }
  });
}

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppGuard } from './AppGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PGCProvider } from './lib/pgc/usePGC';
import { instalarWatchdogFirestore } from './lib/watchdog';
import { initializeStoragePolyfill } from './lib/safeStorage';
import './index.css';

declare global {
  interface Window {
    __hideAppFallback?: () => void;
  }
}

try {
  // Ativar proteção para iOS Safari em Modo Privado e limites de quota
  initializeStoragePolyfill();

  // Ativar Watchdog de proteção contra quota excedida e mutações presas
  instalarWatchdogFirestore();

  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <PGCProvider>
          <AppGuard>
            {({ uid, usuario }) => <App firebaseUser={usuario} firebaseUid={uid} />}
          </AppGuard>
        </PGCProvider>
      </ErrorBoundary>,
    );

    // Ocultar imediatamente o fallback de arranque assim que o React inicia a montagem
    window.__hideAppFallback?.();
  }
} catch (error: any) {
  console.error('Erro crítico ao inicializar ContaGlobal:', error);
  const fb = document.getElementById('app-fallback');
  if (fb) {
    fb.innerHTML = `
      <div style="text-align: center; padding: 24px; max-width: 440px;">
        <div style="font-size: 48px; margin-bottom: 12px">⚠️</div>
        <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #FFFFFF;">
          Erro de Inicialização
        </div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 24px; line-height: 1.5;">
          ${error?.message || 'Ocorreu um erro ao carregar os módulos locais.'}
        </div>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="
            padding: 10px 18px; background: #2563EB;
            color: white; border: none; border-radius: 10px;
            font-size: 13px; font-weight: 600; cursor: pointer;
          ">Limpar Cache e Recarregar</button>
          <button onclick="window.location.reload()" style="
            padding: 10px 18px; background: rgba(255,255,255,0.12);
            color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px;
            font-size: 13px; font-weight: 600; cursor: pointer;
          ">Tentar Novamente</button>
        </div>
      </div>
    `;
  }
}

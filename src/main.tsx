import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppGuard } from './AppGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PGCProvider } from './lib/pgc/usePGC';
import { instalarWatchdogFirestore } from './lib/watchdog';
import './index.css';

// Ativar Watchdog de proteção contra quota excedida e mutações presas
instalarWatchdogFirestore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PGCProvider>
        <AppGuard>
          {({ uid, usuario }) => <App firebaseUser={usuario} firebaseUid={uid} />}
        </AppGuard>
      </PGCProvider>
    </ErrorBoundary>
  </StrictMode>,
);

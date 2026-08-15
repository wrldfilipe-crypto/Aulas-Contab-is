import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppGuard } from './AppGuard.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PGCProvider } from './lib/pgc/usePGC.tsx';
import { instalarWatchdogFirestore } from './lib/watchdog.ts';
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

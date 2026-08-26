import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured error in ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    const isChunkError = this.state.error?.message?.toLowerCase().includes('dynamically imported module') || 
                         this.state.error?.message?.toLowerCase().includes('failed to fetch');
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
    if (isChunkError) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full my-6 bg-white dark:bg-[#0E1B2E] border border-rose-200/80 dark:border-rose-900/50 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-sm max-w-2xl mx-auto space-y-4 animate-fade-in" id="error-boundary-container">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {this.props.fallbackTitle || 'Ocorreu um problema ao carregar este módulo'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mx-auto">
              {this.state.error?.message || 'Não foi possível apresentar a página solicitada devido a um erro temporário.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-indigo-500/30 active:scale-[0.98]"
              id="error-retry-btn"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar novamente</span>
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('ga_active_tab');
                  sessionStorage.clear();
                } catch (e) {}
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

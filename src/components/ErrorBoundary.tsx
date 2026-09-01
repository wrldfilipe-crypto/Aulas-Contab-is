import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

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
                         this.state.error?.message?.toLowerCase().includes('failed to fetch') ||
                         this.state.error?.message?.toLowerCase().includes('importing a module script');
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
    if (isChunkError) {
      window.location.reload();
    }
  };

  handleClearAndReload = () => {
    try {
      localStorage.removeItem('ga_active_tab');
      localStorage.removeItem('ga_session');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Erro ao limpar storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="fixed inset-0 z-[99999] bg-[#0A1628] text-[#E8EDF5] flex flex-col items-center justify-center p-6 text-center select-none"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          id="error-boundary-screen"
        >
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-900/20">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-white tracking-tight mb-2">
            {this.props.fallbackTitle || 'Ocorreu um problema no ContaGlobal'}
          </h2>

          <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
            {this.state.error?.message || 'Não foi possível renderizar a interface devido a um erro de execução temporário.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-blue-500/30"
              id="error-retry-btn"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar Novamente</span>
            </button>

            <button
              onClick={this.handleClearAndReload}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-slate-700"
              id="error-clear-btn"
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span>Limpar Cache & Recarregar</span>
            </button>
          </div>

          <div className="mt-8 text-[11px] text-slate-500">
            PGC Angola • Sistema Resiliente de Alta Disponibilidade
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


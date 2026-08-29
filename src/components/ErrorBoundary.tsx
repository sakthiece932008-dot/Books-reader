import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">Something Went Wrong</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                An unexpected application error occurred while rendering the page.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono overflow-auto max-h-32 text-red-600 dark:text-red-400">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Go to Library</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

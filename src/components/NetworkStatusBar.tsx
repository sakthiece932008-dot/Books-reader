import { WifiOff, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useNetwork, ToastType } from '../context/NetworkContext';

export default function NetworkStatusBar() {
  const { isOnline, isServerReachable, isChecking, checkConnectivity, toasts, dismissToast } = useNetwork();

  const isDisconnected = !isOnline || !isServerReachable;

  return (
    <>
      {/* 1. Offline Alert Banner */}
      {isDisconnected && (
        <div 
          role="status"
          aria-live="polite"
          className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-50 sticky top-0 animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2 max-w-2xl">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
            <span>
              {!isOnline
                ? "You are currently offline. Local reading and saved books work, but AI translations and search require an internet connection."
                : "Unable to reach server. Trying to reconnect..."}
            </span>
          </div>

          <button
            type="button"
            onClick={() => checkConnectivity()}
            disabled={isChecking}
            className="shrink-0 ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-md text-[11px] font-semibold transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
          </button>
        </div>
      )}

      {/* 2. Global Toast Notification Container */}
      {toasts.length > 0 && (
        <div 
          aria-live="assertive"
          className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((toast) => {
            const getToastStyles = (type: ToastType) => {
              switch (type) {
                case 'error':
                  return {
                    bg: 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
                    icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  };
                case 'warning':
                  return {
                    bg: 'bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
                    icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  };
                case 'success':
                  return {
                    bg: 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  };
                default:
                  return {
                    bg: 'bg-blue-50 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
                    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  };
              }
            };

            const styles = getToastStyles(toast.type);

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto rounded-xl border p-3.5 shadow-lg backdrop-blur flex items-start gap-3 transition-all duration-300 transform translate-y-0 ${styles.bg}`}
              >
                {styles.icon}
                <div className="flex-1 text-xs">
                  {toast.title && <h4 className="font-bold text-sm mb-0.5">{toast.title}</h4>}
                  <p className="leading-relaxed font-medium">{toast.message}</p>
                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      onClick={toast.onAction}
                      className="mt-2 text-xs font-bold underline hover:opacity-80 transition-opacity"
                    >
                      {toast.actionLabel}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface NetworkContextType {
  isOnline: boolean;
  isServerReachable: boolean;
  isChecking: boolean;
  checkConnectivity: () => Promise<boolean>;
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  showErrorToast: (message: string, title?: string, duration?: number) => string;
  showSuccessToast: (message: string, title?: string, duration?: number) => string;
  showWarningToast: (message: string, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isServerReachable, setIsServerReachable] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { ...toast, id };

    setToasts(prev => [...prev, newToast]);

    const duration = toast.duration !== undefined ? toast.duration : (toast.type === 'error' ? 6000 : 4000);
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  const showErrorToast = useCallback((message: string, title: string = 'Error', duration?: number) => {
    return showToast({ message, title, type: 'error', duration });
  }, [showToast]);

  const showSuccessToast = useCallback((message: string, title: string = 'Success', duration?: number) => {
    return showToast({ message, title, type: 'success', duration });
  }, [showToast]);

  const showWarningToast = useCallback((message: string, title: string = 'Notice', duration?: number) => {
    return showToast({ message, title, type: 'warning', duration });
  }, [showToast]);

  // Active ping to check actual API server connectivity
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsServerReachable(false);
      return false;
    }

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const reachable = res.ok;
      setIsServerReachable(reachable);
      setIsOnline(true);
      return reachable;
    } catch {
      setIsServerReachable(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      showSuccessToast('Internet connection restored. AI features and translation are available.', 'Back Online', 3500);
      checkConnectivity();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
      showWarningToast('You are currently offline. Local reading and saved books remain accessible.', 'Offline Mode', 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial silent connectivity verification
    checkConnectivity();

    // Periodic check every 30 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnectivity();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [showSuccessToast, showWarningToast, checkConnectivity]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isServerReachable,
        isChecking,
        checkConnectivity,
        toasts,
        showToast,
        showErrorToast,
        showSuccessToast,
        showWarningToast,
        dismissToast
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

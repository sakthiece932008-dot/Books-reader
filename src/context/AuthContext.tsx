import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface User {
  email: string;
  name: string;
  picture?: string;
  verified: boolean;
  authProvider: 'google' | 'email' | 'guest';
  token?: string;
  verifiedAt?: string;
}

export interface OtpDeliveryInfo {
  email: string;
  code?: string;
  expiresInSeconds: number;
  previewUrl?: string;
  isLiveDelivered: boolean;
  hasCustomSmtp?: boolean;
  requestedAt: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  activeOtpSession: OtpDeliveryInfo | null;
  requestEmailOtp: (email: string, name?: string) => Promise<{ success: boolean; code?: string; previewUrl?: string; message?: string; error?: string; hasCustomSmtp?: boolean }>;
  verifyEmailOtp: (email: string, otp: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmailDirect: (email: string, name?: string) => Promise<void>;
  loginWithGoogleAccount: (account?: { email?: string; name?: string; picture?: string; credential?: string }) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AUTH_KEY = 'cleartext_auth_user';
const OTP_STORAGE_KEY = 'cleartext_pending_otp';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeOtpSession, setActiveOtpSession] = useState<OtpDeliveryInfo | null>(null);

  useEffect(() => {
    // Check saved user session
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      } else {
        // Prompt login on fresh session
        setShowLoginModal(true);
      }

      const pendingOtp = sessionStorage.getItem(OTP_STORAGE_KEY);
      if (pendingOtp) {
        const parsed: OtpDeliveryInfo = JSON.parse(pendingOtp);
        const elapsed = (Date.now() - parsed.requestedAt) / 1000;
        if (elapsed < parsed.expiresInSeconds) {
          setActiveOtpSession(parsed);
        } else {
          sessionStorage.removeItem(OTP_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Error loading auth:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (userData: User) => {
    setUser(userData);
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
  };

  /**
   * Requests real email OTP delivery from the backend service
   */
  const requestEmailOtp = async (
    email: string, 
    name?: string
  ): Promise<{ success: boolean; code?: string; previewUrl?: string; message?: string; error?: string; hasCustomSmtp?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const response = await api.sendEmailOtp(cleanEmail, name);
      
      const session: OtpDeliveryInfo = {
        email: cleanEmail,
        code: response.code,
        expiresInSeconds: response.expiresInSeconds || 300,
        previewUrl: response.previewUrl,
        isLiveDelivered: response.isLiveDelivered,
        hasCustomSmtp: response.hasCustomSmtp,
        requestedAt: Date.now()
      };

      setActiveOtpSession(session);
      sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(session));

      return {
        success: true,
        code: response.code,
        previewUrl: response.previewUrl,
        message: response.message,
        hasCustomSmtp: response.hasCustomSmtp
      };
    } catch (err: any) {
      console.error("Failed to send OTP email:", err);
      return {
        success: false,
        error: err.message || 'Failed to dispatch email verification code.'
      };
    }
  };

  /**
   * Validates the 6-digit OTP code on the server
   */
  const verifyEmailOtp = async (
    email: string, 
    otp: string, 
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      const response = await api.verifyEmailOtp(cleanEmail, cleanOtp, name);

      if (response && response.user) {
        const verifiedUser: User = {
          email: response.user.email,
          name: response.user.name || name || response.user.email.split('@')[0],
          verified: true,
          authProvider: 'email',
          token: response.user.token,
          verifiedAt: response.user.verifiedAt || new Date().toISOString()
        };

        saveUserSession(verifiedUser);
        sessionStorage.removeItem(OTP_STORAGE_KEY);
        setActiveOtpSession(null);
        setShowLoginModal(false);
        return { success: true };
      }

      return { success: false, error: 'Verification failed. Please try again.' };
    } catch (err: any) {
      console.error("OTP verification error:", err);
      return { success: false, error: err.message || 'Invalid or expired 6-digit code.' };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Signs in with Google Account (Google OAuth 2.0 Identity or One-Click Google Sign-In)
   */
  const loginWithGoogleAccount = async (account?: { email?: string; name?: string; picture?: string; credential?: string }) => {
    setIsLoading(true);
    try {
      const email = account?.email?.trim().toLowerCase() || 'sakthiece932008@gmail.com';
      const name = account?.name?.trim() || (email === 'sakthiece932008@gmail.com' ? 'Sakthi' : email.split('@')[0]);
      const picture = account?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`;

      const googleUser: User = {
        email,
        name,
        picture,
        verified: true,
        authProvider: 'google',
        token: account?.credential || `g_oauth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        verifiedAt: new Date().toISOString()
      };

      saveUserSession(googleUser);
      setShowLoginModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Direct instant email sign-in / sign-up without blocking on external mail servers
   */
  const loginWithEmailDirect = async (email: string, name?: string) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const displayName = name?.trim() || cleanEmail.split('@')[0];
      const emailUser: User = {
        email: cleanEmail,
        name: displayName,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        verified: true,
        authProvider: 'email',
        token: `jwt_email_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        verifiedAt: new Date().toISOString()
      };

      saveUserSession(emailUser);
      setShowLoginModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      email: 'guest@cleartext.local',
      name: 'Guest Reader',
      verified: false,
      authProvider: 'guest',
      token: `guest_${Date.now()}`,
      verifiedAt: new Date().toISOString()
    };
    saveUserSession(guestUser);
    setShowLoginModal(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(OTP_STORAGE_KEY);
    setActiveOtpSession(null);
    setShowLoginModal(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      activeOtpSession,
      requestEmailOtp,
      verifyEmailOtp,
      loginWithEmailDirect,
      loginWithGoogleAccount,
      loginAsGuest,
      logout,
      showLoginModal,
      setShowLoginModal
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

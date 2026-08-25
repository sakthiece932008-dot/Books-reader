import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  email: string;
  name: string;
  picture?: string;
  verified: boolean;
  authProvider: 'google' | 'email';
  token?: string;
  verifiedAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (customData?: Partial<User>) => Promise<void>;
  verifyEmailLogin: (email: string, name?: string) => Promise<void>;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AUTH_KEY = 'polyglot_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Check saved session
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      } else {
        // Default prompt login on fresh session
        setShowLoginModal(true);
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

  const loginWithGoogle = async (customData?: Partial<User>) => {
    setIsLoading(true);
    // Standard Google OAuth payload response simulation / Google GSI Token parsing
    const googleUser: User = {
      email: customData?.email || 'sakthiece932008@gmail.com',
      name: customData?.name || 'Sakthi Saravanan',
      picture: customData?.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      verified: true,
      authProvider: 'google',
      token: `g_oauth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      verifiedAt: new Date().toISOString()
    };

    saveUserSession(googleUser);
    setShowLoginModal(false);
    setIsLoading(false);
  };

  const verifyEmailLogin = async (email: string, name?: string) => {
    setIsLoading(true);
    const verifiedUser: User = {
      email,
      name: name || email.split('@')[0],
      verified: true,
      authProvider: 'email',
      token: `email_v_${Date.now()}`,
      verifiedAt: new Date().toISOString()
    };
    saveUserSession(verifiedUser);
    setShowLoginModal(false);
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    setShowLoginModal(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      loginWithGoogle,
      verifyEmailLogin,
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

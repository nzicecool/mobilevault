/**
 * Authentication Context
 * Manages PIN authentication state and auto-lock timer
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  isVaultInitialized,
  getFailedAttempts,
  incrementFailedAttempts,
  resetFailedAttempts,
  wipeVaultData,
  getAuthState,
  getAutoLockTimeout,
  setAutoLockTimeoutStorage,
} from "@/lib/storage";

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  pin: string | null;
  failedAttempts: number;
  maxAttempts: number;
  isLocked: boolean;
  autoLockTimeout: number;

  // Actions
  setupPin: (pin: string) => Promise<void>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  logout: () => void;
  wipeData: () => void;
  setAutoLockTimeout: (minutes: number) => void;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(15); // Default 15 minutes
  const maxAttempts = 3;
  const isLocked = failedAttempts >= maxAttempts;
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check initialization on mount
  useEffect(() => {
    const initialized = isVaultInitialized();
    setIsInitialized(initialized);

    if (initialized) {
      const timeout = getAutoLockTimeout();
      setAutoLockTimeoutState(timeout);
      setFailedAttempts(getFailedAttempts());
    }
  }, []);

  // Setup inactivity timer when authenticated
  useEffect(() => {
    if (!isAuthenticated || autoLockTimeout === 0) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      return;
    }

    const setupTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        logout();
      }, autoLockTimeout * 60 * 1000); // Convert minutes to milliseconds
    };

    setupTimer();

    // Track user activity
    const handleActivity = () => {
      setupTimer();
    };

    const events = ["mousedown", "keydown", "touchstart", "click"];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isAuthenticated, autoLockTimeout]);

  const setupPin = async (newPin: string) => {
    const { initializeVault } = await import("@/lib/storage");
    await initializeVault(newPin, "pin");
    setPin(newPin);
    setIsInitialized(true);
    setIsAuthenticated(true);
    resetFailedAttempts();
    setFailedAttempts(0);
  };

  const authenticateWithPin = async (inputPin: string): Promise<boolean> => {
    if (isLocked) {
      return false;
    }

    try {
      const { loadVaultData } = await import("@/lib/storage");
      await loadVaultData(inputPin);

      setPin(inputPin);
      setIsAuthenticated(true);
      resetFailedAttempts();
      setFailedAttempts(0);
      return true;
    } catch {
      const attempts = incrementFailedAttempts();
      setFailedAttempts(attempts);

      if (attempts >= maxAttempts) {
        wipeVaultData();
        setIsInitialized(false);
        setIsAuthenticated(false);
      }

      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setPin(null);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  };

  const wipeData = () => {
    wipeVaultData();
    setIsInitialized(false);
    setIsAuthenticated(false);
    setPin(null);
    setFailedAttempts(0);
  };

  const handleSetAutoLockTimeout = (minutes: number) => {
    setAutoLockTimeoutState(minutes);
    setAutoLockTimeoutStorage(minutes);
  };

  const resetInactivityTimer = () => {
    if (isAuthenticated && inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        logout();
      }, autoLockTimeout * 60 * 1000);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isInitialized,
        isAuthenticated,
        pin,
        failedAttempts,
        maxAttempts,
        isLocked,
        autoLockTimeout,
        setupPin,
        authenticateWithPin,
        logout,
        wipeData,
        setAutoLockTimeout: handleSetAutoLockTimeout,
        resetInactivityTimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

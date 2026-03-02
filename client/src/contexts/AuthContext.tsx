/**
 * Authentication Context
 * Manages PIN/biometric authentication state and vault access
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  isVaultInitialized,
  getFailedAttempts,
  incrementFailedAttempts,
  resetFailedAttempts,
  wipeVaultData,
  updateBiometricPreference,
  getAuthState,
} from "@/lib/storage";
import { isFingerprintSupported } from "@/lib/encryption";

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  pin: string | null;
  useBiometric: boolean;
  fingerprintSupported: boolean;
  failedAttempts: number;
  maxAttempts: number;
  isLocked: boolean;

  // Actions
  setupPin: (pin: string) => Promise<void>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<boolean>;
  logout: () => void;
  enableBiometric: () => void;
  disableBiometric: () => void;
  wipeData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [useBiometric, setUseBiometric] = useState(false);
  const [fingerprintSupported, setFingerprintSupported] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const maxAttempts = 3;
  const isLocked = failedAttempts >= maxAttempts;

  // Check initialization on mount
  useEffect(() => {
    const initialized = isVaultInitialized();
    setIsInitialized(initialized);

    if (initialized) {
      const authState = getAuthState();
      if (authState) {
        setUseBiometric(authState.useBiometric);
      }
      setFailedAttempts(getFailedAttempts());
    }

    // Check fingerprint support
    isFingerprintSupported().then(setFingerprintSupported);
  }, []);

  const setupPin = async (newPin: string) => {
    const { initializeVault } = await import("@/lib/storage");
    await initializeVault(newPin);
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

  const authenticateWithBiometric = async (): Promise<boolean> => {
    if (!fingerprintSupported || !useBiometric || isLocked) {
      return false;
    }

    try {
      // In a real app, you'd use WebAuthn here
      // For now, this is a placeholder
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
  };

  const enableBiometric = () => {
    if (fingerprintSupported) {
      setUseBiometric(true);
      updateBiometricPreference(true);
    }
  };

  const disableBiometric = () => {
    setUseBiometric(false);
    updateBiometricPreference(false);
  };

  const wipeData = () => {
    wipeVaultData();
    setIsInitialized(false);
    setIsAuthenticated(false);
    setPin(null);
    setFailedAttempts(0);
  };

  return (
    <AuthContext.Provider
      value={{
        isInitialized,
        isAuthenticated,
        pin,
        useBiometric,
        fingerprintSupported,
        failedAttempts,
        maxAttempts,
        isLocked,
        setupPin,
        authenticateWithPin,
        authenticateWithBiometric,
        logout,
        enableBiometric,
        disableBiometric,
        wipeData,
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

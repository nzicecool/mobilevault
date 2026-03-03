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
import {
  isPlatformAuthenticatorAvailable,
  authenticateWithFingerprint,
} from "@/lib/webauthn";

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  pin: string | null;
  authMethod: "pin" | "fingerprint" | null;
  useBiometric: boolean;
  fingerprintSupported: boolean;
  failedAttempts: number;
  maxAttempts: number;
  isLocked: boolean;

  // Actions
  setupPin: (pin: string) => Promise<void>;
  setupFingerprint: (credentialId: string) => Promise<void>;
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
  const [authMethod, setAuthMethod] = useState<"pin" | "fingerprint" | null>(
    null
  );
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
        setAuthMethod(authState.authMethod);
      }
      setFailedAttempts(getFailedAttempts());
    }

    // Check fingerprint support
    isPlatformAuthenticatorAvailable().then(setFingerprintSupported);
  }, []);

  const setupPin = async (newPin: string) => {
    const { initializeVault } = await import("@/lib/storage");
    await initializeVault(newPin, "pin");
    setPin(newPin);
    setAuthMethod("pin");
    setIsInitialized(true);
    setIsAuthenticated(true);
    resetFailedAttempts();
    setFailedAttempts(0);
  };

  const setupFingerprint = async (credentialId: string) => {
    const { initializeVault } = await import("@/lib/storage");
    // For fingerprint, we use a derived key from the credential
    // Store the credential ID for later authentication
    await initializeVault(credentialId, "fingerprint", credentialId);
    setPin(credentialId);
    setAuthMethod("fingerprint");
    setIsInitialized(true);
    setIsAuthenticated(true);
    setUseBiometric(true);
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
      const authState = getAuthState();
      if (!authState || !authState.credentialId) {
        return false;
      }

      const derivedKey = await authenticateWithFingerprint(
        authState.credentialId
      );
      const { loadVaultData } = await import("@/lib/storage");
      await loadVaultData(derivedKey);

      setPin(derivedKey);
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
    setAuthMethod(null);
    setFailedAttempts(0);
  };

  return (
    <AuthContext.Provider
      value={{
        isInitialized,
        isAuthenticated,
        pin,
        authMethod,
        useBiometric,
        fingerprintSupported,
        failedAttempts,
        maxAttempts,
        isLocked,
        setupPin,
        setupFingerprint,
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

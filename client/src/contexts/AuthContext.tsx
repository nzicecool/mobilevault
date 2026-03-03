/**
 * Authentication Context
 * Manages PIN authentication state and optional fingerprint unlock
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
import {
  isPlatformAuthenticatorAvailable,
  authenticateWithFingerprint,
  registerFingerprint,
} from "@/lib/webauthn";

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  pin: string | null;
  useBiometric: boolean;
  fingerprintSupported: boolean;
  fingerprintRegistered: boolean;
  failedAttempts: number;
  maxAttempts: number;
  isLocked: boolean;

  // Actions
  setupPin: (pin: string) => Promise<void>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<boolean>;
  registerBiometric: () => Promise<boolean>;
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
  const [fingerprintRegistered, setFingerprintRegistered] = useState(false);
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
        setFingerprintRegistered(!!authState.credentialId);
      }
      setFailedAttempts(getFailedAttempts());
    }

    // Check fingerprint support
    isPlatformAuthenticatorAvailable().then(setFingerprintSupported);
  }, []);

  const setupPin = async (newPin: string) => {
    const { initializeVault } = await import("@/lib/storage");
    // Setup with PIN-only authentication
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

  const registerBiometric = async (): Promise<boolean> => {
    if (!fingerprintSupported || !pin) {
      return false;
    }

    try {
      const credentialData = await registerFingerprint(
        "mobilevault-user",
        "MobileVault User"
      );

      // Store credential ID in auth state
      const authState = getAuthState();
      if (authState) {
        authState.credentialId = credentialData.credentialId;
        localStorage.setItem("vault_auth_state", JSON.stringify(authState));
      }

      setFingerprintRegistered(true);
      setUseBiometric(true);
      updateBiometricPreference(true);
      return true;
    } catch {
      return false;
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    if (!fingerprintSupported || !fingerprintRegistered || isLocked || !pin) {
      return false;
    }

    try {
      const authState = getAuthState();
      if (!authState || !authState.credentialId) {
        return false;
      }

      // Verify fingerprint
      await authenticateWithFingerprint(authState.credentialId);

      // Use the stored PIN to decrypt vault
      const { loadVaultData } = await import("@/lib/storage");
      await loadVaultData(pin);

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
    if (fingerprintSupported && fingerprintRegistered) {
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
        fingerprintRegistered,
        failedAttempts,
        maxAttempts,
        isLocked,
        setupPin,
        authenticateWithPin,
        authenticateWithBiometric,
        registerBiometric,
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

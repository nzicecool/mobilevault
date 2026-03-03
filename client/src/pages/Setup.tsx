/**
 * Setup Page - Initial PIN Configuration
 * Minimalist Security Design: Clean, focused setup flow with authentication method choice
 */

import React, { useState } from "react";
import { Lock, CheckCircle2, AlertCircle, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/PinInput";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { registerFingerprint } from "@/lib/webauthn";

type SetupStep =
  | "welcome"
  | "auth-method"
  | "create-pin"
  | "confirm-pin"
  | "fingerprint-register"
  | "complete";

export default function Setup() {
  const [step, setStep] = useState<SetupStep>("welcome");
  const [authMethod, setAuthMethod] = useState<"pin" | "fingerprint" | null>(
    null
  );
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setupPin, setupFingerprint, fingerprintSupported } = useAuth();
  const [, navigate] = useLocation();

  const handleAuthMethodSelect = (method: "pin" | "fingerprint") => {
    setAuthMethod(method);
    if (method === "pin") {
      setStep("create-pin");
    } else {
      setStep("fingerprint-register");
    }
  };

  const handleCreatePin = async () => {
    if (pin.length !== 6) {
      setError("PIN must be 6 digits");
      return;
    }
    setError("");
    setStep("confirm-pin");
  };

  const handleConfirmPin = async () => {
    if (confirmPin !== pin) {
      setError("PINs do not match");
      setConfirmPin("");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await setupPin(pin);
      navigate("/");
    } catch (err) {
      setError("Failed to setup vault. Please try again.");
      setIsLoading(false);
    }
  };

  const handleFingerprintRegister = async () => {
    setIsLoading(true);
    setError("");

    try {
      const credentialData = await registerFingerprint(
        "mobilevault-user",
        "MobileVault User"
      );
      await setupFingerprint(credentialData.credentialId);
      navigate("/");
    } catch (err) {
      setError(
        `Fingerprint registration failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">MobileVault</h1>
          <p className="text-muted-foreground mt-2">Store securely</p>
        </div>

        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="vault-card space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">
                Welcome to MobileVault
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your personal information will be encrypted and stored locally on
                your device. Choose how you want to protect your vault.
              </p>

              <div className="space-y-3 mt-6">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      End-to-End Encrypted
                    </p>
                    <p className="text-muted-foreground text-xs">
                      All data encrypted locally with your authentication method
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Offline Access
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Works without internet connection
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Secure by Default
                    </p>
                    <p className="text-muted-foreground text-xs">
                      3 failed attempts will wipe all data
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep("auth-method")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Authentication Method Selection */}
        {step === "auth-method" && (
          <div className="vault-card space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Choose Authentication Method
              </h2>
              <p className="text-muted-foreground text-sm">
                Select how you want to protect your vault
              </p>
            </div>

            <div className="space-y-3">
              {/* PIN Option */}
              <button
                onClick={() => handleAuthMethodSelect("pin")}
                className="vault-card hover:border-primary transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">6-Digit PIN</h3>
                      <p className="text-xs text-muted-foreground">
                        Encrypt with a secure PIN code
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary" />
                </div>
              </button>

              {/* Fingerprint Option */}
              {fingerprintSupported && (
                <button
                  onClick={() => handleAuthMethodSelect("fingerprint")}
                  className="vault-card hover:border-primary transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="p-2 bg-green-500/10 text-green-600 rounded-lg group-hover:scale-110 transition-transform">
                        <Fingerprint className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">Fingerprint</h3>
                        <p className="text-xs text-muted-foreground">
                          Encrypt with your biometric data
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-muted" />
                  </div>
                </button>
              )}
            </div>

            <Button
              onClick={() => setStep("welcome")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Back
            </Button>
          </div>
        )}

        {/* Create PIN Step */}
        {step === "create-pin" && (
          <div className="vault-card space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Create Your PIN
              </h2>
              <p className="text-muted-foreground text-sm">
                Choose a 6-digit PIN to protect your vault
              </p>
            </div>

            <PinInput
              value={pin}
              onChange={setPin}
              isError={!!error}
              placeholder="Enter 6-digit PIN"
            />

            {error && (
              <div className="flex gap-2 items-start p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setStep("auth-method")}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button
                onClick={handleCreatePin}
                disabled={pin.length < 6}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Confirm PIN Step */}
        {step === "confirm-pin" && (
          <div className="vault-card space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Confirm Your PIN
              </h2>
              <p className="text-muted-foreground text-sm">
                Enter your PIN again to confirm
              </p>
            </div>

            <PinInput
              value={confirmPin}
              onChange={setConfirmPin}
              isError={!!error}
              placeholder="Re-enter 6-digit PIN"
            />

            {error && (
              <div className="flex gap-2 items-start p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep("create-pin");
                  setConfirmPin("");
                  setError("");
                }}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmPin}
                disabled={confirmPin.length < 6 || isLoading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {isLoading ? "Setting up..." : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Fingerprint Registration Step */}
        {step === "fingerprint-register" && (
          <div className="vault-card space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Register Your Fingerprint
              </h2>
              <p className="text-muted-foreground text-sm">
                Your vault will be encrypted with your biometric data
              </p>
            </div>

            {error && (
              <div className="flex gap-2 items-start p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex justify-center py-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse-subtle">
                <Fingerprint className="w-10 h-10 text-primary" />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleFingerprintRegister}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {isLoading ? "Registering..." : "Register Fingerprint"}
              </Button>
              <Button
                onClick={() => setStep("auth-method")}
                disabled={isLoading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

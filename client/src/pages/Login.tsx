/**
 * Login Page - Authentication
 * Minimalist Security Design: Focused authentication interface
 */

import React, { useState } from "react";
import { Lock, AlertCircle, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/PinInput";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateWithPin, authenticateWithBiometric, failedAttempts, maxAttempts, isLocked, useBiometric } = useAuth();
  const [, navigate] = useLocation();

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;

    setIsLoading(true);
    setError("");

    const success = await authenticateWithPin(pin);
    if (success) {
      navigate("/");
    } else {
      setPin("");
      if (failedAttempts >= maxAttempts) {
        setError("Vault locked. All data has been wiped for security.");
      } else {
        setError(
          `Invalid PIN. ${maxAttempts - failedAttempts} attempt${
            maxAttempts - failedAttempts !== 1 ? "s" : ""
          } remaining.`
        );
      }
    }
    setIsLoading(false);
  };

  const handleBiometric = async () => {
    if (!useBiometric) return;

    setIsLoading(true);
    setError("");

    const success = await authenticateWithBiometric();
    if (success) {
      navigate("/");
    } else {
      setError("Biometric authentication failed");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Secure Vault</h1>
          <p className="text-muted-foreground mt-2">Access your encrypted data</p>
        </div>

        {/* Login Card */}
        <div className="vault-card space-y-6">
          {/* Locked State */}
          {isLocked && (
            <div className="flex gap-3 p-4 bg-destructive/10 rounded-md">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive text-sm">
                  Vault Locked
                </p>
                <p className="text-destructive/80 text-xs mt-1">
                  Too many failed attempts. All data has been wiped for security.
                  Please reinstall the app to start fresh.
                </p>
              </div>
            </div>
          )}

          {/* Biometric Button */}
          {useBiometric && !isLocked && (
            <Button
              onClick={handleBiometric}
              disabled={isLoading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Fingerprint className="w-5 h-5 mr-2" />
              Use Fingerprint
            </Button>
          )}

          {/* PIN Input */}
          {!isLocked && (
            <>
              <PinInput
                value={pin}
                onChange={setPin}
                onComplete={handlePinSubmit}
                isError={!!error}
                disabled={isLoading}
                placeholder="Enter your PIN"
              />

              {error && (
                <div className="flex gap-2 items-start p-3 bg-destructive/10 rounded-md">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Attempt Counter */}
              {failedAttempts > 0 && failedAttempts < maxAttempts && (
                <div className="flex justify-center gap-1">
                  {Array.from({ length: maxAttempts }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        i < failedAttempts ? "bg-destructive" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              )}

              <Button
                onClick={handlePinSubmit}
                disabled={pin.length < 6 || isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {isLoading ? "Unlocking..." : "Unlock Vault"}
              </Button>
            </>
          )}

          {/* Locked State Message */}
          {isLocked && (
            <p className="text-center text-sm text-muted-foreground">
              Please clear your browser data or reinstall the app to reset.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Your data is encrypted locally and never sent to any server.
        </p>
      </div>
    </div>
  );
}

/**
 * Setup Page - Initial PIN Configuration
 * Minimalist Security Design: Clean, focused setup flow with PIN creation
 */

import React, { useState } from "react";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/PinInput";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

type SetupStep = "welcome" | "create-pin" | "confirm-pin";

export default function Setup() {
  const [step, setStep] = useState<SetupStep>("welcome");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setupPin } = useAuth();
  const [, navigate] = useLocation();

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
      // Wait a tick to ensure state updates are processed before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate("/");
    } catch (err) {
      setError("Failed to setup vault. Please try again.");
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
                your device. Create a 6-digit PIN to protect your vault.
              </p>

              <div className="space-y-3 mt-6">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      End-to-End Encrypted
                    </p>
                    <p className="text-muted-foreground text-xs">
                      All data encrypted locally with your PIN
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

                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Download & Install
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Install as an app on your phone - no cloud needed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep("create-pin")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              Create PIN
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
                onClick={() => setStep("welcome")}
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
                {isLoading ? "Setting up..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

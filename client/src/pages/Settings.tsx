/**
 * Settings Page - App configuration and security settings
 * Minimalist Security Design: Clean settings interface
 */

import React, { useState } from "react";
import { ArrowLeft, AlertCircle, Fingerprint, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function Settings() {
  const {
    logout,
    useBiometric,
    enableBiometric,
    disableBiometric,
    fingerprintSupported,
    fingerprintRegistered,
    registerBiometric,
    wipeData,
  } = useAuth();
  const [, navigate] = useLocation();
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);
  const [biometricError, setBiometricError] = useState("");

  const handleWipeData = () => {
    if (
      !confirm(
        "Are you absolutely sure? This will permanently delete all your data."
      )
    ) {
      return;
    }

    wipeData();
    navigate("/");
  };

  const handleBiometricToggle = () => {
    if (useBiometric) {
      disableBiometric();
    } else if (fingerprintRegistered) {
      enableBiometric();
    }
  };

  const handleRegisterBiometric = async () => {
    setIsRegisteringBiometric(true);
    setBiometricError("");
    const success = await registerBiometric();
    if (!success) {
      setBiometricError(
        "Failed to register fingerprint. Please try again."
      );
    }
    setIsRegisteringBiometric(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Security Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Security</h2>

          <div className="space-y-3">
            {/* Biometric Setting */}
            {fingerprintSupported && (
              <>
                {!fingerprintRegistered ? (
                  <div className="vault-card">
                    <div className="flex items-center gap-3 mb-4">
                      <Fingerprint className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          Fingerprint Unlock
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Register your fingerprint for faster access
                        </p>
                      </div>
                    </div>
                    {biometricError && (
                      <div className="flex gap-2 items-start p-3 bg-destructive/10 rounded-md mb-4">
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">
                          {biometricError}
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={handleRegisterBiometric}
                      disabled={isRegisteringBiometric}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="sm"
                    >
                      {isRegisteringBiometric
                        ? "Registering..."
                        : "Register Fingerprint"}
                    </Button>
                  </div>
                ) : (
                  <div className="vault-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          Fingerprint Unlock
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {useBiometric ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleBiometricToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useBiometric ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useBiometric ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Info Box */}
            <div className="vault-card bg-primary/5 border-primary/20">
              <p className="text-sm text-foreground">
                Your vault is protected by a 6-digit PIN and end-to-end
                encryption.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                3 failed login attempts will automatically wipe all data.
              </p>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Account</h2>

          <div className="space-y-3">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start"
              size="lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-destructive mb-4">
            Danger Zone
          </h2>

          <div className="vault-card bg-destructive/5 border-destructive/20">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Wipe All Data</p>
                <p className="text-xs text-destructive/80 mt-1">
                  Permanently delete all stored information. This action cannot
                  be undone.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowWipeConfirm(true)}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              Wipe All Data
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showWipeConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="vault-card max-w-sm w-full space-y-4">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-foreground">
                    Confirm Data Wipe
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    This will permanently delete all your stored data. This
                    action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowWipeConfirm(false)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWipeData}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  Delete All Data
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

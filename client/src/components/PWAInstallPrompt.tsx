/**
 * PWA Installation Prompt Component
 * Displays installation prompt and offline capability information
 */

import React, { useState, useEffect } from "react";
import { Download, Wifi, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Show offline capability info if not installed
  if (isInstalled) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
            <Wifi className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">
              App Installed Locally
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your vault works offline. All data is encrypted and stored on your device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show installation prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 flex-shrink-0">
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">
              Install MobileVault Locally
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Download the app to your device for offline access. No cloud connection needed.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Install Now
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="outline"
              >
                Maybe Later
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Show offline status indicator
  if (!isOnline) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20">
            <WifiOff className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-900 text-sm">
              Offline Mode
            </p>
            <p className="text-xs text-amber-800 mt-1">
              You're offline. Your vault is working with locally stored data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

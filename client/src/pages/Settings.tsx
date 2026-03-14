/**
 * Settings Page - App configuration and security settings
 * Minimalist Security Design: Clean settings interface
 */

import React, { useState, useRef } from "react";
import { ArrowLeft, AlertCircle, Clock, LogOut, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { exportVaultBackup, downloadBackupFile, parseBackupFile, importVaultBackup } from "@/lib/storage";
import { toast } from "sonner";

export default function Settings() {
  const { logout, wipeData, autoLockTimeout, setAutoLockTimeout, pin } = useAuth();
  const [, navigate] = useLocation();
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAutoLockChange = (minutes: number) => {
    setAutoLockTimeout(minutes);
  };

  const handleExportVault = async () => {
    try {
      setIsExporting(true);
      if (!pin) {
        toast.error("PIN not available. Please try again.");
        return;
      }
      const backup = await exportVaultBackup(pin);
      downloadBackupFile(backup);
      toast.success("Vault backup downloaded successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export vault");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const backup = await parseBackupFile(file);
      await importVaultBackup(backup);
      toast.success("Vault imported successfully! Please refresh the page.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import vault");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const autoLockOptions = [
    { label: "5 minutes", value: 5 },
    { label: "15 minutes", value: 15 },
    { label: "30 minutes", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "Never", value: 0 },
  ];

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
            {/* Auto-Lock Timer */}
            <div className="vault-card">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Auto-Lock Timer</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically logout after inactivity
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {autoLockOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAutoLockChange(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                      autoLockTimeout === option.value
                        ? "bg-primary/10 border-primary text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{option.label}</span>
                      {autoLockTimeout === option.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

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

        {/* Backup Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Backup & Restore</h2>

          <div className="space-y-3">
            <Button
              onClick={handleExportVault}
              disabled={isExporting}
              variant="outline"
              className="w-full justify-start"
              size="lg"
            >
              <Download className="w-5 h-5 mr-3" />
              {isExporting ? "Exporting..." : "Export Vault Backup"}
            </Button>

            <Button
              onClick={handleImportClick}
              disabled={isImporting}
              variant="outline"
              className="w-full justify-start"
              size="lg"
            >
              <Upload className="w-5 h-5 mr-3" />
              {isImporting ? "Importing..." : "Import Vault Backup"}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="vault-card bg-primary/5 border-primary/20">
              <p className="text-sm text-foreground">
                Export your encrypted vault to backup your data or restore it on another device.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Backups are encrypted and can only be imported with the same PIN.
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

/**
 * Add/Edit Entry Page
 * Minimalist Security Design: Clean form for data entry
 */

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  addVaultEntry,
  updateVaultEntry,
  loadVaultData,
  EncryptedEntry,
} from "@/lib/storage";

const CATEGORIES = [
  { id: "passwords", name: "Passwords" },
  { id: "medical", name: "Medical" },
  { id: "insurance", name: "Insurance" },
  { id: "travel", name: "Travel" },
  { id: "financial", name: "Financial" },
  { id: "emergency", name: "Emergency" },
];

export default function AddEditEntry() {
  const { pin } = useAuth();
  const [, navigate] = useLocation();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [category, setCategory] = useState("passwords");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get entry ID from URL if editing
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/edit-entry\/([^/]+)/);
    if (match) {
      setEntryId(match[1]);
      loadEntry(match[1]);
    }

    // Get category from query params if adding
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    if (categoryParam) {
      setCategory(categoryParam);
    }
  }, []);

  const loadEntry = async (id: string) => {
    if (!pin) return;

    try {
      setIsLoading(true);
      const vaultData = await loadVaultData(pin);
      const entry = vaultData.entries.find((e) => e.id === id);

      if (entry) {
        setCategory(entry.category);
        setTitle(entry.title);
        setContent(entry.encryptedContent);
      }
    } catch (err) {
      console.error("Failed to load entry", err);
      setError("Failed to load entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pin) return;

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (entryId) {
        // Edit existing
        await updateVaultEntry(
          entryId,
          {
            category,
            title,
            encryptedContent: content,
          },
          pin
        );
      } else {
        // Add new
        await addVaultEntry(
          {
            category,
            title,
            encryptedContent: content,
          },
          pin
        );
      }

      navigate(`/category/${category}`);
    } catch (err) {
      console.error("Failed to save entry", err);
      setError("Failed to save entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-foreground">
              {entryId ? "Edit Entry" : "Add New Entry"}
            </h1>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded-md animate-pulse" />
            <div className="h-12 bg-muted rounded-md animate-pulse" />
            <div className="h-32 bg-muted rounded-md animate-pulse" />
          </div>
        ) : (
          <div className="vault-card space-y-6">
            {error && (
              <div className="flex gap-2 items-start p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Category Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Gmail Password, Insurance Policy"
                className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Information
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your encrypted information here..."
                rows={8}
                className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This information will be encrypted and stored locally on your device.
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? "Saving..." : entryId ? "Update Entry" : "Add Entry"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

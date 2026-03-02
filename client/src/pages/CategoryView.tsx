/**
 * Category View Page - Display entries in a category
 * Minimalist Security Design: Clean list with edit/delete actions
 */

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { getEntriesByCategory, deleteVaultEntry, EncryptedEntry } from "@/lib/storage";

const CATEGORY_INFO: Record<string, { name: string; icon: string }> = {
  passwords: { name: "Passwords", icon: "🔐" },
  medical: { name: "Medical", icon: "❤️" },
  insurance: { name: "Insurance", icon: "🛡️" },
  travel: { name: "Travel", icon: "✈️" },
  financial: { name: "Financial", icon: "💳" },
  emergency: { name: "Emergency", icon: "👥" },
};

export default function CategoryView() {
  const { pin } = useAuth();
  const [, navigate] = useLocation();
  const [categoryId, setCategoryId] = useState("");
  const [entries, setEntries] = useState<EncryptedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  // Get category from URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/category\/([^/]+)/);
    if (match) {
      setCategoryId(match[1]);
    }
  }, []);

  // Load entries
  useEffect(() => {
    if (!categoryId || !pin) return;

    loadEntries();
  }, [categoryId, pin]);

  const loadEntries = async () => {
    try {
      if (!pin || !categoryId) return;
      const categoryEntries = await getEntriesByCategory(categoryId, pin);
      setEntries(categoryEntries);
    } catch (err) {
      console.error("Failed to load entries", err);
      setError("Failed to load entries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!pin) return;

    if (!confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    try {
      await deleteVaultEntry(id, pin);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete entry", err);
      setError("Failed to delete entry");
    }
  };

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedIds);
    if (newRevealed.has(id)) {
      newRevealed.delete(id);
    } else {
      newRevealed.add(id);
    }
    setRevealedIds(newRevealed);
  };

  const categoryInfo = CATEGORY_INFO[categoryId] || { name: "Unknown", icon: "📦" };

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
            <div>
              <h1 className="font-bold text-foreground">
                {categoryInfo.icon} {categoryInfo.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {entries.length} item{entries.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate(`/add-entry?category=${categoryId}`)}
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="flex gap-2 items-start p-3 bg-destructive/10 rounded-md mb-4">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="vault-card h-20 animate-pulse bg-muted" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No entries yet</p>
            <Button
              onClick={() => navigate(`/add-entry?category=${categoryId}`)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Entry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="vault-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{entry.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(entry.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => toggleReveal(entry.id)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {revealedIds.has(entry.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => navigate(`/edit-entry/${entry.id}`)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(entry.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {revealedIds.has(entry.id) && (
                  <div className="p-3 bg-muted rounded-md border border-border">
                    <p className="text-sm text-foreground break-all font-mono">
                      {entry.encryptedContent}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

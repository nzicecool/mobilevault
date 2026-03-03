/**
 * Home Page - Main Dashboard
 * Minimalist Security Design: Clean category grid with quick access
 */

import React, { useState, useEffect } from "react";
import {
  Lock,
  Heart,
  Plane,
  Shield,
  CreditCard,
  Users,
  Plus,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { loadVaultData } from "@/lib/storage";

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const CATEGORIES: Category[] = [
  {
    id: "passwords",
    name: "Passwords",
    icon: <Lock className="w-6 h-6" />,
    description: "Credentials & accounts",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "medical",
    name: "Medical",
    icon: <Heart className="w-6 h-6" />,
    description: "Health & medical info",
    color: "bg-red-500/10 text-red-600",
  },
  {
    id: "insurance",
    name: "Insurance",
    icon: <Shield className="w-6 h-6" />,
    description: "Insurance policies",
    color: "bg-green-500/10 text-green-600",
  },
  {
    id: "travel",
    name: "Travel",
    icon: <Plane className="w-6 h-6" />,
    description: "Travel documents",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    id: "financial",
    name: "Financial",
    icon: <CreditCard className="w-6 h-6" />,
    description: "Bank & financial info",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    id: "emergency",
    name: "Emergency",
    icon: <Users className="w-6 h-6" />,
    description: "Emergency contacts",
    color: "bg-pink-500/10 text-pink-600",
  },
];

export default function Home() {
  const { pin, logout } = useAuth();
  const [, navigate] = useLocation();
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!pin) {
      navigate("/login");
      return;
    }

    loadEntryCounts();
  }, [pin, navigate]);

  const loadEntryCounts = async () => {
    try {
      if (!pin) return;
      const vaultData = await loadVaultData(pin);
      const counts: Record<string, number> = {};

      CATEGORIES.forEach((cat) => {
        counts[cat.id] = vaultData.entries.filter(
          (e) => e.category === cat.id
        ).length;
      });

      setEntryCounts(counts);
    } catch (err) {
      console.error("Failed to load entry counts", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  const handleAddEntry = () => {
    navigate("/add-entry");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">MobileVault</h1>
              <p className="text-xs text-muted-foreground">Store securely</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/settings")}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome Back
          </h2>
          <p className="text-muted-foreground">
            Select a category to view or manage your encrypted information
          </p>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="vault-card h-24 animate-pulse bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="vault-card hover:border-primary transition-all hover:shadow-md text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg ${category.color} group-hover:scale-110 transition-transform`}
                  >
                    {category.icon}
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    {entryCounts[category.id] || 0}
                  </span>
                </div>
                <h3 className="font-bold text-foreground">{category.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Add Entry Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleAddEntry}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Entry
          </Button>
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-card rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center">
            All data is encrypted locally on your device. No information is sent
            to any server.
          </p>
        </div>
      </div>
    </div>
  );
}

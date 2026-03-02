/**
 * PIN Input Component
 * Minimalist Security Design: Clean, focused PIN entry with visual feedback
 */

import React, { useRef, useEffect } from "react";
import { Lock } from "lucide-react";

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  isError?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function PinInput({
  length = 6,
  value,
  onChange,
  onComplete,
  isError = false,
  disabled = false,
  placeholder = "Enter 6-digit PIN",
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, digit: string) => {
    // Only allow digits
    const cleanDigit = digit.replace(/[^0-9]/g, "");

    if (cleanDigit.length > 1) {
      // Handle paste
      const pastedDigits = cleanDigit.slice(0, length - index);
      const newValue = value.slice(0, index) + pastedDigits;
      onChange(newValue.slice(0, length));

      // Focus last input or next empty
      const nextIndex = Math.min(index + pastedDigits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newValue =
        value.slice(0, index) + cleanDigit + value.slice(index + 1);
      onChange(newValue.slice(0, length));

      // Auto-focus next input
      if (cleanDigit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newValue = value.slice(0, index) + value.slice(index + 1);
      onChange(newValue);

      // Focus previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleComplete = () => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  };

  useEffect(() => {
    if (value.length === length) {
      handleComplete();
    }
  }, [value]);

  return (
    <div className="w-full">
      <div className="flex justify-center gap-3 mb-6">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={disabled}
            className={`pin-input transition-all ${
              isError ? "border-destructive animate-shake" : "border-border"
            } ${value[index] ? "ring-2 ring-primary" : ""}`}
            aria-label={`PIN digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Visual indicator */}
      <div className="flex justify-center gap-1">
        {Array.from({ length }).map((_, index) => (
          <div
            key={index}
            className={`h-1 w-1 rounded-full transition-all ${
              index < value.length ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Helper text */}
      <p className="text-center text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
        <Lock className="w-4 h-4" />
        {placeholder}
      </p>
    </div>
  );
}

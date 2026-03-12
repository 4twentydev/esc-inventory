"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Delete, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function LoginClient() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleDigit = useCallback((digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError("");
    }
  }, [pin.length]);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  const handleClear = useCallback(() => {
    setPin("");
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setPin("");
        return;
      }

      // Hard redirect to ensure session cookie is picked up by middleware
      window.location.href = redirect;
    } catch {
      setError("Connection error. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [pin, redirect]);

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && !loading) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pin, loading, handleSubmit]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      if (/^\d$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape") {
        handleClear();
      } else if (e.key === "Enter" && pin.length === 4) {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, pin.length, handleDigit, handleDelete, handleClear, handleSubmit]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="w-full max-w-sm shadow-xl border-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">ESC Inventory</CardTitle>
            <p className="text-muted-foreground mt-2">Enter your PIN to continue</p>
          </CardHeader>
          <CardContent>
            {/* PIN Display with animations */}
            <div className="flex justify-center gap-4 mb-6 relative h-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-4 h-4 flex items-center justify-center">
                  <AnimatePresence>
                    {i < pin.length ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="w-4 h-4 rounded-full bg-primary"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-border" />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-destructive text-sm font-medium mb-4"
              >
                {error}
              </motion.div>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  size="lg"
                  className="text-2xl font-semibold h-16 rounded-xl hover:bg-primary/10 transition-colors"
                  onClick={() => handleDigit(digit)}
                  disabled={loading}
                >
                  {digit}
                </Button>
              ))}
              <Button
                variant="outline"
                size="lg"
                className="h-16 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={handleClear}
                disabled={loading}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-2xl font-semibold h-16 rounded-xl hover:bg-primary/10 transition-colors"
                onClick={() => handleDigit("0")}
                disabled={loading}
              >
                0
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center justify-center"
                onClick={handleDelete}
                disabled={loading}
              >
                <Delete className="w-6 h-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

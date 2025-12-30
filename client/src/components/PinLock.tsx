import { useState, useRef, useEffect } from "react";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";

interface PinLockProps {
  onUnlock: () => void;
}

export function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const currentPin = [...pin];
    currentPin[index] = value.slice(-1); // Take last digit only

    setPin(currentPin);
    setError("");

    // Auto-focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (currentPin.every(d => d !== "") && index === 4) {
      handleVerifyPin(currentPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyPin = async (enteredPin: string[]) => {
    const pinString = enteredPin.join("");
    setIsVerifying(true);

    try {
      const response = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinString }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          onUnlock();
        } else {
          setError("Incorrect PIN");
          setPin(["", "", "", "", ""]);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      } else {
        setError("Verification failed");
        setPin(["", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError("Connection error");
      setPin(["", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl p-8 shadow-xl border border-border">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Enter PIN</h2>
            <p className="text-muted-foreground text-center">
              Enter your 5-digit PIN to continue
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying}
                className="w-14 h-16 text-center text-2xl font-bold rounded-xl bg-secondary/50 border-2 border-border focus:border-primary focus:bg-background transition-all outline-none disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          {isVerifying && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Verifying...
            </div>
          )}

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Contact administrator if you need PIN access</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

interface UseRateLimitOptions {
  cooldownSeconds?: number;
  onCooldownStart?: () => void;
  onCooldownEnd?: () => void;
}

interface UseRateLimitReturn {
  isCooldown: boolean;
  remainingSeconds: number;
  canSubmit: boolean;
  startCooldown: () => void;
}

/**
 * Custom hook for rate limiting with countdown
 * @param options - Configuration options
 * @returns Rate limiting state and controls
 */
export const useRateLimit = (
  options: UseRateLimitOptions = {}
): UseRateLimitReturn => {
  const {
    cooldownSeconds = 10,
    onCooldownStart,
    onCooldownEnd
  } = options;

  const [isCooldown, setIsCooldown] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!cooldownEnd) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((cooldownEnd - now) / 1000);

      if (remaining <= 0) {
        setIsCooldown(false);
        setRemainingSeconds(0);
        setCooldownEnd(null);
        onCooldownEnd?.();
        clearInterval(interval);
      } else {
        setRemainingSeconds(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [cooldownEnd, onCooldownEnd]);

  const startCooldown = useCallback(() => {
    const endTime = Date.now() + cooldownSeconds * 1000;
    setIsCooldown(true);
    setRemainingSeconds(cooldownSeconds);
    setCooldownEnd(endTime);
    onCooldownStart?.();
  }, [cooldownSeconds, onCooldownStart]);

  const canSubmit = !isCooldown;

  return {
    isCooldown,
    remainingSeconds,
    canSubmit,
    startCooldown
  };
};

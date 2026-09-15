import { useState, useCallback } from 'react';

interface UseAntiSpamOptions {
  maxCommentsPerMinute?: number;
  onBlocked?: () => void;
  onRateLimited?: () => void;
}

interface UseAntiSpamReturn {
  isRateLimited: boolean;
  isBlocked: boolean;
  remainingSeconds: number;
  commentCount: number;
  canSubmit: boolean;
  checkAndIncrement: () => Promise<boolean>;
  resetCount: () => Promise<void>;
}

/**
 * SAIL KIOM – Local Anti-Spam hook (no Firestore)
 * Uses simple in-memory state instead of Firebase.
 *
 * To connect a real SAIL KIOM backend:
 *   Replace local state tracking with real API calls.
 */
export const useAntiSpam = (
  uid: string | undefined,
  _options: UseAntiSpamOptions = {}
): UseAntiSpamReturn => {
  const [commentCount, setCommentCount] = useState(0);

  // Always allow submissions in local mode
  const checkAndIncrement = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    setCommentCount((c) => c + 1);
    return true;
  }, [uid]);

  const resetCount = useCallback(async () => {
    setCommentCount(0);
  }, []);

  return {
    isRateLimited: false,
    isBlocked: false,
    remainingSeconds: 0,
    commentCount,
    canSubmit: true,
    checkAndIncrement,
    resetCount,
  };
};

import { useCallback } from 'react';
import { browserAPI } from '@/lib/browser-api';
import type { ExtensionMessage } from '@/ui/types/messages';

/**
 * Typed wrapper around `chrome.runtime.sendMessage` that returns a promise and
 * swallows `lastError` so the caller doesn't trip the unchecked-runtime-error warning.
 */
export function useSendMessage() {
  return useCallback(<T = unknown>(message: ExtensionMessage): Promise<T | null> => {
    return new Promise((resolve) => {
      try {
        browserAPI.runtime.sendMessage(message, (resp: T) => {
          void browserAPI.runtime.lastError;
          resolve(resp ?? null);
        });
      } catch {
        resolve(null);
      }
    });
  }, []);
}

import { useEffect, useState } from 'react';
import { browserAPI } from '@/lib/browser-api';

/**
 * Tracks the currently active tab in the current window. Resubscribes across
 * tab activation and URL updates — the sidebar persists, so we need to keep
 * re-syncing.
 */
export function useCurrentTab(): chrome.tabs.Tab | null {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const [t] = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (alive) setTab(t ?? null);
      } catch {
        if (alive) setTab(null);
      }
    };

    refresh();

    const onActivated = () => { refresh(); };
    const onUpdated: Parameters<typeof browserAPI.tabs.onUpdated.addListener>[0] = (_tabId, change) => {
      if (change.url || change.status === 'complete') refresh();
    };
    const onFocusChanged = () => { refresh(); };

    browserAPI.tabs.onActivated.addListener(onActivated);
    browserAPI.tabs.onUpdated.addListener(onUpdated);
    browserAPI.windows?.onFocusChanged?.addListener?.(onFocusChanged);

    return () => {
      alive = false;
      browserAPI.tabs.onActivated.removeListener(onActivated);
      browserAPI.tabs.onUpdated.removeListener(onUpdated);
      browserAPI.windows?.onFocusChanged?.removeListener?.(onFocusChanged);
    };
  }, []);

  return tab;
}

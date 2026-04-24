import { useCallback, useEffect, useRef, useState } from 'react';
import { browserAPI } from '@/lib/browser-api';
import type { LiveCookiesResponse, LiveCookie, LiveTracker, StorageEntry } from '@/ui/types/messages';

export interface LiveData {
  cookies: LiveCookie[];
  trackers: LiveTracker[];
  localStorage: StorageEntry[];
  sessionStorage: StorageEntry[];
  hostname: string;
  url: string;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Simplified live cookie/storage hook.
 * Queries background for cookies + content script for storage.
 * Re-fetches on tab activation, URL change, and cookie changes.
 */
export function useLiveCookies(): LiveData {
  const [cookies, setCookies] = useState<LiveCookie[]>([]);
  const [trackers, setTrackers] = useState<LiveTracker[]>([]);
  const [ls, setLs] = useState<StorageEntry[]>([]);
  const [ss, setSs] = useState<StorageEntry[]>([]);
  const [hostname, setHostname] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      // Get active tab
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (!mountedRef.current) return;

      if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) {
        setCookies([]);
        setTrackers([]);
        setLs([]);
        setSs([]);
        setHostname('');
        setUrl(tab?.url || '');
        setLoading(false);
        setError(null);
        return;
      }

      // Get cookies from background
      const resp = await new Promise<LiveCookiesResponse | null>((resolve) => {
        browserAPI.runtime.sendMessage({ type: 'getLiveCookies', tabId: tab.id }, (r) => {
          void browserAPI.runtime.lastError;
          resolve(r ?? null);
        });
      });

      if (!mountedRef.current) return;

      if (resp && resp.cookies) {
        setCookies(resp.cookies);
        setTrackers(resp.trackers ?? []);
        setHostname(resp.hostname || '');
        setUrl(resp.url || tab.url);
      } else {
        setCookies([]);
        setTrackers([]);
        setHostname('');
        setUrl(tab.url);
      }

      // Get storage from content script — retry if not ready yet
      const fetchStorage = (retriesLeft: number) => {
        browserAPI.tabs.sendMessage(tab.id!, { type: 'getStorage' }, (storageResp) => {
          void browserAPI.runtime.lastError;
          if (!mountedRef.current) return;
          if (storageResp && storageResp.type === 'storageData') {
            setLs(storageResp.localStorage || []);
            setSs(storageResp.sessionStorage || []);
          } else if (retriesLeft > 0) {
            setTimeout(() => fetchStorage(retriesLeft - 1), 500);
          }
        });
      };
      try {
        fetchStorage(3);
      } catch { /* content script not loaded */ }

      setError(null);
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  // Re-fetch on tab change
  useEffect(() => {
    const onActivated = () => { fetchData(); };
    browserAPI.tabs.onActivated.addListener(onActivated);
    return () => browserAPI.tabs.onActivated.removeListener(onActivated);
  }, [fetchData]);

  // Re-fetch on URL change
  useEffect(() => {
    const onUpdated: Parameters<typeof browserAPI.tabs.onUpdated.addListener>[0] = (_tabId, change) => {
      if (change.url || change.status === 'complete') {
        setTimeout(fetchData, 300); // small delay for cookies to settle
      }
    };
    browserAPI.tabs.onUpdated.addListener(onUpdated);
    return () => browserAPI.tabs.onUpdated.removeListener(onUpdated);
  }, [fetchData]);

  // Listen for cookiesChanged from background
  useEffect(() => {
    const onMessage = (msg: { type?: string }) => {
      if (msg?.type === 'cookiesChanged') fetchData();
    };
    browserAPI.runtime.onMessage.addListener(onMessage);
    return () => browserAPI.runtime.onMessage.removeListener(onMessage);
  }, [fetchData]);

  return { cookies, trackers, localStorage: ls, sessionStorage: ss, hostname, url, loading, error, refresh: fetchData };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentChildren } from 'preact';
import { browserAPI } from '@/lib/browser-api';
import { useSendMessage } from '@/ui/hooks/useMessage';
import { useCurrentTab } from '@/ui/hooks/useCurrentTab';
import type {
  ExtensionMessage,
  Report,
  ReportResponse,
  TestPhase,
  TestResponse,
  StateResponse
} from '@/ui/types/messages';

export type UIStatus = 'idle' | 'testing' | 'report' | 'error' | 'unsupported';

interface ScanContextValue {
  tab: chrome.tabs.Tab | null;
  status: UIStatus;
  phase: TestPhase;
  report: Report | null;
  error: string | null;
  runTest: () => Promise<void>;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: ComponentChildren }) {
  const tab = useCurrentTab();
  const send = useSendMessage();
  const [status, setStatus] = useState<UIStatus>('idle');
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTabId = useRef<number | null>(null);

  const clearPoll = () => {
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
  };

  const applyReport = (r: Report, tabId: number) => {
    if (activeTabId.current !== tabId) return;
    setReport(r);
    setPhase(r.phase);
    setStatus('report');
  };

  const loadStateFor = useCallback(async (tabId: number) => {
    const resp = await send<StateResponse>({ type: 'getState', tabId });
    if (activeTabId.current !== tabId) return;
    if (resp?.report) {
      applyReport(resp.report, tabId);
    } else if (resp?.phase === 'testing') {
      setPhase('testing');
      setStatus('testing');
      pollUntilReport(tabId);
    } else {
      setReport(null);
      setPhase('idle');
      setStatus('idle');
    }
  }, [send]);

  const pollUntilReport = useCallback((tabId: number, windowMs = 6000) => {
    clearPoll();
    const deadline = Date.now() + windowMs + 2000;
    const tick = async () => {
      if (activeTabId.current !== tabId) return;
      if (Date.now() > deadline) {
        const r = await send<ReportResponse>({ type: 'getReport', tabId });
        if (r?.report && activeTabId.current === tabId) applyReport(r.report, tabId);
        return;
      }
      const s = await send<StateResponse>({ type: 'getState', tabId });
      if (activeTabId.current !== tabId) return;
      if (s?.report) {
        applyReport(s.report, tabId);
        return;
      }
      pollTimer.current = setTimeout(tick, 500);
    };
    pollTimer.current = setTimeout(tick, 500);
  }, [send]);

  useEffect(() => {
    clearPoll();
    setError(null);
    // Immediately clear old tab's data so stale results don't show during tab switch
    setReport(null);
    setStatus('idle');
    setPhase('idle');

    if (!tab || !tab.id) {
      activeTabId.current = null;
      setStatus('unsupported');
      return;
    }

    activeTabId.current = tab.id;

    if (!tab.url || !/^https?:/i.test(tab.url)) {
      setStatus('unsupported');
      return;
    }

    loadStateFor(tab.id);
  }, [tab?.id, tab?.url, loadStateFor]);

  useEffect(() => {
    const onMessage = (msg: ExtensionMessage) => {
      if (!activeTabId.current) return;
      if ((msg?.type === 'reportReady' || msg?.type === 'reportUpdated') &&
          msg.tabId === activeTabId.current) {
        send<ReportResponse>({ type: 'getReport', tabId: msg.tabId }).then((r) => {
          if (r?.report && activeTabId.current === msg.tabId) {
            applyReport(r.report, msg.tabId);
          }
        });
      }
    };
    browserAPI.runtime.onMessage.addListener(onMessage);
    return () => browserAPI.runtime.onMessage.removeListener(onMessage);
  }, [send]);

  const runTest = useCallback(async () => {
    if (!tab?.id) return;
    const tabId = tab.id;
    setError(null);
    setStatus('testing');
    setPhase('testing');
    const resp = await send<TestResponse>({ type: 'runTest', tabId });
    if (resp?.error) {
      setError(resp.error);
      setStatus('error');
      setPhase('idle');
      return;
    }
    pollUntilReport(tabId, resp?.scanWindowMs || 6000);
  }, [tab?.id, send, pollUntilReport]);

  const value = useMemo<ScanContextValue>(() => ({
    tab, status, phase, report, error, runTest
  }), [tab, status, phase, report, error, runTest]);

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScanState(): ScanContextValue {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScanState must be used within ScanProvider');
  return ctx;
}

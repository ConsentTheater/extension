import { ShieldCheck, Broom, ClipboardText, ArrowClockwise, Broadcast, FilePdf, FileCode } from '@phosphor-icons/react';
import { browserAPI } from '@/lib/browser-api';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/ui/components/ui/alert';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { Skeleton } from '@/ui/components/ui/skeleton';
import { Badge } from '@/ui/components/ui/badge';
import { Stats } from '@/ui/components/scan/Stats';
import { useScanState } from '@/ui/state/ScanContext';
import { useState } from 'react';
import type { Report, CapturedCookie, CapturedRequest } from '@/ui/types/messages';
import type { ConsentBurden } from '@/lib/tracker-matcher';

const BURDEN_ORDER: Record<ConsentBurden, number> = {
  required_strict: 0, required: 1, contested: 2, minimal: 3
};

const BURDEN_LABEL: Record<ConsentBurden, string> = {
  required_strict: 'consent required (strict)',
  required: 'consent required',
  contested: 'contested',
  minimal: 'minimal'
};

export function TestView() {
  const { status, phase, report, tab, error, runTest } = useScanState();

  if (status === 'unsupported') {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle className="text-sm">Can't test this page</AlertTitle>
        <AlertDescription className="text-xs">
          ConsentTheater only works on http:// and https:// pages.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle className="text-sm">Scan failed</AlertTitle>
        <AlertDescription className="text-xs">{error || 'Unknown error'}</AlertDescription>
      </Alert>
    );
  }

  if (status === 'idle') {
    return <IdleView onRunTest={runTest} url={tab?.url} />;
  }

  if (status === 'testing') {
    return <TestingView url={tab?.url} />;
  }

  if (status === 'report' && report) {
    return <ReportView report={report} onRetest={runTest} url={tab?.url} monitoring={phase === 'monitoring'} />;
  }

  return <LoadingView />;
}

function IdleView({ onRunTest, url }: { onRunTest: () => void; url?: string }) {
  let host = '';
  try { if (url) host = new URL(url).hostname; } catch { /* ignore */ }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ShieldCheck size={22} weight="duotone" className="mt-0.5 shrink-0 text-link" />
            <div>
              <h2 className="text-sm font-semibold">Check {host || 'this page'}</h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Wipes this site's cookies and stored data, reloads the page, and watches for
                trackers that fire before you click Accept on the cookie banner.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onRunTest} size="lg" className="w-full">
        <Broom size={16} weight="regular" />
        Check this site
      </Button>

      <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
        We'll clear the site's cookies and storage, then reload the page for you.<br />
        For the cleanest result, open the site in a private window first.
      </p>
    </div>
  );
}

function TestingView({ url }: { url?: string }) {
  let host = '';
  try { if (url) host = new URL(url).hostname; } catch { /* ignore */ }
  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-link" />
            <div>
              <p className="text-sm font-medium">Checking {host || 'page'}...</p>
              <p className="text-xs text-muted-foreground">Clearing stored data, reloading, watching for trackers.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-16" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
      <Skeleton className="h-20" />
    </div>
  );
}

function ReportView({ report, onRetest, url, monitoring }: { report: Report; onRetest: () => void; url?: string; monitoring?: boolean }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = formatReport(report, url || '');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('clipboard failed', e);
    }
  };

  const onExportPdf = async () => {
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const reportUrl = browserAPI.runtime.getURL(`ui/report.html?tabId=${tab.id}`);
      await browserAPI.tabs.create({ url: reportUrl });
    } catch (e) {
      console.error('export failed', e);
    }
  };

  const onExportHar = async () => {
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const res = await new Promise<{ har?: object; error?: string }>((resolve) => {
        browserAPI.runtime.sendMessage({ type: 'getHar', tabId: tab.id }, (r) => {
          void browserAPI.runtime.lastError;
          resolve(r || {});
        });
      });
      if (!res.har) {
        console.warn('no HAR available:', res.error);
        return;
      }
      const json = JSON.stringify(res.har, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      let host = 'scan';
      try { if (tab.url) host = new URL(tab.url).hostname; } catch { /* ignore */ }
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `consenttheater-${host}-${ts}.har`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('HAR export failed', e);
    }
  };

  const preCookies = report.cookies.filter(c => c.beforeConsent);
  const preRequests = report.requests.filter(r => r.beforeConsent);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {monitoring && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <Broadcast size={14} weight="fill" className="text-link animate-pulse" />
              <span className="text-xs text-link">Still watching — new trackers pop up here as you use the page</span>
            </div>
          )}
          <Stats report={report} />
          <BannerCard report={report} />
          <ObservedSection title="Cookies set before consent" items={preCookies} kind="cookie" />
          <ObservedSection title="Requests fired before consent" items={preRequests} kind="request" />
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-background p-3">
        <Button variant="outline" onClick={onCopy} className="flex-1 min-w-[5rem]">
          <ClipboardText size={14} weight="regular" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="outline" onClick={onExportPdf} className="flex-1 min-w-[5rem]">
          <FilePdf size={14} weight="regular" />
          PDF
        </Button>
        <Button variant="outline" onClick={onExportHar} className="flex-1 min-w-[5rem]" title="HTTP Archive 1.2 — opens in Charles, HTTPToolkit, browser DevTools">
          <FileCode size={14} weight="regular" />
          HAR
        </Button>
        <Button onClick={onRetest} className="flex-1 min-w-[5rem]">
          <ArrowClockwise size={14} weight="regular" />
          Retest
        </Button>
      </div>
    </div>
  );
}

function BannerCard({ report }: { report: Report }) {
  const b = report.banner;
  if (!b || !b.detected) {
    return (
      <Card>
        <CardContent className="p-3 text-xs">
          <p className="font-semibold mb-1">Consent banner</p>
          <p className="text-muted-foreground">No consent banner detected on this page.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-3 text-xs space-y-1">
        <p className="font-semibold">Consent banner</p>
        <p className="text-muted-foreground">
          Accept: {b.hasAcceptButton ? 'yes' : 'no'} · Reject: {b.hasRejectButton ? 'yes' : 'no'} · Manage: {b.hasManageButton ? 'yes' : 'no'}
        </p>
        {report.stats.consentAction && (
          <p className="text-muted-foreground">You clicked: <span className="font-medium text-foreground">{report.stats.consentAction}</span></p>
        )}
      </CardContent>
    </Card>
  );
}

function ObservedSection({ title, items, kind }: { title: string; items: (CapturedCookie | CapturedRequest)[]; kind: 'cookie' | 'request' }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-3 text-xs">
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-muted-foreground">None observed.</p>
        </CardContent>
      </Card>
    );
  }
  const sorted = [...items].sort((a, b) => (BURDEN_ORDER[a.consent_burden] ?? 9) - (BURDEN_ORDER[b.consent_burden] ?? 9));
  return (
    <Card>
      <CardContent className="p-3 text-xs">
        <p className="font-semibold mb-2">{title} <span className="text-muted-foreground font-normal">({items.length})</span></p>
        <ul className="space-y-1.5">
          {sorted.map((it, i) => {
            const label = kind === 'cookie' ? (it as CapturedCookie).name : (it as CapturedRequest).hostname;
            const sub = it.company ? `${it.company}${it.service ? ' · ' + it.service : ''}` : null;
            return (
              <li key={`${kind}-${label}-${i}`} className="flex items-center gap-2">
                <Badge variant={it.consent_burden} className="h-4 px-1.5 text-[8px] shrink-0">{it.consent_burden}</Badge>
                <span className="font-mono text-[10px] truncate flex-1" title={label}>{label}</span>
                {sub && <span className="text-[10px] text-muted-foreground truncate">{sub}</span>}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-16" />
      <Skeleton className="h-14" />
      <Skeleton className="h-24" />
    </div>
  );
}

function formatReport(report: Report, url: string): string {
  const preCookies = report.cookies.filter(c => c.beforeConsent);
  const preRequests = report.requests.filter(r => r.beforeConsent);
  const lines = [
    'ConsentTheater scan report',
    'URL:       ' + url,
    'Generated: ' + new Date().toISOString(),
    '',
    'Summary:',
    `  Cookies before consent:   ${report.stats.preConsentCookies}`,
    `  Requests before consent:  ${report.stats.preConsentRequests}`,
    `  Data-leak requests:       ${report.stats.dataLeakRequests}`,
    `  Banner detected:          ${report.stats.bannerDetected ? 'yes' : 'no'}`,
    `  Your consent click:       ${report.stats.consentAction || 'none'}`,
    ''
  ];
  if (preCookies.length) {
    lines.push(`Cookies set before consent (${preCookies.length}):`);
    preCookies.forEach((c, i) => {
      lines.push(`  ${i + 1}. [${BURDEN_LABEL[c.consent_burden]}] ${c.name}${c.company ? ' — ' + c.company : ''}`);
    });
    lines.push('');
  }
  if (preRequests.length) {
    lines.push(`Requests fired before consent (${preRequests.length}):`);
    preRequests.forEach((r, i) => {
      lines.push(`  ${i + 1}. [${BURDEN_LABEL[r.consent_burden]}] ${r.hostname}${r.company ? ' — ' + r.company : ''}`);
    });
    lines.push('');
  }
  lines.push('---', 'ConsentTheater shows what was observed; it does not issue verdicts.', 'https://consenttheater.org');
  return lines.join('\n');
}

import { ShieldCheck, Broom, ClipboardText, ArrowClockwise, Broadcast } from '@phosphor-icons/react';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/ui/components/ui/alert';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { Skeleton } from '@/ui/components/ui/skeleton';
import { Verdict } from '@/ui/components/scan/Verdict';
import { Stats } from '@/ui/components/scan/Stats';
import { ViolationList } from '@/ui/components/scan/ViolationList';
import { useScanState } from '@/ui/state/ScanContext';
import { useState } from 'react';
import type { Report } from '@/ui/types/messages';

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
          <Verdict report={report} />
          <Stats report={report} />
          <ViolationList violations={report.violations} />
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 flex gap-2 border-t bg-background p-3">
        <Button variant="outline" onClick={onCopy} className="flex-1">
          <ClipboardText size={14} weight="regular" />
          {copied ? 'Copied' : 'Copy report'}
        </Button>
        <Button onClick={onRetest} className="flex-1">
          <ArrowClockwise size={14} weight="regular" />
          Retest
        </Button>
      </div>
    </div>
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
  const lines = [
    'ConsentTheater GDPR Report',
    'URL:       ' + url,
    'Generated: ' + new Date().toISOString(),
    `Verdict:   ${report.band.label} (${report.score}/100)`,
    '',
    'Summary:',
    `  Cookies before consent:  ${report.stats.preConsentCookies}`,
    `  Requests before consent: ${report.stats.preConsentRequests}`,
    `  Data-leak requests:      ${report.stats.dataLeakRequests}`,
    `  Banner detected:         ${report.stats.bannerDetected ? 'yes' : 'no'}`,
    ''
  ];
  if (report.violations.length === 0) {
    lines.push('No violations.');
  } else {
    lines.push(`Violations (${report.violations.length}):`);
    report.violations.forEach((v, i) => {
      lines.push(`  ${i + 1}. [${v.severity.toUpperCase()}] ${v.description}`);
      if (v.items?.length) {
        const names = v.items.map(it => it.name || it.hostname).filter(Boolean).join(', ');
        lines.push('     ' + names);
      }
    });
  }
  lines.push('', '---', 'ConsentTheater - https://consenttheater.org');
  return lines.join('\n');
}

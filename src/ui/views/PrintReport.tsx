import { Printer } from '@phosphor-icons/react';
import { Button } from '@/ui/components/ui/button';
import type { Report, CapturedCookie, CapturedRequest } from '@/ui/types/messages';
import type { ConsentBurden } from '@/lib/tracker-matcher';

const BURDEN_ORDER: Record<ConsentBurden, number> = {
  required_strict: 0, required: 1, contested: 2, minimal: 3
};

const BURDEN_LABEL: Record<ConsentBurden, string> = {
  required_strict: 'Consent required (strict)',
  required: 'Consent required',
  contested: 'Contested',
  minimal: 'Minimal'
};

const BURDEN_BG: Record<ConsentBurden, string> = {
  required_strict: 'bg-red-100 text-red-900 print:bg-red-50',
  required: 'bg-orange-100 text-orange-900 print:bg-orange-50',
  contested: 'bg-amber-100 text-amber-900 print:bg-amber-50',
  minimal: 'bg-slate-100 text-slate-700 print:bg-slate-50'
};

export function PrintReport({ report }: { report: Report }) {
  const generatedAt = new Date(report.finishedAt || Date.now());
  const origin = report.origin || '—';
  let host = '—';
  try { if (report.origin) host = new URL(report.origin).hostname; } catch { /* ignore */ }

  const preCookies = sortByBurden(report.cookies.filter(c => c.beforeConsent));
  const preRequests = dedupRequests(report.requests.filter(r => r.beforeConsent));
  const dataLeaks = dedupRequests(report.requests.filter(r => r.category === 'data_leak'));
  const otherCookies = sortByBurden(report.cookies.filter(c => !c.beforeConsent));
  const otherRequests = dedupRequests(report.requests.filter(r => !r.beforeConsent && r.category !== 'data_leak'));

  return (
    <>
      <div className="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Use your browser's <span className="font-medium text-foreground">Print → Save as PDF</span> to export this report.
          </p>
          <Button onClick={() => window.print()} size="sm">
            <Printer size={14} weight="regular" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8 print:px-0 print:py-4 print:max-w-none">
        <header className="mb-6 border-b pb-4">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">ConsentTheater scan report</h1>
            <span className="font-mono text-xs text-muted-foreground">consenttheater.org</span>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Row term="Site"><span className="font-mono break-all">{host}</span></Row>
            <Row term="Origin"><span className="font-mono break-all">{origin}</span></Row>
            <Row term="Scanned at">{generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC</Row>
            <Row term="Local time">{generatedAt.toLocaleString()}</Row>
          </dl>
        </header>

        <Section title="Summary">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={report.stats.preConsentCookies} label="Cookies before consent" emphasis={report.stats.preConsentCookies > 0} />
            <Stat value={report.stats.preConsentRequests} label="Requests before consent" emphasis={report.stats.preConsentRequests > 0} />
            <Stat value={report.stats.dataLeakRequests} label="Data-leak requests" emphasis={report.stats.dataLeakRequests > 0} />
            <Stat value={report.stats.totalCookies + report.stats.totalRequests} label="Total observations" />
          </div>
        </Section>

        <Section title="Consent banner">
          <BannerPanel report={report} />
        </Section>

        <Section title={`Cookies set before consent (${preCookies.length})`}>
          {preCookies.length === 0
            ? <Empty>No cookies were set before the user resolved the consent banner.</Empty>
            : <CookieTable cookies={preCookies} />}
        </Section>

        <Section title={`Requests fired before consent (${preRequests.length})`}>
          {preRequests.length === 0
            ? <Empty>No third-party requests fired before the user resolved the consent banner.</Empty>
            : <RequestTable requests={preRequests} />}
        </Section>

        {dataLeaks.length > 0 && (
          <Section title={`Data-leak requests (${dataLeaks.length})`}>
            <p className="mb-2 text-xs text-muted-foreground leading-relaxed">
              Requests categorised as <span className="font-mono">data_leak</span> in the Playbill catalogue.
              These exfiltrate IP / user-agent to third parties even when the request itself looks benign
              (web fonts, embedded video, hosted libraries). Multiple EU rulings (Austrian DPA 2022,
              LG München 2022) treat these as personal-data transfers regardless of consent.
            </p>
            <RequestTable requests={dataLeaks} />
          </Section>
        )}

        {otherCookies.length > 0 && (
          <Section title={`Cookies set after consent (${otherCookies.length})`}>
            <CookieTable cookies={otherCookies} />
          </Section>
        )}

        {otherRequests.length > 0 && (
          <Section title={`Other third-party requests (${otherRequests.length})`}>
            <RequestTable requests={otherRequests} />
          </Section>
        )}

        <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground space-y-1">
          <p>
            ConsentTheater records what was observed during a single scan; it does not issue compliance
            verdicts. Whether the observations above amount to a GDPR / ePrivacy violation is a legal
            question for a Data Protection Authority, a court, or your DPO.
          </p>
          <p>
            Tracker classification courtesy of{' '}
            <span className="font-mono">@consenttheater/playbill</span> — open-source GDPR tracker
            knowledge base. Report generated by ConsentTheater browser extension. Source:
            <span className="font-mono"> github.com/ConsentTheater/extension</span>.
          </p>
        </footer>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <section className="mb-6 print:mb-4 print:break-inside-avoid">
      <h2 className="mb-2 border-b pb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Row({ term, children }: { term: string; children: preact.ComponentChildren }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground min-w-[6rem]">{term}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function Stat({ value, label, emphasis }: { value: number; label: string; emphasis?: boolean }) {
  return (
    <div className={`rounded border p-3 ${emphasis ? 'border-red-300 bg-red-50/50 print:bg-red-50' : 'border-border'}`}>
      <div className={`text-2xl font-bold tabular-nums ${emphasis ? 'text-red-700' : 'text-foreground'}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}

function BannerPanel({ report }: { report: Report }) {
  const b = report.banner;
  if (!b || !b.detected) {
    return <p className="text-sm text-muted-foreground">No consent banner was detected on this page during the scan.</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
      <Row term="Detected">Yes</Row>
      <Row term="Accept">{b.hasAcceptButton ? 'present' : 'missing'}</Row>
      <Row term="Reject">{b.hasRejectButton ? 'present' : 'missing'}</Row>
      <Row term="Manage">{b.hasManageButton ? 'present' : 'missing'}</Row>
      {report.stats.consentAction && (
        <Row term="User clicked"><span className="font-mono">{report.stats.consentAction}</span></Row>
      )}
      {b.textPreview && (
        <div className="col-span-2 sm:col-span-4 mt-2">
          <dt className="text-muted-foreground text-xs">Banner text excerpt</dt>
          <dd className="mt-1 rounded border bg-muted/30 px-2 py-1 font-mono text-[11px] leading-snug">{b.textPreview}</dd>
        </div>
      )}
    </dl>
  );
}

function CookieTable({ cookies }: { cookies: CapturedCookie[] }) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead className="text-left">
        <tr className="border-b">
          <Th className="w-[14%]">Burden</Th>
          <Th className="w-[26%]">Name</Th>
          <Th className="w-[24%]">Domain</Th>
          <Th className="w-[20%]">Company</Th>
          <Th className="w-[16%]">Service</Th>
        </tr>
      </thead>
      <tbody>
        {cookies.map((c, i) => (
          <tr key={`${c.name}-${c.domain}-${i}`} className="border-b border-border/40 align-top">
            <Td><BurdenChip value={c.consent_burden} /></Td>
            <Td><span className="font-mono break-all">{c.name}</span></Td>
            <Td><span className="font-mono break-all">{c.domain || '—'}</span></Td>
            <Td>{c.company || '—'}</Td>
            <Td>{c.service || '—'}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RequestTable({ requests }: { requests: CapturedRequest[] }) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead className="text-left">
        <tr className="border-b">
          <Th className="w-[14%]">Burden</Th>
          <Th className="w-[34%]">Hostname</Th>
          <Th className="w-[20%]">Company</Th>
          <Th className="w-[16%]">Service</Th>
          <Th className="w-[16%]">Category</Th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r, i) => (
          <tr key={`${r.hostname}-${i}`} className="border-b border-border/40 align-top">
            <Td><BurdenChip value={r.consent_burden} /></Td>
            <Td><span className="font-mono break-all">{r.hostname}</span></Td>
            <Td>{r.company || '—'}</Td>
            <Td>{r.service || '—'}</Td>
            <Td>{r.category ? r.category.replace(/_/g, ' ') : '—'}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children, className }: { children: preact.ComponentChildren; className?: string }) {
  return <th className={`py-1.5 pr-2 font-semibold text-muted-foreground ${className || ''}`}>{children}</th>;
}

function Td({ children }: { children: preact.ComponentChildren }) {
  return <td className="py-1.5 pr-2">{children}</td>;
}

function BurdenChip({ value }: { value: ConsentBurden }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${BURDEN_BG[value]}`} title={BURDEN_LABEL[value]}>
      {value.replace('_', ' ')}
    </span>
  );
}

function Empty({ children }: { children: preact.ComponentChildren }) {
  return <p className="rounded border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">{children}</p>;
}

function sortByBurden<T extends { consent_burden: ConsentBurden }>(items: T[]): T[] {
  return [...items].sort((a, b) => (BURDEN_ORDER[a.consent_burden] ?? 9) - (BURDEN_ORDER[b.consent_burden] ?? 9));
}

function dedupRequests(items: CapturedRequest[]): CapturedRequest[] {
  const seen = new Map<string, CapturedRequest>();
  for (const r of items) {
    if (!seen.has(r.hostname)) seen.set(r.hostname, r);
  }
  return sortByBurden(Array.from(seen.values()));
}

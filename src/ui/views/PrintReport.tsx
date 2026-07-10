import { Printer } from '@phosphor-icons/react';
import { useState } from 'preact/hooks';
import { Button } from '@/ui/components/ui/button';
import type { Report, CapturedCookie, CapturedRequest } from '@/ui/types/messages';
import type { ConsentBurden } from '@/lib/tracker-matcher';
import { reportStrings, REPORT_LANGS, type ReportLang, type ReportStrings } from '@/ui/i18n/report';

const BURDEN_ORDER: Record<ConsentBurden, number> = {
  required_strict: 0, required: 1, contested: 2, minimal: 3
};

const BURDEN_BG: Record<ConsentBurden, string> = {
  required_strict: 'bg-red-100 text-red-900 print:bg-red-50',
  required: 'bg-orange-100 text-orange-900 print:bg-orange-50',
  contested: 'bg-amber-100 text-amber-900 print:bg-amber-50',
  minimal: 'bg-slate-100 text-slate-700 print:bg-slate-50'
};

function H({ content }: { content: string }) {
  return <span dangerouslySetInnerHTML={{ __html: content }} />;
}

export function PrintReport({ report }: { report: Report }) {
  const [lang, setLang] = useState<ReportLang>('en');
  const t = reportStrings[lang];
  const generatedAt = new Date(report.finishedAt || Date.now());
  const origin = report.origin || '—';
  let host = '—';
  try { if (report.origin) host = new URL(report.origin).hostname; } catch { /* ignore */ }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const tzParts = tz.split('/');
  const tzCity = (tzParts[tzParts.length - 1] || '').replace(/_/g, ' ');
  const tzRegion = tzParts.length > 1 ? tzParts[0].replace(/_/g, ' ') : '';
  const locationLabel = tzCity ? (tzRegion ? `${tzCity}, ${tzRegion}` : tzCity) : '';

  const preCookies = sortByBurden(report.cookies.filter(c => c.beforeConsent));
  const preRequests = dedupRequests(report.requests.filter(r => r.beforeConsent));
  const dataLeaks = dedupRequests(report.requests.filter(r => r.category === 'data_leak'));
  const otherCookies = sortByBurden(report.cookies.filter(c => !c.beforeConsent));
  const otherRequests = dedupRequests(report.requests.filter(r => !r.beforeConsent && r.category !== 'data_leak'));

  return (
    <>
      <div className="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              <H content={t.toolbar} />
            </p>
            <select
              value={lang}
              onChange={(e) => setLang((e.target as HTMLSelectElement).value as ReportLang)}
              className="h-8 rounded border border-border bg-background px-2 text-xs font-medium text-foreground"
              aria-label="Report language"
            >
              {REPORT_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={() => window.print()} size="sm">
            <Printer size={14} weight="regular" />
            {t.print}
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8 print:px-0 print:py-4 print:max-w-none">
        <header className="mb-6 border-b pb-4">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <span className="font-mono text-xs text-muted-foreground">consenttheater.org</span>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Row term={t.site}><span className="font-mono break-all">{host}</span></Row>
            <Row term={t.origin}><span className="font-mono break-all">{origin}</span></Row>
            <Row term={t.scannedAt}>{generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC</Row>
            <Row term={t.localTime}>
              <span className="block">{generatedAt.toLocaleString()}</span>
              {locationLabel && <span className="block text-muted-foreground">{locationLabel}</span>}
            </Row>
          </dl>
        </header>

        {report.mode === 'live' && (
          <Section title={t.liveSnapshot} compact>
            <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 print:bg-amber-50 leading-relaxed">
              <H content={t.liveSnapshotBody} />
            </p>
          </Section>
        )}

        <Section title={t.summary} compact>
          {report.mode === 'scan' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={report.stats.preConsentCookies} label={t.cookiesBeforeConsent} emphasis={report.stats.preConsentCookies > 0} />
              <Stat value={report.stats.preConsentRequests} label={t.requestsBeforeConsent} emphasis={report.stats.preConsentRequests > 0} />
              <Stat value={report.stats.dataLeakRequests} label={t.dataLeakRequests} emphasis={report.stats.dataLeakRequests > 0} />
              <Stat value={report.stats.totalCookies + report.stats.totalRequests} label={t.totalObservations} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat value={report.stats.totalCookies} label={t.cookiesOnPage} />
              <Stat value={report.stats.totalRequests} label={t.thirdPartyHosts} />
              <Stat value={report.stats.dataLeakRequests} label={t.dataLeakRequests} emphasis={report.stats.dataLeakRequests > 0} />
            </div>
          )}
        </Section>

        {report.mode === 'scan' && (
          <Section title={t.consentBanner} compact>
            <BannerPanel report={report} t={t} />
          </Section>
        )}

        {report.mode === 'scan' && (
          <Section title={t.howToRead} compact>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <H content={t.howToReadBody} />
            </p>
          </Section>
        )}

        {report.mode === 'scan' ? (
          <>
            <Section title={`${t.cookiesSetBefore} (${preCookies.length})`}>
              {preCookies.length === 0
                ? <Empty>{t.noCookiesBefore}</Empty>
                : <CookieTable cookies={preCookies} t={t} />}
            </Section>

            <Section title={`${t.requestsFiredBefore} (${preRequests.length})`}>
              {preRequests.length === 0
                ? <Empty>{t.noRequestsBefore}</Empty>
                : <RequestTable requests={preRequests} t={t} />}
            </Section>
          </>
        ) : (
          <>
            <Section title={`${t.cookiesOnPageTitle} (${report.cookies.length})`}>
              {report.cookies.length === 0
                ? <Empty>{t.noCookiesOnPage}</Empty>
                : <CookieTable cookies={sortByBurden(report.cookies)} t={t} />}
            </Section>

            <Section title={`${t.thirdPartyHostsTitle} (${dedupRequests(report.requests.filter(r => r.category !== 'data_leak')).length})`}>
              {report.requests.length === 0
                ? <Empty>{t.noThirdPartyHosts}</Empty>
                : <RequestTable requests={dedupRequests(report.requests.filter(r => r.category !== 'data_leak'))} t={t} />}
            </Section>
          </>
        )}

        {dataLeaks.length > 0 && (
          <Section title={`${t.dataLeakTitle} (${dataLeaks.length})`}>
            <p className="mb-2 text-xs text-muted-foreground leading-relaxed">
              <H content={t.dataLeakBody} />
            </p>
            <RequestTable requests={dataLeaks} t={t} />
          </Section>
        )}

        {report.mode === 'scan' && otherCookies.length > 0 && (
          <Section title={`${t.cookiesSetAfter} (${otherCookies.length})`}>
            <CookieTable cookies={otherCookies} t={t} />
          </Section>
        )}

        {report.mode === 'scan' && otherRequests.length > 0 && (
          <Section title={`${t.otherThirdParty} (${otherRequests.length})`}>
            <RequestTable requests={otherRequests} t={t} />
          </Section>
        )}

        <Section title={t.legend} compact>
          <div className="space-y-3 text-xs">
            <div>
              <p className="mb-1.5 font-semibold text-foreground">{t.consentBurden}</p>
              <p className="mb-2 text-muted-foreground leading-relaxed">
                <H content={t.consentBurdenDesc} />
              </p>
              <ul className="space-y-1">
                <LegendItem chip="required_strict" desc={t.burdenStrict} t={t} />
                <LegendItem chip="required" desc={t.burdenRequired} t={t} />
                <LegendItem chip="contested" desc={t.burdenContested} t={t} />
                <LegendItem chip="minimal" desc={t.burdenMinimal} t={t} />
              </ul>
            </div>
            <div>
              <p className="mb-1.5 font-semibold text-foreground">{t.categories}</p>
              <p className="text-muted-foreground leading-relaxed">
                <H content={t.categoriesBody} />
              </p>
            </div>
            <div>
              <p className="mb-1.5 font-semibold text-foreground">{t.beforeConsentTitle}</p>
              <p className="text-muted-foreground leading-relaxed">
                <H content={t.beforeConsentBody} />
              </p>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{t.caveatTitle}</strong>{' '}
                <H content={t.caveatBody} />
              </p>
            </div>
          </div>
        </Section>

        <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground space-y-1">
          <p>{t.footerLegal}</p>
          <p>
            Tracker classification courtesy of{' '}
            <a href="https://codeberg.org/ConsentTheater/playbill" target="_blank" rel="noopener" className="text-link hover:underline">
              <span className="font-mono">@consenttheater/playbill</span>
            </a>{' '}
            v{report.playbill?.packageVersion ?? '—'}{' '}
            (schema v{report.playbill?.schemaVersion ?? '—'}) —{' '}
            {report.playbill ? `${report.playbill.total.toLocaleString()} entries` : '—'}{' '}
            ({report.playbill ? report.playbill.cookies.toLocaleString() : '—'} cookies,{' '}
            {report.playbill ? report.playbill.domains.toLocaleString() : '—'} domains,{' '}
            {report.playbill ? report.playbill.companies.toLocaleString() : '—'} companies).
            {t.footerPlaybill}
            <span className="font-mono"> codeberg.org/ConsentTheater/extension</span>.
          </p>
        </footer>
      </main>
    </>
  );
}

function Section({ title, children, compact }: { title: string; children: preact.ComponentChildren; compact?: boolean }) {
  // `compact` (header / summary / banner) stays together on one printed page.
  // Long sections (cookie tables, request tables) are allowed to break across
  // pages — `print:break-inside-avoid` was forcing premature page breaks.
  return (
    <section className={`mb-6 print:mb-4 ${compact ? 'print:break-inside-avoid' : ''}`}>
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

function BannerPanel({ report, t }: { report: Report; t: ReportStrings }) {
  const b = report.banner;
  if (!b || !b.detected) {
    return (
      <p className="rounded border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        {t.bannerNotDetected}
      </p>
    );
  }
  return (
    <div className="rounded border bg-muted/20 px-3 py-2.5 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <BannerStatus label={t.bannerDetected} statusText={t.bannerPresent} present />
        <BannerStatus label={t.bannerAccept} statusText={t.bannerPresent} present={!!b.hasAcceptButton} missingText={t.bannerMissing} />
        <BannerStatus label={t.bannerReject} statusText={t.bannerPresent} present={!!b.hasRejectButton} missingText={t.bannerMissing} />
        <BannerStatus label={t.bannerManage} statusText={t.bannerPresent} present={!!b.hasManageButton} missingText={t.bannerMissing} />
        {report.stats.consentAction && (
          <span className="ml-auto text-xs text-muted-foreground">
            {t.userClicked} <span className="font-mono font-medium text-foreground">{report.stats.consentAction}</span>
          </span>
        )}
      </div>
      {b.textPreview && (
        <div className="border-t pt-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t.bannerTextExcerpt}</p>
          <p className="font-mono text-[11px] leading-snug text-foreground/80">{b.textPreview}</p>
        </div>
      )}
    </div>
  );
}

function BannerStatus({ label, present, statusText, missingText }: { label: string; present: boolean; statusText: string; missingText?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${present ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden />
      <span className="text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{present ? statusText : (missingText ?? statusText)}</span>
    </span>
  );
}

function CookieTable({ cookies, t }: { cookies: CapturedCookie[]; t: ReportStrings }) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead className="text-left">
        <tr className="border-b">
          <Th className="w-[14%]">{t.tableBurden}</Th>
          <Th className="w-[26%]">{t.tableName}</Th>
          <Th className="w-[24%]">{t.tableDomain}</Th>
          <Th className="w-[20%]">{t.tableCompany}</Th>
          <Th className="w-[16%]">{t.tableService}</Th>
        </tr>
      </thead>
      <tbody>
        {cookies.map((c, i) => (
          <tr key={`${c.name}-${c.domain}-${i}`} className="border-b border-border/40 align-top">
            <Td><BurdenChip value={c.consent_burden} t={t} /></Td>
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

function RequestTable({ requests, t }: { requests: CapturedRequest[]; t: ReportStrings }) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead className="text-left">
        <tr className="border-b">
          <Th className="w-[14%]">{t.tableBurden}</Th>
          <Th className="w-[34%]">{t.tableHostname}</Th>
          <Th className="w-[20%]">{t.tableCompany}</Th>
          <Th className="w-[16%]">{t.tableService}</Th>
          <Th className="w-[16%]">{t.tableCategory}</Th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r, i) => (
          <tr key={`${r.hostname}-${i}`} className="border-b border-border/40 align-top">
            <Td><BurdenChip value={r.consent_burden} t={t} /></Td>
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

function LegendItem({ chip, desc, t }: { chip: ConsentBurden; desc: string; t?: ReportStrings }) {
  return (
    <li className="flex items-start gap-2">
      <BurdenChip value={chip} t={t} />
      <span className="text-muted-foreground leading-relaxed">{desc}</span>
    </li>
  );
}

const BURDEN_DESC_KEY: Record<ConsentBurden, 'burdenStrict' | 'burdenRequired' | 'burdenContested' | 'burdenMinimal'> = {
  required_strict: 'burdenStrict',
  required: 'burdenRequired',
  contested: 'burdenContested',
  minimal: 'burdenMinimal'
};

function BurdenChip({ value, t }: { value: ConsentBurden; t?: ReportStrings }) {
  const title = t ? t[BURDEN_DESC_KEY[value]] : undefined;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${BURDEN_BG[value]}`} title={title}>
      {value.replace('_', '\u00a0')}
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

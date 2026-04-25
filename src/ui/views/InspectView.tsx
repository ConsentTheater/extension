import { MagnifyingGlass, Cookie, Globe, CaretDown, CaretUp, Eye } from '@phosphor-icons/react';
import { Card, CardContent, CardTitle } from '@/ui/components/ui/card';
import { Badge } from '@/ui/components/ui/badge';
import { Separator } from '@/ui/components/ui/separator';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { useScanState } from '@/ui/state/ScanContext';
import type { ConsentBurden } from '@/lib/tracker-matcher';
import type { CapturedCookie, CapturedRequest, Report } from '@/ui/types/messages';
import { useState } from 'react';

const BURDEN_ORDER: Record<ConsentBurden, number> = {
  required_strict: 0, required: 1, contested: 2, minimal: 3
};

interface CompanyGroup {
  company: string;
  categories: Set<string>;
  cookies: CapturedCookie[];
  requests: CapturedRequest[];
  worstBurden: ConsentBurden;
  hasPreConsent: boolean;
  preConsentCount: number;
}

function groupByCompany(report: Report): CompanyGroup[] {
  const map = new Map<string, { cookies: CapturedCookie[]; requests: CapturedRequest[]; categories: Set<string> }>();

  for (const c of report.cookies) {
    const key = c.company || 'Unknown';
    if (!map.has(key)) map.set(key, { cookies: [], requests: [], categories: new Set() });
    const g = map.get(key)!;
    g.cookies.push(c);
    if (c.category) g.categories.add(c.category);
  }

  for (const r of report.requests) {
    const key = r.company || 'Unknown';
    if (!map.has(key)) map.set(key, { cookies: [], requests: [], categories: new Set() });
    const g = map.get(key)!;
    g.requests.push(r);
    if (r.category) g.categories.add(r.category);
  }

  return Array.from(map.entries())
    .map(([company, { cookies, requests, categories }]) => {
      const allItems = [...cookies, ...requests];
      const preConsentItems = allItems.filter(i => i.beforeConsent);
      const worstBurden = allItems.reduce<ConsentBurden>((worst, item) => {
        return BURDEN_ORDER[item.consent_burden] < BURDEN_ORDER[worst] ? item.consent_burden : worst;
      }, 'minimal');

      return {
        company, categories, cookies, requests,
        worstBurden,
        hasPreConsent: preConsentItems.length > 0,
        preConsentCount: preConsentItems.length
      };
    })
    .sort((a, b) => {
      // Sort by: pre-consent activity first, then by worst burden, then by name.
      if (a.hasPreConsent !== b.hasPreConsent) return a.hasPreConsent ? -1 : 1;
      const burdenDiff = BURDEN_ORDER[a.worstBurden] - BURDEN_ORDER[b.worstBurden];
      if (burdenDiff !== 0) return burdenDiff;
      return a.company.localeCompare(b.company);
    });
}

export function InspectView() {
  const { report, phase, status } = useScanState();

  if (status !== 'report' || !report) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <Eye size={28} weight="duotone" className="text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">No scan data yet</p>
          <p className="text-xs text-muted-foreground">Run a scan from the Scan tab to inspect detected trackers.</p>
        </div>
      </div>
    );
  }

  const companies = groupByCompany(report);

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={16} weight="bold" className="text-link" />
            <h2 className="font-display text-base font-semibold tracking-tight">Detected trackers</h2>
          </div>
          {phase === 'monitoring' && (
            <Badge variant="gold" className="text-[9px] animate-pulse">LIVE</Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {companies.length} {companies.length === 1 ? 'company' : 'companies'} detected
          {' · '}
          {report.stats.totalCookies} cookies · {report.stats.totalRequests} requests
        </p>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-4">
          {companies.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-xs text-muted-foreground">
                No known trackers detected on this page.
              </CardContent>
            </Card>
          ) : (
            companies.map(company => (
              <CompanyCard key={company.company} group={company} />
            ))
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
          <div className="grid grid-cols-2 gap-2">
            <SummaryCard icon={<Cookie size={14} weight="duotone" />} label="Cookies" value={report.stats.totalCookies} sub={`${report.stats.preConsentCookies} before consent`} />
            <SummaryCard icon={<Globe size={14} weight="duotone" />} label="Requests" value={report.stats.totalRequests} sub={`${report.stats.preConsentRequests} before consent`} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function CompanyCard({ group }: { group: CompanyGroup }) {
  const [expanded, setExpanded] = useState(false);
  const categoryLabels = Array.from(group.categories).join(', ');

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-3 pt-3 pb-2 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CardTitle className="text-sm truncate">{group.company}</CardTitle>
          <span className="shrink-0 text-[10px] text-muted-foreground truncate">{categoryLabels}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {group.hasPreConsent && (
            <Badge variant="required_strict" className="text-[8px] h-4 px-1.5">
              {group.preConsentCount} pre-consent
            </Badge>
          )}
          <Badge variant={group.worstBurden} className="text-[8px] h-4 px-1.5">
            {group.worstBurden}
          </Badge>
          {expanded ? <CaretUp size={12} className="text-muted-foreground" /> : <CaretDown size={12} className="text-muted-foreground" />}
        </div>
      </button>

      <CardContent className="px-3 pb-3">
        {/* Chips summary */}
        <div className="flex flex-wrap gap-1">
          {group.cookies.map(c => (
            <ChipItem key={`c-${c.name}-${c.domain}`} label={c.name} beforeConsent={c.beforeConsent} type="cookie" />
          ))}
          {group.requests.filter((r, i, arr) =>
            arr.findIndex(x => x.hostname === r.hostname) === i
          ).map(r => (
            <ChipItem key={`r-${r.hostname}`} label={r.hostname} beforeConsent={r.beforeConsent} type="domain" />
          ))}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {group.cookies.length > 0 && (
              <div>
                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cookies</h4>
                {group.cookies.map(c => (
                  <DetailRow key={`${c.name}-${c.domain}`}>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={c.consent_burden} className="text-[8px] h-4 px-1.5">{c.consent_burden}</Badge>
                      <span className="font-mono text-xs font-medium">{c.name}</span>
                      {c.beforeConsent && <span className="text-[9px] text-destructive font-semibold">PRE-CONSENT</span>}
                    </div>
                    {c.service && <p className="text-[10px] text-muted-foreground">{c.service}</p>}
                  </DetailRow>
                ))}
              </div>
            )}
            {group.requests.length > 0 && (
              <div>
                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requests</h4>
                {/* Dedupe by hostname for display */}
                {Array.from(new Map(group.requests.map(r => [r.hostname, r])).values()).map(r => (
                  <DetailRow key={r.hostname}>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={r.consent_burden} className="text-[8px] h-4 px-1.5">{r.consent_burden}</Badge>
                      <span className="font-mono text-xs">{r.hostname}</span>
                      {r.beforeConsent && <span className="text-[9px] text-destructive font-semibold">PRE-CONSENT</span>}
                    </div>
                    {r.service && <p className="text-[10px] text-muted-foreground">{r.service}{r.note ? ` — ${r.note}` : ''}</p>}
                  </DetailRow>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChipItem({ label, beforeConsent, type }: {
  label: string; beforeConsent: boolean; type: 'cookie' | 'domain';
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${
      beforeConsent ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-muted text-muted-foreground'
    }`}>
      {type === 'cookie' ? <Cookie size={9} weight="fill" /> : <Globe size={9} weight="fill" />}
      {label}
    </span>
  );
}

function DetailRow({ children }: { children: preact.ComponentChildren }) {
  return (
    <div className="rounded-sm border-l-2 border-border bg-muted/30 px-2 py-1.5 mb-1">
      {children}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: {
  icon: preact.ComponentChildren; label: string; value: number; sub: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-muted-foreground">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-base font-semibold tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

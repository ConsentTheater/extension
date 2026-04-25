import { useState } from 'react';
import { Cookie, Database, CaretDown, CaretUp, Warning, ShieldCheck, Globe, Trash, Flask, ArrowClockwise, GearSix, Broadcast, Question, Cloud } from '@phosphor-icons/react';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Separator } from '@/ui/components/ui/separator';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { useLiveCookies } from '@/ui/hooks/useLiveCookies';
import { browserAPI } from '@/lib/browser-api';
import type { LiveCookie, LiveTracker, StorageEntry } from '@/ui/types/messages';
import type { ConsentBurden } from '@/lib/tracker-matcher';
import { detectSuspiciousPattern, scanJsonValue } from '@/lib/pattern-detector';
import { UrlBar } from '@/ui/components/scan/UrlBar';

const TRACKER_CATEGORIES = new Set([
  'advertising', 'analytics', 'marketing', 'tag_manager',
  'data_leak', 'social', 'session_recording', 'fingerprinting'
]);
const CDN_CATEGORIES = new Set(['functional', 'security', 'consent']);

const BURDEN_ORDER: Record<string, number> = { required_strict: 0, required: 1, contested: 2, minimal: 3 };

function bucketTrackers(trackers: LiveTracker[]): { trackers: LiveTracker[]; cdn: LiveTracker[]; unknown: LiveTracker[] } {
  const out = { trackers: [] as LiveTracker[], cdn: [] as LiveTracker[], unknown: [] as LiveTracker[] };
  for (const t of trackers) {
    if (!t.category) out.unknown.push(t);
    else if (TRACKER_CATEGORIES.has(t.category)) out.trackers.push(t);
    else if (CDN_CATEGORIES.has(t.category)) out.cdn.push(t);
    else out.unknown.push(t); // unknown category → treat as unknown
  }
  const sortByImpact = (a: LiveTracker, b: LiveTracker) => {
    const sa = BURDEN_ORDER[a.consent_burden ?? 'minimal'] ?? 99;
    const sb = BURDEN_ORDER[b.consent_burden ?? 'minimal'] ?? 99;
    return sa - sb || b.count - a.count || a.hostname.localeCompare(b.hostname);
  };
  const sortByCount = (a: LiveTracker, b: LiveTracker) => b.count - a.count || a.hostname.localeCompare(b.hostname);
  out.trackers.sort(sortByImpact);
  out.cdn.sort(sortByImpact);
  out.unknown.sort(sortByCount);
  return out;
}

/** Convert cookie expirationDate (unix seconds) to human-readable lifetime */
function formatLifetime(expirationDate?: number): string | null {
  if (!expirationDate) return 'session';
  const now = Date.now() / 1000;
  const diff = expirationDate - now;
  if (diff <= 0) return 'expired';
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)} min`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hours`;
  if (diff < 604800) return `${Math.round(diff / 86400)} days`;
  if (diff < 2592000) return `${Math.round(diff / 604800)} weeks`;
  if (diff < 31536000) return `${Math.round(diff / 2592000)} months`;
  return `${(diff / 31536000).toFixed(1)} years`;
}

export function LiveView({ onSettingsOpen, url: pageUrl, supported }: { onSettingsOpen: () => void; url?: string; supported: boolean }) {
  const { cookies, trackers, localStorage, sessionStorage, hostname, loading, error, refresh } = useLiveCookies();
  const [clearing, setClearing] = useState(false);
  const [testing, setTesting] = useState(false);

  if (loading || testing) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-sm font-medium">{testing ? 'Running test...' : 'Loading...'}</p>
        <p className="text-xs text-muted-foreground">
          {testing ? 'Cookies cleared, page reloading. Waiting for trackers.' : 'Reading cookies and storage.'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <Warning size={28} weight="duotone" className="text-destructive" />
        <p className="text-sm font-medium">Error loading cookies</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}><ArrowClockwise size={14} /> Retry</Button>
      </div>
    );
  }

  if (!hostname) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <Warning size={28} weight="duotone" className="text-muted-foreground" />
        <p className="text-sm font-medium">No data available</p>
        <p className="text-xs text-muted-foreground">Open an http:// or https:// page to inspect cookies and storage.</p>
      </div>
    );
  }

  const trackerBuckets = bucketTrackers(trackers);
  const thirdPartyCookies = cookies.filter(c => c.isThirdParty);
  const knownCookies = cookies.filter(c => c.company);
  const unknownThirdParty = thirdPartyCookies.filter(c => !c.company);

  // Count suspected identifiers in storage
  const suspectedStorageCount = [...localStorage, ...sessionStorage].filter(e => {
    const s = detectSuspiciousPattern(e.key, e.value);
    const j = scanJsonValue(e.value);
    return s.level !== 'none' || j.length > 0;
  }).length;

  // Group by domain
  const domainGroups = groupByDomain(cookies);

  const handleTest = async () => {
    setTesting(true);
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { setTesting(false); return; }

      // Clear all cookies + storage
      await new Promise<void>((resolve) => {
        browserAPI.runtime.sendMessage({ type: 'clearAll', tabId: tab.id }, () => {
          void browserAPI.runtime.lastError;
          resolve();
        });
      });

      // Reload the page
      await browserAPI.tabs.reload(tab.id, { bypassCache: true });

      // Wait for page to fully load before refreshing cookie list
      // Don't refresh too early — otherwise shows "no cookies" briefly
      setTimeout(() => {
        refresh();
        setTimeout(() => {
          refresh();
          setTimeout(() => { setTesting(false); refresh(); }, 2000);
        }, 1500);
      }, 2000);
    } catch {
      setTesting(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { setClearing(false); return; }

      await new Promise<void>((resolve) => {
        browserAPI.runtime.sendMessage({ type: 'clearAll', tabId: tab.id }, () => {
          void browserAPI.runtime.lastError;
          resolve();
        });
      });

      // Wait for deletion to propagate, then refresh
      setTimeout(() => {
        refresh();
        setTimeout(() => { setClearing(false); refresh(); }, 800);
      }, 500);
    } catch {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky top: buttons → URL → timestamp → summary */}
      <div className="shrink-0 border-b">
        {/* Action toolbar — first thing user sees */}
        <div className="flex gap-2 px-3 py-3">
          <Button size="sm" onClick={handleTest} disabled={clearing || testing} className="flex-1 h-8 text-xs">
            <Flask size={14} />
            {testing ? 'Testing...' : 'Test'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearAll} disabled={clearing || testing} className="flex-1 h-8 text-xs">
            <Trash size={14} />
            {clearing ? 'Clearing...' : 'Clear'}
          </Button>
          <Button variant="outline" size="sm" onClick={onSettingsOpen} className="h-8 w-8 px-0 shrink-0">
            <GearSix size={14} />
          </Button>
        </div>

        {/* URL bar */}
        <UrlBar url={pageUrl} supported={supported} />

        {/* Timestamp */}
        <div className="bg-muted/30 px-4 py-1.5">
          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
            <span className="text-muted-foreground">{new Date().toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
            <span className="text-muted-foreground">{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-4 pt-1 pb-2 text-xs text-muted-foreground">
          <span><span className="font-mono font-semibold text-foreground">{cookies.length}</span> cookies</span>
          {thirdPartyCookies.length > 0 && (
            <span><span className="font-mono font-semibold text-warning">{thirdPartyCookies.length}</span> third-party</span>
          )}
          {knownCookies.length > 0 && (
            <span><span className="font-mono font-semibold text-foreground">{knownCookies.length}</span> identified</span>
          )}
          {localStorage.length > 0 && (
            <span><span className={`font-mono font-semibold ${suspectedStorageCount > 0 ? 'text-warning' : 'text-foreground'}`}>{localStorage.length}</span> localStorage</span>
          )}
          {sessionStorage.length > 0 && (
            <span><span className={`font-mono font-semibold ${suspectedStorageCount > 0 ? 'text-warning' : 'text-foreground'}`}>{sessionStorage.length}</span> sessionStorage</span>
          )}
          {trackers.length > 0 && (
            <span>
              <span className={`font-mono font-semibold ${trackerBuckets.trackers.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {trackers.length}
              </span> third-party call{trackers.length > 1 ? 's' : ''}
              {trackerBuckets.trackers.length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({trackerBuckets.trackers.length} tracker{trackerBuckets.trackers.length > 1 ? 's' : ''})
                </span>
              )}
            </span>
          )}
          {unknownThirdParty.length > 0 && (
            <span className="basis-full text-[11px] text-destructive">
              <Warning size={11} weight="fill" className="inline mr-1 -mt-px" />
              {unknownThirdParty.length} unknown third-party cookie{unknownThirdParty.length > 1 ? 's' : ''}
            </span>
          )}
          {suspectedStorageCount > 0 && (
            <span className="basis-full text-[11px] text-warning">
              <Warning size={11} weight="fill" className="inline mr-1 -mt-px" />
              {suspectedStorageCount} suspected identifier{suspectedStorageCount > 1 ? 's' : ''} in storage
            </span>
          )}
        </div>

      </div>

      <ScrollArea className="flex-1">

        {/* Cookie groups by domain */}
        <div className="flex flex-col gap-1.5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Cookies by domain
          </h3>
          {domainGroups.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center">
                <ShieldCheck size={22} weight="duotone" className="mx-auto mb-2 text-green-600" />
                <p className="text-xs text-muted-foreground">No cookies detected on this page.</p>
              </CardContent>
            </Card>
          ) : (
            domainGroups.map(group => (
              <DomainGroup key={group.domain} group={group} />
            ))
          )}
        </div>

        {/* Third-party calls — trackers, CDN/functional, and unknown zoo */}
        {trackers.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-3 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Third-party calls
              </h3>
              {trackerBuckets.trackers.length > 0 && (
                <TrackerBucket
                  title="Trackers"
                  tone="destructive"
                  icon={<Broadcast size={12} weight="fill" />}
                  items={trackerBuckets.trackers}
                  blurb="Known analytics / advertising / marketing calls — these usually need consent under GDPR."
                />
              )}
              {trackerBuckets.cdn.length > 0 && (
                <TrackerBucket
                  title="CDN & functional"
                  tone="muted"
                  icon={<Cloud size={12} weight="fill" />}
                  items={trackerBuckets.cdn}
                  blurb="Infrastructure calls (CDNs, anti-bot, consent tooling). Usually okay, but verify they're really strictly-necessary."
                />
              )}
              {trackerBuckets.unknown.length > 0 && (
                <TrackerBucket
                  title="Unknown third parties"
                  tone="warning"
                  icon={<Question size={12} weight="fill" />}
                  items={trackerBuckets.unknown}
                  blurb="Hosts we don't recognise. Could be innocent CDNs or unlisted trackers — worth a look."
                />
              )}
            </div>
          </>
        )}

        {/* Storage sections */}
        {(localStorage.length > 0 || sessionStorage.length > 0) && (
          <>
            <Separator />
            <div className="flex flex-col gap-2 p-4">
              {localStorage.length > 0 && (
                <StorageSection title="localStorage" entries={localStorage} icon={<Database size={14} weight="duotone" />} />
              )}
              {sessionStorage.length > 0 && (
                <StorageSection title="sessionStorage" entries={sessionStorage} icon={<Database size={14} weight="duotone" />} />
              )}
            </div>
          </>
        )}
      </ScrollArea>

      {/* Action buttons */}
    </div>
  );
}

// --- Sub-components ---

interface DomainGroupData {
  domain: string;
  cookies: LiveCookie[];
  isThirdParty: boolean;
  hasKnown: boolean;
  worstBurden: string | null;
}

function groupByDomain(cookies: LiveCookie[]): DomainGroupData[] {
  const map = new Map<string, LiveCookie[]>();
  for (const c of cookies) {
    const domain = c.domain.replace(/^\./, '');
    if (!map.has(domain)) map.set(domain, []);
    map.get(domain)!.push(c);
  }

  return Array.from(map.entries())
    .map(([domain, cookies]) => {
      const isThirdParty = cookies.some(c => c.isThirdParty);
      const hasKnown = cookies.some(c => c.company);
      const hasSuspected = cookies.some(c => c.suspicionLevel === 'high' || c.suspicionLevel === 'medium');

      // If ANY cookie in the group is suspected, treat as `required` burden minimum.
      let worstBurden = cookies.reduce<string | null>((worst, c) => {
        if (!c.consent_burden) return worst;
        if (!worst) return c.consent_burden;
        return (BURDEN_ORDER[c.consent_burden] ?? 4) < (BURDEN_ORDER[worst] ?? 4) ? c.consent_burden : worst;
      }, null);

      if (hasSuspected && (!worstBurden || BURDEN_ORDER[worstBurden] > BURDEN_ORDER['required'])) {
        worstBurden = 'required';
      }

      return { domain, cookies, isThirdParty, hasKnown, worstBurden };
    })
    .sort((a, b) => {
      // Third-party first, then by burden, then alpha
      if (a.isThirdParty !== b.isThirdParty) return a.isThirdParty ? -1 : 1;
      return a.domain.localeCompare(b.domain);
    });
}

function DomainGroup({ group }: { group: DomainGroupData; pageHostname?: string }) {
  const [expanded, setExpanded] = useState(group.isThirdParty);

  return (
    <Card className={
      group.worstBurden === 'required_strict' ? 'border-l-4 border-l-red-700' :
      group.worstBurden === 'required' ? 'border-l-4 border-l-warning' :
      group.isThirdParty ? 'border-l-4 border-l-neutral-400' : ''
    }>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {group.isThirdParty
            ? <Globe size={13} className="text-warning shrink-0" weight="fill" />
            : <Cookie size={13} className="text-muted-foreground shrink-0" weight="fill" />}
          <span className="font-mono text-xs truncate min-w-0">{group.domain}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">({group.cookies.length})</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {group.worstBurden && (
            <Badge variant={group.worstBurden as ConsentBurden} className="text-[8px] h-4 px-1.5">
              {group.worstBurden}
            </Badge>
          )}
          {group.isThirdParty && !group.hasKnown && (
            <Badge variant="destructive" className="text-[8px] h-4 px-1.5">unknown</Badge>
          )}
          {expanded ? <CaretUp size={10} /> : <CaretDown size={10} />}
        </div>
      </button>

      {expanded && (
        <CardContent className="px-3 pb-2 pt-0">
          {group.cookies.map(c => (
            <CookieRow key={`${c.name}-${c.domain}-${c.path}`} cookie={c} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function CookieRow({ cookie }: { cookie: LiveCookie }) {
  return (
    <div className="border-b border-border/50 last:border-0 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-medium text-foreground break-all">{cookie.name}</span>
        {cookie.consent_burden && (
          <Badge variant={cookie.consent_burden as ConsentBurden} className="text-[7px] h-3.5 px-1">
            {cookie.consent_burden}
          </Badge>
        )}
        {cookie.isThirdParty && !cookie.company && (
          <span className="text-[9px] text-destructive font-semibold">3RD PARTY</span>
        )}
        {cookie.suspicionLevel === 'high' && !cookie.company && (
          <span className="text-[9px] text-warning font-semibold">SUSPECTED ID</span>
        )}
      </div>
      {cookie.company && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {cookie.company} · {cookie.service}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground">
        expires: {formatLifetime(cookie.expirationDate)}
        {cookie.httpOnly && ' · httpOnly'}
        {cookie.secure && ' · secure'}
        {cookie.sameSite && cookie.sameSite !== 'unspecified' && ` · ${cookie.sameSite}`}
      </p>
      {cookie.description && (
        <p className="text-[10px] text-muted-foreground leading-snug">{cookie.description}</p>
      )}
      {cookie.suspicionReasons && cookie.suspicionReasons.length > 0 && !cookie.company && (
        <p className="text-[10px] text-warning leading-snug">
          ⚠ {cookie.suspicionReasons[0]}
        </p>
      )}
      <pre className="mt-0.5 max-h-16 overflow-auto whitespace-pre-wrap break-all bg-muted px-2 py-1 font-mono text-[10px] text-foreground/70">{cookie.value.slice(0, 300)}{cookie.value.length > 300 ? '...' : ''}</pre>
    </div>
  );
}

function StorageSection({ title, entries, icon }: { title: string; entries: StorageEntry[]; icon: preact.ComponentChildren }) {
  const [expanded, setExpanded] = useState(false);

  // Check if any entry has suspicious patterns
  const suspectedCount = entries.filter(e => {
    const s = detectSuspiciousPattern(e.key, e.value);
    const j = scanJsonValue(e.value);
    return s.level !== 'none' || j.length > 0;
  }).length;

  return (
    <Card className={suspectedCount > 0 ? 'border-l-4 border-l-warning' : ''}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium">{title}</span>
          <span className="text-[10px] text-muted-foreground">({entries.length} keys)</span>
          {suspectedCount > 0 && (
            <Badge variant="required" className="text-[7px] h-3.5 px-1">{suspectedCount} suspected</Badge>
          )}
        </div>
        {expanded ? <CaretUp size={10} /> : <CaretDown size={10} />}
      </button>
      {expanded && (
        <CardContent className="px-3 pb-2 pt-0">
          {entries.map(e => {
            const suspicion = detectSuspiciousPattern(e.key, e.value);
            const jsonFindings = scanJsonValue(e.value);
            const hasSuspicion = suspicion.level !== 'none' || jsonFindings.length > 0;
            return (
              <div key={e.key} className="border-b border-border/50 last:border-0 py-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-mono text-[10px] font-medium break-all">{e.key}</span>
                  <span className="text-[9px] text-muted-foreground">({e.size} bytes)</span>
                  {hasSuspicion && (
                    <span className="text-[9px] text-warning font-semibold">SUSPECTED ID</span>
                  )}
                </div>
                <pre className="mt-0.5 max-h-16 overflow-auto whitespace-pre-wrap break-all bg-muted px-2 py-1 font-mono text-[10px] text-foreground/70">{e.value.slice(0, 300)}</pre>
                {suspicion.level !== 'none' && suspicion.reasons.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-warning">⚠ {suspicion.reasons[0]}</p>
                )}
                {jsonFindings.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {jsonFindings.slice(0, 3).map((f, i) => (
                      <p key={i} className="text-[10px] text-warning">
                        ⚠ <span className="font-mono font-semibold">{f.key}</span>: <span className="font-mono">{f.value}</span>
                      </p>
                    ))}
                    {jsonFindings.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{jsonFindings.length - 3} more identifiers found</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

type BucketTone = 'destructive' | 'muted' | 'warning';

const BUCKET_TONES: Record<BucketTone, { border: string; title: string }> = {
  destructive: { border: 'border-l-destructive', title: 'text-destructive' },
  muted:       { border: 'border-l-muted-foreground', title: 'text-muted-foreground' },
  warning:     { border: 'border-l-warning', title: 'text-warning' }
};

function TrackerBucket({ title, tone, icon, items, blurb }: {
  title: string;
  tone: BucketTone;
  icon: preact.ComponentChildren;
  items: LiveTracker[];
  blurb: string;
}) {
  const [expanded, setExpanded] = useState(tone === 'destructive');
  const toneCls = BUCKET_TONES[tone];

  return (
    <Card className={`border-l-4 ${toneCls.border}`}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={toneCls.title}>{icon}</span>
          <span className={`text-xs font-semibold ${toneCls.title}`}>{title}</span>
          <span className="text-[10px] text-muted-foreground">
            ({items.length} host{items.length > 1 ? 's' : ''})
          </span>
        </div>
        {expanded ? <CaretUp size={10} /> : <CaretDown size={10} />}
      </button>
      {expanded && (
        <CardContent className="px-3 pb-2 pt-0 space-y-2 min-w-0">
          <p className="text-[10px] text-muted-foreground leading-snug break-words">{blurb}</p>
          <div className="flex flex-col gap-1 min-w-0">
            {items.map(t => <TrackerRow key={t.hostname} tracker={t} />)}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function TrackerRow({ tracker }: { tracker: LiveTracker }) {
  const burden = tracker.consent_burden as ConsentBurden | undefined;
  return (
    <div className="flex items-start gap-1.5 rounded-sm border-l-2 border-border bg-muted/30 px-2 py-1.5 min-w-0">
      <Globe size={11} weight="regular" className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="font-mono text-[11px] font-medium break-all min-w-0 flex-1">{tracker.hostname}</span>
          {burden && (
            <Badge variant={burden} className="text-[8px] h-3.5 px-1 shrink-0">{burden}</Badge>
          )}
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
            {tracker.count}×
          </span>
        </div>
        {(tracker.company || tracker.service) && (
          <p className="text-[10px] text-muted-foreground break-words">
            {tracker.company}{tracker.service ? ` · ${tracker.service}` : ''}
            {tracker.category ? ` · ${tracker.category.replace(/_/g, ' ')}` : ''}
          </p>
        )}
        {tracker.note && (
          <p className="text-[10px] text-muted-foreground italic leading-snug break-words">{tracker.note}</p>
        )}
      </div>
    </div>
  );
}

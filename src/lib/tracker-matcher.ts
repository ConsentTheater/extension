/**
 * Tracker-DB matching — pure functions. Used by the background (request/cookie pipeline)
 * and by tests. No browser API access here.
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category =
  | 'advertising' | 'analytics' | 'marketing' | 'functional'
  | 'tag_manager' | 'data_leak' | 'social' | 'session_recording'
  | 'security' | 'consent' | 'fingerprinting';

export interface CookieSignature {
  company: string;
  service: string;
  category: Category;
  description?: string;
  severity: Severity;
  pattern?: boolean;
  note?: string;
  lifetime?: string;
  docs_url?: string;
}

export interface DomainSignature {
  company: string;
  service: string;
  category: Category;
  severity: Severity;
  note?: string;
  lifetime?: string;
  docs_url?: string;
}

export interface TrackerDB {
  version: number;
  cookies: Record<string, CookieSignature>;
  domains: Record<string, DomainSignature>;
}

export interface CookieMatch extends CookieSignature {
  name: string;
  matchedPattern?: string;
}

export interface DomainMatch extends DomainSignature {
  hostname: string;
  matchedDomain?: string;
}

export function matchCookie(db: TrackerDB | null | undefined, cookieName: string): CookieMatch | null {
  if (!db?.cookies || !cookieName) return null;

  const exact = db.cookies[cookieName];
  if (exact) return { ...exact, name: cookieName };

  for (const key of Object.keys(db.cookies)) {
    const entry = db.cookies[key];
    if (!entry.pattern || !key.includes('*')) continue;
    const prefix = key.replace(/\*.*$/, '');
    if (prefix && cookieName.startsWith(prefix)) {
      return { ...entry, name: cookieName, matchedPattern: key };
    }
  }
  return null;
}

export function matchDomain(db: TrackerDB | null | undefined, hostname: string): DomainMatch | null {
  if (!db?.domains || !hostname) return null;
  const host = hostname.toLowerCase();

  const exact = db.domains[host];
  if (exact) return { ...exact, hostname: host, matchedDomain: host };

  for (const key of Object.keys(db.domains)) {
    if (host === key || host.endsWith('.' + key)) {
      return { ...db.domains[key], hostname: host, matchedDomain: key };
    }
  }
  return null;
}

export function isSameOrSubdomain(hostname: string, baseHost: string): boolean {
  if (!hostname || !baseHost) return false;
  const h = hostname.toLowerCase();
  const b = baseHost.toLowerCase();
  return h === b || h.endsWith('.' + b) || b.endsWith('.' + h);
}

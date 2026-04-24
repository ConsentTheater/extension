import { describe, it, expect } from 'vitest';
import { loadPlaybill } from '@consenttheater/playbill';
import { matchCookie, matchDomain, isSameOrSubdomain, type TrackerDB } from '../src/lib/tracker-matcher';

const db = loadPlaybill('full') as unknown as TrackerDB;

describe('matchCookie', () => {
  it('returns null for unknown cookie', () => {
    expect(matchCookie(db, 'some_random_cookie')).toBeNull();
  });

  it('matches exact known cookie', () => {
    const m = matchCookie(db, '_ga');
    expect(m).not.toBeNull();
    expect(m!.company).toBe('Google');
    expect(m!.severity).toBe('high');
    expect(m!.name).toBe('_ga');
  });

  it('matches pattern cookies', () => {
    const m = matchCookie(db, '_ga_ABC123XYZ');
    expect(m).not.toBeNull();
    expect(m!.company).toBe('Google');
    expect(m!.matchedPattern).toBe('_ga_*');
  });

  it('does not match pattern prefix on unrelated name', () => {
    expect(matchCookie(db, '_g')).toBeNull();
  });

  it('returns null for null/empty inputs', () => {
    expect(matchCookie(null, '_ga')).toBeNull();
    expect(matchCookie(db, '')).toBeNull();
  });

  it('matches critical ad cookies', () => {
    expect(matchCookie(db, '_fbp')!.severity).toBe('critical');
    expect(matchCookie(db, '_gcl_au')!.severity).toBe('critical');
  });
});

describe('matchDomain', () => {
  it('matches exact domain', () => {
    const m = matchDomain(db, 'google-analytics.com');
    expect(m!.company).toBe('Google');
  });

  it('matches subdomain', () => {
    const m = matchDomain(db, 'analytics.google-analytics.com');
    expect(m).not.toBeNull();
    expect(m!.matchedDomain).toBe('google-analytics.com');
  });

  it('matches deep subdomain', () => {
    const m = matchDomain(db, 'stats.g.doubleclick.net');
    expect(m).not.toBeNull();
    expect(m!.severity).toBe('critical');
  });

  it('returns null for unknown host', () => {
    expect(matchDomain(db, 'example.com')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(matchDomain(db, 'GOOGLE-ANALYTICS.COM')!.company).toBe('Google');
  });
});

describe('isSameOrSubdomain', () => {
  it('true for identical hosts', () => { expect(isSameOrSubdomain('a.com', 'a.com')).toBe(true); });
  it('true for subdomain of base', () => { expect(isSameOrSubdomain('sub.a.com', 'a.com')).toBe(true); });
  it('true when base is subdomain of host', () => { expect(isSameOrSubdomain('a.com', 'sub.a.com')).toBe(true); });
  it('false for unrelated', () => { expect(isSameOrSubdomain('a.com', 'b.com')).toBe(false); });
  it('false for empty', () => { expect(isSameOrSubdomain('', 'a.com')).toBe(false); });
});

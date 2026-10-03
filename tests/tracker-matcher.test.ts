import { describe, it, expect } from 'vitest';
import { loadPlaybill } from '@consenttheater/playbill';
import { matchCookie, matchDomain, isSameOrSubdomain, type TrackerDB } from '../src/lib/tracker-matcher';
import { prettyJsonValue, scanJsonValue } from '../src/lib/pattern-detector';

const db = loadPlaybill('full') as unknown as TrackerDB;

describe('matchCookie', () => {
  it('returns null for unknown cookie', () => {
    expect(matchCookie(db, 'some_random_cookie')).toBeNull();
  });

  it('matches exact known cookie', () => {
    const m = matchCookie(db, '_ga');
    expect(m).not.toBeNull();
    expect(m!.company).toBe('Google');
    expect(m!.consent_burden).toBe('required');
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

  it('matches required_strict ad cookies', () => {
    expect(matchCookie(db, '_fbp')!.consent_burden).toBe('required_strict');
    expect(matchCookie(db, '_gcl_au')!.consent_burden).toBe('required_strict');
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
    expect(m!.consent_burden).toBe('required_strict');
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

describe('prettyJsonValue', () => {
  const encoded = '%7B%22version%22%3A%221.0%22%2C%22timestamp%22%3A1791018747831%2C%22categories%22%3A%7B%22essential%22%3Atrue%2C%22functional%22%3Atrue%2C%22analytics%22%3Atrue%2C%22marketing%22%3Atrue%7D%7D';
  it('decodes percent-encoded JSON', () => {
    expect(prettyJsonValue(encoded)).toBe(JSON.stringify(JSON.parse(decodeURIComponent(encoded)), null, 2));
  });
  it('pretty-prints plain stringified JSON', () => {
    expect(prettyJsonValue('{"a":1}')).toBe('{\n  "a": 1\n}');
  });
  it('returns null for non-JSON and scalars', () => {
    expect(prettyJsonValue('plain-string')).toBeNull();
    expect(prettyJsonValue('123')).toBeNull();
  });
  it('pretty-prints OneTrust-style key=value payloads', () => {
    const v = 'isGpcEnabled=0&datestamp=Sat+Oct+03+2026&consentId=dc2561eb-c0df-495a-8229-1f31717bbb42&landingPath=https%3A%2F%2Fwww.iru.com%2F';
    expect(prettyJsonValue(v)).toBe(
      'isGpcEnabled: 0\ndatestamp: Sat Oct 03 2026\nconsentId: dc2561eb-c0df-495a-8229-1f31717bbb42\nlandingPath: https://www.iru.com/'
    );
  });
  it('returns null for single-pair and malformed strings', () => {
    expect(prettyJsonValue('session=abc123')).toBeNull();
    expect(prettyJsonValue('a=1&noequalsign')).toBeNull();
  });
});

describe('scanJsonValue', () => {
  it('finds identifiers in percent-encoded JSON', () => {
    expect(scanJsonValue('%7B%22user_id%22%3A%22abc123def45%22%7D').length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { computeScore, bandForScore, SEVERITY_WEIGHTS } from '../src/lib/risk-score';

describe('bandForScore', () => {
  it('90+ is Compliant', () => {
    expect(bandForScore(100).key).toBe('compliant');
    expect(bandForScore(90).key).toBe('compliant');
  });
  it('70-89 is At Risk', () => {
    expect(bandForScore(89).key).toBe('at_risk');
    expect(bandForScore(70).key).toBe('at_risk');
  });
  it('40-69 is Non-Compliant', () => {
    expect(bandForScore(69).key).toBe('non_compliant');
    expect(bandForScore(40).key).toBe('non_compliant');
  });
  it('<40 is Violating', () => {
    expect(bandForScore(39).key).toBe('violating');
    expect(bandForScore(0).key).toBe('violating');
  });
});

describe('computeScore', () => {
  it('returns 100/compliant on empty input', () => {
    const r = computeScore({});
    expect(r.score).toBe(100);
    expect(r.band.key).toBe('compliant');
    expect(r.violations).toEqual([]);
  });

  it('deducts 25 for critical cookie violation', () => {
    const r = computeScore({
      preConsentCookies: [{ name: '_fbp', company: 'Meta', severity: 'critical' }]
    });
    expect(r.score).toBe(100 - SEVERITY_WEIGHTS.critical);
    expect(r.band.key).toBe('at_risk');
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]!.type).toBe('critical_cookies_before_consent');
  });

  it('groups multiple cookies of same severity into one violation', () => {
    const r = computeScore({
      preConsentCookies: [
        { name: '_fbp', company: 'Meta', severity: 'critical' },
        { name: '_gcl_au', company: 'Google', severity: 'critical' }
      ]
    });
    const crits = r.violations.filter(v => v.severity === 'critical');
    expect(crits).toHaveLength(1);
    expect(crits[0]!.count).toBe(2);
    expect(r.score).toBe(75);
  });

  it('stacks cookie + request violations', () => {
    const r = computeScore({
      preConsentCookies: [{ name: '_ga', company: 'Google', severity: 'high' }],
      preConsentRequests: [{ hostname: 'connect.facebook.net', company: 'Meta', severity: 'critical' }]
    });
    expect(r.score).toBe(100 - 15 - 25);
    expect(r.band.key).toBe('non_compliant');
  });

  it('flags banner missing reject', () => {
    const r = computeScore({
      banner: { detected: true, hasAcceptButton: true, hasRejectButton: false }
    });
    expect(r.violations.some(v => v.type === 'banner_missing_reject')).toBe(true);
    expect(r.score).toBe(85);
  });

  it('flags no banner when trackers present', () => {
    const r = computeScore({
      banner: { detected: false },
      preConsentCookies: [{ name: '_ga', company: 'Google', severity: 'high' }]
    });
    expect(r.violations.some(v => v.type === 'no_banner_with_trackers')).toBe(true);
  });

  it('does not flag missing banner if no trackers present', () => {
    const r = computeScore({ banner: { detected: false } });
    expect(r.violations.some(v => v.type === 'no_banner_with_trackers')).toBe(false);
    expect(r.score).toBe(100);
  });

  it('flags data leak requests', () => {
    const r = computeScore({
      dataLeakRequests: [
        { hostname: 'fonts.googleapis.com', company: 'Google', severity: 'medium', category: 'data_leak' }
      ]
    });
    expect(r.violations.some(v => v.type === 'data_leaks')).toBe(true);
  });

  it('clamps score at 0', () => {
    const r = computeScore({
      preConsentCookies: [
        { name: 'a', severity: 'critical' },
        { name: 'b', severity: 'critical' },
        { name: 'c', severity: 'critical' }
      ],
      preConsentRequests: [
        { hostname: 'x.com', severity: 'critical' },
        { hostname: 'y.com', severity: 'critical' }
      ]
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

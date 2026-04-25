/**
 * Observation types — what the background pipeline records during a scan.
 *
 * No verdicts, no scoring. ConsentTheater shows what was observed and lets the
 * user (or their lawyer / DPO / DPA) draw the conclusion. Aligns with
 * @consenttheater/playbill 0.2.x, which deliberately removed the scorer for
 * the same reason: we do not pretend to be a regulator.
 */
import type { ConsentBurden, Category } from './tracker-matcher';

export interface ObservedCookie {
  name: string;
  domain?: string;
  company?: string;
  service?: string;
  consent_burden: ConsentBurden;
  category?: Category;
  ts?: number;
}

export interface ObservedRequest {
  hostname: string;
  url?: string;
  company?: string;
  service?: string;
  consent_burden: ConsentBurden;
  category?: Category;
  note?: string;
  ts?: number;
}

export interface ObservedBanner {
  detected: boolean;
  hasAcceptButton?: boolean;
  hasRejectButton?: boolean;
  hasManageButton?: boolean;
  buttonCount?: number;
  textPreview?: string;
}

/**
 * Heuristic pattern detector for suspicious cookies/identifiers.
 *
 * Works WITHOUT the Playbill database — catches unknown trackers by analyzing
 * cookie names and values for identifier patterns. If it looks like a UUID,
 * hash, or tracking ID, it probably IS one, regardless of what the cookie is called.
 *
 * GDPR principle: any unique identifier set without explicit consent is a violation.
 * A cookie called "anonymous-id" containing a UUID is still personally identifiable data.
 */

export type SuspicionLevel = 'high' | 'medium' | 'low' | 'none';

export interface PatternMatch {
  level: SuspicionLevel;
  reasons: string[];
}

/** Cookie name patterns that suggest tracking/identification */
const SUSPICIOUS_NAME_PATTERNS: Array<{ pattern: RegExp; reason: string; level: SuspicionLevel }> = [
  // Name ends with _id, -id, Id, uid, uuid, tuid — very common pattern for identifiers
  { pattern: /[_-]id$/i, reason: 'Name ends with "_id" — likely a unique identifier', level: 'high' },
  { pattern: /Id$/, reason: 'Name ends with "Id" — likely a unique identifier', level: 'high' },
  { pattern: /[_-]uid$/i, reason: 'Name ends with "_uid" — unique user identifier', level: 'high' },
  { pattern: /[_-]tuid$/i, reason: 'Name ends with "_tuid" — tracking unique identifier', level: 'high' },
  { pattern: /[_-]guid$/i, reason: 'Name ends with "_guid" — globally unique identifier', level: 'high' },
  { pattern: /[_-]sid$/i, reason: 'Name ends with "_sid" — session identifier', level: 'medium' },
  { pattern: /[_-]cid$/i, reason: 'Name ends with "_cid" — client identifier', level: 'high' },
  { pattern: /[_-]vid$/i, reason: 'Name ends with "_vid" — visitor identifier', level: 'high' },
  { pattern: /[_-]pid$/i, reason: 'Name ends with "_pid" — persistent identifier', level: 'high' },

  // Direct identifier keywords
  { pattern: /uuid/i, reason: 'Contains "uuid" — likely a unique identifier', level: 'high' },
  { pattern: /\buid\b/i, reason: 'Contains "uid" — user identifier', level: 'high' },
  { pattern: /user.?id/i, reason: 'Contains "user id" — user identifier', level: 'high' },
  { pattern: /visitor.?id/i, reason: 'Contains "visitor id" — visitor tracking', level: 'high' },
  { pattern: /device.?id/i, reason: 'Contains "device id" — device fingerprinting', level: 'high' },
  { pattern: /client.?id/i, reason: 'Contains "client id" — client tracking', level: 'high' },
  { pattern: /session.?id/i, reason: 'Contains "session id" — session tracking', level: 'medium' },
  { pattern: /tracking/i, reason: 'Contains "tracking" — explicit tracking purpose', level: 'high' },
  { pattern: /fingerprint/i, reason: 'Contains "fingerprint" — browser fingerprinting', level: 'high' },

  // Anonymous identifiers (ironic — "anonymous" but still unique)
  { pattern: /anonymous/i, reason: 'Contains "anonymous" — paradoxically still a unique identifier', level: 'high' },
  { pattern: /anon.?id/i, reason: 'Contains "anon id" — anonymous identifier is still an identifier', level: 'high' },

  // Google / known tracker prefixes
  { pattern: /^_ga/i, reason: 'Google Analytics pattern', level: 'high' },
  { pattern: /^_fb/i, reason: 'Facebook/Meta pattern', level: 'high' },
  { pattern: /grecaptcha/i, reason: 'Google reCAPTCHA — leaks IP and behavior data to Google', level: 'medium' },
  { pattern: /^_gcl/i, reason: 'Google Ads conversion linker', level: 'high' },
  { pattern: /^_gc[l_]/i, reason: 'Google Ads conversion pattern', level: 'high' },
  { pattern: /^_hj/i, reason: 'Hotjar pattern', level: 'medium' },
  { pattern: /^_cl[csk]/i, reason: 'Microsoft Clarity pattern', level: 'medium' },
  { pattern: /^mp_/i, reason: 'Mixpanel pattern', level: 'high' },
  { pattern: /^ajs_/i, reason: 'Segment analytics pattern', level: 'high' },
  { pattern: /^amplitude/i, reason: 'Amplitude analytics pattern', level: 'high' },
  { pattern: /^intercom/i, reason: 'Intercom pattern', level: 'medium' },
  { pattern: /^hubspot/i, reason: 'HubSpot pattern', level: 'high' },

  // Pixel/beacon patterns
  { pattern: /pixel/i, reason: 'Contains "pixel" — tracking pixel identifier', level: 'high' },
  { pattern: /beacon/i, reason: 'Contains "beacon" — tracking beacon', level: 'medium' },
  { pattern: /^_pk_/i, reason: 'Matomo/Piwik pattern', level: 'medium' },

  // Telemetry
  { pattern: /telemetry/i, reason: 'Contains "telemetry" — data collection about user behavior', level: 'medium' },
  { pattern: /metrics/i, reason: 'Contains "metrics" — usage measurement', level: 'low' },

  // Conversion/attribution
  { pattern: /conversion/i, reason: 'Contains "conversion" — conversion tracking', level: 'high' },
  { pattern: /attribution/i, reason: 'Contains "attribution" — ad attribution tracking', level: 'high' },
  { pattern: /campaign/i, reason: 'Contains "campaign" — campaign tracking', level: 'medium' },
  { pattern: /referr/i, reason: 'Contains "referr" — referral tracking', level: 'medium' },

  // Retargeting
  { pattern: /retarget/i, reason: 'Contains "retarget" — retargeting identifier', level: 'high' },
  { pattern: /remarket/i, reason: 'Contains "remarket" — remarketing identifier', level: 'high' },
];

/** Value patterns that look like unique identifiers */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_HASH_REGEX = /^[0-9a-f]{32,}$/i;
const BASE64_ID_REGEX = /^[A-Za-z0-9+/=_-]{20,}$/;
const NUMERIC_ID_REGEX = /^\d{10,}$/;
const PREFIXED_ID_REGEX = /^[A-Z]{1,5}[._-]\d{5,}/;
/** Dot-separated segments with random-looking parts: "1.1776560307.KfEVIrgPDwNfP3Xf" */
const DOT_SEGMENT_ID_REGEX = /^\d{1,3}\.\d{8,}\.[A-Za-z0-9_-]{8,}$/;

/** Known-good cookie/storage names that are NOT tracking despite matching patterns.
 *  Infrastructure, security, consent, and functional cookies. */
const KNOWN_SAFE_PATTERNS: RegExp[] = [
  // AWS infrastructure
  /^AWSALB/i, /^AWSALBCORS/i, /^aws[_-]waf/i, /^awswaf/i,
  // Load balancers / infrastructure
  /^JSESSIONID$/i, /^PHPSESSID$/i, /^ASP\.NET_SessionId$/i, /^SERVERID/i,
  /^ELX_SESSIONID$/i, /^BIGipServer/i, /^__cfduid$/i, /^__cfruid$/i,
  /^ROUTEID$/i, /^STICKY$/i, /^BALANCEID$/i, /^haproxy/i,
  // Consent / CMP cookies (strictly necessary)
  /^cck\d/i, /^OptanonConsent$/i, /^OptanonAlertBoxClosed$/i,
  /^CookieConsent$/i, /^cookieyes/i, /^cmplz_/i, /^borlabs-cookie$/i,
  /^klaro$/i, /^didomi/i, /^euconsent/i, /^consentmanager/i,
  /^ppms_privacy/i, /^_iub_cs/i, /^axeptio/i, /^civicCookieControl/i,
  // CSRF tokens
  /^csrf/i, /^_csrf/i, /^XSRF/i, /^ct0$/i,
  // Feature flags
  /^experimentalFeatures/i, /^featureFlag/i,
  // Locale / language
  /^locale$/i, /^lang$/i, /^language$/i, /^i18n/i,
];

/**
 * Analyze a cookie name + value for suspicious patterns.
 * Returns a suspicion level and list of reasons.
 */
export function detectSuspiciousPattern(name: string, value: string): PatternMatch {
  // Skip known-safe infrastructure/consent/security cookies
  if (KNOWN_SAFE_PATTERNS.some(p => p.test(name))) {
    return { level: 'none', reasons: [] };
  }
  const reasons: string[] = [];
  let maxLevel: SuspicionLevel = 'none';

  const upgradeLevel = (level: SuspicionLevel) => {
    const order: Record<SuspicionLevel, number> = { high: 3, medium: 2, low: 1, none: 0 };
    if (order[level] > order[maxLevel]) maxLevel = level;
  };

  // Check name patterns
  for (const { pattern, reason, level } of SUSPICIOUS_NAME_PATTERNS) {
    if (pattern.test(name)) {
      reasons.push(reason);
      upgradeLevel(level);
    }
  }

  // Check value patterns
  if (value) {
    if (UUID_REGEX.test(value)) {
      reasons.push('Value is a UUID — unique persistent identifier');
      upgradeLevel('high');
    } else if (HEX_HASH_REGEX.test(value)) {
      reasons.push(`Value is a ${value.length}-char hex hash — likely a hashed identifier`);
      upgradeLevel('high');
    } else if (value.length > 30 && BASE64_ID_REGEX.test(value)) {
      reasons.push('Value appears to be a base64-encoded identifier');
      upgradeLevel('medium');
    } else if (NUMERIC_ID_REGEX.test(value)) {
      reasons.push('Value is a long numeric ID — likely a user/session identifier');
      upgradeLevel('medium');
    } else if (DOT_SEGMENT_ID_REGEX.test(value)) {
      reasons.push('Value is a dot-separated identifier (e.g., 1.timestamp.randomString)');
      upgradeLevel('high');
    } else if (PREFIXED_ID_REGEX.test(value)) {
      reasons.push('Value matches prefixed ID pattern (e.g., GA1.2.xxxxx)');
      upgradeLevel('medium');
    }

    // Check for embedded UUIDs in complex values
    if (!UUID_REGEX.test(value) && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(value)) {
      reasons.push('Value contains an embedded UUID');
      upgradeLevel('medium');
    }
  }

  return { level: maxLevel, reasons };
}

/**
 * Quick check: is this cookie likely a tracking identifier?
 */
export function isSuspiciousCookie(name: string, value: string): boolean {
  return detectSuspiciousPattern(name, value).level !== 'none';
}

/** Keys inside JSON values that indicate tracking identifiers */
const SUSPICIOUS_JSON_KEYS = [
  'device_id', 'deviceId', 'device_uid',
  'user_id', 'userId', 'uid', 'uuid',
  'visitor_id', 'visitorId', 'vid',
  'session_id', 'sessionId', 'sid',
  'client_id', 'clientId', 'cid',
  'anonymous_id', 'anonymousId', 'anon_id', 'anonId',
  'tracking_id', 'trackingId',
  'fingerprint', 'fp', 'fp_id',
  'account_id', 'accountId',
  'distinct_id', 'distinctId',
  'identity', 'ident',
  'hash', 'token',
  'ga_client_id', 'hublytics_account_id',
  'amplitude_id', 'mixpanel_id',
  'segment_id', 'heap_id',
  '_id', 'id',
  'telemetry', 'telemetryEnabled', 'telemetry_enabled',
  'analytics_enabled', 'analyticsEnabled',
  'tracking_enabled', 'trackingEnabled'
];

/**
 * Deep-scan a stringified JSON value for embedded identifiers.
 * Returns found suspicious keys with their values.
 */
export function scanJsonValue(value: string): Array<{ key: string; value: string; reason: string }> {
  const findings: Array<{ key: string; value: string; reason: string }> = [];

  // Try to parse as JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return findings;
  }

  const seenPaths = new Set<string>();

  function scan(obj: unknown, path: string) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, i) => scan(item, `${path}[${i}]`));
      return;
    }

    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = path ? `${path}.${key}` : key;

      // Skip if already reported this path
      if (seenPaths.has(fullPath)) continue;

      // Check if key name is suspicious
      const keyLower = key.toLowerCase();
      const isSuspiciousKey = SUSPICIOUS_JSON_KEYS.some(sk =>
        keyLower === sk.toLowerCase() ||
        keyLower.endsWith('_id') ||
        keyLower.endsWith('Id') ||
        keyLower.endsWith('_uid') ||
        keyLower.endsWith('_uuid')
      );

      if (isSuspiciousKey && val !== null && val !== undefined) {
        const strVal = String(val);
        if (strVal.length >= 5 && strVal !== 'true' && strVal !== 'false' && strVal !== '0') {
          seenPaths.add(fullPath);
          findings.push({
            key: fullPath,
            value: strVal.slice(0, 60),
            reason: `JSON key "${key}" contains identifier value`
          });
          // Skip value-based check — key already flagged this path
          if (typeof val === 'object' && val !== null) scan(val, fullPath);
          continue;
        }
      }

      // Check if value looks like an ID regardless of key name
      if (typeof val === 'string' && !seenPaths.has(fullPath)) {
        if (UUID_REGEX.test(val)) {
          seenPaths.add(fullPath);
          findings.push({ key: fullPath, value: val, reason: `UUID value in "${key}"` });
        } else if (HEX_HASH_REGEX.test(val) && val.length >= 16) {
          seenPaths.add(fullPath);
          findings.push({ key: fullPath, value: val.slice(0, 40), reason: `Hex hash in "${key}"` });
        } else if (val.startsWith('anon') && val.length > 10) {
          seenPaths.add(fullPath);
          findings.push({ key: fullPath, value: val.slice(0, 40), reason: `Anonymous ID in "${key}"` });
        }
      }

      // Recurse into nested objects
      if (typeof val === 'object' && val !== null) {
        scan(val, fullPath);
      }
    }
  }

  scan(parsed, '');
  return findings;
}

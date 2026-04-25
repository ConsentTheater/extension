/**
 * HAR 1.2 type definitions.
 * Spec: http://www.softwareishard.com/blog/har-12-spec/
 *
 * Browser extensions cannot read request or response bodies (chrome.debugger
 * is the only path and prompts the user). We populate the structural fields
 * (method, url, headers, timings, status) and leave content.text empty —
 * still a valid HAR that opens in Charles, HTTPToolkit, Wireshark, etc.
 */

export interface HarLog {
  log: {
    version: '1.2';
    creator: HarCreator;
    browser?: HarCreator;
    pages: HarPage[];
    entries: HarEntry[];
  };
}

export interface HarCreator {
  name: string;
  version: string;
  comment?: string;
}

export interface HarPage {
  startedDateTime: string;
  id: string;
  title: string;
  pageTimings: {
    onContentLoad?: number;
    onLoad?: number;
    comment?: string;
  };
}

export interface HarEntry {
  pageref?: string;
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache: Record<string, never>;
  timings: HarTimings;
  serverIPAddress?: string;
  connection?: string;
  /** Non-spec extension field: ConsentTheater enrichment from Playbill. */
  _consent_theater?: {
    company?: string;
    service?: string;
    category?: string;
    consent_burden?: string;
    matched_domain?: string;
    before_consent: boolean;
  };
}

export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  cookies: HarCookie[];
  headers: HarHeader[];
  queryString: HarQuery[];
  postData?: HarPostData;
  headersSize: number;
  bodySize: number;
}

export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  cookies: HarCookie[];
  headers: HarHeader[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  _error?: string;
}

export interface HarHeader {
  name: string;
  value: string;
}

export interface HarQuery {
  name: string;
  value: string;
}

export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface HarContent {
  size: number;
  mimeType: string;
  text?: string;
  encoding?: string;
  comment?: string;
}

export interface HarPostData {
  mimeType: string;
  text?: string;
  params?: Array<{ name: string; value?: string }>;
}

export interface HarTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  send: number;
  wait: number;
  receive: number;
  ssl?: number;
  comment?: string;
}

import { NextRequest } from 'next/server';

/**
 * Strip dangerous HTML tags and event handlers to prevent XSS (Cross-Site Scripting).
 */
export function sanitizeXss(val: string): string {
  if (!val) return val;
  // Remove script, iframe, style, and object tags and their contents
  let cleaned = val
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '')
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<object[^>]*>([\s\S]*?)<\/object>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Strip inline event handlers like onload, onerror, onclick, etc.
  cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*('[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  
  // Strip javascript: pseudo-protocol links
  cleaned = cleaned.replace(/href\s*=\s*('[^']*javascript:[^']*'|"[^"]*javascript:[^"]*"|[^\s>]*javascript:[^\s>]*)/gi, 'href="#"');
  cleaned = cleaned.replace(/src\s*=\s*('[^']*javascript:[^']*'|"[^"]*javascript:[^"]*"|[^\s>]*javascript:[^\s>]*)/gi, 'src="#"');

  return cleaned;
}

/**
 * Recursively removes any keys starting with '$' to prevent MongoDB NoSQL Injection,
 * and sanitizes user-facing string fields for XSS.
 */
export function sanitize<T>(val: T, keyName?: string): T {
  if (val === null || val === undefined) return val;

  if (Array.isArray(val)) {
    return val.map(v => sanitize(v, keyName)) as unknown as T;
  }

  if (typeof val === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(val)) {
      if (key.startsWith('$')) {
        continue; // Strip MongoDB query operators
      }
      cleaned[key] = sanitize((val as any)[key], key);
    }
    return cleaned as T;
  }

  if (typeof val === 'string' && keyName) {
    const lowerKey = keyName.toLowerCase();
    // Exclude security-sensitive, file, or image keys that must remain raw
    const excludeKeys = ['password', 'token', 'secret', 'key', 'fcmtoken', 'stripe', 'session_id', 'payment_intent_id', 'avatar'];
    const shouldExclude = excludeKeys.some(k => lowerKey.includes(k));
    if (!shouldExclude) {
      return sanitizeXss(val) as unknown as T;
    }
  }

  return val;
}

/**
 * Safely parses and sanitizes the JSON body of a request to prevent NoSQL Injection.
 */
export async function getSafeJson(req: NextRequest): Promise<any> {
  try {
    const body = await req.json();
    return sanitize(body);
  } catch {
    return {};
  }
}

/**
 * Safely retrieves a query parameter as a strict string, preventing object/operator injection.
 */
export function getSafeQueryParam(req: NextRequest, paramName: string, fallback: string = ''): string {
  try {
    const { searchParams } = new URL(req.url);
    const val = searchParams.get(paramName);
    if (typeof val === 'string') {
      // If it starts with $ or looks like an operator, reject it and return fallback
      if (val.trim().startsWith('$')) {
        return fallback;
      }
      return val.trim();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

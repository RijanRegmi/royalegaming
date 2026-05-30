import { NextRequest } from 'next/server';

/**
 * Recursively removes any keys starting with '$' to prevent MongoDB NoSQL Injection.
 */
export function sanitize<T>(val: T): T {
  if (val === null || val === undefined) return val;

  if (Array.isArray(val)) {
    return val.map(sanitize) as unknown as T;
  }

  if (typeof val === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(val)) {
      if (key.startsWith('$')) {
        continue; // Strip MongoDB query operators
      }
      cleaned[key] = sanitize((val as any)[key]);
    }
    return cleaned as T;
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

const TOKEN_STORAGE_KEY = 'novaworks_session_token';
let inMemoryToken: string | null = null;

const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, '')
    : ''
);

const UNSAFE_HEADERS = new Set([
  'content-length',
  'host',
  'connection',
  'accept-encoding',
  'origin',
]);

/**
 * Ensures every backend request targets a properly prefixed `/api/...` route
 * and strips any accidental `/_/` upload or non-API prefixes.
 */
export function resolveApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  let normalized = endpoint.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (!normalized.startsWith('/api/')) {
    normalized = `/api${normalized}`;
  }
  return `${API_BASE_URL}${normalized}`;
}

export function getSessionToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const fromSession = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (fromSession) {
      inMemoryToken = fromSession;
      return fromSession;
    }
  } catch {
    // Ignore storage access errors in restricted iframes
  }
  try {
    const fromLocal = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (fromLocal) {
      inMemoryToken = fromLocal;
      return fromLocal;
    }
  } catch {
    // Ignore storage access errors in restricted iframes
  }
  return null;
}

export function setSessionToken(token: string | undefined | null): void {
  const clean = typeof token === 'string' && token.trim() ? token.trim() : null;
  inMemoryToken = clean;
  try {
    if (clean) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, clean);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
  try {
    if (clean) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, clean);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function clearSessionToken(): void {
  setSessionToken(null);
}

/**
 * Global authenticated fetch utility:
 * 1. Normalizes `/api/...` route paths via `resolveApiUrl`
 * 2. Strips browser-managed unsafe headers like `Content-Length`
 * 3. Attaches `Authorization: Bearer <token>` from sessionStorage/localStorage
 * 4. Sets `credentials: 'include'` for HTTP-only session cookies
 * 5. Ensures `Content-Type: application/json` for string/JSON payloads (unless FormData)
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = resolveApiUrl(input);
  const headers = new Headers();

  if (init.headers) {
    const incoming = new Headers(init.headers);
    incoming.forEach((value, key) => {
      if (!UNSAFE_HEADERS.has(key.toLowerCase())) {
        headers.set(key, value);
      }
    });
  }

  const token = getSessionToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
}

export async function apiPostJson<TResponse = unknown>(
  endpoint: string,
  payload: unknown
): Promise<{ response: Response; data: TResponse | null }> {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe<TResponse>(response);
  return { response, data };
}

export async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function parseJsonWithDiagnostics<T>(res: Response): Promise<{
  data: T | null;
  kind: 'json' | 'empty' | 'html' | 'text';
  contentType: string;
  preview: string;
}> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return { data: null, kind: 'empty', contentType, preview: '' };
  }
  try {
    return {
      data: JSON.parse(trimmed) as T,
      kind: 'json',
      contentType,
      preview: '',
    };
  } catch {
    const isHtml =
      contentType.toLowerCase().includes('text/html') ||
      /^<!doctype\s+html|^<html/i.test(trimmed);
    return {
      data: null,
      kind: isHtml ? 'html' : 'text',
      contentType,
      preview: trimmed.slice(0, 140),
    };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

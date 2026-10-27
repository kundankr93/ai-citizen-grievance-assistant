export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new ApiError(payload.error ?? `Request failed (${response.status})`, response.status);
  return payload as T;
}

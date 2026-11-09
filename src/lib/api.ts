import type { ApiResponse } from '../types';

export function queryString(params: URLSearchParams | Record<string, string | number | undefined | null>) {
  const search = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams();
  if (!(params instanceof URLSearchParams)) for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  return search.toString();
}

export async function api<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, init);
  const json = await response.json() as ApiResponse<T>;
  if (!response.ok || !json.success) throw new Error(json.error ?? `Permintaan gagal (${response.status}).`);
  return json;
}

export function downloadExport(format: 'csv' | 'xlsx' | 'json', params: URLSearchParams) {
  const query = new URLSearchParams(params); query.set('format', format);
  window.location.assign(`/api/formations/export?${query.toString()}`);
}

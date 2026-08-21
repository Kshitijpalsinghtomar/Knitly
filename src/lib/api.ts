import type { BRD, ServerStatus, Source } from '../types'

/**
 * Thin client for the Ariadne backend served alongside the Knitly frontend.
 *
 * All calls are relative (`/api/...`) so they work regardless of host. If the
 * backend is unreachable (e.g. running the static build without the server),
 * each call resolves to a clear `offline` status so the UI degrades gracefully
 * instead of crashing.
 */
export const OFFLINE: ServerStatus = {
  ok: false,
  dbConfigured: false,
  mode: 'offline',
  detail: 'Backend not reachable. Run `pnpm start` to enable ingest + generation.',
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json() as Promise<T>
}

export async function getHealth(): Promise<ServerStatus> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    if (!res.ok) return OFFLINE
    const data = (await res.json()) as ServerStatus
    return { ok: true, dbConfigured: data.dbConfigured, mode: data.mode, detail: data.detail }
  } catch {
    return OFFLINE
  }
}

export async function saveSource(input: {
  title: string
  rawText: string
  author: string
}): Promise<{ source: Source; status: ServerStatus }> {
  try {
    const data = await post<{ source: Source; dbConfigured: boolean; mode: 'db' | 'memory'; detail?: string }>('/api/sources', input)
    return { source: data.source, status: { ok: true, dbConfigured: data.dbConfigured, mode: data.mode, detail: data.detail } }
  } catch {
    return { source: { id: 'local-fallback', title: input.title, rawText: input.rawText, author: input.author, created_at: new Date().toISOString() }, status: OFFLINE }
  }
}

export async function requestBRD(source: Source): Promise<{ brd: BRD; status: ServerStatus }> {
  try {
    const data = await post<{ brd: BRD; dbConfigured: boolean; mode: 'db' | 'memory'; detail?: string }>('/api/brd/generate', { source })
    return { brd: data.brd, status: { ok: true, dbConfigured: data.dbConfigured, mode: data.mode, detail: data.detail } }
  } catch {
    throw new Error('Generation failed — is the Ariadne server running? (pnpm start)')
  }
}

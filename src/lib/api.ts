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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json() as Promise<T>
}

/** Throw when the Ariadne backend is unreachable for a durable read. */
function backendDown(message: string): never {
  throw new Error(message)
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

export async function listSources(): Promise<Source[]> {
  try {
    const data = await get<{ sources: Source[] }>('/api/sources')
    return data.sources
  } catch {
    return backendDown('Could not list sources — is the Ariadne server running? (pnpm start)')
  }
}

export async function getSource(id: string): Promise<Source> {
  try {
    const data = await get<{ source: Source }>(`/api/sources/${encodeURIComponent(id)}`)
    return data.source
  } catch {
    return backendDown(`Could not load source ${id} — is the Ariadne server running? (pnpm start)`)
  }
}

export async function listBRDs(): Promise<BRD[]> {
  try {
    const data = await get<{ brds: BRD[] }>('/api/brds')
    return data.brds
  } catch {
    return backendDown('Could not list BRDs — is the Ariadne server running? (pnpm start)')
  }
}

export async function getBRD(id: string): Promise<BRD> {
  try {
    const data = await get<{ brd: BRD }>(`/api/brds/${encodeURIComponent(id)}`)
    return data.brd
  } catch {
    return backendDown(`Could not load BRD ${id} — is the Ariadne server running? (pnpm start)`)
  }
}

/**
 * Persist a conflict resolution for a BRD. Returns the updated BRD (with its
 * `complete` flag recomputed) so the UI reflects the durable state.
 */
export async function resolveConflict(brdId: string, conflictId: string, resolved: boolean): Promise<BRD> {
  try {
    const data = await post<{ brd: BRD }>(`/api/brds/${encodeURIComponent(brdId)}/conflicts/${encodeURIComponent(conflictId)}`, { resolved })
    return data.brd
  } catch {
    throw new Error('Conflict resolution failed — is the Ariadne server running? (pnpm start)')
  }
}

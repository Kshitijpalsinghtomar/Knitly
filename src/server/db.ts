import { neon } from '@neondatabase/serverless'
import type { BRD, Source } from '../types'
import { computeCompleteness } from './generator'

/**
 * Server-only database handle for Ariadne persistence.
 *
 * Mirrors the team's shared-site helper (/home/team/shared/site/src/db.ts):
 * the connection string comes from `process.env.DATABASE_URL`, resolved LAZILY
 * (per call, not at module load) so the app still builds and serves before a
 * database is connected. The error only surfaces if a query actually runs
 * without `DATABASE_URL`.
 *
 * When `DATABASE_URL` is absent the server falls back to an in-memory store so
 * the end-to-end slice is fully usable with zero secrets. Wire `DATABASE_URL`
 * (Neon) and this module persists to Postgres automatically.
 *
 * NOTE: This module is server-only. The frontend never imports it (only
 * `server/index.ts` does), so the Neon client never enters the browser bundle.
 */
export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL
}

export function dbUrlUnsetError(): Error {
  return new Error(
    'DATABASE_URL is not set — connect a database (Neon) before running persistent queries. The server continues with in-memory storage.'
  )
}

// ─── In-memory fallback (used when DATABASE_URL is absent) ────────────────────
const memory = {
  sources: new Map<string, Source>(),
  brds: new Map<string, BRD>(),
}

const nowISO = () => new Date().toISOString()

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function lazySql(): ReturnType<typeof neon> {
  const url = process.env.DATABASE_URL
  if (!url) throw dbUrlUnsetError()
  return neon(url)
}

/** Outcome of a lightweight database connectivity probe. */
export interface DbConnectivity {
  ok: boolean
  /** Human-readable, safe status text. Never contains the URL or credentials. */
  detail: string
}

/**
 * Lightweight live connectivity probe against the configured database.
 * Runs `SELECT 1`. Used by `/api/health` so the reported mode reflects actual
 * reachability rather than the mere presence of `DATABASE_URL`.
 *
 * In memory mode (no `DATABASE_URL`) returns `ok: true` — there is no database
 * to be unreachable, so the endpoint is healthy and in-memory.
 *
 * Never throws and never leaks the connection URL or credentials.
 */
export async function checkDbReachable(): Promise<DbConnectivity> {
  if (!dbConfigured()) {
    return { ok: true, detail: 'Memory mode — no database configured.' }
  }
  try {
    const sql = lazySql()
    await (sql`select 1` as Promise<Rows>)
    return { ok: true, detail: 'Database reachable (SELECT 1 ok).' }
  } catch {
    return { ok: false, detail: 'Database configured but unreachable or query failed.' }
  }
}

export async function ensureSchema(): Promise<void> {
  if (!dbConfigured()) return
  const sql = lazySql()
  await sql`create table if not exists sources (
    id text primary key,
    title text not null,
    raw_text text not null,
    author text not null,
    created_at timestamptz not null default now()
  )`
  await sql`create table if not exists brds (
    id text primary key,
    source_id text not null,
    title text not null,
    author text not null,
    created_at timestamptz not null default now(),
    payload jsonb not null
  )`
}

type Rows = Array<Record<string, unknown>>

export async function createSource(input: {
  title: string
  rawText: string
  author: string
}): Promise<{ source: Source; dbConfigured: boolean; mode: 'db' | 'memory' }> {
  const source: Source = {
    id: uid('src'),
    title: input.title,
    rawText: input.rawText,
    author: input.author,
    created_at: nowISO(),
  }
  if (dbConfigured()) {
    const sql = lazySql()
    await sql`insert into sources (id, title, raw_text, author, created_at)
      values (${source.id}, ${source.title}, ${source.rawText}, ${source.author}, ${source.created_at})`
    return { source, dbConfigured: true, mode: 'db' }
  }
  memory.sources.set(source.id, source)
  return { source, dbConfigured: false, mode: 'memory' }
}

export async function getSource(id: string): Promise<Source | null> {
  if (dbConfigured()) {
    const sql = lazySql()
    const rows = await (sql`select id, title, raw_text, author, created_at from sources where id = ${id}` as Promise<Rows>)
    const r = rows[0]
    if (!r) return null
    return {
      id: String(r.id),
      title: String(r.title),
      rawText: String(r.raw_text),
      author: String(r.author),
      created_at: String(r.created_at),
    }
  }
  return memory.sources.get(id) ?? null
}

/** List all persisted sources, newest first. */
export async function listSources(): Promise<Source[]> {
  if (dbConfigured()) {
    const sql = lazySql()
    const rows = await (sql`select id, title, raw_text, author, created_at from sources order by created_at desc` as Promise<Rows>)
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      rawText: String(r.raw_text),
      author: String(r.author),
      created_at: String(r.created_at),
    }))
  }
  return Array.from(memory.sources.values()).reverse()
}

export async function saveBRD(brd: BRD): Promise<{ mode: 'db' | 'memory' }> {
  if (dbConfigured()) {
    const sql = lazySql()
    await sql`insert into brds (id, source_id, title, author, created_at, payload)
      values (${brd.id}, ${brd.sourceId}, ${brd.title}, ${brd.author}, ${brd.createdAt}, ${JSON.stringify(brd)}::jsonb)
      on conflict (id) do update set payload = excluded.payload`
    return { mode: 'db' }
  }
  memory.brds.set(brd.id, brd)
  return { mode: 'memory' }
}

export async function getBRD(id: string): Promise<BRD | null> {
  if (dbConfigured()) {
    const sql = lazySql()
    const rows = await (sql`select payload from brds where id = ${id}` as Promise<Rows>)
    return rows[0] ? (rows[0].payload as BRD) : null
  }
  return memory.brds.get(id) ?? null
}

/** List all persisted BRDs, newest first. */
export async function listBRDs(): Promise<BRD[]> {
  if (dbConfigured()) {
    const sql = lazySql()
    const rows = await (sql`select payload from brds order by created_at desc` as Promise<Rows>)
    return rows.map((r) => r.payload as BRD)
  }
  return Array.from(memory.brds.values()).reverse()
}

/**
 * Outcome of persisting a resolved conflict. Distinguishes "document not found"
 * from "conflict not found" so the API can return a precise 404.
 */
export type ResolveBRDConflictResult =
  | { ok: true; brd: BRD; mode: 'db' | 'memory' }
  | { ok: false; reason: 'brd' | 'conflict' }

/**
 * Durable conflict resolution: load the BRD, flip the given conflict's
 * `resolved` flag, recompute `complete` (via `computeCompleteness`), and persist
 * the updated payload (upsert) so the resolution survives restart. Works in both
 * memory and Neon modes.
 *
 * Returns `{ ok: false, reason: 'brd' }` if the document does not exist and
 * `{ ok: false, reason: 'conflict' }` if the BRD exists but the conflict id is
 * unknown.
 */
export async function resolveBRDConflict(
  brdId: string,
  conflictId: string,
  resolved: boolean
): Promise<ResolveBRDConflictResult> {
  const brd = await getBRD(brdId)
  if (!brd) return { ok: false, reason: 'brd' }
  const conflict = brd.conflicts.find((c) => c.id === conflictId)
  if (!conflict) return { ok: false, reason: 'conflict' }
  conflict.resolved = resolved
  brd.complete = computeCompleteness(brd)
  const { mode } = await saveBRD(brd)
  return { ok: true, brd, mode }
}

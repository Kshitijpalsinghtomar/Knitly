import { neon } from '@neondatabase/serverless'
import type { BRD, Source } from '../types'

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

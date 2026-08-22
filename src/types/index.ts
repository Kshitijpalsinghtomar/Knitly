export type Theme = 'dark' | 'light'

export type View =
  | 'home' | 'projects' | 'workspace' | 'document' | 'graph'
  | 'conflicts' | 'integrations' | 'settings' | 'team'
  | 'knowledge' | 'notifications' | 'requirement' | 'traceability'

export type DocType = 'brd' | 'prd' | 'spec' | 'stories' | 'roadmap' | 'research'
export type DocMode = 'brief' | 'read' | 'act'
export type TraceMood = 'default' | 'thinking' | 'excited' | 'done' | 'wave'
export type BtnV = 'primary' | 'ghost' | 'danger' | 'default' | 'ai'

export type IcoName =
  | 'home' | 'folder' | 'plug' | 'network' | 'warning' | 'sparkle'
  | 'search' | 'bell' | 'settings' | 'sun' | 'moon' | 'send'
  | 'chevron-r' | 'chevron-d' | 'check' | 'link' | 'overview' | 'doc'
  | 'target' | 'code' | 'chat' | 'map' | 'flask' | 'user' | 'users'
  | 'plus' | 'x' | 'arrow-r' | 'star' | 'refresh' | 'github' | 'linear'
  | 'jira' | 'slack' | 'eye' | 'comment' | 'flag' | 'lock' | 'zap'
  | 'book' | 'copy' | 'edit' | 'trash' | 'shield' | 'credit' | 'key'
  | 'webhook' | 'mail' | 'globe' | 'download' | 'upload' | 'filter'
  | 'sort' | 'more' | 'close' | 'arrow-l' | 'invite' | 'crown'
  | 'figma' | 'notion' | 'pipeline'

export interface TeamMember {
  id: string
  name: string
  email: string
  initials: string
  color: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  online: boolean
  lastActive: string
  joined: string
  projects: string[]
}

export interface IntegrationMapping {
  integrationId: string
  resource: string
}

export interface Project {
  id: string
  name: string
  gradient: string
  status: 'active' | 'draft' | 'review'
  desc: string
  team: string[]
  conflicts: number
  reqs: number
  lastActivity: string
  github: string | null
  jira: string | null
  linear: string | null
  docs: Record<DocType, number>
  integrationMappings: IntegrationMapping[]
}

export interface Document {
  id: string
  pid: string
  type: DocType
  title: string
  status: 'draft' | 'review' | 'final'
  v: number
  author: string
  contrib: string[]
  reqs: number
  conflicts: number
  when: string
  ai: boolean
}

export interface Integration {
  id: string
  name: string
  cat: string
  on: boolean
  meta: string | null
  icon: IcoName
  color: string
  hi: string
  desc: string
  lastSync: string | null
  syncedItems: number
  nextSync: string | null
}

export interface AiFlag {
  id: string
  sectionId: string
  label: string
  options: string[]
  resolved: boolean
  resolvedOption?: string
  resolvedBy?: string
}

export interface RequirementSource {
  quote: string
  origin: { type: 'slack' | 'jira' | 'email' | 'meeting'; channel?: string; authorId: string; date: string }
}

export interface RequirementFigmaLink {
  frame: string
  version: string
  approvedById: string
  approvedAt: string
  status: 'in-sync' | 'stale' | 'unlinked'
}

export interface RequirementCodeLink {
  pr: number
  prTitle: string
  merged: boolean
  authorId: string
  mergedAt: string
  status: 'in-sync' | 'contradicted' | 'unlinked'
  contradiction?: string
}

export interface RequirementDetail {
  id: string
  docId: string
  pid: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'in-sync' | 'stale' | 'contradicted' | 'unlinked'
  source: RequirementSource
  decision: string
  figma: RequirementFigmaLink | null
  code: RequirementCodeLink | null
  history: { v: number; change: string; byId: string; at: string }[]
}

export interface OrphanPR {
  pr: number
  title: string
  authorId: string
  mergedAt: string
  branch: string
}

// ─── Live Ariadne slice: real ingest → generate → trace → gate ───────────────
// These types describe the real (non-mock) data path. A `Source` is captured
// from the paste-ingest surface; a `BRD` is produced by a server-side
// `BrdGenerator` (see src/server/generator.ts) and carries full source-quote →
// requirement traceability.

/** A raw ingested source (meeting transcript / pasted note). */
export interface Source {
  id: string
  title: string
  rawText: string
  author: string
  created_at: string
}

/** A traceable requirement extracted from a source. */
export interface GeneratedRequirement {
  id: string
  /** The requirement statement. */
  text: string
  /** Exact quote from the source that this requirement traces back to. */
  sourceQuote: string
  /** Inferred author of the quote. */
  author: string
  /** When the quote was captured. */
  timestamp: string
  status: 'in-sync' | 'stale' | 'contradicted' | 'unlinked'
  /** Conflicts that reference this requirement. */
  conflicts: SourceConflict[]
}

/** A candidate conflict detected between two requirements. */
export interface SourceConflict {
  id: string
  severity: 'major' | 'minor'
  reqA: string
  reqB: string
  title: string
  desc: string
  fix: string
  resolved: boolean
}

/** The generated Business Requirements Document. */
export interface BRD {
  id: string
  sourceId: string
  title: string
  author: string
  createdAt: string
  requirements: GeneratedRequirement[]
  conflicts: SourceConflict[]
  /** Derived: true only if every requirement is traced AND no conflicts are open. */
  complete: boolean
  /** Document type (always 'brd' for a BRD). Set by the generation endpoint. */
  type?: DocType
  /** The user's requested brief captured at generation time (optional). */
  brief?: string
}

/**
 * Detailed database health surfaced by `/api/health`.
 * `ready` reflects successful schema initialization on this process start;
 * `reachable` reflects the live `SELECT 1` probe.
 */
export interface DbHealth {
  ready: boolean
  reachable: boolean
  detail: string
}

/** Runtime status of the backend / persistence layer. */
export interface ServerStatus {
  ok: boolean
  dbConfigured: boolean
  /** 'db' = Neon persistence ready · 'memory' = in-memory fallback · 'offline' = backend unreachable */
  mode: 'db' | 'memory' | 'offline'
  detail?: string
  /** Present only in db mode; describes real schema/connectivity state (never leaks the URL). */
  db?: DbHealth
}

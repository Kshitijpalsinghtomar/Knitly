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
  /**
   * The provenance quote this item traces back to. For a BRD requirement this
   * is a VERBATIM quote from the ingested source. For a downstream document
   * (PRD/spec/stories/…) it is the text of the parent BRD requirement it derives
   * from — provenance one level up the chain. Empty only when the trace could
   * not be verified (→ status `unlinked`, making the document incomplete).
   */
  sourceQuote: string
  /** Inferred author of the quote. */
  author: string
  /** When the quote was captured. */
  timestamp: string
  status: 'in-sync' | 'stale' | 'contradicted' | 'unlinked'
  /** Conflicts that reference this requirement. */
  conflicts: SourceConflict[]
  /**
   * Parent requirement ids this item derives from (downstream docs only). A
   * BRD requirement traces to a source quote and leaves this empty; a PRD/spec/
   * story item traces UP to one or more BRD requirement ids. This is the
   * structured half of downstream provenance (the human-readable half is
   * `sourceQuote`).
   */
  derivedFrom?: string[]
  /**
   * Optional type-specific elaboration rendered under the item — e.g. Gherkin
   * acceptance criteria for a user story, the EARS pattern for a spec line, or
   * the roadmap phase for a milestone. Never affects completeness.
   */
  detail?: string
  /**
   * The framework section this item belongs to, as a key from
   * `DOCUMENT_SECTIONS[docType]` (src/lib/documentTypes.ts) — e.g. a BRD
   * requirement is classified into `functional` / `nonfunctional` / `objectives`
   * / … so the viewer can render a real, sectioned document instead of a flat
   * list. Assigned by `enrichGeneratedDoc` at generation time; the viewer falls
   * back to a client-side classifier when absent (older/AI docs). Never affects
   * completeness.
   */
  section?: string
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
  /**
   * A short narrative "read" of the document — Trace's plain-language summary of
   * what was generated (how many requirements, the shape of the split, and
   * whether it is complete). Rendered as the "Trace's read" lede in the viewer.
   * Assigned by `enrichGeneratedDoc`; the viewer computes a fallback when absent.
   */
  summary?: string
  /**
   * For a downstream document (PRD/spec/…), the id of the parent BRD it was
   * generated from. Empty for a BRD. Lets the client walk the provenance chain
   * one level up (this doc → parent BRD → original source).
   */
  parentId?: string
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
  /** Active BRD generator label (e.g. 'rule-based' or 'claude:…'). Never leaks the key. */
  generator?: string
  /** Active downstream document generator label. Never leaks the key. */
  documentGenerator?: string
  /** Active integration provider label (e.g. 'demo …' or 'composio'). Never leaks the key. */
  integrations?: string
}

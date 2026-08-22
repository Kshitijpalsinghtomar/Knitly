/**
 * Ariadne shared document-type registry.
 *
 * This is the SINGLE source of truth for the supported document types and the
 * (provisional) downstream generation order. It is shared by both the browser
 * client (src/lib/api.ts → Generate Document workspace) and the server
 * (src/server/gate.ts enforcing prereq gates on /api/documents/generate). No
 * secrets live here, so it is safe to bundle.
 *
 * The type ids preserve the repository's existing `DocType` naming convention
 * from src/types/index.ts (`brd | prd | spec | stories | roadmap | research`)
 * so existing UI (DOC_META in src/data/index.ts) keeps mapping cleanly.
 *
 * ─── PROVISIONAL (NOT owner-ratified) ────────────────────────────────────────
 * `PROVISIONAL_DOWNSTREAM_ORDER` below is the team's working hypothesis of the
 * canonical chain (BRD → PRD → Tech Spec → User Stories → Roadmap → Research).
 * The owner has NOT ratified this order or the rule that every document is a
 * strict serial successor. Treat it as easy-to-change configuration: the server
 * gate only enforces "BRD is the initial gate, everything downstream needs a
 * complete current BRD parent", it does NOT hardcode a full irreversible chain.
 * Adjust this file when the owner ratifies the real order.
 */

export const DOCUMENT_TYPE_IDS = ['brd', 'prd', 'spec', 'stories', 'roadmap', 'research'] as const
/** Canonical document type id — mirrors the existing `DocType` union. */
export type DocumentTypeId = (typeof DOCUMENT_TYPE_IDS)[number]

export interface DocumentTypeMeta {
  id: DocumentTypeId
  /** Short label (e.g. "BRD", "Tech Spec"). */
  label: string
  /** Full document name. */
  name: string
  /** One-line description surfaced in the Generate Document workspace. */
  description: string
  /**
   * True only when a server-side generator adapter exists TODAY. Only `brd` is
   * implemented; every downstream type is locked until its adapter is built
   * (and the owner ratifies the chain). This drives the honest lock reason.
   */
  implemented: boolean
  /** True only for BRD — the single entry point / first gate. */
  isInitial: boolean
}

export const DOCUMENT_TYPES: Record<DocumentTypeId, DocumentTypeMeta> = {
  brd: {
    id: 'brd',
    label: 'BRD',
    name: 'Business Requirements Document',
    description: 'What the business needs',
    implemented: true,
    isInitial: true,
  },
  prd: {
    id: 'prd',
    label: 'PRD',
    name: 'Product Requirements Document',
    description: 'What the product will do',
    implemented: false,
    isInitial: false,
  },
  spec: {
    id: 'spec',
    label: 'Tech Spec',
    name: 'Technical Specification',
    description: 'How to build it',
    implemented: false,
    isInitial: false,
  },
  stories: {
    id: 'stories',
    label: 'User Stories',
    name: 'User Stories',
    description: 'Who it is for',
    implemented: false,
    isInitial: false,
  },
  roadmap: {
    id: 'roadmap',
    label: 'Roadmap',
    name: 'Roadmap',
    description: 'When things happen',
    implemented: false,
    isInitial: false,
  },
  research: {
    id: 'research',
    label: 'Research',
    name: 'Research',
    description: 'What we have learned',
    implemented: false,
    isInitial: false,
  },
}

/**
 * PROVISIONAL downstream order — working hypothesis, NOT owner-ratified.
 * The server gate only treats the *first* element as the initial gate and
 * requires a complete current BRD parent for everything after it; it does not
 * enforce strict serial ordering between downstream types. Change this list
 * freely until the owner ratifies the canonical chain.
 */
export const PROVISIONAL_DOWNSTREAM_ORDER: DocumentTypeId[] = [
  'brd',
  'prd',
  'spec',
  'stories',
  'roadmap',
  'research',
]

/** Narrow a runtime value to a registered document type id. */
export function isDocumentTypeId(value: unknown): value is DocumentTypeId {
  return typeof value === 'string' && (DOCUMENT_TYPE_IDS as readonly string[]).includes(value)
}

// ─── Shared gate result shapes (server evaluates, client renders) ────────────
/** A single inspectable prerequisite check for a document type. */
export interface DocumentTypeCheck {
  key: string
  ok: boolean
  reason: string
}

/** Inspectable gate outcome for one document type. */
export interface DocumentTypeGate {
  type: DocumentTypeId
  /** True only when the server will actually generate this type right now. */
  allowed: boolean
  /** True when the type is reachable once prerequisites & its adapter exist. */
  eligible: boolean
  /** Human-readable reason (used for the honest 409 lock message). */
  reason: string
  checks: DocumentTypeCheck[]
}

/** Minimal view of a parent document used by the gate. */
export interface ParentGateInfo {
  id: string
  complete: boolean
}

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
   * True when a server-side generator adapter exists for this type. `brd` is the
   * initial gate; every downstream type (PRD, Tech Spec, User Stories, Roadmap,
   * Research) is implemented via the `DocumentGenerator` seam
   * (src/server/document-generator.ts) and unlocks once a COMPLETE parent BRD is
   * supplied. This drives the honest lock reason when a prerequisite is missing.
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
    implemented: true,
    isInitial: false,
  },
  spec: {
    id: 'spec',
    label: 'Tech Spec',
    name: 'Technical Specification',
    description: 'How to build it',
    implemented: true,
    isInitial: false,
  },
  stories: {
    id: 'stories',
    label: 'User Stories',
    name: 'User Stories',
    description: 'Who it is for',
    implemented: true,
    isInitial: false,
  },
  roadmap: {
    id: 'roadmap',
    label: 'Roadmap',
    name: 'Roadmap',
    description: 'When things happen',
    implemented: true,
    isInitial: false,
  },
  research: {
    id: 'research',
    label: 'Research',
    name: 'Research',
    description: 'What we have learned',
    implemented: true,
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

// ─── Document frameworks (the "research", made into shared data) ─────────────
/**
 * The industry-standard structure each generated document follows, plus the
 * provenance rule that makes it a *spec-integrity* artifact rather than a
 * free-text draft. Surfaced in the Generate workspace so the flow shows its
 * work — what shape the document takes and how every line stays traceable.
 *
 * These mirror what the generators actually emit (BRD → verbatim source quotes
 * + conflict gating; downstream docs → derive one level up with EARS / Gherkin
 * / phase / method detail), so the promise on screen matches the output. No
 * secrets — safe to bundle for both client and server.
 */
export interface DocumentFramework {
  /** The named framework this document is structured against. */
  framework: string
  /** Compact badge (e.g. "IEEE-830", "EARS", "INVEST"). */
  frameworkTag: string
  /** Human phrase completing "Trace will produce …". */
  produces: string
  /** The standard section structure Trace organises the document into. */
  sections: string[]
  /** The traceability guarantee — how every item stays provable. */
  traceRule: string
  /** What kind of input this document is built from. */
  inputHint: string
}

export const DOCUMENT_FRAMEWORKS: Record<DocumentTypeId, DocumentFramework> = {
  brd: {
    framework: 'IEEE-830 · BABOK-aligned',
    frameworkTag: 'IEEE-830',
    produces: 'a Business Requirements Document',
    sections: [
      'Business objectives',
      'Scope & context',
      'Stakeholders',
      'Functional requirements',
      'Non-functional requirements',
      'Assumptions & constraints',
      'Open decisions & conflicts',
    ],
    traceRule:
      'Every requirement quotes a verbatim line from your source. Contradictions are flagged and must be resolved before the BRD is complete.',
    inputHint: 'Meeting transcripts, call notes, Slack threads — anywhere the need was actually spoken.',
  },
  prd: {
    framework: 'Product requirements',
    frameworkTag: 'PRD',
    produces: 'a Product Requirements Document',
    sections: ['Problem & context', 'Goals & success metrics', 'Personas', 'Capabilities', 'Acceptance criteria', 'Out of scope'],
    traceRule: 'Every capability derives from a specific BRD requirement — no orphan features.',
    inputHint: 'Derived from your live BRD.',
  },
  spec: {
    framework: 'EARS technical specification',
    frameworkTag: 'EARS',
    produces: 'a Technical Specification',
    sections: ['Architecture overview', 'System requirements (EARS)', 'Interfaces & contracts', 'Data model', 'NFR budgets'],
    traceRule: 'Every “WHEN … the system SHALL …” statement derives from a BRD requirement.',
    inputHint: 'Derived from your live BRD.',
  },
  stories: {
    framework: 'Agile user stories · INVEST',
    frameworkTag: 'INVEST',
    produces: 'a set of User Stories',
    sections: ['Epics', 'Stories (As-a / I-want / So-that)', 'Acceptance criteria (Gherkin)'],
    traceRule: 'Every story derives from a BRD requirement and carries Given/When/Then acceptance criteria.',
    inputHint: 'Derived from your live BRD.',
  },
  roadmap: {
    framework: 'Now / Next / Later roadmap',
    frameworkTag: 'Phased',
    produces: 'a Roadmap',
    sections: ['Phases', 'Milestones', 'Sequencing & dependencies'],
    traceRule: 'Every milestone derives from a BRD requirement, so scope maps cleanly onto time.',
    inputHint: 'Derived from your live BRD.',
  },
  research: {
    framework: 'Assumption / evidence research',
    frameworkTag: 'Evidence',
    produces: 'a Research brief',
    sections: ['Open questions', 'Assumptions to validate', 'Methods', 'Evidence log'],
    traceRule: 'Every open question derives from a BRD requirement that still needs validation.',
    inputHint: 'Derived from your live BRD.',
  },
}

// ─── Requirement bucketing schema (what makes a doc render as a *document*) ───
/**
 * The ordered sections each document type is organised into, with a stable
 * machine `key` (persisted on `GeneratedRequirement.section`) and a human
 * `label`/`hint`. This is the SINGLE source of truth for grouping requirements
 * into a real, sectioned document — shared by the server classifier
 * (`enrichGeneratedDoc` → `sectionForBrdRequirement`) and the viewer.
 *
 * A BRD spreads its requirements across the full IEEE-830 spread (objectives →
 * assumptions). A downstream document is homogeneous by construction (every item
 * derives one level up), so it has a single primary bucket — its first section —
 * which the generator assigns via `primarySectionKey`. `Open decisions &
 * conflicts` is rendered from `BRD.conflicts`, not from requirement buckets, so
 * it is intentionally NOT a bucket here.
 */
export interface DocSection {
  /** Stable key persisted on `GeneratedRequirement.section`. */
  key: string
  /** Section heading shown in the viewer. */
  label: string
  /** One-line description of what belongs in the section. */
  hint?: string
}

export const DOCUMENT_SECTIONS: Record<DocumentTypeId, DocSection[]> = {
  brd: [
    { key: 'objectives', label: 'Business objectives', hint: 'The outcomes the business is trying to move.' },
    { key: 'scope', label: 'Scope & context', hint: "What's in, the platforms and markets, what's explicitly out." },
    { key: 'stakeholders', label: 'Stakeholders & users', hint: 'Who this serves and who owns the decisions.' },
    { key: 'functional', label: 'Functional requirements', hint: 'What the product must let people do.' },
    { key: 'nonfunctional', label: 'Non-functional requirements', hint: 'Performance, security, accessibility and compliance budgets.' },
    { key: 'assumptions', label: 'Assumptions & constraints', hint: "What we're taking as given, and the limits we work within." },
  ],
  prd: [{ key: 'capabilities', label: 'Capabilities', hint: 'What the product will do, each with acceptance criteria.' }],
  spec: [{ key: 'sysreq', label: 'System requirements (EARS)', hint: 'Testable WHEN/SHALL statements.' }],
  stories: [{ key: 'stories', label: 'User stories', hint: 'As-a / I-want / So-that, with Given/When/Then criteria.' }],
  roadmap: [{ key: 'milestones', label: 'Milestones', hint: 'Sequenced delivery, phase by phase.' }],
  research: [{ key: 'questions', label: 'Open questions', hint: 'Assumptions to validate before build, each with a method.' }],
}

/** The sections for a document type (falls back to the BRD spread). */
export function docSections(type: DocumentTypeId): DocSection[] {
  return DOCUMENT_SECTIONS[type] ?? DOCUMENT_SECTIONS.brd
}

/** Human label for a section key within a document type (key itself if unknown). */
export function sectionLabel(type: DocumentTypeId, key: string): string {
  return docSections(type).find((s) => s.key === key)?.label ?? key
}

/** The primary (first) bucket key for a type — where homogeneous docs land. */
export function primarySectionKey(type: DocumentTypeId): string {
  return docSections(type)[0]?.key ?? 'functional'
}

/**
 * Shared integration catalog + wire shapes.
 *
 * This is the SINGLE source of truth for the third-party sources Trace can pull
 * requirement signal from (Slack threads, Gmail threads, meeting/Loom
 * transcripts, Notion notes, Linear issues) and the verification targets it
 * links downstream work to (GitHub, Figma). It is safe to bundle — no secrets,
 * no signal *content* (that stays server-side in `src/server/integrations.ts`).
 *
 * Both sides use it: the client renders the connect/pick surface from the
 * catalog + the account/signal shapes; the server implements the
 * `IntegrationProvider` seam against the same catalog. When a real provider
 * (Composio / Nango / Arcade) is wired, only the server file changes — this
 * contract, and every screen built on it, stays put.
 */
import type { IcoName } from '../types'

export type IntegrationId =
  | 'slack' | 'gmail' | 'meet' | 'loom' | 'notion' | 'linear' | 'github' | 'figma'

/**
 * What an integration is *for* in the spec-integrity loop:
 *  • `signal`  — a place requirements were actually spoken (feeds the BRD).
 *  • `verify`  — where downstream work is proven (design frames, merged code).
 *  • `both`    — contributes signal AND is a verification target.
 * The generate journey's source picker shows `signal`/`both`; `verify`-only
 * apps (GitHub, Figma) surface as credential-linked verification targets.
 */
export type IntegrationRole = 'signal' | 'verify' | 'both'

export type IntegrationCategory =
  | 'Communication' | 'Meetings' | 'Docs' | 'Planning' | 'Code' | 'Design'

/** Static, bundle-safe metadata for one integration. */
export interface IntegrationMeta {
  id: IntegrationId
  name: string
  category: IntegrationCategory
  icon: IcoName
  /** Brand-ish accent used for the icon + soft fills (`${color}18`). */
  color: string
  /** Plural noun for this app's signals, e.g. "threads", "emails". */
  signalNoun: string
  role: IntegrationRole
  /** One-line description of what Trace reads from it. */
  blurb: string
}

/**
 * A selectable signal (a specific thread / email / recording / issue). Carries
 * only display metadata + a `chars` count — the extractable *content* never
 * leaves the server; the client sends `id`s to the ingest endpoint and the
 * server assembles the source text.
 */
export interface IntegrationSignal {
  id: string
  integrationId: IntegrationId
  /** e.g. "#product-checkout — Fraud vendor debate". */
  title: string
  /** One-line snippet shown under the title. */
  preview: string
  author: string
  /** Human "when" label (e.g. "2d ago", "Aug 21"). */
  when: string
  /** Signal kind for the row chip: 'thread' | 'email' | 'transcript' | 'issue' | 'note'. */
  kind: string
  participants?: string[]
  /** Length of the extractable text this signal contributes. */
  chars: number
}

/** An integration plus its live connection state (returned by the API). */
export interface IntegrationAccount extends IntegrationMeta {
  connected: boolean
  /** Account/workspace label when connected (e.g. "acme.slack.com"). */
  connectedAs?: string
  /** How many signals are available to pull right now. */
  signalCount: number
  /**
   * True when signals are realistic SAMPLE data because no live provider
   * (Composio) is wired yet. The UI is honest about this — it never claims a
   * live sync it can't do. Flips false once a real provider backs the seam.
   */
  demo: boolean
  /** Human "last synced" label, or null if never. */
  lastSync?: string | null
}

/**
 * The catalog. Order here is the display order. `signalNoun`/`role`/`category`
 * drive both the integrations screen and the generate journey's source picker.
 */
export const INTEGRATION_CATALOG: IntegrationMeta[] = [
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    icon: 'slack',
    color: '#E01E5A',
    signalNoun: 'threads',
    role: 'signal',
    blurb: 'Channels & threads where decisions get made in the open.',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Communication',
    icon: 'mail',
    color: '#EA4335',
    signalNoun: 'threads',
    role: 'signal',
    blurb: 'Email threads with stakeholders, vendors and legal.',
  },
  {
    id: 'meet',
    name: 'Google Meet',
    category: 'Meetings',
    icon: 'users',
    color: '#00AC47',
    signalNoun: 'transcripts',
    role: 'signal',
    blurb: 'Meeting transcripts — kickoffs, planning, reviews.',
  },
  {
    id: 'loom',
    name: 'Loom',
    category: 'Meetings',
    icon: 'eye',
    color: '#625DF5',
    signalNoun: 'recordings',
    role: 'signal',
    blurb: 'Async walkthroughs with auto-transcripts.',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Docs',
    icon: 'notion',
    color: '#C7C7C7',
    signalNoun: 'notes',
    role: 'signal',
    blurb: 'Product briefs and notes captured before the build.',
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'Planning',
    icon: 'linear',
    color: '#5E6AD2',
    signalNoun: 'issues',
    role: 'both',
    blurb: 'Issues & epics that already frame the work.',
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Code',
    icon: 'github',
    color: '#B9C0CB',
    signalNoun: 'pull requests',
    role: 'verify',
    blurb: 'Where requirements are proven — merged code, linked to the spec.',
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'Design',
    icon: 'figma',
    color: '#F24E1E',
    signalNoun: 'frames',
    role: 'verify',
    blurb: 'Approved design frames a requirement traces to.',
  },
]

/** Look up catalog metadata by id. */
export function integrationMeta(id: IntegrationId): IntegrationMeta | undefined {
  return INTEGRATION_CATALOG.find((m) => m.id === id)
}

/** True for a valid catalog id. */
export function isIntegrationId(value: unknown): value is IntegrationId {
  return typeof value === 'string' && INTEGRATION_CATALOG.some((m) => m.id === value)
}

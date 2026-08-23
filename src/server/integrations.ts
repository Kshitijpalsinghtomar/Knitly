/**
 * Integration provider seam — the source side of the spec-integrity loop.
 *
 * `IntegrationProvider` is the contract the generate journey pulls requirement
 * signal through: list connected accounts, connect/disconnect, list a source's
 * signals (threads/emails/transcripts/…), and assemble the selected signals into
 * one ingestable transcript. Today it's satisfied by `DemoIntegrationProvider`,
 * which returns realistic SAMPLE signals with zero secrets so the whole journey
 * is clickable end-to-end. A real adapter (Composio / Nango / Arcade) implements
 * the SAME interface and is swapped in by `createIntegrationProvider()` — every
 * screen built on the contract stays put.
 *
 * Honesty rule: demo accounts report `demo: true`, and the UI says so. We never
 * claim a live OAuth sync we cannot perform. When `COMPOSIO_API_KEY` is set and
 * the adapter lands, `demo` flips false and the same signals become live pulls.
 *
 * Server-only (like db.ts): the frontend imports the bundle-safe *types* from
 * `src/lib/integrationTypes.ts`, never this module, so signal CONTENT and any
 * future provider credentials never enter the browser bundle.
 */
import type {
  IntegrationAccount,
  IntegrationId,
  IntegrationSignal,
} from '../lib/integrationTypes'
import { INTEGRATION_CATALOG, integrationMeta } from '../lib/integrationTypes'

/** A signal plus its extractable transcript content (server-only). */
interface SignalFull extends IntegrationSignal {
  content: string
}

// ─── Demo signal corpus ──────────────────────────────────────────────────────
// Realistic, messy human signal in "Speaker: statement" form so the rule-based
// generator attributes speakers and extracts traceable requirements. The Slack
// checkout thread deliberately carries the one-click-vs-step-up-auth
// contradiction so a BRD built from it shows the completeness gate in action.
const S = (
  integrationId: IntegrationId,
  id: string,
  title: string,
  preview: string,
  author: string,
  when: string,
  kind: string,
  participants: string[],
  content: string,
): SignalFull => ({
  id,
  integrationId,
  title,
  preview,
  author,
  when,
  kind,
  participants,
  chars: content.length,
  content,
})

const DEMO_SIGNALS: SignalFull[] = [
  // ── Slack ──
  S('slack', 'slack-checkout', '#product-checkout — Checkout overhaul',
    'Katrina, Omar & James scoping the new checkout flow', 'Katrina M.', '2d ago', 'thread',
    ['Katrina', 'Omar', 'James', 'Priya'],
    `Katrina: We need to cut checkout abandonment by 30% this quarter.
Omar: Checkout should complete in three steps max from cart to confirmation.
Katrina: Returning customers must have one-click buy with saved cards.
James: One-click must not skip the step-up auth on orders over $500.
Priya: The gateway must support payments in 14 currencies with live rates.
Omar: Guest checkout must be available on every platform.`),
  S('slack', 'slack-fraud', '#fraud-ops — Fraud check budget',
    'Omar & Dana on where fraud screening runs', 'Omar R.', '4d ago', 'thread',
    ['Omar', 'Dana'],
    `Omar: Fraud detection must flag suspicious transactions before authorisation.
Dana: We must not add more than 200ms of latency in the fraud check.
Omar: High-risk orders should route to manual review within five minutes.`),
  S('slack', 'slack-mobile', '#mobile — Mobile checkout gaps',
    'Maya & Omar on the mobile path', 'Maya L.', '1w ago', 'thread',
    ['Maya', 'Omar'],
    `Maya: Mobile checkout must work without a saved shipping address.
Maya: Users should be able to edit cart quantities without leaving the page.
Omar: The confirmation screen must display an order number.`),

  // ── Gmail ──
  S('gmail', 'gmail-compliance', 'Re: Payments compliance sign-off',
    'Legal & Finance constraints for launch', 'Legal (Dana K.)', 'Aug 21', 'email',
    ['Legal', 'Product', 'Finance'],
    `Legal: All payment data must be PCI DSS Level 1 compliant.
Legal: We must not store raw card numbers on our own servers.
Product: The checkout UI must be WCAG 2.1 AA accessible.
Finance: We must not charge users for storing a payment method.`),
  S('gmail', 'gmail-vendor', 'Re: Payment gateway vendor evaluation',
    'Priya summarising vendor requirements', 'Priya S.', 'Aug 18', 'email',
    ['Priya', 'Omar'],
    `Priya: The payment API must respond under 800ms at the 99th percentile.
Priya: The vendor must provide a sandbox for automated tests.
Omar: We should support Apple Pay and Google Pay at launch.`),

  // ── Google Meet ──
  S('meet', 'meet-kickoff', 'Checkout kickoff — recording transcript',
    'Full kickoff with goals & scope', 'Katrina M.', 'Aug 20', 'transcript',
    ['Katrina', 'Omar', 'James', 'Priya'],
    `Katrina: The goal is to reduce cart abandonment and grow mobile conversion.
Omar: Mobile checkout must work without a saved address.
James: Guest checkout must be available on every platform.
Priya: We need real-time currency conversion at checkout.
Katrina: Payment API calls must stay under 800ms at the 99th percentile.`),
  S('meet', 'meet-planning', 'Sprint planning — checkout',
    'Refunds, receipts & retries', 'Omar R.', 'Aug 22', 'transcript',
    ['Omar', 'Dana'],
    `Omar: Refunds must be processed within two business days.
Dana: The system should send an email receipt after every purchase.
Omar: Every checkout error must show a human-readable message.`),

  // ── Loom ──
  S('loom', 'loom-walkthrough', 'Cart redesign walkthrough',
    'Maya walking the cart & taxes states', 'Maya L.', 'Aug 19', 'transcript',
    ['Maya'],
    `Maya: The cart page must show estimated taxes before checkout.
Maya: Users should be able to edit quantities without leaving the cart.
Maya: The confirmation page must display an order number and an estimated delivery date.`),

  // ── Notion ──
  S('notion', 'notion-brief', 'Checkout — product brief',
    'North-star metric & saved-address assumptions', 'Katrina M.', 'Aug 15', 'note',
    ['Katrina', 'Priya'],
    `Katrina: The north-star metric is checkout completion rate.
Priya: We must support saved addresses for returning users.
Priya: We assume the address service is provided by the existing profile team.`),

  // ── Linear ──
  S('linear', 'linear-epic', 'CHK-142 — Checkout reliability epic',
    'Error handling & payment retry issues', 'Dana K.', 'Aug 17', 'issue',
    ['Dana', 'Omar'],
    `Dana: Every checkout error must show a human-readable message.
Dana: The system must retry a failed payment once automatically.
Omar: We must not lose the cart contents when a payment fails.`),
]

const signalsFor = (id: IntegrationId): SignalFull[] => DEMO_SIGNALS.filter((s) => s.integrationId === id)
const stripContent = (s: SignalFull): IntegrationSignal => {
  const { content: _content, ...meta } = s
  return meta
}

/** The provider contract the generate journey depends on. */
export interface IntegrationProvider {
  /** Human label for /api/health (never leaks a key). */
  label: string
  listAccounts(): Promise<IntegrationAccount[]>
  connect(id: IntegrationId): Promise<IntegrationAccount>
  disconnect(id: IntegrationId): Promise<IntegrationAccount>
  /** Signals available from one connected account (metadata only). */
  listSignals(id: IntegrationId): Promise<IntegrationSignal[]>
  /** Fetch full content for chosen signal ids (for ingest into a Source). */
  getSignalsContent(ids: string[]): Promise<SignalFull[]>
}

/**
 * Zero-secret provider backed by the demo corpus. Connection state lives in
 * process memory (a single Bun process), so connect/disconnect persist for the
 * session — durable enough for the slice, and the exact surface a real provider
 * fills. A couple of accounts start connected so the journey has signal on first
 * open; everything is honestly flagged `demo: true`.
 */
export class DemoIntegrationProvider implements IntegrationProvider {
  label = 'demo (sample signals — set COMPOSIO_API_KEY for live sync)'
  private connected = new Set<IntegrationId>(['slack', 'gmail', 'meet'])
  private connectedAt = new Map<IntegrationId, string>()

  private account(id: IntegrationId): IntegrationAccount {
    const meta = integrationMeta(id)!
    const isOn = this.connected.has(id)
    const sig = signalsFor(id)
    return {
      ...meta,
      connected: isOn,
      connectedAs: isOn ? demoAccountLabel(id) : undefined,
      signalCount: sig.length,
      demo: true,
      lastSync: isOn ? this.connectedAt.get(id) ?? 'moments ago' : null,
    }
  }

  async listAccounts(): Promise<IntegrationAccount[]> {
    return INTEGRATION_CATALOG.map((m) => this.account(m.id))
  }

  async connect(id: IntegrationId): Promise<IntegrationAccount> {
    this.connected.add(id)
    this.connectedAt.set(id, 'just now')
    return this.account(id)
  }

  async disconnect(id: IntegrationId): Promise<IntegrationAccount> {
    this.connected.delete(id)
    this.connectedAt.delete(id)
    return this.account(id)
  }

  async listSignals(id: IntegrationId): Promise<IntegrationSignal[]> {
    if (!this.connected.has(id)) return []
    return signalsFor(id).map(stripContent)
  }

  async getSignalsContent(ids: string[]): Promise<SignalFull[]> {
    const wanted = new Set(ids)
    // Only surface content from connected accounts, preserving corpus order.
    return DEMO_SIGNALS.filter((s) => wanted.has(s.id) && this.connected.has(s.integrationId))
  }
}

function demoAccountLabel(id: IntegrationId): string {
  switch (id) {
    case 'slack': return 'acme.slack.com'
    case 'gmail': return 'team@acme.com'
    case 'meet': return 'Acme Workspace'
    case 'loom': return 'acme.loom.com'
    case 'notion': return 'Acme / Product'
    case 'linear': return 'acme.linear.app'
    case 'github': return 'acme-inc'
    case 'figma': return 'Acme Design'
  }
}

/**
 * Assemble selected signals into one ingestable transcript. Prefixes each block
 * with a "— from <App>: <title> —" separator comment; the generator's parser
 * treats non "Speaker:" lines as continuation, so the separators are ignored for
 * requirement extraction but keep provenance readable in the stored source.
 */
export function assembleTranscript(signals: SignalFull[]): string {
  return signals
    .map((s) => {
      const meta = integrationMeta(s.integrationId)
      return `— from ${meta?.name ?? s.integrationId}: ${s.title} —\n${s.content}`
    })
    .join('\n\n')
}

let singleton: IntegrationProvider | null = null

/**
 * Select the integration provider. Today always the demo provider (the seam is
 * ready for a Composio adapter — instantiate it here when `COMPOSIO_API_KEY` is
 * set and the adapter is implemented). Returns a process singleton so
 * connect/disconnect state persists across requests.
 */
export function createIntegrationProvider(): IntegrationProvider {
  if (singleton) return singleton
  // if (process.env.COMPOSIO_API_KEY) singleton = new ComposioIntegrationProvider()
  singleton = new DemoIntegrationProvider()
  return singleton
}

/** Safe label for /api/health. Never contains a key. */
export function activeIntegrationProviderLabel(): string {
  return createIntegrationProvider().label
}

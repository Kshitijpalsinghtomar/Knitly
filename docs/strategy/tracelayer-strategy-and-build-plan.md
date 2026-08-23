# TraceLayer — Strategy & Build Plan

*Compiled 2026-08-23 from a full competitive & trend research sweep: the 10 requirements-management incumbents, the SDD trend leaders (Kiro / Spec Kit / OpenSpec / Tessl), the agentic IDEs (Cursor / Claude Code / Antigravity), the AI-PRD & customer-intelligence startup field, demand/funding evidence, and a six-platform integration evaluation. Full working notes live in [`competitive-notes.md`](../research/competitive-notes.md).*

---

## 0. The bet, in five lines

- **The job:** turn messy, multi-party human signal (meetings, Slack, email) into a **verified, provenance-anchored spec**, then keep a **live thread** from each requirement's *original source quote* → decision → design → **merged code** — and flag the moment any of them disagree.
- **Why now:** spec-driven development is *the* trend, MCP is now a governed standard, and capital is pouring into AI-code quality & verification — yet every tool in the space starts *after* a clean spec already exists.
- **The copy-proof core:** "ingest a conversation and cite it" is now table-stakes (Nautex, Dovetail, Nugget, Cycle all do a version of it). The part **nobody** owns is the *triangle*: external-source provenance **+** cross-source / cross-time contradiction detection **+** live code-conformance. That triangle compounds into trace-data gravity.
- **The wedge:** the empty middle between $0–59/user PRD toys (no rigor, no trace) and $47–124K/yr regulated RM suites (too heavy, contact-sales). Non-regulated, AI-native software teams. Self-serve. Priced on the engine.
- **The line:** *"Shipping AI-written code with no traceable link back to what a human actually asked for is not trustworthy."*

---

## 1. The honest market truth (what the research changed)

I went in assuming "messy input → traceable spec" was an empty lane. **It is no longer empty**, and pretending otherwise would build the wrong product. Here is the real map.

**Five camps, and where each stops:**

1. **Requirements-management / ALM incumbents** (Jama, Visure, codebeamer, MatrixReq, ReqView, Modern Requirements, reqSuite, Reqtest, Requirements Portal, + Jira-via-plugins). Expect an *already-authored* requirement. Traceability = coverage matrices + suspect-link flags, not a human-readable source→code chain. AI is a *co-author* (rewrite to EARS, gen test cases, flag ambiguity) — **never a provenance verifier**. Priced for regulated buyers ($47–124K/yr, mostly contact-sales). Moat = trace-data gravity + compliance certs.
2. **SDD trend leaders** (Kiro, GitHub Spec Kit, OpenSpec, Tessl). Start from *one developer's already-distilled prompt*. Internal traceability only (task ↔ requirement number). Tessl — the best-funded ($125M) — **abandoned spec authoring** for agent-skill governance, which is the loudest possible signal that authoring-from-clean-intent is commoditizing.
3. **Agentic IDEs** (Cursor Plan Mode, Claude Code, Google Antigravity). Intent → plan → code. Antigravity even *verifies its own output* — but it verifies "does it run/render," not "does it conform to a traced requirement." **These are our downstream, not our competitor.**
4. **Customer-intelligence / AI-PRD startups** (Dovetail ~$960M, Kraftful→Amplitude, Enterpret, ChatPRD, Productboard, BuildBetter). Two halves: raw-signal→insight *with source citation* but stops at themes/opportunities; OR "you already know what to build"→writes-doc→pushes-to-code but weak on ingestion/provenance. Meeting-notes tools (Otter/Fireflies/Fathom) all stop at notes & action items.
5. **The near-competitors — the ones to actually watch:** **Nautex.ai** ("capture messy inputs… shape a clear first spec… traceability across specs, files, tasks"), **isoform/Yansu** ("capture intent from discussions, examples, tribal knowledge"), **Nugget AI** (interviews → PRDs *with real customer quotes* → GitHub/MCP), **Cycle.app** (feedback→features, bidirectional GitHub/Linear sync, $6M seed). Thin, new, and aimed at roughly our front-end.

**What is STILL unowned — verified by two independent research passes:**

> No tool combines **(a) provenance to the original *external* source quote** (the exact meeting moment / Slack message / email utterance — not just an internal insight card), **(b) cross-source, cross-time contradiction detection** (reconciling what *different stakeholders* said across *different threads over months*), and **(c) live code-conformance** (checking the merged PR against the requirement).

Even the most rigorous methodology found (VSDD) builds a complete internal chain but *"has no mechanism for citing/quoting external source documents."* That gap is the product.

---

## 2. Identity — the thing a prompt can't copy

A prompt can copy a UI, a doc template, even an extraction chain. It **cannot** copy:

- **Accumulated trace-data gravity.** Every requirement TraceLayer verifies knits one more strand of a graph: source quote ⇄ decision ⇄ design frame ⇄ PR ⇄ status, across a team's whole history. Both Jama (10M-item live graph) and MatrixReq lock in precisely because switching means recreating the entire web. The graph is the moat, not any screen — and it grows every time the product is used.
- **The three-way triangle** above, as a *system of record*, not a one-shot generation. Generation is a commodity; *maintaining a verified thread over time* is not.
- **Being the neutral layer *on top of* the systems of record.** We borrow GitHub/Figma/Slack via API and never try to replace them (proven model: Modern Requirements sits on ADO, no data leaves it). That neutrality is a position, not a feature.

**Positioning sentence to build toward:** *"Building without TraceLayer isn't trustworthy"* — because the alternative is AI-generated code shipping with no verifiable line back to a human decision, and signed-off specs silently drifting from both the conversation that created them and the code that's supposed to implement them.

---

## 3. Demand — and the objection we must answer

**Demand is real and funded.** Tessl $125M; CodeRabbit $60M ("quality gates for AI-assisted coding"); Macroscope $40M ("track code"); the "context engineering" movement is top-of-HN (915 pts). Willingness to pay is proven at the rigorous end (Jama median **$76.5K/yr**). Documented pain: coding agents fail systematically above ~400K LOC ("the gap wasn't intelligence — it was context"); "Amazon Kiro took down AWS for 13 hours." MCP is now a governed standard (Anthropic donated it to the Agentic AI Foundation, Dec 2025) — the agent-bridge plumbing is standardized, so our differentiation must be the *guardrailed trace context*, not the bridge.

**The objection to preempt (it's credible and loud):** a vocal camp argues SDD is "waterfall redux" and that *no tool can turn messy input into a durable spec because writing the spec IS the thinking* ("Spec-driven development doesn't work if you're too confused to write the spec"; marmelab's "Waterfall Strikes Back," 225 pts).

> **Our answer:** TraceLayer does **not** claim to do the thinking for you or replace discovery. It preserves *provenance* and detects *drift/contradiction* — the parts humans reliably fail at and that compound silently. We assist the discovery; we don't pretend to finish it. This must be baked into the product's voice and UX, or we inherit the backlash.

---

## 4. Monetization

**Principle: charge on the engine; make viewing and collaboration free.** Per-seat pricing is the thing every incumbent is routing around (Jama's $47–124K per-seat model caps org-wide rollout; ReqView/Altium/reqSuite all give viewers free seats).

- **Free / solo:** connect sources, generate a limited number of verified BRDs, full viewing. Land the solo founder & indie hacker (the Trace mascot + self-serve flow already fits this).
- **Team (self-serve, transparent — the wedge):** unlimited viewers/collaborators; **priced on engine usage** — verified documents generated, sources connected, living-doc re-extractions, drift checks. This is the empty middle nobody serves with transparent pricing.
- **Enterprise:** SSO/SCIM, audit export, data-residency / self-hostable integration layer, the guardrailed MCP bridge, on-prem LLM option. This is where compliance/audit buyers live — pursued *after* the wedge, not first.

---

## 5. The meeting → code lifecycle: what to minimize, replace, add

| Lifecycle step | Who owns it today | TraceLayer's move |
|---|---|---|
| Elicitation (meetings/Slack/email) | Notes tools (Otter/Fireflies) — stop at action items | **ADD**: ingest as *traceable source signal*, not notes |
| Analysis / reconciliation | Humans, manually; nobody detects cross-source conflict | **ADD** (core moat): cross-source, cross-time contradiction detection |
| Specification (BRD→PRD→spec→stories) | RM suites (heavy) / PRD tools (shallow) | **REPLACE** with AI-generated, provenance-anchored, gated docs |
| Design (Figma) | Figma | **BORROW**: link frames + detect version drift, never rebuild |
| Implementation (PR) | GitHub + agentic IDEs | **BORROW + THREAD**: REQ↔PR link, feed a verified spec forward |
| Verification | CI / code review (CodeRabbit) | **ADD**: requirement-*conformance* check (said-vs-specified-vs-built) |

We deliberately **minimize** our footprint in design and implementation (thin live links only) and **concentrate** engineering on elicitation→specification-with-provenance and the code-conformance thread — the parts that are unowned and compound.

---

## 6. The product surface: the requirement page IS the product

One page, showing a single requirement's full chain end-to-end: **source quote(s)** → decision & who made it → **Figma frame + approval history** → **code PR** → status (in-sync / stale / contradicted / unlinked). Nobody has this in one place — today it's scattered across four tools. The existing `RequirementView` already has the live-panel bones; the rest of the app should orbit this page.

---

## 7. The BRD generation journey — redesigned

Replacing the current mock `IntegrationsView` (fake `setTimeout` sync timers) and thin gen modal with a real, staged flow:

1. **Connect sources** *(real, Composio-backed)* — GitHub / Figma / Gmail / Slack via managed OAuth **+** upload transcripts & files. No fake timers; real connection state.
2. **Intent dialog** *(optional, high-value)* — "What is this BRD about?" Capture topic/scope + optional target outcome. Scopes extraction, sharpens quality. Fully skippable.
3. **Signal selection** — pick *which* specific threads / emails / channels / files / PRs feed this BRD (not the whole firehose). Preview each item before including it.
4. **Generate** *(real LLM)* — extract requirements, each carrying a **source-quote link** (provenance). Run **conflict detection** across the selected sources. Completeness rule stays: *complete only if every requirement is traced AND no unresolved conflicts.*
5. **Review & resolve** — the requirement page: accept/edit each requirement, resolve conflicts ("Trace suggests…"), approve.
6. **Downstream unlock** — only once the BRD is complete do **PRD → spec → stories → roadmap** unlock (server-enforced gate; recent commits already lay the groundwork for document-type gating).
7. **Skip / alternate scenarios:**
   - *"We only need a tech doc"* → start at spec with a manually-attested parent.
   - *"Someone else made the BRD"* → import/attest an external BRD as the parent so downstream unlocks.
   - *Credential-verification links* → deep-link to the team's Figma/GitHub so a reviewer can confirm the referenced design/code actually exists.

---

## 8. Architecture — build with libraries, own the seams

The discipline: **borrow undifferentiated plumbing, own the trace graph and the policy.** Every external dependency sits behind our own adapter interface (mirroring the existing `BrdGenerator` seam).

- **Integration layer → Composio (primary).** Managed OAuth + field-preserving tools (keeps PR SHA, Figma version hash, Slack `ts`) + webhook triggers + hosted MCP + Python/TS SDKs. Behind an `IntegrationProvider` seam so we can swap to **Nango** (OSS, self-hostable, SOC 2) or **Arcade** (VPC/air-gapped) for compliance buyers. **Loom = direct API, low priority** (no platform wraps it).
- **Extraction → real Claude**, swapped in behind the existing `BrdGenerator` interface. The deterministic `RuleBasedBrdGenerator` stays as an offline/fallback path.
- **MCP bridge → we host our own MCP server = TraceLayer's policy engine.** It calls Composio tool-execution underneath. Composio gives tool-level allow-list + per-user auth; **we** add the row/field-level visibility policy that guarantees *nothing restricted ever leaks* (your hard constraint). Restricted context simply isn't reachable through the bridge.
- **Data → multi-tenant Postgres (Neon).** Extend the current `sources`/`brds` schema to workspaces, users, documents, requirements, trace-links, conflicts. The DB client stays server-only (never in the browser bundle); `ServerStatus` never leaks the connection URL.
- **Biggest risk to actively manage:** Composio is cloud-only and customer signal transits it. Keep the seam swappable; offer the self-hostable layer (Nango/Arcade) as the enterprise escape hatch.

---

## 9. Phased build plan

**Phase 0 — Make the real slice trustworthy (foundations)**
- Swap `RuleBasedBrdGenerator` → real Claude generator behind the `BrdGenerator` seam.
- Multi-tenant schema + workspace/user identity + auth.

**Phase 1 — The generation journey (§7)**
- Rebuild `IntegrationsView` into a real Composio-backed source picker (kill the fake timers).
- Intent dialog → signal selection → generate → review, all wired to the real engine.
- Server-enforced downstream gating + the three skip scenarios.

**Phase 2 — The missing viewers**
- Build PRD, spec (**emits EARS** for Kiro/Spec-Kit interop), stories (INVEST/Gherkin), roadmap, and research viewers — matching the `st()` / CSS-var / `Trace`/`Ico`/`Btn` design language, each rendering real generated docs with provenance.

**Phase 3 — Code traceability & drift (the moat)**
- Real GitHub linking (Composio): REQ↔PR, rendered in `TraceabilityView` + the requirement chain.
- Figma frame linking + version-hash drift detection.
- Three-way said-vs-specified-vs-built contradiction surfacing in `ConflictsView` + the requirement page.

**Phase 4 — Living docs + guardrailed MCP bridge + realtime collab**
- Living docs: watch new signal (Composio triggers) → cheap classification → targeted re-extraction → human-approval queue.
- Our-own guardrailed MCP server (policy boundary over Composio tools).
- Real-time collaboration on documents.

**Phase 5 — Spec export into the SDD ecosystem**
- EARS/markdown export consumable by Kiro / Spec-Kit / Cursor / Antigravity's Implementation Plan — TraceLayer becomes the verified front-end that feeds the agents.

---

## 10. What we deliberately do NOT build

- A generic PM tool (Jira/Linear territory).
- A heavy, ugly enterprise ALM clone (the Jama/Polarion failure mode).
- The code-gen side of Spec Kit / Cursor / Kiro — we *feed* them.
- A second Figma / Slack / Notion — we borrow their surfaces via API.
- Spec-authoring-from-clean-intent — commoditized; Tessl already fled it.
- Regulated-industry compliance certs *first* — that's the incumbents' moat and a slow sales cycle; we start in the fast, non-regulated middle and grow into it.

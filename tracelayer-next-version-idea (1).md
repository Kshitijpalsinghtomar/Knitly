# TraceLayer — next version, final direction

Use this as the fixed reference for what TraceLayer is becoming. The two agent prompts (frontend design, idea/build reasoning) tell the agent *how* to think while building. This doc tells it *what* we're building, so it isn't re-derived differently every session.

---

## What TraceLayer is today
Meetings, Slack, emails, and docs go in → verified BRD/PRD comes out, every claim linked to a real quoted source. One-shot generation.

## What it's becoming
A **spec integrity layer**: the thing that keeps a live, verified spec in sync with both the messy human conversation that produced it and the code being written against it — and flags the moment those three things disagree.

Category: **spec-driven development / requirements-to-code assurance** — not project management, not a generic doc generator. This category is active and growing (GitHub Spec Kit, AWS Kiro, OpenSpec, Cursor, Claude Code, Tessl, Google Antigravity all ship a flavor of it), but almost all of it starts *after* a clean spec already exists. TraceLayer's edge is owning the step before that: turning real, messy human communication into a verified spec in the first place, then carrying that same verified thread all the way to the code.

## The three things this product actually does

**1. Living docs, not one-shot generation.**
Specs keep watching new signal (meetings, Slack, email) after they're created and update themselves — but never by blindly rerunning full extraction on every message. Cheap classification filters noise first; only signals that plausibly touch an existing requirement trigger a targeted, section-level re-extraction; high-confidence changes apply automatically, ambiguous or contradictory ones queue for human approval instead of silently overwriting a signed-off doc.

**2. Code traceability & contradiction board.**
Requirements link to GitHub PRs/commits. The board surfaces three states: a requirement with no linked code (not built yet), code with no linked requirement (undocumented scope), and code that contradicts what the linked requirement actually says. Start with explicit ID-based linking (PR references REQ-024); grow into semantic contradiction detection (does the diff actually do what the requirement says) once the basic version is proven.

**3. Spec export into the SDD ecosystem.**
Verified requirements export into a structured format the existing spec-driven coding tools (Spec Kit, Cursor, Claude Code, etc.) can consume — TraceLayer becomes the front door to a workflow developers are already adopting, instead of competing with it.

## Build order — smallest to biggest, in this sequence
1. Smart living-doc updates (classification filter → targeted re-extraction → confidence-gated apply/queue).
2. Spec export format for existing SDD tools.
3. Code traceability board v1 — explicit ID linking via GitHub webhook.
4. Semantic contradiction detection between diff and requirement intent.
5. Full loop — mailbox/team board integration, closing back to signal capture.

Ship 1–3 first. That alone is a real, differentiated product. 4–5 are what make it hard to displace once it's working.

## Who pays, and why
Engineering leads and compliance/audit owners — the people who get burned when AI-generated code ships with no traceable link to a requirement, or when a spec silently drifts out of sync with what's actually being built. This is a documented, active pain point in AI-assisted development right now, not a hypothetical.

## Integration architecture — build vs. borrow

Never rebuild the surface people already work in. Pull structured signal out via API, push lightweight actions/notifications back in. TraceLayer owns the trace and the verification; it never owns the canvas.

**Figma — borrow via API, don't rebuild the design tool.**
- Read: file/frame updates and version hashes via Figma's webhook events, comment threads via the Comments API, frame thumbnails via the image export API for display inside TraceLayer.
- Link: a frame to the requirement it implements, capturing the frame's version hash at link time — the same discipline as a source quote.
- Write back: when a requirement changes after a frame was approved, post a comment on the Figma file via API so the designer sees the flag where they already work, without needing to open TraceLayer.
- TraceLayer never becomes a second design surface. It shows a thumbnail and a status, not an editable canvas.

**Slack — borrow via API, don't rebuild chat.**
- Read: messages and threads relevant to a linked requirement, as source signal for the living-doc update system already planned.
- Write back: a bot that posts trace alerts into the channel people already use — "REQ-024 changed, the linked Figma frame is now stale" — instead of requiring anyone to log into TraceLayer to find out.
- No message composing, no channel management, no chat UI inside TraceLayer.

**GitHub — same pattern, already covered above:** webhook-based PR/commit linking, no code review UI rebuilt.

The rule that keeps this from becoming a Notion+Figma+Slack clone: TraceLayer only builds the parts none of those tools do — the trace graph, drift/contradiction detection, and a unified view of the chain. Everything else is read via API and, where useful, written back as a notification into the tool people are already in.

## The requirement page — one unified view

Every requirement gets a single page that is the one place the full chain is actually visible end to end: the source quote it came from, the decision that created it, the linked Figma frame with its approval/correction history, the linked code (PRs/commits), and its current status (in sync, stale, contradicted). Nobody currently has this — it's scattered across four tools with no single source of truth connecting them. Building this one page well, precisely, is the actual product; everything else (Slack alerts, Figma comments, GitHub webhooks) exists only to keep this one page accurate in real time.

## What NOT to build
- Not a generic project management tool (Jira/Linear territory — no edge there).
- Not a heavy, expensive, ugly enterprise ALM clone (Jama/Polarion's failure mode).
- Not a full rebuild of what Spec Kit/Cursor/Kiro already do on the code-generation side — integrate with that layer, don't recreate it.

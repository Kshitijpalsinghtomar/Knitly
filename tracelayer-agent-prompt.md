# TraceLayer frontend agent — operating instructions

Paste this as a persistent system/project prompt (CLAUDE.md, .cursorrules, or equivalent) so it applies to every task, not just the one you're currently asking about.

---

## 1. Before touching anything: map the blast radius

Never edit a component, state, or page in isolation. Before writing code:

1. Find every place that imports or reuses the thing you're about to change.
2. State explicitly: "If I change X, it affects Y because ___, and Z because ___."
3. Check the neighbors of the ripple too — Y's own dependents, not just X's.
4. Cover every state of the changed thing, not just the happy path: empty state, loading state, error state, disabled state, long-content overflow, mobile breakpoint, dark mode.

Do not silently patch the one spot that was asked about while leaving the three other places that render the same data inconsistent. If a downstream effect is large enough that fixing it changes the scope of the task, say so before proceeding — don't just quietly expand the diff.

## 2. Nothing gets built at the "just a button" level

Every element — button, card, input, section, empty state, nav item — goes through this before it's written:

- **Purpose**: what job is this doing in the user's flow at this exact moment? Is it competing for attention with something that matters more?
- **Hierarchy**: primary, secondary, or tertiary — and does its visual weight actually match that?
- **Shape & size**: padding, radius, and dimensions consistent with the existing system — not a new one-off value.
- **All states**: default, hover, active, focus, disabled, loading, error. An element with only a default state isn't finished.
- **Color**: pulled from the existing palette and used with actual semantic meaning (danger, success, neutral) — not decorative.
- **Motion**: only where it clarifies something (state change, causality) — never motion for its own sake.
- **Placement & spacing**: does it breathe against its neighbors, sit on the existing grid, align with siblings?
- **Copy/microcopy**: does the tone match the rest of the product?

If you can't answer all of these for an element, it's not ready to ship — go back and design it, don't place a default.

## 3. One request implies a system, not a widget

When asked for a single thing ("add a login button," "add a settings page"), first ask: what does this thing actually require to not feel broken?

- List everything adjacent that's implied — error handling, empty states, related nav entries, permission checks, the page it links to if it doesn't exist yet.
- Either build the complete, non-half-hearted version, or explicitly flag what you're deferring and why — never silently ship a stub and call it done.
- Ask what this page/feature *means* for the product as a whole — does it need to connect to something else that already exists (e.g., a new "requirements" view should probably link into the trace graph, not sit isolated).

## 4. No AI-default design, no SaaS-template cosplay

- No default gradient-hero, no unmodified shadcn spacing/shadows, no generic "modern SaaS" layout picked because it's familiar rather than right for this product.
- No visually copying the recognizable patterns of other tools (Linear's sidebar, Stripe's hero, Notion's blocks, Jama's dense old-school tables) — study them for what problem they solve, not for their look.
- Every visual decision needs a reason tied to what TraceLayer actually is (traceability, verification, audit-grade trust) — not "this is what SaaS apps look like now."
- The current design is approved. Extend its existing tokens, components, and patterns — don't introduce a second design language on top of it, and don't touch anything that wasn't asked to be touched.

## 5. Process to run on every task

1. Restate the request and its purpose in the product.
2. Map the blast radius (§1).
3. Run the element-level checklist (§2) for every new or changed piece of UI.
4. List what the request implies beyond the literal ask (§3) — build it or flag it.
5. Implement.
6. Self-check before calling it done: "would this pass as a deliberate design decision, or does it look like the default the tool would have produced with no thought?" If the latter, redo it.

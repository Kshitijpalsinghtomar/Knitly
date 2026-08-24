# Knitly — competitive & trend research (working notes)

Distilled, decision-oriented notes compiled from a research fleet. Raw agent transcripts are not kept here — only the findings that change what we build. Sources are the vendors' own product/pricing/feature pages plus review aggregators unless noted.

Status: **compiling** (research fleet still reporting in).

---

## Cross-tool signals (updated as evidence lands)

- **Nobody ingests messy human communication (meetings / Slack / email) to _create_ the spec.** Every requirements tool and every SDD tool starts from *already-authored* requirements or *already-clean* developer intent. This is the open lane.
- **GitHub integration is shallow where it exists.** Visure: GitHub not listed (Jira/DOORS/Azure DevOps/GitLab). Reqtest: GitHub not mentioned. MatrixReq: links GitHub/GitLab **issues** (create/backlink). Jama: generic "Git." → **requirement↔PR-diff contradiction detection is nobody's product**; at best they backlink issues, none checks whether the merged code actually does what the requirement says.
- **The real moat is accumulated trace-data gravity, not features.** Both Jama (10M-item live graph) and MatrixReq lock in because switching means recreating the entire trace web + audit history. Defensibility lesson: **the trace graph compounds with usage** — that's the copy-proof asset, not any single screen.
- **Per-seat pricing caps adoption.** Jama contracts run **$47K–$124K/yr** (Vendr median $76.5K); reviewers say per-license cost blocks org-wide rollout. Wedge: pricing where *everyone can see the trace* (viewers free), charge on the engine/verification, not per-viewer.
- **Pricing is opaque / quote-based at the heavyweight end** (Visure, Reqtest, MatrixReq, Jama all unpublished). Transparent self-serve pricing is a wedge for the solo-founder → mid-market band.
- **Traceability today = coverage matrices + impact analysis + "suspect link" flags**, not a human-readable "source quote → decision → design → code" chain. The chain-as-a-page is still nobody's core product.
- **MCP is already surfacing at the incumbent level** (Jama ships an OpenAI/MCP integration) — so an agent bridge is table-stakes-trending, not a novelty; the differentiation has to be the *guardrailed trace context* it exposes, not the bridge itself.
- **The "live reference" overlay model is proven in market** (Modern Requirements keeps every item as a live pointer to the ADO work item, no data leaves the system of record). This validates Knitly's "borrow the surface, own the trace" architecture — we can sit *on top of* GitHub/Figma/Slack as systems of record rather than copying/replacing them.
- **AI in this category is uniformly a co-author, never a provenance verifier.** Every tool now has AI that improves/analyzes/generates/compresses requirements, drafts test cases, checks ambiguity (Vivia, Copilot4DevOps, reqSuite "intelligent assistance," Matrix Compliance Checker). **None extracts requirements from raw human conversation with a traceable link back to who said what, when.** That extraction-with-provenance is the unclaimed capability.
- **Autonomous agents are entering the category** (Modern Requirements "Agents4DevOps," BYOLLM add-ons) — confirms the agent-to-agent direction is real, not speculative.
- **The pricing wedge is now unmistakable: charge on the engine, make viewing/collaboration free.** Altium bundles Requirements Portal at **$995/yr flat with unlimited collaborators**; ReqView publishes transparent per-seat (€440–600/user/yr) with a free tier; Jama/reqSuite give reviewers free seats. Jama's per-seat model ($47–124K) is the thing everyone is routing around.
- **The SDD trend leaders all start from a single developer's already-distilled prompt** (Kiro, OpenSpec, Spec Kit) — confirmed. The upstream "messy multi-party human comms → clean spec" step is unoccupied by the trend leaders too, not just the incumbents.
- **Export target for interop is EARS syntax** (`WHEN <trigger> THEN the system SHALL <response>`) — Kiro's `requirements.md` uses it; our "spec export into the SDD ecosystem" (north-star pillar 3) should emit this so Kiro/Spec Kit/OpenSpec can consume Knitly output directly.
- **Tessl's pivot is a flashing demand signal to interpret carefully.** The best-funded spec startup ($125M at $750M post, Snyk founder Guy Podjarny) abandoned spec-authoring for agent-skill governance by Aug 2026. Reading A: authoring-specs-from-clean-intent is commoditizing (Spec Kit/Kiro/OpenSpec are free/cheap) → don't compete there. Reading B: the messy-input→spec problem is the part nobody (including Tessl) tackled → that's exactly Knitly's lane. Both readings point the same way: **do NOT build spec-authoring-from-clean-intent; own the messy-input→verified-spec→code-trace thread.**
- **⚠ BRUTAL-HONESTY UPDATE — the "messy input → traceable spec" lane is NO LONGER empty.** Named, live entrants now market almost exactly Knitly's front-end: **Nautex.ai** ("capture messy inputs, ground them with signals, shape a clear first spec"; "traceability across specs, files, and tasks"; chat cites anchored spec items); **isoform / Yansu** ("capture intent and constraints from discussions, examples, and tribal knowledge"); **Nugget AI** (interviews/calls → PRDs *with real customer quotes* → Linear/GitHub + MCP); **Cycle.app** ($6M seed; feedback/calls → insights linked to features → bidirectional Linear/GitHub/Jira sync); **BuildBetter.ai** (calls/Slack/tickets → PRDs, MCP). The customer-intelligence camp (**Dovetail** ~$960M val, **Kraftful** acq. Amplitude, **Enterpret**) already does raw-signal→insight *with source traceability* but stops at themes/opportunities. So "ingest conversation + cite the source" is now table-stakes-trending, NOT a moat by itself.
- **The genuinely still-under-owned wedge (verified by two independent agents) narrowed to TWO things nobody does together:** (1) **provenance to the original EXTERNAL source quote** — the exact meeting moment / Slack message / email utterance, not just an internal insight card; and (2) **true three-way "said vs specified vs built" drift + cross-source contradiction detection** — reconciling what *different stakeholders* said across *different threads over time*, and checking the merged *code* against the requirement. Even the most rigorous SDD methodology found (VSDD) builds a full internal chain but "has no mechanism for citing/quoting external source documents." Cross-source, cross-time conflict detection is nobody's product. **That triangle is the copy-proof core — not the ingestion, not the citation alone.**
- **Closest incumbents actively closing in (watch as direct competitors):** **Jama Connect Advisor** (EARS/INCOSE rewrites, test-gen, semantic *Relationship Discovery* that auto-suggests missing trace links, PDF→structured-requirements + conversational assistant "in the works"); **Visure Vivia** ("governed AI," generate traceable reqs from interviews/docs, MCP server, human-in-loop approval); **Ketryx** (auto-traces Git tests → Jira requirements — the strongest *code-side* traceability, regulated); **QVscribe** (flags contradictions/redundancies). None combines external-source provenance + cross-source conflict + live code trace.
- **Demand & capital are validated and flowing to this exact lane.** Tessl $125M, **CodeRabbit $60M** ("quality gates for AI-assisted coding"), **Macroscope $40M** ("track code"), Kilo $8M; ecosystem: Supabase $500M @ $10.5B on "vibe coding." Documented pain: agents fail systematically above ~400K LOC ("the gap wasn't intelligence — it was context"); "Amazon Kiro took down AWS for 13 hours"; "context engineering" is a top HN movement (915 pts). MCP is now a *governed standard* (Anthropic donated it to the Agentic AI Foundation, Dec 2025) — the agent-bridge plumbing is standardized, so differentiation must be the guardrailed trace context, not the bridge.
- **The objection we MUST preempt:** a loud, credible camp argues SDD is "waterfall redux" and that *no tool can turn messy input into a durable spec because writing the spec IS the thinking* ("Spec-driven development doesn't work if you're too confused to write the spec"; marmelab "Waterfall Strikes Back," 225 pts). Our answer: Knitly does NOT claim to do the thinking for you — it preserves provenance and catches drift/contradiction, the parts humans reliably fail at and that compound silently. We assist discovery; we don't pretend to replace it.
- **Pricing gap is concrete and unoccupied.** Light PRD tools ($0–59/user: ChatPRD, Productboard, Notion AI) lack rigor/traceability; rigorous RM/ALM suites are "contact sales," regulated-industry-oriented, and enterprise-priced (Jama median **$76.5K/yr**, IBM/DOORS ~$100K/yr). The middle — "AI that turns everyday product conversations into traceable, conflict-checked requirements linked to code, for *non-regulated* software teams, with transparent self-serve pricing" — is largely empty. Market anchors (only firms fetchable): RM tools **$2.5B→$5.7B, 9.9% CAGR**; ALM **$4.77B→$6.81B (Mordor) / $12.8B→$24.6B (VMR)**.

---

## Incumbents (10-tool study)

### Visure Requirements — DONE
- **Who:** enterprise / regulated industries ("AI Engineering Management Platform for regulated industries"); 1,000+ regulated orgs (ABB, Saab, Vestas, Honeywell, Bosch). Systems/requirements/safety engineers, V&V, compliance/quality.
- **Workflow:** all-in-one ALM. Reqs imported (Word/Excel/ReqIF/DOORS) or authored in a central repo; configurable **data models** (customer→system→SW/HW reqs). Traceability is data-model-driven matrices incl. **Hazard Traceability Matrix**, spanning req↔req/test/risk and **source-code↔req**; coverage dashboards + upstream/downstream impact analysis. Change via dedicated **Change Mgmt + Baseline + Impact Analysis** with suspect-link-style flagging. AI = **Vivia** assistant + AI-powered V&V + automated compliance checklists.
- **Integrations:** Jira, DOORS (migration target), Azure DevOps, GitLab, ReqIF, Word/Excel, Sparx EA, Micro Focus ALM, Simulink, VectorCAST, Cameo, SCADE. **GitHub not listed.** Connectors are **paid per-connection add-ons.**
- **Pricing:** quote-based. Perpetual license OR annual cloud sub; S&M = 20%/yr of perpetual. Cloud (SOC2/SSO) or on-prem/air-gapped with **on-prem LLM**.
- **Moat:** data gravity (reqs+risk+test+code in one repo) + audit trail + compliance breadth (DO-178B/C, DO-254, ISO 26262, IEC 62304, ISO 13485/14971, ARP4754, ISO 21434, ASPICE, CMMI). Air-gap/on-prem-LLM locks in defense; perpetual + paid connectors raise switching cost.

### Reqtest — DONE
- **Who:** Swedish SaaS (2009, Stockholm; Nordtech Group). "Leading in the Nordics for QA of IT projects." 15K+ users, 300+ orgs. PMOs, BAs, QA/test leads, business stakeholders. ISO 27001.
- **Workflow:** three modules — **Requirements, Test Management, Bug Tracking** (+Reports/Planboard). Reqs via **CSV import or manual** + AI drafting; epics/user-stories hierarchy, reusable template projects. "**100% traceability**" req↔test↔bug. Change = **version log** (who/what/when, restore) — no formal baselines/suspect links. UAT via EasyTest; auto bug reports from test steps.
- **Integrations:** Jira, Azure DevOps, ServiceNow, Freshdesk, Workato (1000+ apps), test-automation; Open API. **GitHub + DOORS not mentioned.** Integrations are a managed service.
- **Pricing:** unpublished, quote-based, 10-day trial.
- **Moat:** lighter — cloud SaaS, ISO 27001, Nordic/ERP install base, managed integrations. **No safety certs, no baselining/suspect links, CSV-only import** → easy to rip out. Moat = workflow habit + regional presence, not compliance.

### MatrixReq ("Matrix One") — DONE
- **Who:** life sciences / medical device **only** ("purpose-built for medical device"). 500+ customers (Roche, Sanofi, Diabeloop, MindMaze). Regulatory Affairs, QA, Eng Director, PM, R&D. (matrixreq.com now redirects to matrixone.health.)
- **Workflow:** Excel/Word column-mapping import (no DOORS importer); unified versioned/auditable repo; **Compose** module with shared "Base Library" that products Include with auto-propagating updates. Traceability req→design outputs→risks→V&V with live trace reports (who/what/when/why) + impact analysis flagging "**broken, missing, or outdated traces**." Change: auto revision history, item locking, signed snapshots, red-line compare. Built-in **audit trails + e-signature**.
- **Integrations:** Jira, **GitHub & GitLab (create/link issues, backlinks)**, Azure DevOps, Confluence. Full **REST API + SDK**; SSO/MFA. Native test mgmt; no DOORS.
- **Pricing:** quote-only; FAQ references an **$8,000 onboarding** package.
- **Moat:** **certified vendor** (ISO 13485 + ISO 27001 with published certs — explicitly contrasts Jama as "framework aligned, no certificate"). AI Compliance Checker ingests ISO 13485/IEC 62304/ISO 14971/EU MDR/FDA QSR/21 CFR Part 11/510(k). Bundled **eQMS (Matrix Quality)** = CAPA, change control, controlled docs → data gravity across reqs+risks+tests+quality records.

### Jama Connect — DONE
- **Who:** enterprise-led + mid-market. Cross-industry (A&D, Automotive, MedTech, Semis, Industrial, Energy, Gov, FinServ). Systems Eng, Software Dev, Eng Leadership, BAs, Risk & Test.
- **Workflow:** import via Wizard + **Jama Connect Interchange** (ReqIF migration incl. DOORS); scales to 10M items/project via a "**semantic product graph**." **Live Traceability** upstream/downstream across req/test/risk/defect/design; Traceability Information Models + visual schematics for regulators; coverage-gap/change-impact. Change: side-by-side compare, **baselines** at milestones, **branches** for variants, reuse catalogs. **Review Center**; **Reviewer license = digital sign-off, included free**.
- **Integrations:** Jira, Azure DevOps, Git; test: TestRail, Xray, Parasoft, LDRA, Questa; MBSE: Cameo/CATIA, Sparx EA, Simulink, Capella; PLM: Windchill, Aras; **plus OpenAI/MCP**. Best-in-class **REST API**.
- **Pricing:** quote-only; 4 license types (Creator / Stakeholder / Reviewer-free / Test Runner). Vendr median **$76,543/yr** (range $47K–$124K). Reviewers: "pricy," per-license cost caps org-wide rollout.
- **Moat:** **TÜV SÜD validated** for safety-related development, SOC2 Type II, TISAX L2; standards breadth (ISO 26262, ASPICE, DO-178C/254/ARP4754, ISO 13485/FDA 820.30/21 CFR Part 11/ISO 14971). Moat = trace-data gravity (10M-item live graph) + validated environment.

### reqSuite rm (OSSENO / PeakAvenue) — DONE
- **Who:** mid-sized companies building technically sophisticated products + public authorities + innovation teams. Regulated engineering skew (auto ISO 26262, rail, medical IEC 62304/ISO 13485, aero DO-178C) + IT/tenders. 4.6/5 GetApp.
- **Workflow:** manual authoring in a **fully customizable data model** (drag-drop categories/fields/forms/relationships/workflows) or Word/Excel/ReqIF import. Reuse is a core pillar: approved reuse libraries, project templates, "intelligent branching" for variants, one-click change propagation, legacy-comparison. Traceability = typified req↔req links + graphical dependency diagrams + impact analysis + auto consistency checks. Change: versioning, diffs, baselines, notifications. AI: quality/ambiguity analysis, link/term suggestions, auto test-case gen, 20+ lang translation; isolated instances, no training on customer data.
- **Integrations:** bidirectional Jira, Azure DevOps, **GitLab**, ClickUp, TestRail, EA, Redmine; REST API. (No GitHub named.)
- **Pricing:** quote-based; perpetual+maintenance OR subscription; named + floating; **read-only seats free**; no free trial (configured pilot).
- **Moat:** customized data models + reuse libraries + on-prem + ISO 27001/GDPR. Tool-agnostic hub → **weaker lock-in** than DOORS/ADO-native tools.

### Modern Requirements (4DevOps + Copilot4DevOps) — DONE
- **Who:** teams standardized on **Microsoft Azure DevOps** in regulated industries (medical, banking, insurance, A&D, gov, rail, auto, energy). Eng/quality/compliance leadership. 4.7/5 GetApp; Info-Tech 2025 "Champion."
- **Workflow — key differentiator:** a **doc/authoring/reporting layer on top of native ADO work items, not a separate DB**. "Every work item in a Smart Doc is a live reference to ADO," runs in-tenant, no data leaves ADO. Adds Smart Docs (rich-text, Meta Templates for SRS/test plan/trace matrix/sign-off), Smart Reports (Word/PDF/HTML), Baselines, Version Package. Traceability: live Intersection/Horizontal matrices, Trace Analysis (coverage heatmap, gap analysis, Link Tree), suspect link + impact assessment. **Review = compliance strength:** FDA 21 CFR Part 11 password e-signatures, reviewer vs approver, "approve as package," Approval Audit Report (name/role/decision/comment/timestamp), air-gapped. AI: **Copilot4DevOps** (Chat over backlog, Elicit/Analyze/Generate/Transform/Convert/Mockup/SOP/Diagram/Q&A) + BYOLLM + autonomous **Agents4DevOps**.
- **Integrations:** ADO-native; **AI Sync Bridge** (ADO↔ADO, ADO↔Jira, Jira↔Jira). **GitHub, DOORS import, ReqIF, public REST API NOT found** — narrow, ADO-centric.
- **Pricing:** quote-based; 4 editions (Frontier / Frontier AI / Engineering / Engineering AI); free trial.
- **Moat:** very high via ADO lock-in (reqs ARE ADO work items) + compliance/audit gravity (21 CFR Part 11 e-sig, DO-178C/254, IEC 62304, ISO 26262, ASPICE, GAMP 5, SOC 2). Weakness: fate tied to Microsoft ADO.

### ReqView — DONE
- **Who:** SMB→mid systems/HW/SW engineers on safety/mission-critical products (aero, auto/rail, medical, robotics); budget **DOORS-migration** target ("limited-DOORS at a fraction of the price"). Buyer = eng lead/QA/founder, not a central tools org.
- **Workflow:** Word/PDF/CSV/Excel/ReqIF import; manual authoring with **ISO/IEC/IEEE 29148 templates**. Hierarchical objects + custom attributes. Traceability = directed custom link types (Satisfies/Verification), live RTM (≤3 levels), coverage/impact, **suspect-link flags**. Change = Git/SVN history, baselines, audit trail.
- **Integrations:** Jira Cloud (export baseline + sync dev status back), Azure DevOps, Sparx EA, Capella, ReqIF, **Git hosts incl. GitHub/GitLab/Bitbucket**, SVN. Storage = **human-readable JSON in your own repo**. No public REST API.
- **Pricing (published! rare):** FREE (1 doc/≤150 objects); PRO **€440/user/yr**; TEAM **€600/user/yr**; ENTERPRISE €1,800/floating (min 3). 14-day trial, free edu.
- **Moat:** **deliberately LOW lock-in** — portable JSON + ReqIF, easy rip-out by design. No named safety certs. Moat = price/simplicity + traceability habit.

### Requirements Portal (Altium, ex-Valispace) — DONE
- **Who:** hardware/systems/electronics engineers inside **Altium ECAD** shops (Airbus, Heart Aerospace, ClearSpace, DMG Mori).
- **Workflow:** V-model. **AI-assisted import of unstructured XLS/PDF/DOC** + AI assistant that **drafts/decomposes requirements**; reusable numerical parameters feed engineering calcs. Links requirements to Altium ECAD (schematics/PCB/BOM), verifications, parent-child → live matrices. **"Continuous Verifications"** auto-check performance vs targets. Baselines/suspect-links/approvals **"coming soon."**
- **Integrations:** deep Altium Designer + Altium 365 + SOLIDWORKS. **No Jira/GitHub/ReqIF/DOORS/API.** Cloud-only.
- **Pricing:** bundled in **Altium Develop $995/yr flat with UNLIMITED collaborators** (the differentiator). No free tier.
- **Moat:** high *if already on Altium* (requirements welded to ECAD data) + unlimited-collab adoption. But young/immature, cloud-only, weak interchange.

### codebeamer (PTC) — DONE
- **Who:** enterprise ALM for safety-critical/regulated (auto, medical, aero/defense, industrial). BMW, Mazda, Hamilton Medical, Medtronic, Align, Daimler, Samsung. DOORS-migration target.
- **Workflow:** full ALM in one repo (reqs/tests/tasks/bugs/changes/CI-CD), "Smart Requirement View," industry templates. End-to-end trace (req→design→code→test→defect), matrices, coverage/gap, impact, suspect links, baselining, e-signature review. Con: bulk trace edits often need Word/Excel export.
- **AI:** was "lacks AI" through 2024; PTC announced AI + config-management for codebeamer/ALM in 2026 (specifics unfetchable — page blocked).
- **Integrations:** strong REST API (~80–85% OOB), tight Windchill PLM, Jira (connector "needs work"), Git/GitLab, DOORS migration.
- **Pricing:** quote-only, seat-based (named + floating); reviewer cites an on-prem deal ~$20K/yr, licenses flexed 10–180.
- **Moat:** ready-made ASPICE/ISO 26262/HARA/FDA modules, audit trail, unified-data-model data gravity, deep Windchill lock-in + multi-year strategic deals.

### Jira Service Management (as an RM tool) — DONE
- **Not a requirements tool** — it's ITSM/service-desk. Appears in RM talk only because Atlassian-stack orgs stretch Jira issues into requirements. Natively lacks: requirement tree/hierarchy, real traceability matrix, baselines/versioning of req sets, coverage/gap, suspect links, compliant e-sig.
- **How teams bend it (the tell):** third-party apps fill the gap — **R4J** (req tree, doc view, trace matrix, coverage, baselining — pitched "alternative to Polarion/DOORS/Jama, all within Jira"), **Requirement Yogi** (author reqs in Confluence, link to Jira; 330k+ users), **Xray/Zephyr** (test↔requirement coverage). → confirms requirements-in-Jira is a real, unmet demand that plugins monetize.
- **Pricing:** Free ≤3 agents; paid ~$20/agent/mo (Standard/Premium ~$10–25); RM plugins are extra per-user. **Moat:** Atlassian ecosystem lock-in + low entry — NOT compliance; no native ALM safety certs.

---

## SDD / AI-first trend

### GitHub Spec Kit — preview confirmed
- Starts from **one developer's written intent** (not messy multi-party input). Essentially **markdown templates + prompts over third-party agents** (MIT-licensed, no commercial engine). **No native requirement→source or requirement→code traceability.**

### Tessl — preview confirmed (full detail in the DONE entry below)

### Kiro (AWS) — DONE
- Agentic SDD from AWS. NL description → **Requirements** (`requirements.md`, WHEN/THEN/SHALL EARS-style acceptance criteria) → **Design** (`design.md`: architecture, sequence diagrams, data flow) → **Tasks** (`tasks.md`, run concurrently in "waves") → parallel-agent implementation with **correctness checks / contradiction+gap reasoning before writing code**. Also Bugfix specs + "Quick Spec."
- **Starts from:** a developer's NL prompt + codebase "steering" context. **No ingestion of meetings/Slack/email.**
- **Pricing:** credit-based — Free $0 / Pro $20 / Pro+ $40 / Pro Max $100 / Power $200 per mo; Enterprise tier. Free year of Pro+ for VC-backed startups (Dec 2025).
- **News:** announced Jul 2025; re:Invent Dec 2025 previewed autonomous agent running "hours or days" with persistent context. Web/iOS/CLI/Crew through 2026.

### OpenSpec (Fission-AI) — DONE
- MIT **open-source**, free. Markdown spec layer between human & AI. Slash commands `/opsx:explore → propose "idea" → apply → archive`. Brownfield + greenfield. Works with 30+ AI tools (Cursor, Copilot, Codex, Amazon Q). **Starts from a developer's idea/feature request** — not multi-party comms. No commercial engine.

### Tessl — DONE (pivoted)
- **Was (Nov 2024):** "AI-native development," specs as durable system-of-record; PMs/non-coders submit NL/code specs → Tessl generates+maintains code. **$125M raised at $750M post** (Index/Accel/GV/Boldstart); founder **Guy Podjarny (Snyk)**.
- **Now (Aug 2026):** **"Agent Enablement Platform"** — governs AI-agent **skills** ("Skills are the new code"), **Tessl Registry** (3,000+ skills), evals, security/governance. **No longer touches spec creation.** Integrates Claude Code/Cursor/Copilot/Gemini.
- **Read:** the best-funded spec startup left spec-authoring → strong evidence not to compete on authoring-from-clean-intent, and that messy-input→spec was never claimed.

### Cursor / Claude Code / Google Antigravity — DONE
- **Headline:** all three are **intent-first** (developer's typed prompt/goal + codebase → plan → code). **None ingests messy multi-party comms; none has requirement-to-source traceability.**
- **Cursor:** Plan Mode researches codebase + asks clarifying Qs → reviewable implementation plan; persistent context via hand-authored Rules/AGENTS.md. 2026 changelog added Slack/Gmail/Drive plugins + agents that watch PRs/Slack — context *sourcing* for the agent, not requirement extraction. Verification = Bugbot + tests. ~$20–40/user/mo; ~$1B ARR late 2025. (Wikipedia "SpaceX acquired Cursor" claim = hallucination, ignore.)
- **Claude Code + Agent SDK:** intent → plan (Plan Mode, read-only) → code; CLAUDE.md memory, subagents, MCP. MCP *can* read Drive/Jira/Slack — tool access, not spec production/verification. Sessions link to PRs (`--from-pr`) = workflow linkage, not requirement linkage.
- **Google Antigravity** (launched Nov 18 2025 w/ Gemini 3): most spec-artifact-oriented — Editor + Manager (multi-agent) views; **Implementation Plan** artifact reviewed/approved before code; `/grill-me` elicits clarifications; emits **Artifacts** (task lists, plans, screenshots, browser recordings) + **Walkthrough** with screen recordings. Its distinguishing feature = agents **validate their own code** via browser use — BUT verifies "does it run/render," NOT conformance to a traced requirement. Free during preview.
- **Takeaway:** these are the *downstream* Knitly feeds. Their planning artifacts are technical, ephemeral, intent-derived — a verified, provenance-anchored spec that Plan Mode / `/grill-me` / an Implementation Plan can consume is complementary, not competitive.

### cto.new / okasa.ai — DONE
- **cto.new** (Engine Labs / Era Technologies; $5.7M led by Kindred + PROfounders, Oct 2025; visible principals Simon Spurrier, Michael Ludden): **free-forever browser AI code agent** — chat → multi-agent "teams" plan + code directly into GitHub repos, open/test/merge PRs; connects Linear/Sentry/Vercel/Notion/any MCP; marketplace to hire/list AI teams. Ideation→PR, does NOT assume a spec. Ad-supported + optional Premium. → another *downstream code-gen consumer*, not a competitor to the spec layer.
- **okasa.ai = MISIDENTIFICATION.** Redirects to ocasa.ai, a real-estate photos→virtual-tour-video tool (WY LLC, no team/funding disclosed). Not a CMO/marketing agent, not relevant. **Discard from analysis.**

### AI PRD/requirements startups — DONE
- **Split market (the key structural finding):** (1) **raw input → insights/opportunities then STOP or hand to Jira/Linear** — Dovetail (~$960M val, "every insight links to source"), Kraftful (YC, *acq. Amplitude* Jul 2025, standalone shut Aug 11 2025), Enterpret ("Context Graph" traceability); strong ingestion + source-trace but stop at themes, not formal requirements, no code. (2) **"you already know what to build" → write doc → push to code** — ChatPRD (bootstrapped, Claire Vo; $15/mo; best code path: MCP + v0/Lovable/Bolt/Cursor + GitHub/Linear), Productboard Spark (drafts PRDs w/ citations); weak on raw-corpus ingestion + evidence→requirement trace. (3) **pure research gen** — Maze (~$57.5M raised; user research, no requirements/code).
- **On-thesis adjacents:** **Cycle.app** and **Nugget AI** (PRDs with real customer quotes → Linear/GitHub + MCP) are the thinnest/newest and closest to the full chain.
- **Whitespace confirmed:** the full chain *raw messy input → structured traceable requirements (quote-linked) → forward to code with a live link* is served only by the newest/thinnest entrants; no incumbent owns "evidence-linked requirements whose trace carries into engineering." Meeting-notes tools (Otter/Fireflies/Fathom/Circleback/Spinach/Gong) **all stop at notes/action items/tickets** — none produce structured traceable requirements.

### Demand / market-gap evidence — DONE
- **Gap is real but closing** — see the ⚠ cross-tool signal above (Nautex, isoform/Yansu already market messy-input→traceable-spec). Fowler's SDD taxonomy (Kiro/Spec-Kit/Tessl all "spec-first," internal-trace only) + the "too confused to write the spec / Waterfall Strikes Back" critique are the intellectual headwind to answer.
- **WTP proven** (Vendr): Jama median $76,543/yr (range $47K–$124K); IBM/DOORS-family ~$100K/yr. Fast money in AI-native lane (Tessl $125M, CodeRabbit $60M, Macroscope $40M).
- **Tailwinds:** MCP standardized + governed (Anthropic → Agentic AI Foundation, Dec 2025); spec-as-source-of-truth is vendor doctrine; documented agent-failure/blast-radius costs; "context engineering" grassroots demand.

---

## Standards / lifecycle — DONE (thin from research; relying on domain knowledge + verified market anchors)
- The standards agent hit hard web blocks and returned mainly **market anchors** (already folded into cross-tool signals): RM tools **$2.5B→$5.7B, 9.9% CAGR** (Verified Market Reports); ALM **$4.77B→$6.81B, 7.36%** (Mordor) / **$12.8B→$24.6B, 7.8%** (VMR). Independent RM TAM cross-checks were unverifiable (all analyst sites bot-blocked).
- **Standards to build TO (well-established, applied from domain knowledge — no external fetch needed):**
  - **ISO/IEC/IEEE 29148** — requirements engineering; the canonical SRS/StRS/SyRS structure + characteristics of a good requirement (unambiguous, verifiable, traceable). ReqView templates to this. → our BRD/PRD/spec section models should map to 29148.
  - **EARS** (Easy Approach to Requirements Syntax) — `WHEN <trigger> THEN the system SHALL <response>`. Kiro's requirements.md uses it; Jama Advisor + QVscribe rewrite to it. → our **spec export must emit EARS** for Kiro/Spec-Kit/OpenSpec interop.
  - **INCOSE** guide for writing requirements — quality rules; Jama/Visure enforce it. **IREB/CPRE** — the requirements-engineering certification body (elicitation → analysis → specification → validation → management), i.e., the discipline we're automating the provenance of.
  - **BABOK** — business-analysis body of knowledge (stakeholder analysis, elicitation, requirements lifecycle) → informs the BRD layer specifically.
  - **BDD / Gherkin** (`Given/When/Then`) + **INVEST** (good user stories) → informs the stories viewer + acceptance criteria.
  - Regulated (only if we chase that buyer later): **DO-178C** (aero SW), **ISO 26262** (automotive functional safety), **IEC 62304** (medical SW), **ISO 13485 / FDA 21 CFR Part 11** (QMS/e-sig). These are the incumbents' moat (Jama/Visure/codebeamer/MatrixReq) — we deliberately do NOT start here.
- **Lifecycle POV (meeting→code):** elicitation (meetings/Slack/email) → analysis/reconciliation → specification (BRD→PRD→spec→stories) → design (Figma) → implementation (PR) → verification. Incumbents own specification→verification for regulated buyers; SDD tools own specification→implementation for the clean-intent case. **Knitly's insertion point = elicitation→specification with provenance, then a thin live thread through design→implementation→verification (the trace, not the doing).**

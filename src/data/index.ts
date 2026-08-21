import type { TeamMember, Project, Document, Integration, DocType, AiFlag, RequirementDetail, OrphanPR } from '../types'

export const TEAM_DATA: TeamMember[] = [
  { id:'u1', name:'Katrina M.', email:'katrina@acme.com', initials:'KM', color:'#F5A623', role:'owner',  online:true,  lastActive:'Online now', joined:'Jan 2024', projects:['p1','p2','p3'] },
  { id:'u2', name:'James T.',   email:'james@acme.com',   initials:'JT', color:'#5B8DEF', role:'admin',  online:true,  lastActive:'Online now', joined:'Jan 2024', projects:['p1','p3'] },
  { id:'u3', name:'Sofia R.',   email:'sofia@acme.com',   initials:'SR', color:'#4EAD79', role:'member', online:false, lastActive:'2h ago',     joined:'Feb 2024', projects:['p2'] },
  { id:'u4', name:'Omar H.',    email:'omar@acme.com',    initials:'OH', color:'#9B6FE8', role:'member', online:true,  lastActive:'Online now', joined:'Jan 2024', projects:['p1','p3'] },
  { id:'u5', name:'Priya K.',   email:'priya@acme.com',   initials:'PK', color:'#E05F6A', role:'viewer', online:false, lastActive:'1d ago',     joined:'Mar 2024', projects:['p2'] },
]
export const TEAM = TEAM_DATA

export const DOC_META: Record<DocType, { label:string; icon:string; color:string; desc:string }> = {
  brd:      { label:'BRD',          icon:'doc',    color:'#F5A623', desc:'What the business needs' },
  prd:      { label:'PRD',          icon:'target', color:'#5B8DEF', desc:'What the product will do' },
  spec:     { label:'Tech Spec',    icon:'code',   color:'#4EAD79', desc:'How to build it' },
  stories:  { label:'User Stories', icon:'chat',   color:'#9B6FE8', desc:'Who it is for' },
  roadmap:  { label:'Roadmap',      icon:'map',    color:'#E05F6A', desc:'When things happen' },
  research: { label:'Research',     icon:'flask',  color:'#E0823A', desc:'What we have learned' },
}

export const PROJECTS: Project[] = [
  { id:'p1', name:'Checkout Flow v2', gradient:'linear-gradient(135deg,#F5A623,#E0823A)', status:'active',
    desc:'Overhaul the payment UX — multi-currency, one-click buy, less friction.',
    team:['u1','u2','u4'], conflicts:4, reqs:52, lastActivity:'2h ago',
    github:'checkout-v2', jira:'SHOP-124', linear:'ENG-234',
    docs:{ brd:1,prd:2,spec:1,stories:14,roadmap:0,research:1 },
    integrationMappings:[
      { integrationId:'github', resource:'repo: checkout-v2' },
      { integrationId:'jira', resource:'board: SHOP-124' },
      { integrationId:'slack', resource:'#product #eng-checkout' },
    ] },
  { id:'p2', name:'Mobile App Rewrite', gradient:'linear-gradient(135deg,#5B8DEF,#9B6FE8)', status:'draft',
    desc:'Native iOS and Android. Swift and Kotlin. No more React Native.',
    team:['u1','u3','u5'], conflicts:2, reqs:23, lastActivity:'1d ago',
    github:'native-rewrite', jira:'MOB-001', linear:null,
    docs:{ brd:1,prd:1,spec:0,stories:7,roadmap:1,research:0 },
    integrationMappings:[
      { integrationId:'github', resource:'repo: native-rewrite' },
      { integrationId:'jira', resource:'board: MOB-001' },
    ] },
  { id:'p3', name:'AI Recommendations', gradient:'linear-gradient(135deg,#9B6FE8,#E05F6A)', status:'review',
    desc:'Personalised product recs using collaborative filtering and behaviour signals.',
    team:['u2','u4'], conflicts:0, reqs:38, lastActivity:'3d ago',
    github:'ai-recs', jira:'ML-045', linear:'ML-89',
    docs:{ brd:0,prd:1,spec:2,stories:8,roadmap:0,research:2 },
    integrationMappings:[
      { integrationId:'github', resource:'repo: ai-recs' },
      { integrationId:'linear', resource:'team: ML-89' },
    ] },
]

export const DOCUMENTS: Document[] = [
  { id:'d1', pid:'p1', type:'brd',      title:'Checkout Flow v2 — Business Requirements',      status:'draft',  v:3, author:'u1', contrib:['u2','u4'], reqs:39, conflicts:4, when:'2h ago',  ai:true  },
  { id:'d2', pid:'p1', type:'prd',      title:'Multi-Currency Payment — Product Requirements', status:'review', v:2, author:'u2', contrib:['u1'],     reqs:18, conflicts:0, when:'1d ago',  ai:false },
  { id:'d3', pid:'p1', type:'prd',      title:'One-Click Buy — Product Requirements',          status:'draft',  v:1, author:'u1', contrib:[],          reqs:11, conflicts:1, when:'4h ago',  ai:true  },
  { id:'d4', pid:'p1', type:'spec',     title:'Payment Gateway — Technical Specification',     status:'draft',  v:1, author:'u2', contrib:['u4'],      reqs:0,  conflicts:0, when:'2d ago',  ai:false },
  { id:'d5', pid:'p1', type:'research', title:'Checkout UX — Competitive Analysis',            status:'final',  v:1, author:'u3', contrib:['u1'],      reqs:0,  conflicts:0, when:'5d ago',  ai:false },
  { id:'d6', pid:'p2', type:'brd',      title:'Mobile Rewrite — Business Requirements',        status:'draft',  v:1, author:'u1', contrib:['u5'],      reqs:23, conflicts:2, when:'1d ago',  ai:true  },
  { id:'d7', pid:'p2', type:'prd',      title:'Mobile App — Product Requirements',             status:'draft',  v:1, author:'u3', contrib:['u1'],      reqs:11, conflicts:0, when:'3d ago',  ai:false },
]

export const BRD_SECTIONS = [
  { id:'s1', n:'01', title:'Executive Summary',           body:'Checkout Flow v2 targets a 30% drop in cart abandonment and an 18% lift in average order value. Requirements were pulled from Slack threads, Jira epics, and stakeholder interviews.' },
  { id:'s2', n:'02', title:'Functional Requirements',     items:['REQ-001 — Support payments in 14 currencies with real-time exchange rates.','REQ-002 — Checkout completes in 3 steps max from cart to confirmation.','REQ-003 — One-click purchasing for returning customers with saved payment methods.','REQ-007 — Integrate Apple Pay, Google Pay, and Stripe.','REQ-011 — Fraud detection flags suspicious transactions before authorisation.'] },
  { id:'s3', n:'03', title:'Non-Functional Requirements', items:['REQ-004 — Payment API calls under 800ms at p99.','REQ-008 — Checkout UI is WCAG 2.1 AA compliant.','REQ-010 — All payment data is PCI DSS Level 1 compliant.','REQ-015 — Handles 10,000 concurrent sessions without degrading.'] },
  { id:'s4', n:'04', title:'Stakeholders',                body:'Katrina M. owns checkout conversion. James T. owns gateway architecture. Omar H. manages sprint delivery. Three Finance stakeholders are unlinked and need assignments before Sprint 6.' },
  { id:'s5', n:'05', title:'Open Decisions',              body:'Fraud vendor (Stripe Radar vs. Sift) pending Finance. Crypto rounding rules blocked on Legal. Both required before Sprint 6 kick-off.' },
]

export const CONFLICTS_DATA = [
  { id:'CON-001', severity:'major', reqA:'REQ-003', reqB:'REQ-012', title:'One-click buy breaks PCI step-up auth above $500',        desc:'REQ-003 wants frictionless one-click. REQ-012 requires biometric step-up for orders over $500. Without a threshold rule, these directly contradict.', fix:'Apply one-click below $500, step-up above it. Update both requirements to reference the $500 threshold.' },
  { id:'CON-002', severity:'minor', reqA:'REQ-004', reqB:'REQ-011', title:'Fraud check latency breaks the 800ms API target',          desc:'REQ-004 targets 800ms p99. Sift alone adds 600–900ms. Both cannot be satisfied without an architectural change.',                                   fix:'Run fraud checks async post-authorisation, or raise p99 to 1,400ms.' },
  { id:'CON-003', severity:'minor', reqA:'REQ-008', reqB:'REQ-017', title:'Card loading animation violates WCAG motion rules',         desc:'The card flip in REQ-017 does not honour prefers-reduced-motion. Users with vestibular disorders are affected.',                                   fix:'Wrap animation in @media (prefers-reduced-motion). Two lines of CSS.' },
  { id:'CON-004', severity:'major', reqA:'REQ-010', reqB:'REQ-022', title:'Client-side card preview kills your PCI compliance scope', desc:'REQ-022 wants a live card number preview in the browser. Raw PAN data in your DOM is an immediate PCI DSS Level 1 violation.',                   fix:'Use a Stripe.js iFrame. Card data never touches your DOM. PCI scope stays clean.' },
]

export const ACTIVITY = [
  { id:'a1', uid:'u2', verb:'resolved',      obj:'CON-002 fraud latency conflict',          proj:'Checkout Flow v2',   time:'12m ago' },
  { id:'a2', uid:'u4', verb:'linked PR #441', obj:'to REQ-024',                             proj:'Checkout Flow v2',   time:'1h ago'  },
  { id:'a3', uid:'u1', verb:'generated',     obj:'BRD from 4 Slack threads + 2 Jira epics', proj:'Checkout Flow v2',   time:'2h ago'  },
  { id:'a4', uid:'u3', verb:'commented on',  obj:'REQ-007 conflict',                         proj:'Mobile App Rewrite', time:'3h ago'  },
  { id:'a5', uid:'u2', verb:'synced',        obj:'14 tickets from Jira SHOP-124',            proj:'Checkout Flow v2',   time:'4h ago'  },
]

export const COLLAB_COMMENTS = [
  { id:'cm1', uid:'u2', req:'REQ-003', text:'This directly conflicts with REQ-012. Do we have the threshold rule finalised yet?', time:'1h ago', resolved:false },
  { id:'cm2', uid:'u4', req:'REQ-007', text:'Confirmed with the payment team — Stripe is the vendor. We can close this one.',      time:'3h ago', resolved:true  },
  { id:'cm3', uid:'u1', req:'REQ-011', text:'Blocked on Finance for the fraud vendor decision. Cannot finalise until then.',       time:'5h ago', resolved:false },
]

export const INTEGRATIONS_DATA: Integration[] = [
  { id:'github',     name:'GitHub',     cat:'Code & Dev',    on:true,  meta:'12 repos',       icon:'github', color:'#3d4147', hi:'#d0d7de', desc:'PRs, issues, and commits linked to requirements.', lastSync:'3 min ago',  syncedItems:47,  nextSync:'12 min' },
  { id:'linear',     name:'Linear',     cat:'Planning',      on:true,  meta:'3 teams',        icon:'linear', color:'#5E6AD2', hi:'#a0a8f0', desc:'Issues and milestones mapped back to requirements.', lastSync:'8 min ago',  syncedItems:31,  nextSync:'7 min'  },
  { id:'jira',       name:'Jira',       cat:'Planning',      on:true,  meta:'5 projects',     icon:'jira',   color:'#0052CC', hi:'#4d9fff', desc:'Epics, stories, and sprints flow into documents.',  lastSync:'15 min ago', syncedItems:89,  nextSync:'now'    },
  { id:'slack',      name:'Slack',      cat:'Communication', on:true,  meta:'#product #eng',  icon:'slack',  color:'#4A154B', hi:'#e01e5a', desc:'Decisions from channels become requirements.',       lastSync:'2 min ago',  syncedItems:156, nextSync:'3 min'  },
  { id:'figma',      name:'Figma',      cat:'Design',        on:false, meta:null,             icon:'figma',  color:'#F24E1E', hi:'#ff7262', desc:'Link prototypes and designs to requirements.',        lastSync:null,         syncedItems:0,   nextSync:null     },
  { id:'notion',     name:'Notion',     cat:'Docs',          on:false, meta:null,             icon:'doc',    color:'#404040', hi:'#aaa',    desc:'Pull in pages and databases as source documents.',    lastSync:null,         syncedItems:0,   nextSync:null     },
  { id:'gmail',      name:'Gmail',      cat:'Communication', on:false, meta:null,             icon:'mail',   color:'#EA4335', hi:'#ff7b72', desc:'Requirements hiding in email threads.',               lastSync:null,         syncedItems:0,   nextSync:null     },
  { id:'confluence', name:'Confluence', cat:'Docs',          on:false, meta:null,             icon:'link',   color:'#0052CC', hi:'#4d9fff', desc:'Import spaces and pages into the pipeline.',          lastSync:null,         syncedItems:0,   nextSync:null     },
]

export const KB_TEMPLATES = [
  { id:'t1', type:'brd'      as DocType, name:'Standard BRD',        desc:'Full business requirements with stakeholder analysis and success metrics.', uses:12, platform:true  },
  { id:'t2', type:'prd'      as DocType, name:'Feature PRD',         desc:'Product requirements for a specific feature or epic.',                       uses:8,  platform:true  },
  { id:'t3', type:'spec'     as DocType, name:'API Specification',   desc:'Technical spec for a REST or GraphQL API endpoint.',                         uses:5,  platform:true  },
  { id:'t4', type:'stories'  as DocType, name:'User Story Pack',     desc:'A structured pack of user stories with acceptance criteria.',                uses:21, platform:true  },
  { id:'t5', type:'roadmap'  as DocType, name:'Quarterly Roadmap',   desc:'Product roadmap broken into themes, milestones, and outcomes.',              uses:3,  platform:false },
  { id:'t6', type:'research' as DocType, name:'Competitor Analysis', desc:'Structured template for evaluating 3-5 competitors.',                        uses:7,  platform:false },
]

export const KB_SHARED_REQS = [
  { id:'sr1', code:'GLOB-001', title:'PCI DSS Level 1 compliance required for all payment flows',   used:3, projects:['Checkout Flow v2'] },
  { id:'sr2', code:'GLOB-002', title:'WCAG 2.1 AA accessibility for all user-facing interfaces',     used:5, projects:['Checkout Flow v2','Mobile App Rewrite'] },
  { id:'sr3', code:'GLOB-003', title:'GDPR data deletion within 30 days of user request',           used:4, projects:['AI Recommendations'] },
  { id:'sr4', code:'GLOB-004', title:'API response time under 200ms at p50 for core endpoints',     used:2, projects:['Checkout Flow v2','AI Recommendations'] },
]

export const KB_PROPOSED = [
  { id:'pr1', type:'brd' as DocType, name:'Meeting Transcript BRD', desc:'Auto-generate a BRD from a meeting transcript with action items and decisions extracted.', proposedBy:'u3', status:'pending' },
  { id:'pr2', code:'GLOB-005', title:'All third-party APIs must have circuit breakers with 5s timeout', proposedBy:'u4', status:'pending' },
]

export const NOTIFICATIONS_DATA = [
  { id:'n1', type:'conflict', title:'New conflict detected in Checkout Flow v2', sub:'REQ-003 and REQ-022 cannot coexist. Trace needs your attention.', time:'12m ago', read:false, color:'var(--err)' },
  { id:'n2', type:'review',   title:'James T. requested your review',            sub:'Multi-Currency PRD v2 — review before end of day.',              time:'1h ago',  read:false, color:'var(--ac)'  },
  { id:'n3', type:'sync',     title:'Slack sync completed',                      sub:'Trace found 14 new requirements in #product-checkout.',           time:'2h ago',  read:false, color:'var(--ai)'  },
  { id:'n4', type:'invite',   title:'Sofia R. joined Checkout Flow v2',          sub:'Sofia accepted the invitation and has view access.',              time:'5h ago',  read:true,  color:'var(--ok)'  },
  { id:'n5', type:'resolve',  title:'CON-002 resolved by James T.',              sub:'Fraud latency conflict marked resolved.',                         time:'6h ago',  read:true,  color:'var(--ok)'  },
]

export const GRAPH_NODES = [
  { id:'r1', x:300, y:130, label:'REQ-001', type:'req'         },
  { id:'r2', x:520, y:85,  label:'REQ-003', type:'req'         },
  { id:'r3', x:460, y:270, label:'REQ-007', type:'req'         },
  { id:'r4', x:185, y:280, label:'REQ-010', type:'req'         },
  { id:'r5', x:640, y:220, label:'REQ-015', type:'req'         },
  { id:'s1', x:135, y:120, label:'Slack',   type:'source'      },
  { id:'s2', x:355, y:390, label:'Jira',    type:'source'      },
  { id:'s3', x:610, y:370, label:'GitHub',  type:'source'      },
  { id:'k1', x:700, y:115, label:'James T.', type:'stakeholder' },
  { id:'c1', x:545, y:170, label:'CON-004', type:'conflict'    },
]
export const GRAPH_EDGES = [['s1','r1'],['s1','r4'],['s2','r3'],['s2','r4'],['r2','r5'],['r3','c1'],['k1','r2'],['r1','r4'],['c1','r2'],['s3','r3']]
export const NODE_COL: Record<string,string> = { req:'#5B8DEF', source:'#4EAD79', stakeholder:'#9B6FE8', conflict:'#E05555' }

export const AI_FLAGS: AiFlag[] = [
  { id:'f1', sectionId:'s4', label:'Fraud vendor decision required — which vendor should we use?', options:['Use Stripe Radar','Use Sift','Defer to Finance decision'], resolved:false },
  { id:'f2', sectionId:'s5', label:'Crypto rounding rules — pick approach before Sprint 6', options:['Always round down','Round to nearest cent','Block crypto until Legal clears'], resolved:false },
]

export const REQUIREMENTS_DETAIL: RequirementDetail[] = [
  {
    id:'REQ-001', docId:'d1', pid:'p1',
    title:'Support payments in 14 currencies with real-time exchange rates.',
    priority:'high', status:'in-sync',
    source:{ quote:'"We need to support at least 12 currencies for European expansion — finance team wants this by Q2 at minimum, ideally 14 to cover APAC markets too."', origin:{ type:'slack', channel:'#product', authorId:'u2', date:'Jan 15' } },
    decision:'Settled on 14 after APAC scope was confirmed in the Jan 12 roadmap review. Exchange rates will use Stripe\'s real-time feed — not a cached table, because stale rates on checkout create payment failures.',
    figma:{ frame:'Checkout / CurrencyPicker', version:'v4', approvedById:'u1', approvedAt:'2d ago', status:'in-sync' },
    code:{ pr:441, prTitle:'feat: add currency selector with 14 options and live Stripe exchange rates', merged:true, authorId:'u2', mergedAt:'3d ago', status:'in-sync' },
    history:[
      { v:1, change:'Created from Slack thread — James flagged 12-currency minimum for EU expansion', byId:'u1', at:'8d ago' },
      { v:2, change:'Scope extended 12 → 14 currencies after APAC roadmap confirmed', byId:'u2', at:'3d ago' },
    ],
  },
  {
    id:'REQ-002', docId:'d1', pid:'p1',
    title:'Checkout completes in 3 steps max from cart to confirmation.',
    priority:'high', status:'unlinked',
    source:{ quote:'"The current 6-step checkout is killing conversion. I want three steps, maximum: review, pay, confirm. That\'s it. No exceptions."', origin:{ type:'meeting', authorId:'u1', date:'Jan 8' } },
    decision:'Three-step flow agreed in kick-off. Step 1: cart review + address. Step 2: payment method. Step 3: confirmation. Design is approved at v2, engineering sprint not yet scheduled.',
    figma:{ frame:'Checkout / 3-Step Flow', version:'v2', approvedById:'u1', approvedAt:'4d ago', status:'in-sync' },
    code:null,
    history:[
      { v:1, change:'Created from kick-off meeting transcript', byId:'u1', at:'10d ago' },
    ],
  },
  {
    id:'REQ-003', docId:'d1', pid:'p1',
    title:'One-click purchasing for returning customers with saved payment methods.',
    priority:'high', status:'contradicted',
    source:{ quote:'"Returning customers should buy in one tap — no re-entering cards, no friction. Amazon does it, we can too. This is table stakes."', origin:{ type:'slack', channel:'#product', authorId:'u1', date:'Jan 10' } },
    decision:'One-click approved for orders under $500. Step-up biometric auth required above that threshold per REQ-012. The $500 threshold rule must be explicit in the implementation.',
    figma:{ frame:'Checkout / OneClick', version:'v1', approvedById:'u1', approvedAt:'3d ago', status:'in-sync' },
    code:{ pr:438, prTitle:'feat: one-click buy for returning customers (all orders)', merged:false, authorId:'u4', mergedAt:'—', status:'contradicted', contradiction:'PR implements one-click for all order amounts with no threshold check. The requirement (updated v2) requires step-up auth above $500 to satisfy REQ-012. The $500 gate is missing from this diff.' },
    history:[
      { v:1, change:'Created from Slack — Katrina requested one-click checkout', byId:'u1', at:'10d ago' },
      { v:2, change:'Added $500 threshold restriction after CON-001 was flagged by James', byId:'u2', at:'2d ago' },
    ],
  },
  {
    id:'REQ-004', docId:'d1', pid:'p1',
    title:'Payment API calls complete under 800ms at p99.',
    priority:'critical', status:'contradicted',
    source:{ quote:'"800ms p99 is the hard ceiling. Anything above that and we lose customers on slower connections. This is a platform SLA, not a suggestion."', origin:{ type:'jira', authorId:'u2', date:'Jan 11' } },
    decision:'Platform SLA sets 800ms ceiling. Current Sift integration adds 600–900ms, making the combined path 1,200–1,400ms. CON-002 is open. Resolution path: async fraud check post-auth, or raise SLA target to 1,400ms with Finance sign-off.',
    figma:null,
    code:{ pr:433, prTitle:'feat: payment gateway integration v1 with Sift fraud check', merged:true, authorId:'u2', mergedAt:'5d ago', status:'contradicted', contradiction:'Integration benchmarks show p99 at 1,240ms with Sift enabled. Requirement ceiling is 800ms. CON-002 is flagged but unresolved — no architectural change has been made.' },
    history:[
      { v:1, change:'Created from Jira SHOP-124 — platform SLA constraint', byId:'u2', at:'12d ago' },
    ],
  },
  {
    id:'REQ-007', docId:'d1', pid:'p1',
    title:'Integrate Apple Pay, Google Pay, and Stripe as payment methods.',
    priority:'high', status:'unlinked',
    source:{ quote:'"We need the payment methods our users already trust. Apple Pay, Google Pay, Stripe. Confirmed with the payment team — Stripe is the gateway vendor."', origin:{ type:'slack', channel:'#eng-checkout', authorId:'u4', date:'Jan 14' } },
    decision:'Stripe as primary gateway. Apple Pay and Google Pay implemented via Stripe Elements — keeps PCI scope clean, no raw token handling on our side.',
    figma:{ frame:'Checkout / PaymentMethods', version:'v3', approvedById:'u2', approvedAt:'3d ago', status:'in-sync' },
    code:null,
    history:[
      { v:1, change:'Created from Slack — Omar confirmed Stripe as vendor', byId:'u4', at:'8d ago' },
    ],
  },
  {
    id:'REQ-008', docId:'d1', pid:'p1',
    title:'Checkout UI is WCAG 2.1 AA compliant.',
    priority:'medium', status:'in-sync',
    source:{ quote:'"Accessibility is not optional. WCAG 2.1 AA across the entire checkout — every input, every button, every error state. Legal requires it and we\'re aligned."', origin:{ type:'email', authorId:'u1', date:'Jan 9' } },
    decision:'WCAG 2.1 AA is the legal minimum. Automated axe-core CI check added to every PR. Manual audit with a screen reader scheduled for Sprint 5 before QA sign-off.',
    figma:{ frame:'Checkout / Accessibility Audit', version:'v1', approvedById:'u3', approvedAt:'4d ago', status:'in-sync' },
    code:{ pr:422, prTitle:'feat: WCAG 2.1 AA audit and remediation across checkout flow', merged:true, authorId:'u3', mergedAt:'4d ago', status:'in-sync' },
    history:[
      { v:1, change:'Created from legal team email — WCAG 2.1 AA contractual mandate', byId:'u1', at:'12d ago' },
    ],
  },
  {
    id:'REQ-010', docId:'d1', pid:'p1',
    title:'All payment data is PCI DSS Level 1 compliant.',
    priority:'critical', status:'unlinked',
    source:{ quote:'"PCI DSS Level 1 is a contractual requirement with our payment processor. We cannot go live without certified compliance. No shortcuts."', origin:{ type:'email', authorId:'u1', date:'Jan 9' } },
    decision:'PCI scope managed via Stripe.js iFrame — raw PANs never touch our DOM. CON-004 flagged a potential violation in REQ-022 (client-side card preview). Formal audit planned Sprint 6.',
    figma:null,
    code:null,
    history:[
      { v:1, change:'Created from legal team email — contractual PCI Level 1 requirement', byId:'u1', at:'12d ago' },
    ],
  },
  {
    id:'REQ-011', docId:'d1', pid:'p1',
    title:'Fraud detection flags suspicious transactions before authorisation.',
    priority:'high', status:'stale',
    source:{ quote:'"We lost $240k to friendly fraud last quarter. Pre-auth fraud scoring on every transaction — before money moves. Not post-auth, pre-auth."', origin:{ type:'slack', channel:'#product', authorId:'u1', date:'Jan 13' } },
    decision:'Pre-auth fraud check required. Vendor decision (Stripe Radar vs. Sift) is blocked on Finance approval. Sprint 5 implementation cannot start until vendor is selected. Blocked.',
    figma:null,
    code:null,
    history:[
      { v:1, change:'Created from Slack — Katrina escalated post-Q4 fraud loss report', byId:'u1', at:'9d ago' },
    ],
  },
]

export const ORPHAN_PRS: OrphanPR[] = [
  { pr:388, title:'refactor: split payment session storage into two separate services', authorId:'u4', mergedAt:'5d ago', branch:'refactor/session-split' },
  { pr:404, title:'fix: handle Stripe webhook timeout edge case on 3DS redirect', authorId:'u2', mergedAt:'3d ago', branch:'fix/stripe-3ds-timeout' },
  { pr:412, title:'chore: upgrade Stripe SDK to v14 and migrate deprecated API calls', authorId:'u4', mergedAt:'2d ago', branch:'chore/stripe-sdk-v14' },
]

# TraceLayer — Backend Specification

This document covers everything the backend agent needs to implement to wire up the TraceLayer frontend. The frontend is a complete React + Vite app in `src/`. All data is currently mocked in `src/data/index.ts`. Replace mock data with real API calls.

---

## Tech Stack Recommendation

| Layer | Choice |
|---|---|
| Runtime | Node.js 20+ with TypeScript |
| Framework | Fastify (or Express) |
| Database | PostgreSQL (primary) |
| Cache / Queues | Redis + BullMQ |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens) |
| Real-time | WebSocket (ws or socket.io) |
| AI | Anthropic Claude API (claude-sonnet-5 for doc gen, claude-haiku-4-5 for quick extractions) |
| File storage | S3-compatible (exports, attachments) |
| Email | Resend or Postmark (invite emails) |

---

## Data Models (Prisma schema)

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  plan      Plan     @default(FREE)
  createdAt DateTime @default(now())
  users     User[]
  projects  Project[]
  knowledgeTemplates KnowledgeTemplate[]
  sharedRequirements SharedRequirement[]
  invites   Invite[]
}

enum Plan { FREE TEAM BUSINESS ENTERPRISE }

model User {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  name        String
  email       String    @unique
  passwordHash String?
  role        Role      @default(MEMBER)
  avatarUrl   String?
  online      Boolean   @default(false)
  lastActiveAt DateTime @default(now())
  joinedAt    DateTime  @default(now())
  projectMemberships ProjectMember[]
  notifications Notification[]
  activities  Activity[]
}

enum Role { OWNER ADMIN MEMBER VIEWER }

model Project {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  name        String
  description String?
  gradient    String    @default("linear-gradient(135deg,#F5A623,#E0823A)")
  status      ProjectStatus @default(DRAFT)
  createdAt   DateTime  @default(now())
  members     ProjectMember[]
  documents   Document[]
  integrations ProjectIntegration[]
  conflicts   Conflict[]
  activities  Activity[]
}

enum ProjectStatus { ACTIVE DRAFT REVIEW ARCHIVED }

model ProjectMember {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  @@unique([projectId, userId])
}

model Integration {
  id       String @id @default(cuid())
  slug     String @unique  // github | linear | jira | slack | figma | notion | gmail | confluence
  name     String
  category String  // Code & Dev | Planning | Communication | Design | Docs
  iconName String
  color    String
  hiColor  String
  description String
}

model ProjectIntegration {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  integrationId   String
  integration     Integration @relation(fields: [integrationId], references: [id])
  resourceLabel   String   // e.g. "repo: checkout-v2", "#product-checkout"
  accessToken     String
  refreshToken    String?
  webhookSecret   String?
  lastSyncAt      DateTime?
  syncedItemsCount Int     @default(0)
  nextSyncAt      DateTime?
  @@unique([projectId, integrationId])
}

model Document {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  type        DocType
  title       String
  status      DocStatus @default(DRAFT)
  version     Int      @default(1)
  authorId    String
  aiGenerated Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  sections    DocumentSection[]
  requirements Requirement[]
  aiFlags     AiFlag[]
  contributors DocumentContributor[]
}

enum DocType { BRD PRD SPEC STORIES ROADMAP RESEARCH }
enum DocStatus { DRAFT REVIEW FINAL }

model DocumentSection {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id])
  order      Int
  sectionNum String   // "01", "02"
  title      String
  body       String?
  items      String[] // for list-type sections
  aiFlags    AiFlag[]
}

model DocumentContributor {
  documentId String
  userId     String
  @@id([documentId, userId])
}

model Requirement {
  id           String   @id @default(cuid())
  documentId   String
  document     Document @relation(fields: [documentId], references: [id])
  code         String   // REQ-001
  title        String
  body         String?
  sourceType   SourceType?
  sourceRef    String?  // e.g. "slack:C012345:msg:abc123"
  extractedAt  DateTime @default(now())
  conflictsA   Conflict[] @relation("reqA")
  conflictsB   Conflict[] @relation("reqB")
}

enum SourceType { SLACK JIRA GITHUB MEETING_TRANSCRIPT MANUAL }

model Conflict {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  requirementAId  String
  requirementA    Requirement @relation("reqA", fields: [requirementAId], references: [id])
  requirementBId  String
  requirementB    Requirement @relation("reqB", fields: [requirementBId], references: [id])
  title           String
  description     String
  suggestedFix    String
  severity        ConflictSeverity
  status          ConflictStatus @default(OPEN)
  resolvedBy      String?
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
}

enum ConflictSeverity { MAJOR MINOR }
enum ConflictStatus { OPEN RESOLVED }

model AiFlag {
  id              String   @id @default(cuid())
  documentId      String
  document        Document @relation(fields: [documentId], references: [id])
  sectionId       String?
  section         DocumentSection? @relation(fields: [sectionId], references: [id])
  label           String
  options         String[]
  resolvedOption  String?
  customOption    String?
  resolvedById    String?
  resolvedAt      DateTime?
}

model KnowledgeTemplate {
  id          String   @id @default(cuid())
  workspaceId String?  // null = platform template
  workspace   Workspace? @relation(fields: [workspaceId], references: [id])
  type        DocType
  name        String
  description String
  structure   Json     // template sections JSON
  usageCount  Int      @default(0)
  isPlatform  Boolean  @default(false)
  proposedById String?
  approvedById String?
  status      KBStatus @default(APPROVED)
  createdAt   DateTime @default(now())
}

model SharedRequirement {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  code        String   // GLOB-001
  title       String
  body        String?
  usageCount  Int      @default(0)
  proposedById String?
  approvedById String?
  status      KBStatus @default(APPROVED)
}

enum KBStatus { APPROVED PENDING REJECTED }

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      NotifType
  title     String
  subtitle  String
  color     String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum NotifType { CONFLICT REVIEW SYNC INVITE RESOLVE }

model Activity {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id])
  verb      String
  object    String
  createdAt DateTime @default(now())
}

model Invite {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  email       String
  role        Role
  token       String   @unique @default(cuid())
  expiresAt   DateTime
  acceptedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

---

## API Endpoints

### Auth
```
POST   /auth/login              { email, password } → { accessToken, refreshToken, user }
POST   /auth/logout
POST   /auth/refresh            { refreshToken } → { accessToken }
POST   /auth/invite/accept      { token, name, password } → { accessToken, user }
```

### Workspace
```
GET    /workspace               → Workspace + plan + usage stats
PATCH  /workspace               { name } → Workspace
DELETE /workspace               (owner only)
```

### Users / Team
```
GET    /workspace/members       → User[]
PATCH  /workspace/members/:id   { role } → User
DELETE /workspace/members/:id
POST   /workspace/invites       { email, role } → Invite (sends email)
```

### Projects
```
GET    /projects                → Project[] (with doc counts, conflict counts)
POST   /projects                { name, description, gradient } → Project
GET    /projects/:id            → Project (full detail)
PATCH  /projects/:id            { name, description, status }
DELETE /projects/:id
```

### Project Integrations
```
GET    /projects/:id/integrations         → ProjectIntegration[]
POST   /projects/:id/integrations         { integrationId, resourceLabel, oauthCode } → ProjectIntegration
PATCH  /projects/:id/integrations/:iid    { resourceLabel } → ProjectIntegration
DELETE /projects/:id/integrations/:iid
POST   /projects/:id/integrations/:iid/sync  (trigger manual sync) → { jobId }
```

### Documents
```
GET    /projects/:id/documents                    → Document[] (with requirement counts)
POST   /projects/:id/documents                    { type, title, authorId } → Document
GET    /projects/:id/documents/:docId             → Document (with sections, requirements, flags)
PATCH  /projects/:id/documents/:docId             { title, status }
DELETE /projects/:id/documents/:docId
POST   /projects/:id/documents/generate           { type, brief, sourceIntegrationIds } → { jobId }
GET    /jobs/:jobId                               → { status, progress, stepLabel, documentId? }
```

### AI Flags
```
GET    /documents/:docId/flags           → AiFlag[]
POST   /documents/:docId/flags/:flagId/resolve   { option, custom? } → AiFlag (resolved)
```

### Requirements
```
GET    /documents/:docId/requirements       → Requirement[]
GET    /requirements/:id/trace              → { requirement, sourceItem, integration, sections[] }
```

### Conflicts
```
GET    /projects/:id/conflicts              → Conflict[]
PATCH  /conflicts/:id                       { status: 'RESOLVED' } → Conflict
```

### Knowledge Base
```
GET    /knowledge/templates                 → KnowledgeTemplate[] (platform + workspace approved)
POST   /knowledge/templates/propose         { type, name, description, structure } → KnowledgeTemplate (pending)
PATCH  /knowledge/templates/:id/approve     (admin) → KnowledgeTemplate
PATCH  /knowledge/templates/:id/reject      (admin) → KnowledgeTemplate
DELETE /knowledge/templates/:id

GET    /knowledge/shared-requirements       → SharedRequirement[]
POST   /knowledge/shared-requirements/propose  { code, title, body } → SharedRequirement (pending)
PATCH  /knowledge/shared-requirements/:id/approve
PATCH  /knowledge/shared-requirements/:id/reject
```

### Notifications
```
GET    /notifications               → Notification[]
PATCH  /notifications/read-all
PATCH  /notifications/:id/read
```

### Webhooks (inbound from integrations)
```
POST   /webhooks/github        { x-hub-signature-256 header }
POST   /webhooks/jira
POST   /webhooks/slack
```

---

## AI Document Generation Pipeline

The generation job runs in BullMQ. Steps:

```
1. Validate inputs (docType, brief, projectId, sourceIntegrationIds)
2. Emit progress: 0% — "Reading sources…"
3. For each selected integration:
   a. Fetch recent items since lastSyncAt (Slack messages, Jira issues, GitHub PRs/commits)
   b. Emit progress step
4. Emit progress: 30% — "Extracting requirements…"
5. LLM call (Haiku): given items + brief → extract list of requirements with codes
6. Deduplicate against existing project requirements
7. Emit progress: 55% — "Writing document sections…"
8. LLM call (Sonnet): given requirements + brief + docType template → write full document sections
9. Emit progress: 75% — "Detecting conflicts…"
10. Run conflict detection:
    - For each new requirement pair, check semantic contradiction (LLM or rule-based)
    - For each new req vs. existing reqs, check contradiction
    - Save any conflicts found
11. Emit progress: 88% — "Flagging open decisions…"
12. LLM call: given document sections → identify ambiguous decisions, open questions
    - Save as AiFlag records with 2-3 suggested options each
13. Emit progress: 100% — "Done"
14. Save Document + DocumentSections + Requirements + Conflicts + AiFlags
15. Send notifications to all project members
16. Return documentId
```

### Traceability
Every `Requirement` stores:
- `sourceType`: SLACK | JIRA | GITHUB | MEETING_TRANSCRIPT | MANUAL
- `sourceRef`: structured reference, e.g.:
  - `slack:C012345:1234567890.123456` (channel:message_ts)
  - `jira:SHOP-124:issue:10001` (project:type:id)
  - `github:checkout-v2:pr:441` (repo:type:number)

`GET /requirements/:id/trace` resolves this ref back to the source item and returns the full chain.

---

## Sync Jobs (per integration)

Runs on a schedule (every 15 min default) or triggered by webhook:

```
1. Fetch OAuth token for this ProjectIntegration
2. Call integration API for items since lastSyncAt
3. Run requirement extraction LLM prompt on new items
4. Insert new Requirements (skip duplicates)
5. Run conflict detection on new requirements
6. Update ProjectIntegration.lastSyncAt + syncedItemsCount
7. If new conflicts found → send notifications
```

### Integration API calls (what to fetch per integration)

| Integration | What to fetch |
|---|---|
| GitHub | Closed PRs since lastSync, merged commits, open issues with "requirement" label |
| Jira | Stories and epics updated since lastSync in the mapped project |
| Slack | Messages from mapped channels since lastSync (using Conversations API) |
| Linear | Issues in mapped team updated since lastSync |
| Notion | Pages updated since lastSync in mapped database |
| Gmail | Emails with specific labels (configured per integration) |
| Confluence | Pages updated since lastSync in mapped space |

---

## Real-time WebSocket Events

Connect: `ws://host/ws?token=<accessToken>`

Client joins rooms on connect: `workspace:<id>`, `project:<id>` (for all their projects).

### Events emitted by server:

```typescript
// New conflict found
{ event: 'conflict.detected', payload: { projectId, conflict } }

// Conflict resolved
{ event: 'conflict.resolved', payload: { projectId, conflictId, resolvedBy } }

// AI flag answered by a teammate
{ event: 'flag.resolved', payload: { documentId, flagId, option, resolvedBy } }

// Integration sync completed
{ event: 'sync.completed', payload: { projectId, integrationId, newItemsCount, newRequirementsCount } }

// New notification
{ event: 'notification', payload: Notification }

// Member came online/offline
{ event: 'member.presence', payload: { userId, online } }

// Document generation job progress
{ event: 'job.progress', payload: { jobId, progress, stepLabel } }
{ event: 'job.complete', payload: { jobId, documentId } }
```

---

## Auth Strategy

- JWT access tokens (15 min TTL) + refresh tokens (30 day TTL, stored in httpOnly cookie)
- Every request: validate `workspaceId` claim matches requested resource's workspace
- Role checks per route:
  - VIEWER: GET on documents, requirements, projects
  - MEMBER: VIEWER + POST comments, propose KB items
  - ADMIN: MEMBER + manage integrations, invite members, approve KB
  - OWNER: ADMIN + billing, delete workspace, change plan

---

## Plan Tier Limits

| Limit | Free | Team | Business | Enterprise |
|---|---|---|---|---|
| Projects | 1 | 5 | Unlimited | Unlimited |
| Documents | 3 | 50 | 200 | Unlimited |
| Team members | 1 | 10 | 25 | Unlimited |
| Integrations | 1 | 4 | All | All |
| AI gen/month | 3 | 25 | 200 | Unlimited |
| KB templates | 0 private | 5 | 20 | Unlimited |

Enforce limits in the POST handlers — return `402 Payment Required` with `{ error: 'PLAN_LIMIT', limit, current, plan }`.

---

## OAuth Flows (per integration)

Each integration needs its own OAuth app credentials (env vars below). Flow:

1. Frontend calls `GET /integrations/:slug/oauth/start?projectId=<id>`
2. Backend returns OAuth authorization URL
3. User authenticates in popup
4. Callback hits `GET /integrations/:slug/oauth/callback?code=<code>&state=<projectId>`
5. Backend exchanges code for access + refresh tokens
6. Creates `ProjectIntegration` record
7. Triggers first sync job

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# AI
ANTHROPIC_API_KEY=

# Frontend
FRONTEND_URL=https://app.tracelayer.com

# Email
RESEND_API_KEY=

# Integrations OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=

# Storage (for exports)
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

---

## Frontend API Contract

The frontend currently uses mock data from `src/data/index.ts`. Replace with real calls by:

1. Creating `src/lib/api.ts` with an axios/fetch client that attaches `Authorization: Bearer <token>`
2. Each view component calls the relevant endpoint on mount (useEffect)
3. AppContext stores `currentUser` and `workspace` fetched from `/auth/me` and `/workspace`
4. Loading states: use the existing Trace mascot ("thinking" mood) as a skeleton while loading
5. Error states: show a Trace card with an error message and retry button

Key replacements:
- `PROJECTS` array → `GET /projects`
- `DOCUMENTS` array → `GET /projects/:id/documents`
- `CONFLICTS_DATA` → `GET /projects/:id/conflicts`
- `INTEGRATIONS_DATA` → `GET /projects/:id/integrations` (merged with global integration catalog)
- `TEAM_DATA` → `GET /workspace/members`
- `NOTIFICATIONS_DATA` → `GET /notifications`
- `KB_TEMPLATES` → `GET /knowledge/templates`
- `KB_SHARED_REQS` → `GET /knowledge/shared-requirements`
- `AI_FLAGS` → `GET /documents/:id/flags`
- Doc generation modal → `POST /projects/:id/documents/generate` then poll `GET /jobs/:jobId`
- Flag resolution → `POST /documents/:id/flags/:flagId/resolve`

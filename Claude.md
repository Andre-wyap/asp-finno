# Allianz Shield Plus

A personal accident insurance website that sells insurance online with dynamic pricing, plan showcasing, and integrated application submission.

This is the single source of truth for product scope, architecture, schema, and the build plan. Design tokens and visual rules live in [Design.md](./Design.md) — refer to it for colors, typography, elevation, components, and the "no-line / tonal depth" rules.

---

## What is this?

A personal accident insurance site that allows customers to:
- Browse and compare insurance plans
- Get dynamic pricing based on their profile
- Submit applications directly online
- Pay securely through multiple payment methods

**Key highlight:** Renewable up to 80 years old (last entry age 65).

**Distributed by WF** — displayed in the hero section.

## Functions

1. **Dynamic pricing** while showcasing the plan
2. **Showcase all the benefits** of the plan
3. **Insert "form information"** so the application can be submitted on our backend
4. **Payment gateway** with Senang Pay (credit card, e-wallet, FPX)
5. **Capture leads on our own backend** (Firestore)
6. **Customer issuance tracker** so customers can track their policy progress
7. **CRM frontend** for admin users to view and update issuance status
8. **Email automation** via Resend — status changes trigger customer emails; the CRM is the operator surface for previewing, resending, and ad-hoc sends (see §CRM Email Control)
9. **CRM issuance operations** — direct CRM NRIC display for insurance issuance, lead archiving, CSV import, and auditable admin activity logs

## Design

All visual rules — colors, typography, elevation/depth, component styling, the no-line and glass/gradient rules — are defined in [Design.md](./Design.md). When implementing UI, treat Design.md as authoritative for tokens and styling decisions, and treat this file as authoritative for behavior and structure.

---

## Architecture

Two Next.js frontends, each with its own backend (Route Handlers), both writing to one Firestore.

| Concern | Service |
|---|---|
| Website (Next.js, public) | Firebase App Hosting backend `web`, mapped to `asp.finnomalaysia.com` |
| CRM (Next.js, admin) | Firebase App Hosting backend `crm`, mapped to `aspadmin.finnomalaysia.com` |
| Backend API (Route Handlers) | Co-located inside each App Hosting backend |
| Database | Firestore (native mode, region `asia-southeast1`) |
| Server SDK | `firebase-admin` (Node runtime, no edge constraints) |
| Scheduled jobs | Cloud Scheduler → HTTPS Cloud Function |
| Admin auth | Firebase Authentication (Google) + custom claim `role: "admin"` |
| Secrets | Google Secret Manager, bound via `apphosting.yaml` |
| Object storage (PDFs) | Cloud Storage for Firebase, region `asia-southeast1` |
| Email (transactional) | Resend (REST API + React Email templates in `packages/shared/emails`) |
| Email delivery events | Resend webhook → `POST /api/webhooks/resend` → Firestore `events` subcollection |
| Logs / metrics | Cloud Logging + Cloud Monitoring |

**Order ID format:** `ASP-<yyyymmdd>-<8 random chars>` (e.g. `ASP-20260430-K7P2X9QM`). A separate unguessable `trackerToken` (UUID v4) is generated per application for the public tracker URL.

### Project Layout

Single Firebase project with two App Hosting backends:

```
firebase project: asp-finno
├── apphosting backend "web"   → asp.finnomalaysia.com
├── apphosting backend "crm"   → aspadmin.finnomalaysia.com
├── firestore                   (asia-southeast1)
├── storage bucket              (asia-southeast1)
├── auth tenant                 (single, used by CRM only)
└── cloud scheduler jobs        (lead-reminder)
```

Repository:

```
/apps
  /web                        → public site (Next.js)
    apphosting.yaml           ← config for the `web` backend lives here
    next.config.js            ← transpilePackages: ['@asp/shared', '@asp/pricing']
    package.json
  /crm                        → admin app (Next.js)
    apphosting.yaml           ← config for the `crm` backend lives here
    next.config.js            ← transpilePackages: ['@asp/shared']
    package.json
/packages
  /shared                     → Firestore schema, status state machine, email triggers, React Email templates (package name `@asp/shared`)
  /pricing                    → plans data + dynamic pricing logic (package name `@asp/pricing`)
/functions                    → scheduled / pub-sub Cloud Functions; own package.json, Node 20 runtime
/scripts
  grant-admin.ts              → one-shot script to set the `role: "admin"` custom claim on a Firebase Auth user
firebase.json                 → declares `apphosting`, `firestore`, `functions`, `storage` targets
.firebaserc                   → project alias
package.json                  → root with `workspaces: ["apps/*", "packages/*", "functions"]` (npm workspaces)
```

**Monorepo tool:** npm workspaces (no Turborepo, no pnpm) — broadest compatibility with App Hosting's buildpack and the simplest setup. Each app declares its workspace deps via `"@asp/shared": "*"` in its own `package.json`. Next.js `transpilePackages` is required so the workspace TypeScript gets compiled into each app's build.

**App Hosting monorepo wiring:** each backend's *root directory* (set in the Firebase console when connecting the GitHub repo, **not** in `apphosting.yaml`) is `/apps/web` for the `web` backend and `/apps/crm` for the `crm` backend. App Hosting's buildpack runs `npm install` from the repo root first (because of the workspaces declaration), then builds from the chosen root directory. There is no `apphosting.yaml` at the repo root.

The `@asp/shared` package is the single source of truth for the status state machine and the `onStatusChange` hook so both the website (lead/paid/payment_failed transitions) and the CRM (issued transition) call the same code path.

---

## Customer Journey

Status state machine (single source of truth — only place that triggers email):

| Status            | Trigger                                          | Email sent                                              |
|-------------------|--------------------------------------------------|---------------------------------------------------------|
| `lead`            | Form submitted, before payment                   | "Reminder: complete your payment" (delayed, via cron)   |
| `paid`            | Senang Pay callback success                      | "Payment received, policy issuing within 2 business days" |
| `payment_failed`  | Senang Pay callback failure                      | "Payment failed, try again" (with retry link)           |
| `issued`          | Admin marks issued in CRM                        | "Policy issued" (with policy number / docs)             |

## Form Information

### Applicant Details
1. Name
2. NRIC
3. Date of Birth (auto-filled from NRIC)
4. Email
5. **Mobile Number** — see §Mobile number normalization below
6. Address
7. Gender (auto-filled from NRIC)
8. Occupation
9. Smoker or not

### Mobile number normalization

UI accepts whatever the user types; backend stores a single canonical E.164 string.

**Pipeline (apply in order):**
1. Strip all whitespace, dashes, parentheses, and the `+` sign
2. If the string starts with `60`, leave it
3. Else if it starts with `0`, drop the leading `0` and prepend `60`
4. Else if it starts with `1`, prepend `60`
5. Final stored value is `+` + the result

**Acceptance rule:** the stored value must match `^\+601[0-46-9][0-9]{7,8}$`. This permits all current MY mobile prefixes (`10`–`14`, `16`–`19`; `+6015` is reserved/unused, so it's excluded), with a 9–10 digit subscriber portion. Total length 12 or 13 chars including the `+60`.

**Examples (all canonicalize to the same value):**
- `012-345 6789` → `+60123456789`
- `0123456789` → `+60123456789`
- `+60 12 345 6789` → `+60123456789`
- `60123456789` → `+60123456789`

**Reject:** anything else, including `+60` followed by `0`, fewer than 9 subscriber digits, more than 10, or a non-`1X` prefix. Non-MY numbers are out of scope for v1.

The normalization helper lives in `@asp/shared/src/mobile.ts` so both the form (client-side validation + canonicalization on blur) and the backend (defense-in-depth re-validation before the Firestore write) call the same code.

### Nominee Details (add up to 2)
1. Name
2. NRIC
3. Relationship
4. Nationality (default: Malaysian)

## Dynamic Pricing

1. **Age bands:**
   - Below 50 years old
   - 51 to 65 years old (last entry age 65, renewable up to 80)

2. **Occupation:** Category A or Category B
   - Info icon opens a modal listing the categories from the brochure

3. **Plan options:** Selecting an age band or occupation reactively updates every plan card's price

4. **Plan availability:** Only Plans 1–9 are sold online; Plan 10 requires underwriting. For Occupation Category B, only Plans 1–5 are available for online purchase. When Category B is selected, hide Plans 6–9 and show the remark: "Category B is only available to buy Plans 1 to 5."

## Plan Cards

1. Plan name (e.g. Plan 1, Plan 2, …)
2. Sum Assured, medical expenses, renewal bonus, price
3. Price changes dynamically with age + occupation selectors
4. "View Plan" button expands the card to show the full benefits breakdown
5. PDF buttons for Brochure, Policy Wording, Product Disclosure Sheet

---

## Firestore Schema

`applications/{orderId}` — `orderId` format `ASP-<yyyymmdd>-<8 random chars>`.

```
applications/{orderId}
  status:          "applied" | "paid" | "payment_failed" | "issued" | "drop"
  applicant:       { name, nric, nricHash, dob, email, mobile, address, gender, occupation, smoker }
                   # mobile: E.164, MY default (e.g. "+60123456789")
  nominees:        [ { name, nric, nricHash, relationship, nationality }, ... up to 2 ]
  plan:            { code, ageBand, occupationCategory }
  premium:         { amount, currency: "MYR" }
  pdpaConsent:     { accepted: boolean, at: Timestamp, version: string }   # captured at form submit
  trackerToken:    string  (UUID v4, unguessable, indexed)
  policyNumber:    string | null
  reminderSent:    boolean (default false)
  ownerAdminId:    string | null
  underwritingFlag: boolean
  archivedAt:      Timestamp | null
  archivedBy:      { id: string, email: string } | null
  archiveReason:   string | null
  statusBeforeArchive: string | null
  # CRM search support — denormalized lowercase fields for prefix queries (Firestore can't do partial-text search)
  searchKeys:      { nameLower: string, emailLower: string }
  createdAt, updatedAt, paidAt, issuedAt: Timestamp
```

**Search note:** Firestore has no native partial-text search. The `searchKeys.nameLower` / `emailLower` fields exist so the CRM list view can do prefix queries (`>=` and `<` over the lowercased value). For the v1 volume this is enough; if order count exceeds ~10K and free-text search becomes a need, swap in Algolia/Typesense.

**NRIC storage:** New applications store plaintext `nric` for CRM issuance work and also store `nricHash = HMAC-SHA256(nric, NRIC_HASH_PEPPER)` for duplicate detection and verification. Plaintext NRIC must never be written to event payloads, logs, URLs, email templates, or the public customer tracker.

Existing applications created before plaintext `nric` storage only have `nricHash`; their original NRIC cannot be recovered from the hash. CRM should display `Not captured` for those older rows and ask the applicant/admin to re-provide the NRIC when needed.

`applications/{orderId}/events/{eventId}` — append-only audit log.

```
events/{eventId}
  type:    "status_change" | "note" | "payment_callback"
         | "email_sent" | "email_event"      # email_event = Resend webhook (delivered/bounced/opened/clicked/complaint)
         | "application_archived" | "application_unarchived"
         | "import_created" | "import_row_created" | "import_row_failed"
  from:    string | null
  to:      string | null
  actor:   { kind: "system" | "admin" | "customer" | "resend", id: string | null, email?: string | null }
  payload: map           # PDPA-safe; never store plaintext NRIC or raw CSV contents
  at:      Timestamp
```

Email-related event payload shapes:
- `email_sent` → `{ template, resendMessageId, to, subject, triggeredBy }`
- `email_event` → `{ resendMessageId, kind: "delivered"|"bounced"|"opened"|"clicked"|"complaint", raw }` — joined back to the originating `email_sent` row by `resendMessageId`.

`activityLogs/{logId}` — top-level CRM audit feed optimized for cheap reads.

```
activityLogs/{logId}
  at:      Timestamp
  actor:   { kind: "admin" | "system", id: string | null, email?: string | null }
  action:  string
  orderId: string | null
  summary: string        # PDPA-safe display text
  payload: map           # PDPA-safe; no plaintext NRIC, raw email body, or raw CSV contents
```

`importBatches/{batchId}` — CRM CSV import audit record.

```
importBatches/{batchId}
  uploadedBy:     { id: string, email: string }
  originalName:   string
  status:         "validated" | "committed" | "failed"
  totalRows:      number
  validRows:      number
  failedRows:     number
  createdOrderIds: string[]
  errors:         [ { row: number, field?: string, message: string } ]
  createdAt, committedAt: Timestamp
```

PDPA notes:
- NRIC is stored in plaintext for authenticated CRM issuance use. This is operationally simpler but increases breach impact, so CRM access must remain admin-only and Firestore client access must remain denied.
- Event payloads, logs, emails, CSV import audit records, and the public tracker must never include plaintext NRIC.
- The customer tracker (`/track/[token]`) returns the applicant block (name, DOB, gender, email, mobile, address, occupation, smoker), nominees (name, relationship, nationality), the plan summary with full benefits, the premium breakdown, the four timestamps, and `policyNumber` if issued. Access is gated by the unguessable `trackerToken` (UUID v4), which is delivered only via email to the applicant.

---

## Auth & Access Control

**Website (public):** No auth. Form submissions hit a Route Handler that uses `firebase-admin`. The browser never talks to Firestore directly.

**CRM:** Firebase Authentication, Google provider only. A user is an admin iff their token carries the custom claim `role: "admin"`. Custom claims are set via a one-shot script (`scripts/grant-admin.ts`) — there is no self-service admin signup.

**Firestore security rules:** all client SDK access is denied. All reads/writes go through `firebase-admin` in Route Handlers / Functions, which bypasses rules. Rules stay trivially auditable:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

---

## Status State Machine & Email

The state machine in §Customer Journey is implemented in `packages/shared/src/onStatusChange.ts`. It is the **only** place that triggers a transactional Resend send for status transitions.

Call sites:
1. Form submit handler (website) → `lead`
2. Senang Pay server-to-server callback (website) → `paid` or `payment_failed`
3. CRM status mutation endpoint → `issued`
4. Cloud Scheduler reminder job → no status change, but emits the lead reminder template and sets `reminderSent=true`

The hook writes the status change, appends an `events` row with `type: "status_change"`, calls Resend with the corresponding React Email template, and on a 2xx writes a second `events` row with `type: "email_sent"` and Resend's returned `id`. If Resend fails, the status change still commits and the failure is logged as `email_send_failed` for manual retry from the CRM.

### Email templates (React Email, in `packages/shared/emails`)

| Component | Triggered by | Audience |
|---|---|---|
| `LeadReminder.tsx` | Cloud Scheduler reminder job | Customer |
| `Paid.tsx` | `lead → paid` | Customer |
| `PaymentFailed.tsx` | `lead → payment_failed` | Customer |
| `Issued.tsx` | `paid → issued` (CRM) | Customer |

Templates are imported by both the website and CRM backends so any send — automatic or admin-triggered — renders identically.

### Resend webhook

`POST /api/webhooks/resend` lives on the website backend. It verifies the signature using the Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) against `RESEND_WEBHOOK_SECRET`, looks up the originating `email_sent` row by `resendMessageId`, and appends an `email_event` row to that application's events subcollection. The handler is idempotent on `(resendMessageId, kind)`.

---

## CRM Email Control

The CRM is the operator surface for everything email-related. Automatic emails (lead reminder, paid, payment_failed) still fire from the website backend on their own triggers — but the CRM is where admins observe, intervene, and send manually. Every CRM-initiated send routes through the same `lib/email.ts` Resend client and writes the same `email_sent` / `email_event` rows, so there is exactly one email pathway and one audit log.

### Capabilities

From an application's detail page:
- **Email timeline** — every send and every Resend webhook event (delivered, bounced, opened, clicked, complaint), sourced from the events subcollection
- **Preview** — render any template against the application's data before sending
- **Resend** — re-send any past transactional email (e.g. retry an `Issued` send if it bounced)
- **Compose ad-hoc** — pick a registered template with overrides, or send a free-form HTML/text message
- **Status mutation with email** — advancing `paid → issued` (with policy number) flows through `onStatusChange`, which dispatches the `Issued` template

### Endpoints (CRM backend)

| Method & path | Purpose |
|---|---|
| `GET /api/crm/applications/:orderId/email/timeline` | Combined `email_sent` + `email_event` rows, newest first |
| `POST /api/crm/applications/:orderId/email/preview` | `{ template, overrides? }` → rendered HTML, no send |
| `POST /api/crm/applications/:orderId/email/resend` | `{ template }` → resends, writes new `email_sent` row |
| `POST /api/crm/applications/:orderId/email/custom` | `{ subject, body, cc?: [] }` → ad-hoc send |
| `POST /api/crm/applications/:orderId/status` | `{ to: "issued", policyNumber }` → triggers `onStatusChange` |

All five endpoints require the `role: "admin"` custom claim and stamp `actor: { kind: "admin", id: <uid> }` on every event row they write.

### Guardrails

- Custom (free-form) sends are subject to a per-admin rate limit (10/min, 200/day) enforced at the endpoint
- Templates can only be addressed to `applicant.email` of the order they belong to — no cross-application sends
- Preview is read-only and never calls Resend
- Resending a `lead-reminder` while `status != "applied"` is rejected at the endpoint

---

## CRM Issuance Operations

The CRM must support the operational tasks needed after application capture without weakening the public website privacy posture.

### CRM NRIC display

- CRM detail pages show applicant and nominee NRIC directly for insurance issuance.
- Historical hash-only rows display `Not captured` because plaintext NRIC cannot be reconstructed from `nricHash`.
- The public customer tracker must continue to omit NRIC.

### Archive leads

- Admins may archive lead-like records that should disappear from normal follow-up queues: `applied`, `payment_failed`, and `drop`.
- Archive requires an admin reason and writes `archivedAt`, `archivedBy`, `archiveReason`, and `statusBeforeArchive` on the application.
- Default applicant lists exclude archived records. CRM provides an `Archived` filter and an unarchive action.
- Archived records do not receive normal reminder/follow-up sends unless unarchived first.

### CSV import

- CRM provides a CSV import workflow with upload, column mapping, dry-run validation, conflict preview, and final confirmation.
- Imports use the same validation and normalization pipeline as checkout: NRIC validation, plaintext `nric` storage, `nricHash`, Malaysian mobile normalization, email normalization, and plan/status validation.
- Import batches are recorded in `importBatches/{batchId}` with uploader, timestamp, original filename, counts, row-level errors, and final result.
- Raw CSV content and plaintext NRIC are not persisted after processing unless a future compliance requirement adds secure object storage retention.

### Activity log

- The CRM activity log is the human-readable audit view for admin operations.
- Minimum columns: user, timestamp, action, order ID/application ID, import batch ID when relevant, and a PDPA-safe summary.
- It is sourced from top-level `activityLogs`, not by scanning application event subcollections.
- Initial page load reads 10 activity documents. The "Load 50 more" action uses Firestore cursor pagination (`orderBy("at", "desc")` + `startAfter`) and reads the next 50.
- Every state-changing CRM endpoint writes a PDPA-safe `activityLogs` row and stamps `actor: { kind: "admin", id, email }` consistently.

### Endpoints (CRM backend)

| Method & path | Purpose |
|---|---|
| `POST /api/crm/applications/:orderId/archive` | `{ reason }` → archives application, writes `application_archived` |
| `POST /api/crm/applications/:orderId/unarchive` | `{ reason? }` → restores application to normal lists, writes `application_unarchived` |
| `POST /api/crm/imports/validate` | CSV dry-run validation and duplicate/conflict preview |
| `POST /api/crm/imports/commit` | Writes validated import rows and `importBatches/{batchId}` metadata |
| `GET /api/crm/activity` | Paginated global activity log; initial page uses 10 logs, load-more uses 50 |

---

## Scheduled Jobs

Lead reminder:
- Cloud Scheduler runs hourly: `0 * * * *` Asia/Kuala_Lumpur
- Target: HTTPS Cloud Function `leadReminderTick`
- Function queries `applications` where `status == "applied"`, `reminderSent == false`, `archivedAt == null`, `createdAt < now - 24h`, batches in pages of 100, fires the reminder email, and sets `reminderSent=true`

A composite index on `(status, reminderSent, archivedAt, createdAt)` is required once archive filtering is added to the reminder job.

---

## Senang Pay Integration

Two endpoints on the website backend:

- `POST /api/checkout/initiate` — generates `orderId`, writes `applied` doc, returns Senang Pay redirect URL with hash signature
- `POST /api/checkout/callback` — Senang Pay server-to-server. Verifies hash with the merchant secret from Secret Manager. Idempotent on `orderId` + Senang Pay txn id (a duplicate callback must not re-trigger the email)

Return URL (browser redirect) goes to `/payment/result?orderId=...` which reads the current status from Firestore and renders success or retry.

---

## Customer Tracker

`GET /track/[token]` — public route on the website backend.

- Looks up by `trackerToken` (single-field index)
- Returns the lifecycle data (`status`, `createdAt`, `paidAt`, `issuedAt`, and `policyNumber` once `status == "issued"`), the applicant block (name, DOB, gender, email, mobile, address, occupation, smoker — never NRIC), the nominee list (name, relationship, nationality), and the plan summary with the full 19-benefit breakdown plus the premium components (base premium, SST, stamp duty, discount, total).
- 404s on unknown token; never reveals whether a token "used to exist"

The tracker URL is embedded in every status email.

---

## Secrets & Configuration

Stored in Secret Manager and bound via `apphosting.yaml`:

| Secret | Used by |
|---|---|
| `SENANGPAY_MERCHANT_ID` | web |
| `SENANGPAY_SECRET` | web (callback hash verify) |
| `RESEND_API_KEY` | web, crm, functions |
| `RESEND_WEBHOOK_SECRET` | web (Svix signature verification on `/api/webhooks/resend`) |
| `RESEND_FROM_ADDRESS` | web, crm, functions (e.g. `Allianz Shield Plus <noreply@asp.finnomalaysia.com>`) |
| `NRIC_HASH_PEPPER` | web (server-side hashing) |
| `TRACKER_BASE_URL` | web, crm, functions |

Resend has no per-template IDs — templates are React components in `packages/shared/emails`, so the only Resend-specific runtime config is the API key, the webhook secret, and the verified sender address. The sender domain (SPF/DKIM/DMARC) is verified once in the Resend dashboard.

`firebase-admin` picks up Application Default Credentials inside App Hosting — no service-account JSON file in the repo.

**Local development auth:** `firebase-admin` does not auto-discover credentials when running `next dev` on your laptop. Pick one of:
1. **Run `gcloud auth application-default login` once** — sets up ADC for the local user; combined with `FIREBASE_PROJECT_ID` in `.env.local`, `firebase-admin` initializes against the real Firestore. (Costs Firestore reads/writes against the real DB during dev.)
2. **Use the Firebase Emulator Suite** (`firebase emulators:start`) — set `FIRESTORE_EMULATOR_HOST=localhost:8080` and `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` in `.env.local`; `firebase-admin` auto-routes to emulators when those env vars are set. Free, isolated, recommended for daily dev.

Do **not** download a service-account JSON for local dev — it's a long-lived credential and easy to leak.

---

## Plan & Cost Controls

The project runs on the **Blaze (pay-as-you-go) plan**. Spark cannot host this stack: App Hosting, Cloud Scheduler, Secret Manager, and outbound network calls from Cloud Functions are all Blaze-only.

Blaze keeps a generous free tier per product, so realistic pre-launch and early-traffic cost is **$0–$3 / month**:

| Product | Free tier on Blaze |
|---|---|
| Firestore | 50K reads, 20K writes, 20K deletes per day; 1 GiB stored |
| Cloud Functions | 2M invocations / month, 400K GB-seconds, 5 GB egress |
| App Hosting | Cloud Run free tier (2M requests, 360K vCPU-seconds, 180K GiB-seconds / month) |
| Cloud Scheduler | 3 jobs free |
| Secret Manager | 6 active versions, 10K access ops / month |
| Cloud Storage | 5 GB stored, 1 GB egress / day |
| Firebase Authentication | 50K MAU |

### Required guardrails (do these on day one)

- **Billing budget alert**: GCP Billing → Budgets & alerts → set a monthly budget (e.g. $10) with alert thresholds at 50/90/100% emailed to the project owner. Single most important cost guardrail.
- **App Hosting min instances = 0**: in `apphosting.yaml` set `runConfig.minInstances: 0` so idle backends scale to zero.
- **App Hosting max instances cap**: set `runConfig.maxInstances` (e.g. 5 for `web`, 2 for `crm`) so a traffic spike or runaway loop can't bill unbounded.
- **Firestore composite indexes only where queried**: each unused index costs storage. Review `firestore.indexes.json` periodically.
- **Cloud Logging retention**: drop default retention from 30 days to 7 days for `INFO` logs.
- **Cloud Scheduler frequency**: hourly for the reminder job. Don't go to per-minute without a reason.

### What can push you over

- A bug in the Resend webhook handler that re-writes the same `email_event` row in a loop → Firestore write spike
- A misconfigured Senang Pay callback retrying every minute → Cloud Function invocation spike
- Someone scraping `/track/[token]` → Firestore read spike (mitigate with a per-IP rate limit on the route)
- Forgetting `maxInstances` and getting hugged by a launch announcement → App Hosting cost spike

The budget alert catches all of these within hours rather than at end-of-month.

---

## Deployment

Day-to-day deploys are automatic: `git push origin main` → GitHub webhook → App Hosting builds and rolls out both backends. Manual `firebase deploy` is only for the items App Hosting doesn't watch (Firestore rules/indexes, Functions).

### One-time setup

Run these from the repo root with the Firebase CLI installed (`npm i -g firebase-tools`) and `firebase login` completed.

```bash
# 1. Select the project
firebase use asp-finno

# 2. Create the App Hosting backends (interactive: prompts for GitHub repo, branch, and root directory)
#    Run twice — once per backend.
firebase apphosting:backends:create --project asp-finno --location asia-southeast1
#   When prompted: backend ID = "web",  root directory = "/apps/web",  branch = "main"
firebase apphosting:backends:create --project asp-finno --location asia-southeast1
#   When prompted: backend ID = "crm",  root directory = "/apps/crm",  branch = "main"

# 3. Create each secret in Secret Manager (interactive: prompts for value)
firebase apphosting:secrets:set RESEND_API_KEY
firebase apphosting:secrets:set RESEND_WEBHOOK_SECRET
firebase apphosting:secrets:set RESEND_FROM_ADDRESS
firebase apphosting:secrets:set SENANGPAY_MERCHANT_ID
firebase apphosting:secrets:set SENANGPAY_SECRET
firebase apphosting:secrets:set NRIC_HASH_PEPPER
firebase apphosting:secrets:set TRACKER_BASE_URL

# 4. Grant each backend's compute service account read access to the secrets it needs.
#    Run once per (secret, backend) pair the secret table in §Secrets says it's used by.
firebase apphosting:secrets:grantaccess RESEND_API_KEY --backend web
firebase apphosting:secrets:grantaccess RESEND_API_KEY --backend crm
firebase apphosting:secrets:grantaccess RESEND_WEBHOOK_SECRET --backend web
# ... etc per the table

# 5. Reference the secrets in each apphosting.yaml so they appear as env vars at runtime:
#    /apps/web/apphosting.yaml
#      env:
#        - variable: RESEND_API_KEY
#          secret: RESEND_API_KEY
#        - variable: SENANGPAY_SECRET
#          secret: SENANGPAY_SECRET
#        # ...
```

### Every-deploy commands (CI or manual)

```bash
# Firestore rules + indexes (App Hosting doesn't watch these)
firebase deploy --only firestore:rules,firestore:indexes

# Cloud Functions (the lead-reminder tick + any future jobs)
firebase deploy --only functions
```

App Hosting itself does not need a `firebase deploy` invocation — pushing to `main` rolls out both backends automatically. Preview channels are created automatically for PR branches; promote via the Firebase console.

> **CLI flag verification:** the `apphosting:secrets:set` / `:grantaccess` and `apphosting:backends:create` commands are stable as of `firebase-tools` v13+. If a flag is rejected, `firebase apphosting:backends:create --help` and `firebase apphosting:secrets --help` are authoritative — flag names occasionally change between minor versions.

---

## DNS & Domains

Both apps are subdomains of `finnomalaysia.com`, so binding is plain CNAME (no apex / ALIAS / ANAME).

1. **In Firebase Console** → App Hosting → backend → "Add custom domain" → enter the hostname. Firebase shows a CNAME target.
2. **At the DNS provider for `finnomalaysia.com`** add two CNAMEs:
   - `asp` → CNAME → Firebase target (for the `web` backend)
   - `aspadmin` → CNAME → Firebase target (for the `crm` backend, separate target)
3. Firebase auto-provisions a Let's Encrypt cert. DNS + cert typically live within ~10 minutes.
4. **Firebase Auth**: in the Auth console, add `aspadmin.finnomalaysia.com` to **Authorized Domains** so Google SSO redirects work for the CRM.

**Cloudflare-specific note** (if `finnomalaysia.com` DNS is on Cloudflare): set the CNAME records to **DNS-only** (grey cloud), not proxied (orange cloud), at least until Firebase has issued the cert. Proxying can interfere with domain verification.

DNS is fully changeable later — develop on Firebase's auto-generated `*.web.app` URLs, switch to the real domain whenever, and switch again later if needed. No code redeploy required.

---

## Build Plan

The phased build plan and checkbox tracker live in [TASKS.md](./TASKS.md). It churns; this file does not.

---

## Open Questions

- Where does `finnomalaysia.com` DNS live (Cloudflare / registrar default / other)? Determines exactly where the two CNAMEs are added and whether the Cloudflare proxy needs to be DNS-only during cert issuance.
- Whether the CRM should support more than Google SSO (e.g. email/password fallback for non-Google admins).
- Data retention policy for the `events` subcollection (default: keep indefinitely; revisit at 12 months).
- Whether to split `web` and `crm` into separate Firebase projects for blast-radius isolation, or keep them in one project for shared Firestore. Current default: one project.

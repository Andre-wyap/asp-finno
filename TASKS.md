# Build Task List

Working tracker for Allianz Shield Plus. Spec lives in [Claude.md](./Claude.md); design tokens in [Design.md](./Design.md). When a task is done, tick the box. When the work changes, edit the task — this file is allowed to churn.

---

## Phase 1: Project Setup
- [x] Initialize **npm workspaces** monorepo at the repo root (`package.json` with `"workspaces": ["apps/*", "packages/*", "functions"]`)
- [x] Scaffold `/apps/web` and `/apps/crm` as Next.js + Tailwind apps; each has its own `package.json` and `next.config.js`
- [x] Create `/packages/shared` (name `@asp/shared`) and `/packages/pricing` (name `@asp/pricing`) as workspace packages
- [x] Add `transpilePackages: ['@asp/shared', '@asp/pricing']` to `/apps/web/next.config.js`, and `['@asp/shared']` to `/apps/crm/next.config.js`
- [x] Place `apphosting.yaml` at `/apps/web/apphosting.yaml` and `/apps/crm/apphosting.yaml` (one per backend, **inside** that backend's directory — there is no root-level `apphosting.yaml`, and `rootDir` is **not** a key in this file)
- [x] Verify `.gitignore` covers `.env`, `.env*.local`, `.next/`, `node_modules/`, `.firebase/`, `firebase-debug.log`, `.DS_Store` (`create-next-app` handles most; add the firebase entries manually)
- [x] Create `.env.example` (committed) listing every required env var with empty values — use this as the template:
  - `RESEND_API_KEY=`
  - `RESEND_WEBHOOK_SECRET=`
  - `RESEND_FROM_ADDRESS=`
  - `SENANGPAY_MERCHANT_ID=`
  - `SENANGPAY_SECRET=`
  - `NRIC_HASH_PEPPER=`
  - `TRACKER_BASE_URL=http://localhost:3000`
  - `FIREBASE_PROJECT_ID=`
  - `FIRESTORE_EMULATOR_HOST=localhost:8080`        # only when using the emulator
  - `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`    # only when using the emulator
- [x] Create `.env.local` in each app (`/apps/web` and `/apps/crm`) for local dev — copied from `.env.example` with empty placeholders. Never commit. Production reads from Secret Manager (see `Claude.md §Secrets`)
- [x] Configure `/apps/web/.env.local` and `/apps/crm/.env.local` for ADC mode (`FIREBASE_PROJECT_ID=asp-finno`, emulator host vars blank)
- [ ] Fill real secrets in `/apps/web/.env.local` and `/apps/crm/.env.local`
- [ ] Set up local `firebase-admin` auth — pick one of (see `Claude.md §Secrets → Local development auth`):
  - [ ] **Recommended:** install Firebase CLI, run `firebase init emulators` (Firestore + Auth), and `firebase emulators:start` for daily dev — set the two `*_EMULATOR_HOST` vars in `.env.local`
  - [ ] **Selected:** Google Cloud CLI installed at `~/google-cloud-sdk`, project set to `asp-finno`. Run `gcloud auth application-default login` once to give your laptop ADC against the real project (writes count against Firestore quota).
- [x] Copy brochure, policy wording, and product disclosure sheet PDFs to `/apps/web/public/pdfs`
- [x] Extract plan data from brochure (Plans 1–9: sum assured, medical expenses, renewal bonus, premiums per age/occupation band)
- [x] Create `packages/pricing/plans.ts` with the full pricing matrix
- [x] Wire Tailwind tokens to the values in [Design.md](./Design.md)

### Git & Continuous Deploy (set up early so every commit auto-saves progress)
- [x] `git init`
- [x] Push initial scaffold to a private GitHub repo
- [x] Create the Firebase project (`asp-finno`) and provision Firestore (current database location: `nam5`)
- [x] Create the two App Hosting backends in the Firebase console:
  - [x] `web` backend → connect to GitHub repo, **set Root directory = `/apps/web`** (Firebase console field, not the yaml), watch `main`
  - [x] `crm` backend → same repo, **Root directory = `/apps/crm`**, watch `main`
- [x] Verify a trivial commit triggers a build and lands on the auto-generated App Hosting URLs for both backends (custom domains come later in Phase 9)
- [x] If the build fails on workspace resolution, confirm npm workspaces is declared at repo root and that `transpilePackages` lists every internal `@asp/*` package each app imports
- [ ] Add a billing budget alert ($10/month, 50/90/100% thresholds) in GCP Billing

## Phase 2: Landing Page & Plan Showcase
- [x] Build hero section with Allianz Shield Plus branding
  - [x] Add "Distributed by WF Wealth Management Sdn Bhd" tagline/badge
  - [x] Highlight "Renewable up to 80 years old" as a key selling point
- [x] Age selector (Below 50 / 51–65) — segmented toggle per Design.md
- [x] Occupation selector (Category A / Category B) with info icon tooltip
- [x] Occupation categories modal (list from brochure)
- [x] Plan cards grid (Plans 1–9 only)
  - [x] Plan name, sum assured, medical expenses, renewal bonus, dynamic price
  - [x] "View Plan" expand button, "Buy Now" CTA
  - [x] If Occupation Category B is selected, hide Plans 6–9 and show: "Category B is only available to buy Plans 1 to 5."
- [x] Dynamic pricing logic (reactive to age + occupation)
- [x] Expanded plan view with full benefits breakdown
- [x] PDF viewer buttons (Brochure / Policy Wording / Product Disclosure Sheet)

## Phase 3: Application Form
- [x] Multi-step form UI
- [x] Applicant details
  - [x] Name input
  - [x] NRIC input with validation
  - [x] Auto-fill DOB + Gender from NRIC
  - [x] Email input with validation
  - [x] Mobile input — `@asp/shared/src/mobile.ts` normalization pipeline + regex `^\+601[0-46-9][0-9]{7,8}$`. Normalized on blur; server re-validates before Firestore write (Phase 5).
  - [x] Address input
  - [x] Occupation dropdown
  - [x] Smoker yes/no toggle
- [x] Nominee details (dynamic, up to 2)
  - [x] Name, NRIC, Relationship, Nationality (default Malaysian)
  - [x] Add/Remove nominee buttons
- [x] Client-side validation
- [x] Order summary sidebar (selected plan + price)

## Phase 4: Payment Integration (Senang Pay)
- [x] Set up Senang Pay merchant account & API keys
- [x] Configure Senang Pay dashboard URLs for production/live payment:
  - [x] Return URL → `https://asp.finnomalaysia.com/payment/result`
  - [x] Callback URL → `https://asp.finnomalaysia.com/api/checkout/callback`
- [x] `POST /api/checkout/initiate` — generates `ASP-<yyyymmdd>-<random>` order ID, writes `lead` doc
- [x] Senang Pay return URL handler (browser redirect) → `/payment/result`
- [x] Senang Pay server-to-server callback (with hash verification) — idempotent
- [x] Payment success page
- [x] Payment failure / retry page
- [ ] Test credit card, e-wallet, and FPX flows with production/live Senang Pay credentials

## Phase 5: Firestore Backend
- [x] Firebase project + Firestore database were provisioned in Phase 1's CD bootstrap (current database location: `nam5`)
- [x] Wire `firebase-admin` in Route Handlers (no JWT/REST helper needed — App Hosting provides ADC; locally use the emulator or `gcloud auth application-default login`)
- [x] Implement the `applications/{orderId}` schema (including `pdpaConsent` and `searchKeys`) and the `events` subcollection per `Claude.md §Firestore Schema`
- [x] Implement `nricHash = HMAC-SHA256(nric, NRIC_HASH_PEPPER)` in `@asp/shared`; never log plaintext NRIC
- [x] Populate `searchKeys.nameLower` and `searchKeys.emailLower` on every application write so the CRM list view can do prefix queries
- [x] Replace any in-memory store with Firestore writes on form submit (status `lead`)
- [x] Capture PDPA consent at form submit → `pdpaConsent: { accepted, at: serverTimestamp(), version: "v1" }`
- [x] Senang Pay callback updates status to `paid` / `payment_failed` and writes an event row
- [x] Generate per-application `trackerToken` (UUID v4) at lead creation
- [x] Underwriting flag logic
- [x] Lock down Firestore security rules to deny all client access (rules in `Claude.md §Auth & Access Control`)
- [x] Define `firestore.indexes.json` with the composite index on `(status, reminderSent, createdAt)` for the lead-reminder query

### Cloud Functions scaffold (needed before Phase 6's reminder job)
- [x] Create `/functions` workspace package with its own `package.json`, `firebase-functions` + `firebase-admin` deps, and TypeScript config
- [x] Set Functions runtime to **Node 20** in `firebase.json` (`"functions": { "runtime": "nodejs20" }`)
- [ ] Verify `firebase deploy --only functions` succeeds with an empty placeholder export before adding real handlers

## Phase 6: Email Automation (Resend)
- [ ] Create Resend account; verify sender domain (SPF/DKIM/DMARC) for `asp.finnomalaysia.com`
- [x] Author React Email components in `packages/shared/emails`: `LeadReminder.tsx`, `Paid.tsx`, `PaymentFailed.tsx`, `Issued.tsx`
- [x] Add `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_FROM_ADDRESS` to Secret Manager and grant access to both backends + functions
- [x] Build `lib/email.ts` Resend client in `@asp/shared`
- [x] Build central `onStatusChange(application, from, to)` hook — only place a status-driven email is triggered
- [x] Wire `onStatusChange` into Senang Pay callback and CRM status mutation; lead reminder is handled by the scheduled function
- [x] Build Resend webhook handler at `/api/webhooks/resend` (Svix signature verify) → write `email_event` rows
- [ ] Configure the Resend webhook URL in the Resend dashboard:
  - [ ] Initially: `https://<web-backend-id>.web.app/api/webhooks/resend` (use the App Hosting auto-generated URL)
  - [ ] After Phase 9 domain bind: update to `https://asp.finnomalaysia.com/api/webhooks/resend`
- [x] Cloud Scheduler job → `leadReminderTick` Cloud Function for stale `lead` docs (>24h, `reminderSent=false`)

### Current Email Bugs To Fix Before Expanding CRM
- [x] Fix deployed email runtime dependencies so automatic transactional emails can render/send from App Hosting
- [x] Fix CRM template preview runtime path so previews can render templates
- [x] Fix CRM resend runtime path and return real send/render errors to the UI
- [x] CRM custom/free-form email sends successfully
- [x] Confirm root cause: App Hosting standalone bundles were missing `@react-email/render` / `prettier` / shared email runtime deps
- [x] Add safer JSON error responses + server logging around preview/resend/status-email routes
- [ ] Deploy the email runtime fix to Firebase App Hosting and verify live preview/resend/auto-send

## Phase 7: Customer Issuance Tracker
- [x] Public route `/track/[token]` — looks up by `trackerToken`, returns sanitized status + timeline
- [x] 4-step progress bar driven from `status` + timestamps
- [x] Embed tracker link in every status-change email
- [x] Per-IP rate limit on the route to deter scraping
- [x] Verify the tracker never exposes NRIC, address, or full applicant record

## Phase 8: CRM Frontend
- [x] (CRM scaffold + CD already exist from Phase 1) — fill out routes and UI now
- [x] Gate every CRM route + API endpoint with a Firebase Authentication check that requires the custom claim `role: "admin"`
- [ ] Add `aspadmin.finnomalaysia.com` and the auto-generated `*.web.app` host to Firebase Auth → Authorized Domains
- [x] Build `/scripts/grant-admin.ts`: takes an email, looks up the Firebase Auth user, calls `auth.setCustomUserClaims(uid, { role: "admin" })`. Run it locally against your own email **before** the first CRM deploy goes live, otherwise no one can log in.
- [x] List view:
  - [x] Filter by status (server-side, exact match)
  - [x] Search by name/email — prefix query against `searchKeys.nameLower` / `searchKeys.emailLower` using `>= q && < q + ''`
  - [x] Search by orderId — direct doc lookup
  - [x] Pagination via Firestore `startAfter` cursors (not offset-based)
- [x] Detail view: full application, payment history, event timeline
- [x] "Change status" action (`paid → issued`) with policy number input
- [x] "Add note" action (writes to events subcollection)
- [x] CRM email control surface (per `Claude.md §CRM Email Control`):
  - [x] Email timeline (sends + Resend webhook events)
  - [x] Template preview (no send)
  - [x] Resend a past transactional email
  - [x] Compose ad-hoc email (free-form)
- [x] Per-admin attribution (`ownerAdminId` + actor on every event row)

## Phase 9: Polish & Launch
- [ ] Mobile responsive testing
- [ ] Cross-browser testing
- [x] Loading states and error handling
- [x] Analytics wiring placeholders (GA4 / Meta Pixel IDs can be added later)
- [x] Privacy policy, refund policy, and T&C pages
- [x] PDPA consent checkbox on the form (writes to `pdpaConsent` per Phase 5)
- [x] SEO meta tags and Open Graph
- [x] Set `runConfig.maxInstances` in both `apphosting.yaml` files (e.g. 5 for `web`, 2 for `crm`) and `runConfig.minInstances: 0`
- [ ] Bind custom domains in Firebase:
  - [x] `asp.finnomalaysia.com` → `web` backend
  - [ ] `aspadmin.finnomalaysia.com` → `crm` backend
- [ ] Add the two CNAME records at the `finnomalaysia.com` DNS provider (set DNS-only / grey cloud if Cloudflare-fronted)
- [ ] Update Resend webhook URL to `https://asp.finnomalaysia.com/api/webhooks/resend`
- [x] Update `TRACKER_BASE_URL` secret to `https://asp.finnomalaysia.com`
- [x] Update Senang Pay return URL + callback URL in the Senang Pay merchant dashboard to the production hostnames
- [ ] Verify the auto-deploy from Phase 1 still rolls out cleanly to both custom domains (no manual deploy step needed)
- [ ] End-to-end test with a real Senang Pay production/live transaction
- [ ] End-to-end test full journey: lead → reminder email → paid → issued → all four emails delivered + webhook events recorded

## Phase 10: CRM Growth Features

### CRM Navigation
- [ ] Restructure CRM into 3 top-level tabs:
  - [ ] Applicants
  - [ ] Email Marketing
  - [ ] Promo Codes
- [ ] Keep existing applicant list/detail flow under Applicants

### Manual Status Management
- [ ] Let admins manually change lead/application status from CRM beyond only `paid → issued`
- [ ] Every manual status change writes an `events` subcollection row, visible in Event timeline like notes
- [ ] Require optional admin note/reason for manual status changes
- [ ] Decide whether manual status changes should trigger transactional emails by default, require a checkbox, or never auto-send
- [ ] Add guardrails so manual payment status changes cannot accidentally duplicate payment callback events

### Payment Follow-Up Email
- [ ] Create/repair "complete your payment" email template with live `/payment/retry/{trackerToken}` link
- [ ] Add CRM button to send payment follow-up email for `lead` / `payment_failed` applications
- [ ] Include this send in Event timeline as `email_sent`
- [ ] Prevent sending payment follow-up to already `paid` or `issued` applications

### Email Policy Progress
- [ ] Add policy/application progress section to every transactional email
- [ ] Ensure progress reflects statuses: `lead`, `payment_failed`, `paid`, `issued`
- [ ] Include tracker link in every progress section

### Bulk Email Marketing
- [ ] Build Email Marketing tab in CRM
- [ ] Segment recipients by application status (`lead`, `payment_failed`, `paid`, `issued`)
- [ ] Add filters/search before send: plan, date range, occupation category, paid/unpaid status
- [ ] Add recipient preview and final confirmation before sending
- [ ] Add unsubscribe/marketing consent strategy before sending non-transactional email
- [ ] Add rate limiting / batch sending to avoid Resend throttling
- [ ] Write bulk campaign docs and per-recipient send events for auditability
- [ ] Separate transactional emails from marketing emails in code and event naming

### Promo Codes
- [ ] Add Promo Codes CRM tab
- [ ] Create Firestore promo code schema: code, discount type, amount/percent, active dates, usage limit, allowed plans/categories, created/updated metadata
- [ ] Build CRM create/edit/deactivate promo code UI
- [ ] Add promo code input to web application/payment flow
- [ ] Validate promo codes server-side in checkout initiation
- [ ] Store applied promo code and discount amount on application/payment record
- [ ] Show discount in order summary, checkout payload, CRM detail, and payment amount calculation
- [ ] Add guardrails for expired/disabled/usage-limited promo codes

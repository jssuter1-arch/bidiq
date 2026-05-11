# BidIQ Changelog

## Phase 3 — Budget Lifecycle Module — 2026-05-10

Full-stack Budget Lifecycle feature: immutable budget snapshot history, automated snapshot hooks on project creation/status transitions/change-order approval, bank reconciliation, SVG timeline chart, lender dossier with PDF export, and executive dashboard card.

### New Migrations

| Migration | Purpose |
|-----------|---------|
| 300 | Adds `status_changed_at TIMESTAMPTZ` to `projects`; backfills from `updated_at` |

### New Server Code

| File | Purpose |
|------|---------|
| `server/src/services/budget-snapshot-helpers.ts` | `computeChangeOrderTotal(projectId)` and `captureLineItemsSnapshot(projectId)` — used by all snapshot hooks |
| `server/src/routes/budgetLifecycle.ts` | All Phase 3 endpoints: manual snapshot, snapshot list, single snapshot, budget timeline, bank reconciliation, lender dossier, lender dossier PDF export |

### Controller Hooks (Additive — No API Shape Changes)

| File | Hook Added |
|------|-----------|
| `server/src/routes/projects.ts` | POST → `project_created` + conditional `bank_declared` snapshots; PATCH → `bank_declared` (loan change), `break_ground` (→active), `completion` (→completed), `status_changed_at` update |
| `server/src/routes/invoices.ts` | POST `/:id/approve` → `revision` snapshot when `is_change_order = true` |

### New API Endpoints

**Snapshots (all require `budget_lifecycle` module access)**
- `POST /api/v1/projects/:projectId/snapshots` — Record manual snapshot (project_manager+)
- `GET /api/v1/projects/:projectId/snapshots` — Ordered snapshot history
- `GET /api/v1/projects/:projectId/snapshots/:snapshotId` — Single snapshot with line_items_snapshot
- `GET /api/v1/projects/:projectId/budget-timeline` — Timeline data for chart rendering (project + ordered snapshots)
- `GET /api/v1/projects/:projectId/bank-reconciliation` — Live vs. declared budget/spend comparison
- `GET /api/v1/lender-dossier` — Portfolio-level KPIs + per-project summaries with bank declared data
- `POST /api/v1/lender-dossier/export` — Structured export data for client-side PDF generation (admin only)

### Snapshot Trigger Logic

| Trigger | Snapshot Type | Condition |
|---------|--------------|-----------|
| Project created | `project_created` | Always |
| Project created with loan | `bank_declared` | `has_construction_loan && loan_amount` at creation |
| Project PATCH: loan changed | `bank_declared` | `has_construction_loan` updated or `loan_amount` changed |
| Project PATCH: → `active` | `break_ground` | `status` changes from any → `active` |
| Project PATCH: → `completed` | `completion` | `status` changes from any → `completed` |
| Invoice approved | `revision` | `is_change_order = true` on approved invoice |
| Manual | `manual` | Explicit `POST /projects/:id/snapshots` call |

All hooks are non-fatal: a snapshot failure logs to console but does not roll back the primary operation.

### New Client Code

**Components** (`client/src/components/budget-lifecycle/`)
- `SnapshotTypeBadge` — Colored badge for 7 snapshot types
- `ProjectVarianceDistributionBar` — Stacked bar: base spend / change orders / over-budget (red)
- `BudgetTimelineChart` — Custom SVG chart: budget line (dashed) + actual spend line + event dots colored by type
- `SnapshotTable` — Tabular snapshot history with type badge, date, budget, spend, CO columns; click-to-select
- `SnapshotDetailDrawer` — Right-side drawer: all snapshot fields + line_items_snapshot table
- `ManualSnapshotDialog` — Modal with notes field; calls POST snapshots endpoint
- `BudgetTimelineSection` — Orchestrator: loads timeline + snapshots, renders chart + table + drawer + manual snapshot button
- `BankReconciliationPanel` — Sync status banner + declared vs. live budget/spend diff; only renders if `has_construction_loan`
- `ExecutiveBudgetPerformanceCard` — Dashboard card: portfolio budget, variance %, loan exposure, on-budget rate; links to Lender Dossier
- `LenderDossierPDF` — Print-optimized white-background component for `window.print()` export

**Pages**
- `client/src/pages/LenderDossierPage.tsx` — KPI row, track record card, per-project detail cards with `ProjectVarianceDistributionBar`, LTV recommendation panel, PDF export

**App Updates**
- `ProjectDetailPage.tsx` — Added "Timeline" tab (gated on `budget_lifecycle` access); `BankReconciliationPanel` in Overview tab when `has_construction_loan`
- `DashboardPage.tsx` — `ExecutiveBudgetPerformanceCard` mounted when `budget_lifecycle` access granted
- `Sidebar.tsx` — "Lender Dossier" nav item gated on `budget_lifecycle` access (ClipboardList icon)
- `App.tsx` — `/lender-dossier` lazy route

### Demo Seed Extensions (Phase 3)

Three existing projects now have rich snapshot histories:
- **South End Full Gut Reno** (proj1) — `project_created` → `bank_declared` (Rockland Trust, $185K) → `break_ground` → `revision` (CO FGC-2025-003, $3K)
- **Dorchester Unit Turns** (proj2) — `project_created` → `bank_declared` → 4× `revision` tracking weekly spend
- **Somerville Planning Phase** (proj3) — `project_created` → `bank_declared` ($45K declared)
- Backfilled `status_changed_at` for all three projects
- Fixed Phase 1/2 seed: Phase 1 DO $$ block was missing its `END $$;` — added before Phase 2 block

---

## Phase 2 — Deal Intelligence Module — 2026-05-10

Full-stack Deal Intelligence feature: acquisition pipeline, versioned underwriting calculator, status lifecycle state machine, sensitivity analysis, deal-to-property promotion, and all supporting UI.

### New Migrations

| Migration | Purpose |
|-----------|---------|
| 200 | Placeholder — backfill script invoked via `npx tsx server/src/scripts/backfill-underwriting.ts` |
| 201 | Adds nullable `deal_id` FK to `property_documents` for deal-scoped document association |

### New Server Code

| File | Purpose |
|------|---------|
| `server/src/middleware/requireModuleAccess.ts` | Middleware factory; calls `user_has_module_access()` RPC; returns 403 `MODULE_ACCESS_DENIED` |
| `server/src/services/underwriting-calc-service.ts` | Pure-function underwriting calculator: IRR (Newton-Raphson), NPV, equity multiple, recommended max bid (bisection), sensitivity analysis |
| `server/src/routes/deals.ts` | Full deal CRUD, status machine transitions, deal-to-property promotion (`POST /:id/promote`) |
| `server/src/routes/underwriting.ts` | Versioned UW model CRUD; nested (`/deals/:dealId/underwriting`) and standalone (`/underwriting/:id`) routers; sensitivity and PDF endpoints |
| `server/src/scripts/backfill-underwriting.ts` | One-time script: fetches all models with `irr IS NULL`, runs calc service, updates computed columns |

### New API Endpoints

**Deals**
- `GET /api/v1/deals` — Paginated deal list with active UW model join; filterable by status, source, search
- `POST /api/v1/deals` — Create deal (project_manager+)
- `GET /api/v1/deals/:id` — Deal with all UW versions, regulatory constraints, documents
- `PATCH /api/v1/deals/:id` — Update deal metadata (project_manager+)
- `DELETE /api/v1/deals/:id` — Admin only; hard delete
- `PATCH /api/v1/deals/:id/status` — Server-validated status transition; `closed_lost` requires reason
- `POST /api/v1/deals/:id/promote` — Converts `closed_won` deal to `properties` row + optional project (admin only)

**Underwriting Models**
- `GET /api/v1/deals/:dealId/underwriting` — All versions for a deal
- `POST /api/v1/deals/:dealId/underwriting` — Create new version; auto-increments version #; runs calc service synchronously
- `GET /api/v1/underwriting/:id` — Single model
- `PATCH /api/v1/underwriting/:id` — Update + recalculate (merges current DB values for unchanged fields)
- `POST /api/v1/underwriting/:id/duplicate` — Clones model as next version
- `POST /api/v1/underwriting/:id/activate` — Sets as active; demotes all other versions for that deal
- `POST /api/v1/underwriting/:id/sensitivity` — Returns sensitivity grid (no DB write)
- `POST /api/v1/underwriting/:id/report-pdf` — Returns model data for client-side PDF generation

**Users**
- `GET /api/v1/users/me/module-access` — Returns `{module_key: boolean}` map based on user role vs. org access settings

### Underwriting Calculator (Key Formulas)

- **Total Capital** = equityIn + closing + carry + (hasConstLoan ? 0 : reno)
- **NOI Year 1** = (curRent + curOther) × 12 × (1 − vacancy) − opex × 12
- **Exit Value** = NOI_stabilized / exitCapRate
- **Equity at Exit** = exitValue − debtBalance − exitValue × 0.04 (selling costs)
- **IRR**: Newton-Raphson on monthly cash flows → annualized via (1+r)^12 − 1
- **NPV**: Monthly discount rate = (1+r)^(1/12) − 1
- **Recommended Max Bid**: Bisection (50 iters, $1K precision) finding highest price where IRR ≥ hurdleRate
- **Stabilization period**: 12 months (Phase 2 fixed)

### Deal Status Machine

```
prospecting → underwriting, passed
underwriting → prospecting, loi_submitted, passed
loi_submitted → under_negotiation, passed
under_negotiation → due_diligence, closed_lost, passed
due_diligence → closed_won, closed_lost
closed_won → (terminal, can promote)
closed_lost → (terminal)
passed → prospecting (reopen)
```

### New Client Code

**Hooks & Types**
- `client/src/types/deals.ts` — TypeScript types: `AcquisitionDeal`, `UnderwritingModel`, `SensitivityResult`, status constants
- `client/src/hooks/useModuleAccess.ts` — Fetches and caches `/api/v1/users/me/module-access`; used to gate sidebar items and dashboard cards

**Components** (`client/src/components/deals/`)
- `DealStatusBadge` — Colored badge for 8 deal statuses
- `CapitalStackBar` — Visual equity/debt proportional bar
- `UnderwritingResultsPanel` — IRR, NPV, equity multiple, CoC, max bid metrics grid
- `SensitivityTable` — Three-axis sensitivity grid (price, cap rate, reno cost) with hurdle highlighting
- `UnderwritingVersionList` — Versioned model list with activate/duplicate/edit actions
- `DealCard` — Kanban card with IRR indicator
- `MarkLostDialog` — Modal requiring reason text before `closed_lost` transition
- `PromoteToPropertyDialog` — Modal creating property + optional project from `closed_won` deal
- `ExecutiveDealsCard` — Dashboard summary card: pipeline counts, top IRR deals, hurdle pass rate

**Pages** (`client/src/pages/deals/`)
- `DealsPage` — Kanban board + table view with status/source/search filters
- `NewDealPage` — Full deal creation form
- `EditDealPage` — Pre-populated deal edit form
- `DealDetailPage` — 5-tab layout (Overview, Underwriting, Documents, Regulatory, Activity); status transition menu; promote/mark-lost actions
- `UnderwritingFormPage` — Dual-mode (create/edit); all UW inputs organized in sections; PercentInput for rate fields
- `UnderwritingComparePage` — Select two versions; side-by-side comparison table with better/worse coloring

**App Updates**
- `Sidebar.tsx` — Adds "Pipeline" nav item gated on `hasAccess('deal_intelligence')`
- `App.tsx` — Lazy routes for all deal pages (`/deals`, `/deals/new`, `/deals/:id`, etc.)
- `DashboardPage.tsx` — Mounts `ExecutiveDealsCard` when `deal_intelligence` access is granted

### Tests Added

| File | Coverage |
|------|---------|
| `server/src/__tests__/underwriting-calc-service.test.ts` | 14 tests: 10 calc scenarios + 4 sensitivity tests |

### Demo Seed Extensions (Phase 2)

- **Cambridge 24-Unit** property (`v_prop4`) — created from deal promotion
- **Cambridge 24-Unit Acquisition** deal — `closed_won`, promoted to `v_prop4` with active underwriting model
- **Watertown Office Complex** deal — `passed` (commercial, doesn't fit strategy)
- **Roxbury 18-Unit Portfolio** deal — `prospecting` (early-stage referral)

---



## Phase 1 Foundation — 2026-05-10

Schema and infrastructure foundation for five new modules: Deal Intelligence, Budget Lifecycle, Scenario Modeling, Cost Intelligence Extensions, and Portfolio Intelligence.

### New Tables

| Migration | Table | Purpose |
|-----------|-------|---------|
| 100 | `organization_module_access` | Per-org, per-module role gates for Phase 1+ features |
| 101 | `acquisition_deals` | Pre-purchase deal pipeline (prospecting → closed_won/lost) |
| 102 | `deal_underwriting_models` | Versioned underwriting models per deal; one `is_active_version` per deal |
| 103 | `project_budget_snapshots` | Canonical budget history; `projects.current_budget` and `actual_spend` are now a denormalized cache |
| 105 | `budget_reconciliation_log` | Audit log for nightly budget drift reconciliation |
| 107 | `regulatory_constraints` | Code and zoning constraints as first-class inputs for scenario modeling |
| 108 | `scenario_models` | What-if renovation path models attached to deals or properties |
| 109 | `scenario_path_comparisons` | Groups multiple scenario models for side-by-side decision support |
| 111 | `pricing_templates` | Org-scoped user-curated pricing rules |
| 111 | `pricing_template_items` | Line items within a pricing template |

### Schema Extensions (Existing Tables)

| Migration | Table | Change |
|-----------|-------|--------|
| 110 | `contractor_invoices` | Added `change_order_category` enum column (free-text `change_order_reason` preserved) |
| 112 | `equity_analyses` | Added `discount_rate`, `hurdle_rate`, `npv`, `irr`, `hold_period_months`, `meets_hurdle` columns |

### Database Functions and Triggers

- `user_has_module_access(user_id, module_key)` — Postgres helper function for feature gating in Phases 2–6
- `insert_default_module_access()` — Trigger on `organizations` INSERT; auto-seeds 5 module access rows per new org
- `sync_project_flat_budget_columns()` — Trigger on `project_budget_snapshots`; syncs `projects.current_budget` and `projects.actual_spend` whenever a snapshot becomes current

### One-Time Migrations

- **106**: Backfills `project_created` snapshots for all existing projects from their flat column values
- **104**: Installs the snapshot sync trigger (idempotent `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`)

### New Server Code

| File | Purpose |
|------|---------|
| `server/src/services/budget-snapshot-service.ts` | **Only** permitted write path for `projects.current_budget` and `projects.actual_spend` |
| `server/src/jobs/budget-reconciliation.ts` | Nightly reconciliation; detects and corrects drift; logs to `budget_reconciliation_log` |
| `server/src/routes/settings.ts` | `GET /api/v1/settings/module-access`, `PATCH /api/v1/settings/module-access/:module_key` |
| `server/src/routes/jobs.ts` | `GET /api/v1/jobs/budget-reconciliation` (Vercel Cron endpoint, CRON_SECRET guarded) |

### New API Endpoints

- `GET /api/v1/settings/module-access` — Returns org's module access configuration (any authenticated user)
- `PATCH /api/v1/settings/module-access/:module_key` — Admin-only; updates `enabled` and `allowed_roles`

### Infrastructure

- `server/vercel.json` — Added Vercel Cron schedule: `0 9 * * *` → `/api/v1/jobs/budget-reconciliation`
- `scripts/lint-forbidden-writes.js` — Repo-wide grep that fails CI if any non-allowed file writes directly to `projects.current_budget` or `projects.actual_spend`
- `.github/workflows/deploy.yml` — Added `lint` and `test` jobs as required gates before `typecheck` and `build`
- `server/package.json` — Added `test` (vitest) and `lint` scripts; added `vitest` devDependency

### Architectural Invariant (Budget Lifecycle)

All budget mutations must flow through `recordBudgetSnapshot()`. The nightly reconciliation job (`budget-reconciliation.ts`) asserts and auto-corrects drift. The lint script prevents regressions. The snapshot sync trigger keeps flat columns in sync.

**Allowed write paths to `projects.current_budget` / `projects.actual_spend`:**
1. `budget-snapshot-service.ts` — via snapshot insert + trigger
2. `budget-reconciliation.ts` — auto-correction only, logs every action
3. Migration files — explicitly opted out via comment

### Demo Seed Extensions (Beantown Companies)

- `organization_module_access` — 5 rows with Beantown-specific role gates
- `project_budget_snapshots` — Initial `project_created` snapshots for all 3 existing projects
- `acquisition_deals` — "Eastie 60-Unit Portfolio" (status: `under_negotiation`)
- `deal_underwriting_models` — 3 versions (at ask, Mark's bid, stress-test); v3 is active
- `regulatory_constraints` — Bowden Street fire code sprinkler trigger ($150K estimate)
- `scenario_models` — 3 paths for Dorchester 6-Unit decision (A: sprinkler+bedrooms, B: cosmetic [recommended], C: do nothing [baseline])
- `scenario_path_comparisons` — Decision record selecting Path B, signed off 2025-04-22
- `pricing_templates` + `pricing_template_items` — "Beantown Standard Renovation" with 5 items

### Backward Compatibility

- No existing column dropped, renamed, or retyped
- No existing index removed or modified
- No existing API endpoint signature changed
- No existing UI component modified
- No existing RLS policy modified
- All UAT-validated flows continue to function identically

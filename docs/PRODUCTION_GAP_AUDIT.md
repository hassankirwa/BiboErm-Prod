# Production Module — Gap Audit

**Audit date:** 2026-06-04  
**Compared to:** [PRODUCTION.MD](./PRODUCTION.MD) v1.1, [PRODUCTION_FRONTEND_GUIDE.md](./PRODUCTION_FRONTEND_GUIDE.md)  
**Branch baseline:** `development` after production module pull (~53c5cda)

## Executive summary

| Layer | Status |
|-------|--------|
| Backend (Phases 1–5) | **Largely complete** — pipeline API, FIFO, cutting sheets, start-stage WH release, offcuts proxy, PM/PROC listeners |
| Frontend (§17) | **~70%** — routes and API client live; operator flows were thin (offcuts, QC links, material releases) |
| QC ↔ Production | **Was half-wired** — listener existed but unregistered; `qc_pre_check` did not emit `ProductionStageCompleted` |

This document tracks gaps and remediation. Items marked **Fixed** were addressed in the implementation pass that created this file.

---

## Backend — Complete

- All §15 phase-1 endpoints including `PATCH /cutting-sheet/{line}`
- `CreateProductionOrder` on `ProjectMaterialsReady`
- Option A: material release on **start-stage** (WH complete listener is no-op)
- 13 PHPUnit cases in `ProductionFlowTest.php`
- `ProductionStageCompleted` for PM sync stages + post-fabrication QC

## Backend — Fixed in remediation

| Item | Fix |
|------|-----|
| `CreateProductionQcInspection` not registered | `registerQualityControlListeners()` in `AppServiceProvider` |
| `qc_pre_check` never emitted event | `ProductionStage::emitsProductionStageCompleted()` includes `qc_pre_check` |
| List filter vs `production.manage` | Index skips `assigned_to_me` when user has `production.manage` |
| `on_hold` no API | `PATCH /orders/{id}/status` |

## Backend — Remaining (phase 2+)

- Granular permissions (`production.orders.view`, etc.)
- Pause/resume / partial cutting completion (§22 Q4)
- Client notification on new order (§22 Q3)
- MySQL: one-active-order unique index (PostgreSQL only in `600001`)
- Material release silent no-op when no reservation — surface warning in UI

## Frontend — Complete

- `/production/schedule`, `/orders`, `/orders/[id]`, `/cutting`, `/assembly`
- `frontend/lib/api/production.ts` maps PROD endpoints
- Project tab `?tab=production`

## Frontend — Fixed in remediation

| Item | Fix |
|------|-----|
| Cutting complete without offcuts | Offcut picker from cutting sheet; complete bundles offcuts or requires prior log |
| `/production` 404 | Redirect to `/production/schedule` |
| Nav without permission gates | `production.view` on subModules |
| `isProductionManager` | `production.manage` \|\| `production.schedule.manage` |
| Stage buttons vs policy | `canManageStages` mirrors backend team/manager rules |
| Material releases not shown | Panel on order detail |
| Assembly N+1 glass | Reuse `GET /schedule` `glass_status` |
| QC links | Chips linking to `/qc/inspections` by `production_order_id` |

## Frontend — Fixed in QA pass (2026-06-04)

| Item | Fix |
|------|-----|
| 422 / validation toasts | `getApiErrorMessage()` in [`frontend/lib/api/errors.ts`](../frontend/lib/api/errors.ts); used across production pages/components |
| Invalid order URL | Guard `NaN` / invalid id on [`orders/[id]/page.tsx`](../frontend/app/(dashboard)/production/orders/[id]/page.tsx) |
| Cutting sheet permissions | Regenerate/edit use `canManageProductionStages()` |
| Offcut raw item ID | [`production-offcut-item-select.tsx`](../frontend/components/production/production-offcut-item-select.tsx) — sheet lines or `listAluminiumProfiles()` |
| BOM regenerate | Confirm dialog on order detail |
| Cutting line edit | Numeric validation; `bar_length_mm`, `waste_mm` fields |
| Project link | Order detail → `/projects/{id}?tab=production` |
| Queue filters | [`load-queue-orders.ts`](../frontend/lib/production/load-queue-orders.ts) server `?stage=` per queue stage |
| Orders list | Status filter + pagination (25/page) |
| Team assign UI | shadcn `Select` + shared stage/role options from [`utils.ts`](../frontend/lib/production/utils.ts) |
| Nav analytics | Production Reports/Analytics gated with `analytics.view` |
| Static production badge | Removed misleading `"4 Delayed"` workspace badge |

## Frontend — Remaining (phase 2+)

- Dispatch workspace tile still labeled “Dispatch” but links to production schedule
- Inline start/complete on cutting/assembly queue rows (must open order detail today)
- Material release rows still show reservation line ID (needs WH resource enrichment)
- Team unassign API/UI (backend has no DELETE)
- Offcut dialog: quantity pieces and notes fields optional in API but not in UI

## Cross-module matrix

| Integration | Status |
|-------------|--------|
| WH → PROD order | Done |
| PROD → WH release (start) | Done |
| PROD → WH offcuts | Done (BE + FE) |
| PROD → PM stage | Done |
| PROD → PROC glass | Done |
| PROD → QC inspections | **Fixed** (listener + event + FE links) |
| PM → PROD project tab | Done |

## Implementation phases (reference)

1. **Phase A** — Shop floor: offcuts UX, nav, list permissions (**done**)
2. **Phase B** — QC wiring (**done**)
3. **Phase C** — Material releases, glass on detail, project tab history (**partial** — releases + QC + glass on detail)
4. **Phase D** — Tests + docs (**done** for schedule/offcuts/qc_post tests; PRODUCTION.MD updated)

---

*Maintainers: update this file when closing gaps; keep [PRODUCTION.MD](./PRODUCTION.MD) §0 as the canonical status table.*

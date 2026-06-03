# Production Module — Frontend Implementation Guide

**Audience:** Frontend developers wiring the BIBO ERM production UI  
**Backend:** `/api/v1/production` (see [PRODUCTION.MD](./PRODUCTION.MD))  
**API client:** [`frontend/lib/api/production.ts`](../frontend/lib/api/production.ts)

---

## Routes

| Route | Page | API |
|-------|------|-----|
| `/production/schedule` | FIFO queue + stats | `GET /production/schedule`, `GET /production/orders` |
| `/production/orders` | Order list | `GET /production/orders` |
| `/production/orders/[id]` | Order detail, stage actions, cutting sheet | `GET /production/orders/{id}`, stage/offcut/team endpoints |
| `/production/cutting` | Cutting queue filter | `GET /production/orders` (client filter) |
| `/production/assembly` | Assembly queue + glass badge | `GET /production/orders`, `GET /procurement/glass-orders?project_id=` |

**Project detail:** `/projects/[id]?tab=production` — `GET /production/orders?project_id=`

Field Installation is **not** under Production nav (see [FIELD_INSTALLATION.MD](./FIELD_INSTALLATION.MD)).

---

## Permissions

| Slug | UI |
|------|-----|
| `production.view` | All read-only pages, project Production tab |
| `production.manage` | Start/complete stage, offcuts, cutting sheet regenerate |
| `production.schedule.manage` | PATCH schedule dates (FIFO position is read-only) |

---

## Stage workflow

1. Warehouse emits `ProjectMaterialsReady` → backend creates `production_order` (no manual create in UI).
2. Operator **starts** current stage → partial WH material release.
3. Operator **completes** stage → `ProductionStageCompleted` → PM/PROC listeners.
4. At **cutting** complete: offcuts required (`POST .../offcuts` with `storage_area: production_workspace`).

```mermaid
flowchart LR
  WH[Materials ready] --> PO[Production order]
  PO --> Start[start-stage]
  Start --> WHRelease[WH partial release]
  Start --> Work[Shop floor work]
  Work --> Complete[complete-stage]
  Complete --> PM[Project stage sync]
```

---

## Types

Use types from `@/lib/api/production` (`ProductionStageValue`, `ProductionOrderStatus`).  
Legacy mock types in `@/lib/types` are for `mock-data` only.

---

## Run tests

```bash
cd backend && php artisan test --filter=ProductionFlowTest
```

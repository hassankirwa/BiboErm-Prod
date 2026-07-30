# Cross-Module Flow and Gap Audit

## End-to-end operating flow

1. CRM captures leads, contacts, accounts, site visits, quotations, deal status, deposits, and project creation.
2. Project management owns the live project, site/production measurement visits, documents, floors, engineers, delays, addons, BOM, material status, and stage advancement.
3. Design/Wincad uploads convert measured production files into BOM lines, glass requirements, cutting/fabrication lists, and mapped warehouse item demand.
4. Warehouse resolves BOM demand to stocked master data, reserves FIFO stock, releases materials to production, receives stock from GRNs, tracks offcuts, stock take, tools, and location hierarchy.
5. Procurement consumes shortages and low-stock alerts, creates requisitions, supplier POs, glass orders, transport, GRNs, attachments, and warehouse putaway handoff.
6. Production uses reserved materials, schedules production orders, manages teams, cutting sheets, stage start/complete/skip actions, offcuts, and QC gates.
7. QC inspects warehouse receiving, warehouse audits, production pre/post checks, in-process work, site installation, and snagging sign-off with templates, schedules, defects, and photos.
8. Field installation receives completed work, runs installation jobs, unit progress, daily logs, deliveries, photos, non-conformities, tool issue/return, and closeout.
9. Client portal exposes controlled project progress by project reference/client code plus phone ownership verification, then returns a short-lived signed project token.

## Confirmed coverage

- CRM, quotation, project, procurement, warehouse, production, QC, and field-installation route groups are registered under `api/v1`.
- Backend permission middleware exists for production, QC, warehouse, procurement, field installation, and project client portal visibility.
- Production has list/view/schedule/status/stage/team/cutting/offcut routes and matching frontend API calls.
- QC has template, inspection, photo, defect, schedule, and dashboard routes with matching frontend API calls.
- Procurement has requisitions, POs, GRNs, GRN attachments, glass orders, transport, suppliers, drivers, stock, and dashboard routes.
- Warehouse has inventory, movement, reservation, offcut, tool, stock-take, locations, and material master-data routes.
- Field installation has job list/detail/create/update/start/complete, member assign/remove, daily log create, delivery create, photo upload, unit progress update, NC create/update, and tool issue/return routes.

## High-priority gaps

- Client portal is now built as a stateless access flow: project reference/client portal code plus phone verification issues a signed token for client-scoped project progress. Remaining hardening: optional SMS OTP, client document publish controls, and branded client notifications.
- Field installation now supports photo upload/gallery, daily-log edits, delivery note edits, and NC acknowledge/resolve closeout actions. Remaining hardening: photo delete/archive, richer delivery-line editing, and explicit supervisor approval for waived NCs.
- Warehouse master data now supports create/update/deactivate backend routes for door types, aluminium profiles, accessories, and rubbers, with deactivate actions in the page. Remaining hardening: full edit dialogs and alias editing in the material catalog UI.
- Procurement is intentionally workflow CRUD rather than delete CRUD: requisitions and POs can be created/updated/approved/rejected/sent/exported. Cancel/archive should be added instead of delete when needed for audit traceability.
- Production is intentionally workflow CRUD: orders are generated from project/operations flow, then listed/viewed/scheduled/statused/stage-managed. Delete is not recommended; cancellation/hold should remain status-based.
- QC is intentionally workflow CRUD: inspections/templates/schedules/defects can be created/updated/submitted/resolved. Delete is not recommended for quality traceability; archive/deactivate should be used if needed.
- Page-level permission guards are inconsistent. Navigation filtering exists, and many action buttons use `PermissionGate`, but several module pages rely on backend 403s rather than wrapping the whole page in `PermissionGuard`.

## Frontend/backend mismatches found in this pass

- Field photo upload backend route existed without frontend API helpers or UI. API helpers and UI upload/gallery were added.
- Warehouse material catalog extract/import/export backend routes existed without frontend API helpers. API helpers were added.
- Procurement requisition XLSX export backend route existed without a frontend API helper. A blob download helper was added.
- Production navigation had duplicate entries and some production links without `production.view`.
- QC top nav had links without `qc.view`.
- Client portal navigation pointed at a missing dashboard route. It now points to the public `/client-portal` access flow.

## Recommended next implementation slices

1. Add SMS OTP to the client portal for stronger phone ownership proof.
2. Add explicit client-visible flags on documents/photos so staff can publish or hide artifacts.
3. Expand warehouse master-data edit dialogs to cover all update fields and alias management.
4. Add cancel/archive workflow endpoints for procurement requisitions/POs only if management wants reversible cancellation beyond approve/reject/send.
5. Add page-level guards consistently for production, QC, procurement, warehouse, and field installation.

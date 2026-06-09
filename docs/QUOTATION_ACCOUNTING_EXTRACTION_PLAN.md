# Quotation vs Fabrication Excel Extraction

## Two workbook types

| Workbook | Sample | Endpoint | Service |
|----------|--------|----------|---------|
| **Accounting / cost** | `docs/excel dump.txt` (`BEATRICE-W&D Cost-SD-*`) | `POST /api/v1/projects/quotations/extract` | `QuotationAccountingExcelExtractionService` |
| **Fabrication / BOM** | `docs/BEATRICE FABRICATION LIST.xls` | `POST /api/v1/projects/design/extract` | `QuotationExcelExtractionService` (fabrication; rename to `FabricationExcelExtractionService` planned) |

## Accounting output (`lines[]`)

Priced client quotation lines: `series`, `code`, `glass_type`, `width_mm`, `height_mm`, `sqm_per_pcs`, `quantity`, `total_sqm`, `unit_price`, `line_total`, plus `metadata.accounting`.

### `metadata.accounting` schema

| Field | Description |
|-------|-------------|
| `layout` | `tabular` (client quote table) or `cost_section` (`PROJECT-W&D Cost-CODE` blocks) |
| `currency` | `USD` for internal accounting sheets; `KES` for client quotation tables |
| `usd_per_sqm` | USD/SQM rate from the cost section (not client unit price) |
| `line_total_usd` / `unit_price_usd` | USD totals when the sheet is priced in USD |
| `unit_price_kes` / `fx_rate` | Reserved for future FX conversion to client KES quote |
| `in_colour`, `out_colour`, `location`, `mark` | Header fields from each cost section |
| `vat_amount`, `profit_amount`, `commission_amount` | Per-line analytics totals |
| `cost_breakdown` | Full nested breakdown: direct cost (aluminum, glass/mesh, hardware, labor), indirect, profit, VAT, commission, total |

When a workbook contains both a tabular quote sheet and `-W&D Cost-*` sections (e.g. `BEATRICE20260423.xlsx`), extraction uses the tabular sheet for dimensions/qty/pricing and merges cost-section metadata by `code`.

## Fabrication output (`items[]`)

Design/BOM: frame profiles, sash profiles, hardware, glass, sash openings, drawings, dimensions. Not used directly on client quotation PDF.

## Merge strategy (future)

Join accounting `lines` with fabrication `items` by `code` for width/height/glass/picture on client quote.

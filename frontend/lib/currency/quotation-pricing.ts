import type { ApiQuotationLine } from "@/lib/api/crm/types";
import type { AccountingLineMetadata } from "@/lib/api/projects/quotations";
import { convertUsdToKes } from "./usd-to-kes";

function num(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getLineAccountingMetadata(
  line: Pick<ApiQuotationLine, "metadata">,
): AccountingLineMetadata | null {
  const accounting = line.metadata?.accounting;
  if (!accounting || typeof accounting !== "object") return null;
  return accounting as AccountingLineMetadata;
}

export function lineIsUsdPriced(line: Pick<ApiQuotationLine, "metadata" | "unit_price">): boolean {
  const accounting = getLineAccountingMetadata(line);
  if (accounting?.currency === "KES") return false;
  if (accounting?.currency === "USD") return true;
  if (accounting?.unit_price_usd != null || accounting?.line_total_usd != null) return true;
  return false;
}

export function lineUsdUnitPrice(line: Pick<ApiQuotationLine, "metadata" | "unit_price">): number {
  const accounting = getLineAccountingMetadata(line);
  if (accounting?.unit_price_usd != null) return num(accounting.unit_price_usd);
  return num(line.unit_price);
}

export function lineUsdTotal(
  line: Pick<ApiQuotationLine, "metadata" | "unit_price" | "quantity" | "line_total">,
): number {
  const accounting = getLineAccountingMetadata(line);
  if (accounting?.line_total_usd != null) return num(accounting.line_total_usd);
  return num(line.quantity) * lineUsdUnitPrice(line);
}

export function lineKesUnitPrice(
  line: Pick<ApiQuotationLine, "metadata" | "unit_price">,
  rate: number | null | undefined,
): number {
  if (!lineIsUsdPriced(line) || rate == null || rate <= 0) {
    return num(line.unit_price);
  }
  return convertUsdToKes(lineUsdUnitPrice(line), rate);
}

export function lineKesTotal(
  line: Pick<ApiQuotationLine, "metadata" | "unit_price" | "quantity" | "line_total">,
  rate: number | null | undefined,
): number {
  if (!lineIsUsdPriced(line) || rate == null || rate <= 0) {
    const raw = line.line_total ?? num(line.quantity) * num(line.unit_price);
    return num(raw);
  }
  return convertUsdToKes(lineUsdTotal(line), rate);
}

export function quotationHasUsdLines(lines: Pick<ApiQuotationLine, "metadata" | "unit_price">[]): boolean {
  return lines.some(lineIsUsdPriced);
}

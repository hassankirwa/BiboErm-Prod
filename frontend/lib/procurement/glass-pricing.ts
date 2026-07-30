/** Pane area in m² from millimetre dimensions (includes quantity). */
export function glassPaneAreaM2(
  widthMm?: number | null,
  heightMm?: number | null,
  quantity?: number | null,
): number {
  const w = Number(widthMm);
  const h = Number(heightMm);
  const q = Number(quantity);
  if (!(w > 0) || !(h > 0) || !(q > 0)) return 0;
  return (w / 1000) * (h / 1000) * q;
}

/** Line spend = unit buying price × ordered quantity. */
export function glassLineBuyingTotal(
  unitBuyingPrice?: number | null,
  quantity?: number | null,
): number | null {
  const unit = Number(unitBuyingPrice);
  const qty = Number(quantity);
  if (!Number.isFinite(unit) || unit < 0 || !(qty > 0)) return null;
  return unit * qty;
}

export function glassPricePerSqm(buyingPrice: number, areaM2: number): number | null {
  if (!(areaM2 > 0) || !(buyingPrice >= 0) || Number.isNaN(buyingPrice)) return null;
  return buyingPrice / areaM2;
}

export function formatKes(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPricePerSqm(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${formatKes(value)} / m²`;
}

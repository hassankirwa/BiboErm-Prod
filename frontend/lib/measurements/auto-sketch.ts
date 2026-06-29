import type { SiteMeasurementLine } from "@/lib/measurements/types";

export type SketchProductKind = "door" | "window" | "other";

export type SketchSymbol = {
  key: string;
  product_type: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  kind: SketchProductKind;
};

export type FloorSketchPage = {
  floor: string;
  symbols: SketchSymbol[];
};

const GRID_COLS = 4;
const CELL_PADDING = 12;
const CANVAS_WIDTH = 800;
const FLOOR_HEADER_HEIGHT = 36;
const FLOOR_BODY_HEIGHT = 360;

function primaryWidth(line: SiteMeasurementLine): number {
  return (
    line.width_centre_mm ??
    line.width_top_mm ??
    line.width_bottom_mm ??
    0
  );
}

function primaryHeight(line: SiteMeasurementLine): number {
  return (
    line.height_centre_mm ??
    line.height_left_mm ??
    line.height_right_mm ??
    0
  );
}

export function lineHasSketchDimensions(line: SiteMeasurementLine): boolean {
  const product = (line.product_type ?? "").trim();
  if (!product) return false;
  return primaryWidth(line) > 0 && primaryHeight(line) > 0;
}

export function sketchSignature(line: SiteMeasurementLine): string {
  const product = (line.product_type ?? "").trim().toLowerCase();
  const width = Math.round(primaryWidth(line));
  const height = Math.round(primaryHeight(line));
  return `${product}|${width}|${height}`;
}

export function detectProductKind(productType: string): SketchProductKind {
  const value = productType.toLowerCase();
  if (value.includes("door")) return "door";
  if (value.includes("window") || value.includes("win")) return "window";
  return "other";
}

export function dedupeLinesForSketch(lines: SiteMeasurementLine[]): SketchSymbol[] {
  const map = new Map<string, SketchSymbol>();

  for (const line of lines) {
    if (!lineHasSketchDimensions(line)) continue;

    const key = sketchSignature(line);
    const quantity = Math.max(1, line.quantity ?? 1);
    const product = (line.product_type ?? "").trim();
    const existing = map.get(key);

    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    map.set(key, {
      key,
      product_type: product,
      width_mm: Math.round(primaryWidth(line)),
      height_mm: Math.round(primaryHeight(line)),
      quantity,
      kind: detectProductKind(product),
    });
  }

  return Array.from(map.values());
}

export function groupLinesByFloor(
  lines: SiteMeasurementLine[],
): FloorSketchPage[] {
  const floors = new Map<string, SiteMeasurementLine[]>();

  for (const line of lines) {
    if (!lineHasSketchDimensions(line)) continue;
    const floor = (line.unit_floor ?? "").trim() || "Unspecified floor";
    const bucket = floors.get(floor) ?? [];
    bucket.push(line);
    floors.set(floor, bucket);
  }

  if (floors.size === 0) {
    return [];
  }

  return Array.from(floors.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([floor, floorLines]) => ({
      floor,
      symbols: dedupeLinesForSketch(floorLines),
    }));
}

function drawSymbol(
  context: CanvasRenderingContext2D,
  symbol: SketchSymbol,
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
) {
  const maxDrawWidth = cellWidth - CELL_PADDING * 2;
  const maxDrawHeight = cellHeight - CELL_PADDING * 2 - 28;
  const scale = Math.min(
    maxDrawWidth / symbol.width_mm,
    maxDrawHeight / symbol.height_mm,
    1,
  );
  const drawWidth = Math.max(24, symbol.width_mm * scale);
  const drawHeight = Math.max(24, symbol.height_mm * scale);
  const drawX = x + (cellWidth - drawWidth) / 2;
  const drawY = y + (cellHeight - drawHeight - 20) / 2;

  context.strokeStyle = "#111827";
  context.lineWidth = 2;
  context.fillStyle = "#ffffff";
  context.fillRect(drawX, drawY, drawWidth, drawHeight);
  context.strokeRect(drawX, drawY, drawWidth, drawHeight);

  if (symbol.kind === "window") {
    context.beginPath();
    context.moveTo(drawX + drawWidth / 2, drawY);
    context.lineTo(drawX + drawWidth / 2, drawY + drawHeight);
    context.moveTo(drawX, drawY + drawHeight / 2);
    context.lineTo(drawX + drawWidth, drawY + drawHeight / 2);
    context.stroke();
  } else if (symbol.kind === "door") {
    context.beginPath();
    context.arc(
      drawX,
      drawY + drawHeight,
      drawWidth,
      -Math.PI / 2,
      0,
    );
    context.stroke();
  }

  if (symbol.quantity > 1) {
    context.fillStyle = "#1d4ed8";
    context.font = "bold 11px system-ui, sans-serif";
    context.textAlign = "right";
    context.fillText(`×${symbol.quantity}`, x + cellWidth - 6, y + 14);
  }

  context.fillStyle = "#374151";
  context.font = "10px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(
    symbol.product_type,
    x + cellWidth / 2,
    y + cellHeight - 18,
  );
  context.fillText(
    `${symbol.width_mm} × ${symbol.height_mm} mm`,
    x + cellWidth / 2,
    y + cellHeight - 6,
  );
}

export function renderFloorSketch(
  canvas: HTMLCanvasElement,
  page: FloorSketchPage,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = FLOOR_BODY_HEIGHT + FLOOR_HEADER_HEIGHT;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#111827";
  context.font = "bold 14px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText(page.floor, 16, 24);

  const rows = Math.max(1, Math.ceil(page.symbols.length / GRID_COLS));
  const cellWidth = CANVAS_WIDTH / GRID_COLS;
  const cellHeight = FLOOR_BODY_HEIGHT / rows;

  page.symbols.forEach((symbol, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const x = col * cellWidth;
    const y = FLOOR_HEADER_HEIGHT + row * cellHeight;
    drawSymbol(context, symbol, x, y, cellWidth, cellHeight);
  });
}

export function renderAllFloorsSketch(
  canvas: HTMLCanvasElement,
  pages: FloorSketchPage[],
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  if (pages.length === 0) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = 120;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#6b7280";
    context.font = "13px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(
      "Add product lines with dimensions to generate sketch",
      canvas.width / 2,
      60,
    );
    return;
  }

  const pageHeight = FLOOR_BODY_HEIGHT + FLOOR_HEADER_HEIGHT;
  canvas.width = CANVAS_WIDTH;
  canvas.height = pages.length * pageHeight + (pages.length - 1) * 8;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const scratch = document.createElement("canvas");
  pages.forEach((page, index) => {
    renderFloorSketch(scratch, page);
    const y = index * (pageHeight + 8);
    context.drawImage(scratch, 0, y);
  });
}

export async function sketchPagesToBlob(
  pages: FloorSketchPage[],
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  renderAllFloorsSketch(canvas, pages);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

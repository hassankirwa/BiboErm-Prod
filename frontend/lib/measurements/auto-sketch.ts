import type {
  MeasurementProductType,
  SiteMeasurementLine,
} from "@/lib/measurements/types";
import type { BalconyMeasurementDetails } from "@/lib/measurements/balcony-types";
import type { ShowerMeasurementDetails } from "@/lib/measurements/shower-types";
import {
  drawSpecializedOrthographicViews,
  specializedFooterLabel,
} from "@/lib/measurements/auto-sketch-specialized";

export type SketchProductKind = "door" | "window" | "balcony" | "bathroom";

export type SketchSymbol = {
  key: string;
  product_type: string;
  width_mm: number;
  height_mm: number;
  wall_height_mm: number | null;
  wall_thickness_mm: number | null;
  quantity: number;
  kind: SketchProductKind;
  balcony_details?: BalconyMeasurementDetails | null;
  shower_details?: ShowerMeasurementDetails | null;
};

export type FloorSketchPage = {
  floor: string;
  symbols: SketchSymbol[];
};

const GRID_COLS = 4;
const CELL_PADDING = 12;
const CANVAS_WIDTH = 960;
const FLOOR_HEADER_HEIGHT = 36;
const CLASSIC_ROW_HEIGHT = 220;
const SPECIALIZED_ROW_HEIGHT = 300;

function primaryWidth(line: SiteMeasurementLine): number {
  if (line.product_type === "Balcony") {
    return (
      line.balcony_details?.overall_width_mm ??
      line.width_centre_mm ??
      line.width_top_mm ??
      line.width_bottom_mm ??
      0
    );
  }

  if (line.product_type === "Bathroom") {
    return (
      line.shower_details?.overall_width_mm ??
      line.width_centre_mm ??
      line.width_top_mm ??
      line.width_bottom_mm ??
      0
    );
  }

  return (
    line.width_centre_mm ??
    line.width_top_mm ??
    line.width_bottom_mm ??
    0
  );
}

function primaryHeight(line: SiteMeasurementLine): number {
  if (line.product_type === "Balcony") {
    return (
      line.balcony_details?.overall_projection_mm ??
      line.balcony_details?.front_edge?.open_height_above_barricade_mm ??
      line.balcony_details?.balcony_height_mm ??
      line.height_centre_mm ??
      line.height_left_mm ??
      line.height_right_mm ??
      0
    );
  }

  if (line.product_type === "Bathroom") {
    return (
      line.shower_details?.overall_height_mm ??
      line.shower_details?.overall_depth_mm ??
      line.height_centre_mm ??
      line.height_left_mm ??
      line.height_right_mm ??
      0
    );
  }

  return (
    line.height_centre_mm ??
    line.height_left_mm ??
    line.height_right_mm ??
    0
  );
}

function primaryWallHeight(line: SiteMeasurementLine): number | null {
  if (line.product_type === "Balcony") {
    return (
      line.balcony_details?.ffl_to_slab_mm ??
      line.balcony_details?.balcony_height_mm ??
      line.wall_height_mm ??
      null
    );
  }

  if (line.product_type === "Bathroom") {
    return (
      line.shower_details?.ceiling_height_mm ??
      line.shower_details?.overall_height_mm ??
      line.wall_height_mm ??
      null
    );
  }

  return line.wall_height_mm ?? null;
}

function primaryWallThickness(line: SiteMeasurementLine): number | null {
  if (line.product_type === "Balcony") {
    return line.balcony_details?.wall_thickness_mm ?? line.wall_thickness_mm ?? null;
  }

  if (line.product_type === "Bathroom") {
    return line.shower_details?.kerb_thickness_mm ?? line.wall_thickness_mm ?? null;
  }

  return line.wall_thickness_mm ?? null;
}

function isSpecializedKind(kind: SketchProductKind): boolean {
  return kind === "balcony" || kind === "bathroom";
}

export function lineHasSketchDimensions(line: SiteMeasurementLine): boolean {
  const product = (line.product_type ?? "").trim();
  if (!product) return false;

  if (line.product_type === "Balcony") {
    const width = primaryWidth(line);
    const projection =
      line.balcony_details?.overall_projection_mm ??
      line.balcony_details?.balcony_height_mm ??
      line.balcony_details?.front_edge?.open_height_above_barricade_mm ??
      0;
    return width > 0 && (projection > 0 || primaryHeight(line) > 0);
  }

  if (line.product_type === "Bathroom") {
    const width = primaryWidth(line);
    const depthOrHeight =
      line.shower_details?.overall_depth_mm ??
      line.shower_details?.overall_height_mm ??
      primaryHeight(line);
    return width > 0 && depthOrHeight > 0;
  }

  return primaryWidth(line) > 0 && primaryHeight(line) > 0;
}

export function sketchSignature(line: SiteMeasurementLine): string {
  const product = (line.product_type ?? "").trim().toLowerCase();
  const width = Math.round(primaryWidth(line));
  const height = Math.round(primaryHeight(line));
  const wallHeight = Math.round(primaryWallHeight(line) ?? 0);
  const wallThickness = Math.round(primaryWallThickness(line) ?? 0);

  if (line.product_type === "Balcony") {
    const d = line.balcony_details;
    return [
      product,
      d?.balcony_type ?? "",
      width,
      Math.round(d?.overall_projection_mm ?? 0),
      d?.left_side?.condition ?? "",
      d?.right_side?.condition ?? "",
      Math.round(d?.front_edge?.barricade_height_mm ?? 0),
      Math.round(d?.front_edge?.open_height_above_barricade_mm ?? 0),
      Math.round(d?.front_edge?.facet_1_length_mm ?? 0),
      Math.round(d?.front_edge?.facet_2_length_mm ?? 0),
      Math.round(d?.front_edge?.facet_3_length_mm ?? 0),
      wallHeight,
      wallThickness,
    ].join("|");
  }

  if (line.product_type === "Bathroom") {
    const d = line.shower_details;
    return [
      product,
      d?.shower_type ?? "",
      width,
      Math.round(d?.overall_depth_mm ?? 0),
      height,
      Math.round(d?.kerb_height_mm ?? 0),
      Math.round(d?.kerb_width_mm ?? 0),
      wallHeight,
      wallThickness,
    ].join("|");
  }

  return `${product}|${width}|${height}|${wallHeight}|${wallThickness}`;
}

export function detectProductKind(
  productType: MeasurementProductType | string,
): SketchProductKind {
  const value = productType.toLowerCase();
  if (value.includes("balcony")) return "balcony";
  if (value.includes("bathroom")) return "bathroom";
  if (value.includes("door")) return "door";
  return "window";
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

    const wallHeight = primaryWallHeight(line);
    const wallThickness = primaryWallThickness(line);
    const kind = detectProductKind(product);

    map.set(key, {
      key,
      product_type: product,
      width_mm: Math.round(primaryWidth(line)),
      height_mm: Math.round(primaryHeight(line)),
      wall_height_mm: wallHeight != null ? Math.round(wallHeight) : null,
      wall_thickness_mm:
        wallThickness != null ? Math.round(wallThickness) : null,
      quantity,
      kind,
      balcony_details: kind === "balcony" ? (line.balcony_details ?? null) : null,
      shower_details: kind === "bathroom" ? (line.shower_details ?? null) : null,
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

function floorPageHeight(page: FloorSketchPage): number {
  const specialized = page.symbols.filter((s) => isSpecializedKind(s.kind));
  const classic = page.symbols.filter((s) => !isSpecializedKind(s.kind));
  const classicRows = classic.length === 0 ? 0 : Math.ceil(classic.length / GRID_COLS);
  return (
    FLOOR_HEADER_HEIGHT +
    specialized.length * SPECIALIZED_ROW_HEIGHT +
    classicRows * CLASSIC_ROW_HEIGHT +
    (specialized.length + classicRows > 0 ? 0 : CLASSIC_ROW_HEIGHT)
  );
}

function drawClassicSymbol(
  context: CanvasRenderingContext2D,
  symbol: SketchSymbol,
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
) {
  const maxDrawWidth = cellWidth - CELL_PADDING * 2;
  const maxDrawHeight = cellHeight - CELL_PADDING * 2 - 46;
  const scale = Math.min(
    maxDrawWidth / Math.max(symbol.width_mm, 1),
    maxDrawHeight / Math.max(symbol.height_mm, 1),
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
    context.arc(drawX, drawY + drawHeight, drawWidth, -Math.PI / 2, 0);
    context.stroke();
  }

  context.fillStyle = "#6b7280";
  context.font = "9px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(`W ${symbol.width_mm}`, drawX + drawWidth / 2, drawY - 3);
  context.save();
  context.translate(drawX - 4, drawY + drawHeight / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(`H ${symbol.height_mm}`, 0, 0);
  context.restore();

  if (symbol.quantity > 1) {
    context.fillStyle = "#1d4ed8";
    context.font = "bold 11px system-ui, sans-serif";
    context.textAlign = "right";
    context.fillText(`×${symbol.quantity}`, x + cellWidth - 6, y + 14);
  }

  const footerCenterX = x + cellWidth / 2;
  context.fillStyle = "#111827";
  context.font = "bold 11px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(symbol.product_type, footerCenterX, y + cellHeight - 34);
  context.fillStyle = "#374151";
  context.font = "10px system-ui, sans-serif";
  context.fillText(
    `Opening: ${symbol.width_mm} × ${symbol.height_mm} mm`,
    footerCenterX,
    y + cellHeight - 20,
  );
  const wallDimensions = [
    symbol.wall_height_mm ? `WH ${symbol.wall_height_mm}` : null,
    symbol.wall_thickness_mm ? `WTK ${symbol.wall_thickness_mm}` : null,
  ].filter(Boolean);
  if (wallDimensions.length > 0) {
    context.fillText(
      `${wallDimensions.join(" · ")} mm`,
      footerCenterX,
      y + cellHeight - 6,
    );
  }
}

function drawSpecializedSymbol(
  context: CanvasRenderingContext2D,
  symbol: SketchSymbol,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const footerH = 36;
  const bodyH = height - footerH - 8;
  drawSpecializedOrthographicViews(
    context,
    symbol,
    x + CELL_PADDING,
    y + 8,
    width - CELL_PADDING * 2,
    bodyH,
  );

  if (symbol.quantity > 1) {
    context.fillStyle = "#1d4ed8";
    context.font = "bold 11px system-ui, sans-serif";
    context.textAlign = "right";
    context.fillText(`×${symbol.quantity}`, x + width - 8, y + 16);
  }

  context.fillStyle = "#111827";
  context.font = "bold 11px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(
    specializedFooterLabel(symbol),
    x + width / 2,
    y + height - 14,
  );
}

export function renderFloorSketch(
  canvas: HTMLCanvasElement,
  page: FloorSketchPage,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  const pageHeight = floorPageHeight(page);
  canvas.width = CANVAS_WIDTH;
  canvas.height = pageHeight;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#111827";
  context.font = "bold 14px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText(page.floor, 16, 24);

  const specialized = page.symbols.filter((s) => isSpecializedKind(s.kind));
  const classic = page.symbols.filter((s) => !isSpecializedKind(s.kind));

  let cursorY = FLOOR_HEADER_HEIGHT;

  for (const symbol of specialized) {
    drawSpecializedSymbol(
      context,
      symbol,
      0,
      cursorY,
      CANVAS_WIDTH,
      SPECIALIZED_ROW_HEIGHT,
    );
    cursorY += SPECIALIZED_ROW_HEIGHT;
  }

  const cellWidth = CANVAS_WIDTH / GRID_COLS;
  classic.forEach((symbol, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const x = col * cellWidth;
    const y = cursorY + row * CLASSIC_ROW_HEIGHT;
    drawClassicSymbol(context, symbol, x, y, cellWidth, CLASSIC_ROW_HEIGHT);
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

  const heights = pages.map((page) => floorPageHeight(page));
  const totalHeight =
    heights.reduce((sum, h) => sum + h, 0) + (pages.length - 1) * 8;

  canvas.width = CANVAS_WIDTH;
  canvas.height = totalHeight;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const scratch = document.createElement("canvas");
  let y = 0;
  pages.forEach((page, index) => {
    renderFloorSketch(scratch, page);
    context.drawImage(scratch, 0, y);
    y += heights[index]! + 8;
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

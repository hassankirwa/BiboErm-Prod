import type { BalconyMeasurementDetails } from "@/lib/measurements/balcony-types";
import { balconyTypeLabel } from "@/lib/measurements/balcony-types";
import type { ShowerMeasurementDetails } from "@/lib/measurements/shower-types";
import { showerTypeLabel } from "@/lib/measurements/shower-types";

export type SpecializedSketchSymbol = {
  product_type: string;
  width_mm: number;
  height_mm: number;
  kind: "balcony" | "bathroom" | "door" | "window";
  balcony_details?: BalconyMeasurementDetails | null;
  shower_details?: ShowerMeasurementDetails | null;
};

export type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function splitOrthographicPanels(
  x: number,
  y: number,
  width: number,
  height: number,
  gap = 10,
): { top: PanelRect; side: PanelRect; front: PanelRect } {
  // TOP gets the largest share so plan matches type-card readability.
  const usable = width - gap * 2;
  const topW = Math.floor(usable * 0.48);
  const sideW = Math.floor(usable * 0.24);
  const frontW = usable - topW - sideW;
  return {
    top: { x, y, width: topW, height },
    side: { x: x + topW + gap, y, width: sideW, height },
    front: { x: x + topW + sideW + gap * 2, y, width: frontW, height },
  };
}

function mm(value?: number | null): number {
  return value != null && value > 0 ? value : 0;
}

function labelMm(value: number, suffix = "mm"): string {
  return `${Math.round(value)} ${suffix}`;
}

function drawPanelFrame(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  title: string,
): void {
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
  ctx.fillStyle = "#6b7280";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, panel.x + 6, panel.y + 14);
}

function drawDimH(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  text: string,
): void {
  ctx.strokeStyle = "#9ca3af";
  ctx.fillStyle = "#4b5563";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.moveTo(x1, y - 3);
  ctx.lineTo(x1, y + 3);
  ctx.moveTo(x2, y - 3);
  ctx.lineTo(x2, y + 3);
  ctx.stroke();
  ctx.font = "9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, (x1 + x2) / 2, y - 3);
}

function drawDimV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  text: string,
): void {
  ctx.strokeStyle = "#9ca3af";
  ctx.fillStyle = "#4b5563";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.moveTo(x - 3, y1);
  ctx.lineTo(x + 3, y1);
  ctx.moveTo(x - 3, y2);
  ctx.lineTo(x + 3, y2);
  ctx.stroke();
  ctx.save();
  ctx.translate(x - 5, (y1 + y2) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Building face + entrance door — door is never counted as a wall. */
function drawBuildingFaceWithDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#64748B";
  ctx.fillRect(x, y, width, height);
  const doorW = Math.max(18, Math.min(36, width * 0.2));
  const doorH = height - 6;
  const doorX = x + (width - doorW) / 2;
  const doorY = y + 3;
  ctx.fillStyle = "#FEF3C7";
  ctx.strokeStyle = "#B45309";
  ctx.lineWidth = 1.5;
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.strokeRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = "#92400E";
  ctx.font = "bold 8px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DOOR", x + width / 2, y + height / 2 + 3);
}

/** Full-height wall block outside the floor slab (matches type-card visuals). */
function drawFullWallBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rotateLabel: "left" | "right" | "none" = "none",
): void {
  ctx.fillStyle = "#334155";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  if (rotateLabel === "left") {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("WALL", 0, 3);
    ctx.restore();
  } else if (rotateLabel === "right") {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText("WALL", 0, 3);
    ctx.restore();
  } else {
    ctx.fillText("WALL", x + width / 2, y + height / 2 + 3);
  }
}

/** Open edge: low barricade + dashed OPEN zone (glass / railing area). */
function drawOpenEdgeStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: "front" | "side",
  showLabel = true,
): void {
  const barricade = Math.max(8, Math.min(14, orientation === "front" ? height * 0.18 : width * 0.35));
  ctx.fillStyle = "#94A3B8";
  if (orientation === "front") {
    ctx.fillRect(x, y + height - barricade, width, barricade);
    const openH = Math.max(16, height * 0.38);
    const openY = y + height - barricade - openH - 2;
    ctx.fillStyle = "rgba(147,197,253,0.55)";
    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(x + 4, openY, width - 8, openH);
    ctx.strokeRect(x + 4, openY, width - 8, openH);
    ctx.setLineDash([]);
    if (showLabel) {
      ctx.fillStyle = "#1E3A8A";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("OPEN ↑", x + width / 2, openY + openH / 2 + 3);
    }
  } else {
    ctx.fillRect(x, y + height - barricade, width, barricade);
    const openH = Math.max(16, height * 0.38);
    const openY = y + height - barricade - openH - 2;
    ctx.fillStyle = "rgba(147,197,253,0.55)";
    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(x + 1, openY, width - 2, openH);
    ctx.strokeRect(x + 1, openY, width - 2, openH);
    ctx.setLineDash([]);
  }
}

function wallThicknessPx(
  wallThicknessMm: number,
  scale: number,
  planSpan: number,
): number {
  if (wallThicknessMm > 0) {
    return Math.max(10, Math.min(22, wallThicknessMm * scale));
  }
  return Math.max(12, Math.min(18, planSpan * 0.1));
}

function balconyDims(details?: BalconyMeasurementDetails | null, symbol?: SpecializedSketchSymbol) {
  const width = mm(details?.overall_width_mm) || symbol?.width_mm || 1200;
  const projection =
    mm(details?.overall_projection_mm) ||
    Math.max(600, Math.round((symbol?.height_mm ?? 1000) * 0.6));
  const barricade =
    mm(details?.front_edge?.barricade_height_mm) ||
    mm(details?.left_side?.barricade_height_mm) ||
    mm(details?.right_side?.barricade_height_mm) ||
    900;
  const openHeight =
    mm(details?.front_edge?.open_height_above_barricade_mm) ||
    mm(details?.balcony_height_mm) ||
    mm(details?.left_side?.open_height_above_barricade_mm) ||
    1100;
  const totalHeight = barricade + openHeight;
  const left = details?.left_side?.condition ?? null;
  const right = details?.right_side?.condition ?? null;
  const type = details?.balcony_type ?? null;
  return {
    width,
    projection,
    barricade,
    openHeight,
    totalHeight,
    left,
    right,
    type,
    wallThickness: mm(details?.wall_thickness_mm) || 150,
  };
}

function seedSideConditions(type: string | null, left: string | null, right: string | null) {
  if (left || right) return { left, right };
  if (type === "between_two_walls") return { left: "full_wall", right: "full_wall" };
  if (type === "edge") return { left: "full_wall", right: "open" };
  if (type === "floating" || type === "irregular") return { left: "open", right: "open" };
  return { left: left, right: right };
}

export function drawBalconyOrthographicViews(
  ctx: CanvasRenderingContext2D,
  symbol: SpecializedSketchSymbol,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const panels = splitOrthographicPanels(x, y, width, height);
  const d = balconyDims(symbol.balcony_details, symbol);
  const sides = seedSideConditions(d.type, d.left, d.right);

  drawBalconyTop(ctx, panels.top, d, sides, symbol.balcony_details);
  drawBalconySide(ctx, panels.side, d, sides);
  drawBalconyFront(ctx, panels.front, d, sides);
}

function drawBalconyTop(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  d: ReturnType<typeof balconyDims>,
  sides: { left: string | null; right: string | null },
  details?: BalconyMeasurementDetails | null,
): void {
  drawPanelFrame(ctx, panel, "TOP");

  const padX = 28;
  const padY = 20;
  const buildingH = 22;
  const dimRoom = 28;
  const areaX = panel.x + padX;
  const areaY = panel.y + padY;
  const areaW = panel.width - padX * 2;
  const areaH = panel.height - padY - dimRoom;

  const leftWall = sides.left === "full_wall";
  const rightWall = sides.right === "full_wall";

  // Scale so floor + side wall blocks fit (walls sit outside the slab, like type cards).
  const provisionalScale = Math.min(
    areaW / (d.width + d.wallThickness * ((leftWall ? 1 : 0) + (rightWall ? 1 : 0))),
    (areaH - buildingH) / d.projection,
  );
  const wallT = wallThicknessPx(d.wallThickness, provisionalScale, d.width * provisionalScale);
  const floorScale = Math.min(
    (areaW - (leftWall ? wallT : 0) - (rightWall ? wallT : 0)) / d.width,
    (areaH - buildingH) / d.projection,
  );
  const planW = d.width * floorScale;
  const planD = d.projection * floorScale;
  const totalW = planW + (leftWall ? wallT : 0) + (rightWall ? wallT : 0);
  const originX = areaX + (areaW - totalW) / 2;
  const planY = areaY + buildingH;
  const planX = originX + (leftWall ? wallT : 0);

  // Building face spans walls + floor (door not a wall)
  drawBuildingFaceWithDoor(ctx, originX, areaY, totalW, buildingH);

  // Floor slab
  ctx.fillStyle = "#DBEAFE";
  ctx.strokeStyle = "#1D4ED8";
  ctx.lineWidth = 1.5;

  const type = d.type;
  if (type === "l_shaped") {
    const stem = planW * 0.58;
    const returnD = planD * 0.52;
    ctx.beginPath();
    ctx.moveTo(planX, planY);
    ctx.lineTo(planX + stem, planY);
    ctx.lineTo(planX + stem, planY + planD - returnD);
    ctx.lineTo(planX + planW, planY + planD - returnD);
    ctx.lineTo(planX + planW, planY + planD);
    ctx.lineTo(planX, planY + planD);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === "u_shaped") {
    const arm = planW * 0.26;
    const throat = planD * 0.42;
    ctx.beginPath();
    ctx.moveTo(planX, planY);
    ctx.lineTo(planX + planW, planY);
    ctx.lineTo(planX + planW, planY + throat);
    ctx.lineTo(planX + planW - arm, planY + throat);
    ctx.lineTo(planX + planW - arm, planY + planD);
    ctx.lineTo(planX + arm, planY + planD);
    ctx.lineTo(planX + arm, planY + throat);
    ctx.lineTo(planX, planY + throat);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === "irregular") {
    const f1 = mm(details?.front_edge?.facet_1_length_mm) || d.width / 3;
    const f2 = mm(details?.front_edge?.facet_2_length_mm) || d.width / 3;
    const f3 = mm(details?.front_edge?.facet_3_length_mm) || d.width / 3;
    const total = f1 + f2 + f3 || 1;
    const inset = planD * 0.32;
    ctx.beginPath();
    ctx.moveTo(planX, planY);
    ctx.lineTo(planX + planW, planY);
    ctx.lineTo(planX + planW, planY + inset);
    ctx.lineTo(planX + ((f1 + f2) / total) * planW, planY + planD);
    ctx.lineTo(planX + (f1 / total) * planW, planY + planD);
    ctx.lineTo(planX, planY + inset);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === "curved") {
    ctx.beginPath();
    ctx.moveTo(planX, planY);
    ctx.lineTo(planX + planW, planY);
    ctx.lineTo(planX + planW, planY + planD * 0.55);
    ctx.quadraticCurveTo(
      planX + planW / 2,
      planY + planD * 1.15,
      planX,
      planY + planD * 0.55,
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(planX, planY, planW, planD);
    ctx.strokeRect(planX, planY, planW, planD);
  }

  // Side walls outside slab (type-card style)
  if (leftWall) {
    drawFullWallBlock(ctx, originX, planY, wallT, planD, "left");
  } else {
    drawOpenEdgeStrip(ctx, planX, planY, Math.max(10, wallT * 0.7), planD, "side", false);
  }

  if (rightWall) {
    drawFullWallBlock(ctx, planX + planW, planY, wallT, planD, "right");
  } else {
    drawOpenEdgeStrip(
      ctx,
      planX + planW - Math.max(10, wallT * 0.7),
      planY,
      Math.max(10, wallT * 0.7),
      planD,
      "side",
      false,
    );
  }

  // Front open barricade + OPEN ↑
  if (type === "curved") {
    const barricade = Math.max(8, planD * 0.12);
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = barricade;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(planX, planY + planD * 0.55);
    ctx.quadraticCurveTo(
      planX + planW / 2,
      planY + planD * 1.12,
      planX + planW,
      planY + planD * 0.55,
    );
    ctx.stroke();
    ctx.fillStyle = "#1E3A8A";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OPEN ↑", planX + planW / 2, planY + planD * 0.72);
  } else if (type === "irregular") {
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = Math.max(8, planD * 0.12);
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(planX, planY + planD * 0.32);
    ctx.lineTo(planX + planW * 0.33, planY + planD);
    ctx.lineTo(planX + planW * 0.67, planY + planD);
    ctx.lineTo(planX + planW, planY + planD * 0.32);
    ctx.stroke();
    ctx.fillStyle = "#1E3A8A";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OPEN ↑", planX + planW / 2, planY + planD * 0.7);
  } else {
    const frontInsetL = leftWall ? 0 : 0;
    const frontInsetR = rightWall ? 0 : 0;
    drawOpenEdgeStrip(
      ctx,
      planX + frontInsetL,
      planY,
      planW - frontInsetL - frontInsetR,
      planD,
      "front",
      true,
    );
  }

  // Measurements
  drawDimH(ctx, planX, planX + planW, planY + planD + 14, `W ${labelMm(d.width)}`);
  drawDimV(ctx, originX - 12, planY, planY + planD, `D ${labelMm(d.projection)}`);
  if (leftWall || rightWall) {
    const wallBlockX = leftWall ? originX : planX + planW;
    drawDimH(
      ctx,
      wallBlockX,
      wallBlockX + wallT,
      planY - 4,
      `WTK ${labelMm(d.wallThickness)}`,
    );
  }
}

function drawBalconySide(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  d: ReturnType<typeof balconyDims>,
  sides: { left: string | null; right: string | null },
): void {
  drawPanelFrame(ctx, panel, "SIDE");
  const pad = 24;
  const areaX = panel.x + pad;
  const areaY = panel.y + pad;
  const areaW = panel.width - pad * 2;
  const areaH = panel.height - pad * 2 - 8;
  const scale = Math.min(areaW / d.projection, areaH / d.totalHeight);
  const depth = d.projection * scale;
  const totalH = d.totalHeight * scale;
  const barricadeH = d.barricade * scale;
  const openH = d.openHeight * scale;
  const ox = areaX + (areaW - depth) / 2;
  const oy = areaY + (areaH - totalH) / 2;

  // Building mass behind
  ctx.fillStyle = "#64748B";
  ctx.fillRect(ox - 10, oy, 10, totalH);

  const sideIsWall = sides.left === "full_wall" || sides.right === "full_wall";
  if (sideIsWall && sides.left === "full_wall" && sides.right !== "open") {
    // Full wall side elevation
    ctx.fillStyle = "#334155";
    ctx.fillRect(ox, oy, depth, totalH);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FULL WALL", ox + depth / 2, oy + totalH / 2);
  } else {
    // Slab line
    ctx.strokeStyle = "#1D4ED8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, depth, totalH);
    ctx.fillStyle = "#DBEAFE";
    ctx.fillRect(ox, oy + openH, depth, barricadeH);
    ctx.fillStyle = "rgba(147,197,253,0.45)";
    ctx.setLineDash([3, 2]);
    ctx.fillRect(ox, oy, depth, openH);
    ctx.strokeRect(ox, oy, depth, openH);
    ctx.setLineDash([]);
    ctx.fillStyle = "#1E3A8A";
    ctx.font = "8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OPEN", ox + depth / 2, oy + openH / 2 + 3);
    ctx.fillStyle = "#334155";
    ctx.fillText("BARRICADE", ox + depth / 2, oy + openH + barricadeH / 2 + 3);
  }

  drawDimH(ctx, ox, ox + depth, oy + totalH + 12, labelMm(d.projection));
  drawDimV(ctx, ox + depth + 10, oy, oy + openH, labelMm(d.openHeight));
  drawDimV(ctx, ox + depth + 22, oy + openH, oy + totalH, labelMm(d.barricade));
}

function drawBalconyFront(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  d: ReturnType<typeof balconyDims>,
  sides: { left: string | null; right: string | null },
): void {
  drawPanelFrame(ctx, panel, "FRONT");
  const pad = 24;
  const areaX = panel.x + pad;
  const areaY = panel.y + pad;
  const areaW = panel.width - pad * 2;
  const areaH = panel.height - pad * 2 - 8;
  const scale = Math.min(areaW / d.width, areaH / d.totalHeight);
  const w = d.width * scale;
  const totalH = d.totalHeight * scale;
  const barricadeH = d.barricade * scale;
  const openH = d.openHeight * scale;
  const ox = areaX + (areaW - w) / 2;
  const oy = areaY + (areaH - totalH) / 2;
  const wallT = Math.max(6, w * 0.06);

  ctx.strokeStyle = "#1D4ED8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ox, oy, w, totalH);

  if (sides.left === "full_wall") {
    ctx.fillStyle = "#334155";
    ctx.fillRect(ox, oy, wallT, totalH);
  }
  if (sides.right === "full_wall") {
    ctx.fillStyle = "#334155";
    ctx.fillRect(ox + w - wallT, oy, wallT, totalH);
  }

  const glassX = ox + (sides.left === "full_wall" ? wallT : 0);
  const glassW =
    w -
    (sides.left === "full_wall" ? wallT : 0) -
    (sides.right === "full_wall" ? wallT : 0);

  ctx.fillStyle = "rgba(147,197,253,0.5)";
  ctx.setLineDash([3, 2]);
  ctx.fillRect(glassX, oy, glassW, openH);
  ctx.strokeStyle = "#2563EB";
  ctx.strokeRect(glassX, oy, glassW, openH);
  ctx.setLineDash([]);

  ctx.fillStyle = "#94A3B8";
  ctx.fillRect(glassX, oy + openH, glassW, barricadeH);

  ctx.fillStyle = "#1E3A8A";
  ctx.font = "8px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("OPEN", glassX + glassW / 2, oy + openH / 2 + 3);

  drawDimH(ctx, ox, ox + w, oy + totalH + 12, labelMm(d.width));
  drawDimV(ctx, ox + w + 10, oy, oy + openH, labelMm(d.openHeight));
  drawDimV(ctx, ox + w + 22, oy + openH, oy + totalH, labelMm(d.barricade));
}

function showerDims(details?: ShowerMeasurementDetails | null, symbol?: SpecializedSketchSymbol) {
  const width = mm(details?.overall_width_mm) || symbol?.width_mm || 900;
  const depth = mm(details?.overall_depth_mm) || Math.max(700, Math.round(width * 0.9));
  const height = mm(details?.overall_height_mm) || symbol?.height_mm || 2000;
  const kerbH = mm(details?.kerb_height_mm) || 100;
  const kerbW = mm(details?.kerb_width_mm) || 80;
  const type = details?.shower_type ?? null;
  return {
    width,
    depth,
    height,
    kerbH,
    kerbW,
    type,
    wallThickness: 150,
  };
}

export function drawShowerOrthographicViews(
  ctx: CanvasRenderingContext2D,
  symbol: SpecializedSketchSymbol,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const panels = splitOrthographicPanels(x, y, width, height);
  const d = showerDims(symbol.shower_details, symbol);
  drawShowerTop(ctx, panels.top, d);
  drawShowerSide(ctx, panels.side, d);
  drawShowerFront(ctx, panels.front, d);
}

/**
 * Shower TOP uses the same visual language as balcony type cards:
 * tiled walls as thick WALL blocks, floor slab, OPEN ↑ for glass edges, kerb/barricade.
 */
function drawShowerTop(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  d: ReturnType<typeof showerDims>,
): void {
  drawPanelFrame(ctx, panel, "TOP");

  const padX = 28;
  const padY = 20;
  const buildingH = 22;
  const dimRoom = 28;
  const areaX = panel.x + padX;
  const areaY = panel.y + padY;
  const areaW = panel.width - padX * 2;
  const areaH = panel.height - padY - dimRoom;

  // Wall / open mapping by shower type (same idea as balcony conditions)
  let leftWall = true;
  let rightWall = true;
  let backWall = true;
  let frontOpen = true;
  let rightOpen = false;
  let leftOpen = false;

  if (d.type === "corner_l") {
    leftWall = true;
    rightWall = false;
    backWall = true;
    frontOpen = true;
    rightOpen = true;
  } else if (d.type === "u_shape") {
    leftWall = true;
    rightWall = true;
    backWall = true;
    frontOpen = true;
  } else if (d.type === "straight" || d.type === "bathtub_screen") {
    leftWall = true;
    rightWall = true;
    backWall = true;
    frontOpen = true;
  } else if (d.type === "walk_in") {
    leftWall = true;
    rightWall = false;
    backWall = true;
    frontOpen = true;
    rightOpen = true;
  } else if (d.type === "neo_angle") {
    leftWall = true;
    rightWall = false;
    backWall = true;
    frontOpen = true;
    rightOpen = true;
  } else {
    // custom — assume enclosed on three sides, open front
    leftWall = true;
    rightWall = true;
    backWall = true;
    frontOpen = true;
  }

  const provisionalScale = Math.min(
    areaW / (d.width + d.wallThickness * ((leftWall ? 1 : 0) + (rightWall ? 1 : 0))),
    (areaH - buildingH) / d.depth,
  );
  const wallT = wallThicknessPx(d.wallThickness, provisionalScale, d.width * provisionalScale);
  const floorScale = Math.min(
    (areaW - (leftWall ? wallT : 0) - (rightWall ? wallT : 0)) / d.width,
    (areaH - buildingH) / d.depth,
  );
  const planW = d.width * floorScale;
  const planD = d.depth * floorScale;
  const totalW = planW + (leftWall ? wallT : 0) + (rightWall ? wallT : 0);
  const originX = areaX + (areaW - totalW) / 2;
  const planY = areaY + buildingH;
  const planX = originX + (leftWall ? wallT : 0);

  // Back wall / building face (door into wet room if present — shown as entry face)
  if (backWall) {
    drawBuildingFaceWithDoor(ctx, originX, areaY, totalW, buildingH);
  } else {
    ctx.fillStyle = "#64748B";
    ctx.fillRect(originX, areaY, totalW, buildingH);
  }

  // Floor
  ctx.fillStyle = "#DBEAFE";
  ctx.strokeStyle = "#1D4ED8";
  ctx.lineWidth = 1.5;
  if (d.type === "neo_angle") {
    ctx.beginPath();
    ctx.moveTo(planX, planY);
    ctx.lineTo(planX + planW * 0.68, planY);
    ctx.lineTo(planX + planW, planY + planD * 0.32);
    ctx.lineTo(planX + planW, planY + planD);
    ctx.lineTo(planX, planY + planD);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(planX, planY, planW, planD);
    ctx.strokeRect(planX, planY, planW, planD);
  }

  if (leftWall) {
    drawFullWallBlock(ctx, originX, planY, wallT, planD, "left");
  } else if (leftOpen) {
    drawOpenEdgeStrip(ctx, planX, planY, Math.max(10, wallT * 0.7), planD, "side", false);
  }

  if (rightWall) {
    drawFullWallBlock(ctx, planX + planW, planY, wallT, planD, "right");
  } else if (rightOpen) {
    drawOpenEdgeStrip(
      ctx,
      planX + planW - Math.max(10, wallT * 0.7),
      planY,
      Math.max(10, wallT * 0.7),
      planD,
      "side",
      false,
    );
  }

  if (frontOpen) {
    drawOpenEdgeStrip(ctx, planX, planY, planW, planD, "front", true);
  }

  // Kerb / collar across threshold (inside front)
  const kerbPx = Math.max(5, Math.min(10, (d.kerbW || 80) * floorScale * 0.4));
  ctx.fillStyle = "#94A3B8";
  ctx.fillRect(planX + 6, planY + planD - 14 - kerbPx, planW - 12, kerbPx);

  drawDimH(ctx, planX, planX + planW, planY + planD + 14, `W ${labelMm(d.width)}`);
  drawDimV(ctx, originX - 12, planY, planY + planD, `D ${labelMm(d.depth)}`);
  if (leftWall || rightWall) {
    const wallBlockX = leftWall ? originX : planX + planW;
    drawDimH(
      ctx,
      wallBlockX,
      wallBlockX + wallT,
      planY - 4,
      `WTK ${labelMm(d.wallThickness)}`,
    );
  }
}

function drawShowerSide(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  d: ReturnType<typeof showerDims>,
): void {
  drawPanelFrame(ctx, panel, "SIDE");
  const pad = 24;
  const areaX = panel.x + pad;
  const areaY = panel.y + pad;
  const areaW = panel.width - pad * 2;
  const areaH = panel.height - pad * 2 - 8;
  const scale = Math.min(areaW / d.depth, areaH / d.height);
  const depth = d.depth * scale;
  const h = d.height * scale;
  const kerb = Math.min(h * 0.12, d.kerbH * scale || h * 0.08);
  const ox = areaX + (areaW - depth) / 2;
  const oy = areaY + (areaH - h) / 2;

  ctx.fillStyle = "#E0F2FE";
  ctx.strokeStyle = "#0284C7";
  ctx.lineWidth = 1.5;
  ctx.fillRect(ox, oy, depth, h - kerb);
  ctx.strokeRect(ox, oy, depth, h);
  ctx.fillStyle = "#94A3B8";
  ctx.fillRect(ox, oy + h - kerb, depth, kerb);
  ctx.strokeStyle = "#0F172A";
  ctx.beginPath();
  ctx.moveTo(ox + depth, oy);
  ctx.lineTo(ox + depth, oy + h - kerb);
  ctx.stroke();

  drawDimH(ctx, ox, ox + depth, oy + h + 12, labelMm(d.depth));
  drawDimV(ctx, ox + depth + 10, oy, oy + h, labelMm(d.height));
  if (d.kerbH > 0) {
    drawDimV(ctx, ox - 10, oy + h - kerb, oy + h, labelMm(d.kerbH));
  }
}

function drawShowerFront(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  d: ReturnType<typeof showerDims>,
): void {
  drawPanelFrame(ctx, panel, "FRONT");
  const pad = 24;
  const areaX = panel.x + pad;
  const areaY = panel.y + pad;
  const areaW = panel.width - pad * 2;
  const areaH = panel.height - pad * 2 - 8;
  const scale = Math.min(areaW / d.width, areaH / d.height);
  const w = d.width * scale;
  const h = d.height * scale;
  const kerb = Math.min(h * 0.12, d.kerbH * scale || h * 0.08);
  const ox = areaX + (areaW - w) / 2;
  const oy = areaY + (areaH - h) / 2;

  ctx.fillStyle = "rgba(224,242,254,0.8)";
  ctx.strokeStyle = "#0284C7";
  ctx.lineWidth = 1.5;
  ctx.fillRect(ox, oy, w, h - kerb);
  ctx.strokeRect(ox, oy, w, h);
  ctx.fillStyle = "#94A3B8";
  ctx.fillRect(ox, oy + h - kerb, w, kerb);

  // Glass panel suggestion
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.strokeRect(ox + 4, oy + 4, w - 8, h - kerb - 8);

  drawDimH(ctx, ox, ox + w, oy + h + 12, labelMm(d.width));
  drawDimV(ctx, ox + w + 10, oy, oy + h, labelMm(d.height));
}

export function specializedFooterLabel(symbol: SpecializedSketchSymbol): string {
  if (symbol.kind === "balcony") {
    const type = balconyTypeLabel(symbol.balcony_details?.balcony_type);
    const w = symbol.balcony_details?.overall_width_mm ?? symbol.width_mm;
    const d = symbol.balcony_details?.overall_projection_mm ?? null;
    return d
      ? `Balcony · ${type} · ${Math.round(w)} × ${Math.round(d)} mm`
      : `Balcony · ${type} · ${Math.round(w)} mm`;
  }

  if (symbol.kind === "bathroom") {
    const type = showerTypeLabel(symbol.shower_details?.shower_type);
    const w = symbol.shower_details?.overall_width_mm ?? symbol.width_mm;
    const d = symbol.shower_details?.overall_depth_mm;
    const h = symbol.shower_details?.overall_height_mm ?? symbol.height_mm;
    return d
      ? `Shower · ${type} · ${Math.round(w)} × ${Math.round(d)} × ${Math.round(h)} mm`
      : `Shower · ${type} · ${Math.round(w)} × ${Math.round(h)} mm`;
  }

  return `${symbol.product_type} · ${symbol.width_mm} × ${symbol.height_mm} mm`;
}

export function drawSpecializedOrthographicViews(
  ctx: CanvasRenderingContext2D,
  symbol: SpecializedSketchSymbol,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (symbol.kind === "balcony") {
    drawBalconyOrthographicViews(ctx, symbol, x, y, width, height);
    return;
  }
  if (symbol.kind === "bathroom") {
    drawShowerOrthographicViews(ctx, symbol, x, y, width, height);
  }
}

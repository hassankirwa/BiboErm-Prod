"use client";

import { forwardRef, Fragment } from "react";
import type { ApiQuotation, ApiQuotationLine } from "@/lib/api/crm/types";
import { formatKes } from "@/lib/api/projects/quotations";
import type { QuotationPreviewData } from "@/lib/api/projects/quotations";
import {
  lineKesTotal,
  lineKesUnitPrice,
  quotationHasUsdLines,
} from "@/lib/currency/quotation-pricing";
import type { QuotationExchangeRate } from "@/lib/currency/usd-to-kes";
import { BIBO_LOGO_PATH } from "@/lib/projects/quotation-pdf-download";
import {
  formatDeliveryDate,
  formatMm,
  getLineElevationDimensions,
  getLineElevationImageUrl,
  getLineFabrication,
  num,
} from "@/lib/quotation-fabrication";
import { MediaImage } from "@/components/media/media-image";
import { cn } from "@/lib/utils";

type QuotationPreviewDocumentProps = {
  quotation: ApiQuotation;
  bankDetails?: QuotationPreviewData["bank_details"];
  className?: string;
  printMode?: boolean;
  deliveryDate?: string | null;
  deliveryDateIso?: string | null;
  showFabricationDetails?: boolean;
  exchangeRate?: QuotationExchangeRate | null;
};

function LinePicture({ line }: { line: ApiQuotationLine }) {
  const imageUrl = getLineElevationImageUrl(line);
  const fabrication = getLineFabrication(line);
  const diagramFallback = <WindowDiagram line={line} />;

  if (imageUrl) {
    const image = imageUrl.startsWith("data:") ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={`Elevation ${line.code ?? "drawing"}`}
        className="mx-auto max-h-20 max-w-[88px] object-contain"
      />
    ) : (
      <MediaImage
        src={imageUrl}
        alt={`Elevation ${line.code ?? "drawing"}`}
        className="mx-auto max-h-20 max-w-[88px] object-contain"
        fallback={diagramFallback}
      />
    );

    return (
      <div className="flex flex-col items-center gap-0.5">
        {image}
        {fabrication?.colour ? (
          <span className="max-w-[88px] truncate text-[9px] text-muted-foreground">{fabrication.colour}</span>
        ) : null}
      </div>
    );
  }

  return diagramFallback;
}

function WindowDiagram({ line }: { line: ApiQuotationLine }) {
  const fabrication = getLineFabrication(line);
  const { width_mm: w, height_mm: h } = getLineElevationDimensions(line);
  const openings = fabrication?.sash_openings ?? [];
  const aspect = w > 0 && h > 0 ? w / h : 1.4;
  const boxW = 88;
  const boxH = Math.max(48, Math.round(boxW / aspect));
  const panelCount = Math.max(openings.length, 2);
  const panelWidth = boxW / panelCount;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg
        width={boxW}
        height={boxH + 14}
        viewBox={`0 0 ${boxW} ${boxH + 14}`}
        className="mx-auto text-foreground"
        aria-label={`Elevation ${formatMm(w)} × ${formatMm(h)} mm`}
      >
        <rect
          x="1"
          y="1"
          width={boxW - 2}
          height={boxH - 2}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        {Array.from({ length: panelCount - 1 }, (_, index) => {
          const x = panelWidth * (index + 1);
          return (
            <line
              key={index}
              x1={x}
              y1="1"
              x2={x}
              y2={boxH - 1}
              stroke="currentColor"
              strokeWidth="0.8"
            />
          );
        })}
        <text x={boxW / 2} y={boxH + 10} textAnchor="middle" fontSize="7" fill="currentColor">
          {w > 0 ? formatMm(w) : "—"}
        </text>
        <text
          x="2"
          y={boxH / 2}
          fontSize="7"
          fill="currentColor"
          transform={`rotate(-90 2 ${boxH / 2})`}
        >
          {h > 0 ? formatMm(h) : "—"}
        </text>
      </svg>
      {fabrication?.colour ? (
        <span className="max-w-[88px] truncate text-[9px] text-muted-foreground">{fabrication.colour}</span>
      ) : null}
    </div>
  );
}

function FabricationBomSection({ line }: { line: ApiQuotationLine }) {
  const fabrication = getLineFabrication(line);
  if (!fabrication) return null;

  const sections = [
    {
      title: "Glass",
      rows: (fabrication.glass ?? []).map((item) =>
        [
          item.name,
          item.specification,
          item.width_mm && item.height_mm ? `${formatMm(item.width_mm)} × ${formatMm(item.height_mm)}` : null,
          item.qty != null ? `×${item.qty}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    },
    {
      title: "Frame profiles",
      rows: (fabrication.frame_profiles ?? []).map(
        (item) =>
          `${item.name ?? "—"} (${item.code_no ?? "—"}) · ${formatMm(item.length_mm)} mm · ×${item.qty ?? 1}`,
      ),
    },
    {
      title: "Sash profiles",
      rows: (fabrication.sash_profiles ?? []).map(
        (item) =>
          `${item.name ?? "—"} (${item.code_no ?? "—"}) · ${formatMm(item.length_mm)} mm · ×${item.qty ?? 1}`,
      ),
    },
    {
      title: "Hardware",
      rows: (fabrication.hardware ?? []).map(
        (item) =>
          `${item.name ?? "—"} · ${item.specification ?? ""}${item.qty != null ? ` · ×${item.qty}` : ""}`.trim(),
      ),
    },
    {
      title: "Sash openings",
      rows: (fabrication.sash_openings ?? []).map(
        (item) =>
          `${item.type ?? item.opening ?? "Panel"} · ${formatMm(item.width_mm)} × ${formatMm(item.height_mm)} mm · ×${item.qty ?? 1}`,
      ),
    },
  ].filter((section) => section.rows.length > 0);

  if (sections.length === 0) return null;

  return (
    <tr className="bg-neutral-50/80">
      <td colSpan={12} className="border border-black px-3 py-2">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                {section.title}
              </div>
              <ul className="space-y-0.5 text-[10px] leading-snug">
                {section.rows.map((row, index) => (
                  <li key={`${section.title}-${index}`}>{row}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export const QuotationPreviewDocument = forwardRef<HTMLDivElement, QuotationPreviewDocumentProps>(
  function QuotationPreviewDocument(
    {
      quotation,
      bankDetails,
      className,
      printMode = false,
      deliveryDate,
      deliveryDateIso,
      showFabricationDetails = false,
      exchangeRate = null,
    },
    ref,
  ) {
  const lines = quotation.lines ?? [];
  const rate = exchangeRate?.rate ?? null;
  const totalQty = lines.reduce((sum, line) => sum + num(line.quantity), 0);
  const totalSqm = lines.reduce((sum, line) => sum + num(line.total_sqm), 0);
  const subtotal = lines.reduce((sum, line) => sum + lineKesTotal(line, rate), 0);
  const discount = num(quotation.discount_amount);
  const taxRate = num(quotation.tax_rate) || 16;
  const taxable = Math.max(subtotal - discount, 0);
  const tax = taxable * (taxRate / 100);
  const grandTotal = subtotal - discount + tax;
  const showRateNote = exchangeRate != null && quotationHasUsdLines(lines);

  const formattedDelivery = formatDeliveryDate(deliveryDate, deliveryDateIso);

  const terms =
    quotation.terms_conditions ??
    `1. Throughout the quotation: All measurements in mm.
2. Any changes to above scope may alter price.
3. The above items remain a property of Bibo Windows & Doors until fully paid for.
4. Quote is firm for 7 days as per the scope above.
5. Terms of Payment: 100% On Placement of Order.
6. The above quotation does not allow for scaffolding or transportation outside of Nairobi.`;

  const bank = bankDetails ?? {
    account_name: "BIBO BUILDING MATERIALS LIMITED",
    account_number_kes: "0300154801",
    account_number_usd: "0300154802",
    bank_name: "GULF AFRICAN BANK",
    branch: "UPPER HILL",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto w-full bg-white text-black shadow-sm",
        printMode ? "print:shadow-none" : "rounded-lg border",
        className,
      )}
    >
      <div className="border-b border-black px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BIBO_LOGO_PATH}
              alt="BIBO Windows & Doors"
              className="h-14 w-auto object-contain"
              crossOrigin="anonymous"
            />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold uppercase tracking-wide md:text-xl">
              Aluminium Windows and Doors Quotation
            </h1>
          </div>
        </div>
        <div className="mt-4 grid gap-2 border border-black text-sm md:grid-cols-2">
          <div className="flex border-b border-black md:border-b-0 md:border-r">
            <div className="w-36 border-r border-black bg-neutral-100 px-3 py-2 font-semibold">Project No.</div>
            <div className="flex-1 px-3 py-2">{quotation.project_number ?? quotation.quotation_number ?? "—"}</div>
          </div>
          <div className="flex border-b border-black md:border-b-0 md:border-r">
            <div className="w-36 border-r border-black bg-neutral-100 px-3 py-2 font-semibold">Project Name</div>
            <div className="flex-1 px-3 py-2 uppercase">{quotation.project_name ?? quotation.account?.name ?? "—"}</div>
          </div>
          {formattedDelivery ? (
            <div className="flex md:col-span-2">
              <div className="w-36 border-r border-black bg-neutral-100 px-3 py-2 font-semibold">Delivery Date</div>
              <div className="flex-1 px-3 py-2">{formattedDelivery}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-4">
        <table className="w-full min-w-[960px] border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-neutral-100 text-[11px] uppercase">
              {[
                "No.",
                "Seris",
                "Code",
                "Glass Type",
                "Picture",
                "Width (mm)",
                "Height (mm)",
                "Sqm/Pcs",
                "Qty (Pcs)",
                "Total Sqm",
                "Price (Kes/Pcs)",
                "Total Price",
              ].map((heading) => (
                <th key={heading} className="border border-black px-2 py-2 text-left font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const elevation = getLineElevationDimensions(line);
              return (
                <Fragment key={line.id ?? index}>
                  <tr>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-2">{line.series ?? "—"}</td>
                    <td className="border border-black px-2 py-2 font-medium">{line.code ?? "—"}</td>
                    <td className="border border-black px-2 py-2">{line.glass_type ?? line.description}</td>
                    <td className="border border-black px-2 py-3">
                      <LinePicture line={line} />
                    </td>
                    <td className="border border-black px-2 py-2 text-right">
                      {elevation.width_mm > 0 ? formatMm(elevation.width_mm) : "—"}
                    </td>
                    <td className="border border-black px-2 py-2 text-right">
                      {elevation.height_mm > 0 ? formatMm(elevation.height_mm) : "—"}
                    </td>
                    <td className="border border-black px-2 py-2 text-right">{num(line.sqm_per_pcs).toFixed(4)}</td>
                    <td className="border border-black px-2 py-2 text-right">{num(line.quantity).toFixed(0)}</td>
                    <td className="border border-black px-2 py-2 text-right">{num(line.total_sqm).toFixed(4)}</td>
                    <td className="border border-black px-2 py-2 text-right">
                      {formatKes(lineKesUnitPrice(line, rate))}
                    </td>
                    <td className="border border-black px-2 py-2 text-right font-medium">
                      {formatKes(lineKesTotal(line, rate))}
                    </td>
                  </tr>
                  {showFabricationDetails ? <FabricationBomSection line={line} /> : null}
                </Fragment>
              );
            })}
            <tr className="font-semibold">
              <td className="border border-black px-2 py-2" colSpan={8}>
                合计 Total
              </td>
              <td className="border border-black px-2 py-2 text-right">{totalQty.toFixed(0)}</td>
              <td className="border border-black px-2 py-2 text-right">{totalSqm.toFixed(4)}</td>
              <td className="border border-black px-2 py-2" />
              <td className="border border-black px-2 py-2 text-right">{formatKes(subtotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end px-6 pb-4">
        <div className="w-full max-w-xs border border-black text-sm">
          {showRateNote ? (
            <div className="border-b border-black px-3 py-1.5 text-[10px] text-neutral-600">
              {exchangeRate.label}
            </div>
          ) : null}
          <div className="flex border-b border-black">
            <div className="w-28 border-r border-black bg-neutral-100 px-3 py-2 font-semibold">Subtotal</div>
            <div className="flex-1 px-3 py-2 text-right">{formatKes(subtotal)}</div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-28 border-r border-black bg-neutral-100 px-3 py-2 font-semibold">Tax/VAT</div>
            <div className="flex-1 px-3 py-2 text-right">{formatKes(tax)}</div>
          </div>
          <div className="flex font-bold">
            <div className="w-28 border-r border-black bg-neutral-100 px-3 py-2">Grand Total</div>
            <div className="flex-1 px-3 py-2 text-right">{formatKes(grandTotal)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-black px-6 py-5 text-xs md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-bold uppercase">Terms & Conditions</h2>
          <div className="whitespace-pre-line leading-relaxed">{terms}</div>
          <p className="mt-3 font-semibold text-red-600">Thank you for choosing our business</p>
        </div>
        <div>
          <h2 className="mb-2 font-bold uppercase">Bank Details</h2>
          <dl className="space-y-1">
            <div><dt className="inline font-semibold">Account Name: </dt><dd className="inline">{bank.account_name}</dd></div>
            <div><dt className="inline font-semibold">Account Number (KES): </dt><dd className="inline">{bank.account_number_kes}</dd></div>
            <div><dt className="inline font-semibold">Account Number (USD): </dt><dd className="inline">{bank.account_number_usd}</dd></div>
            <div><dt className="inline font-semibold">Bank Name: </dt><dd className="inline">{bank.bank_name}</dd></div>
            <div><dt className="inline font-semibold">Branch: </dt><dd className="inline">{bank.branch}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
});

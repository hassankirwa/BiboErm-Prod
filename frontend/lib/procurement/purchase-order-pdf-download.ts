import type { PurchaseOrder } from "@/lib/api/procurement";
import {
  BIBO_LOGO_PATH,
  buildPurchaseOrderPdfHtml,
  purchaseOrderPdfFilename,
} from "@/lib/procurement/purchase-order-pdf-html";

async function waitForImages(root: ParentNode): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
}

function resolveLogoUrl(): string {
  if (typeof window === "undefined") {
    return BIBO_LOGO_PATH;
  }
  return new URL(BIBO_LOGO_PATH, window.location.origin).href;
}

/** Generates a PDF file from PO data and triggers a browser download. */
export async function downloadPurchaseOrderPdfFile(
  order: PurchaseOrder,
  filename?: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const logoUrl = resolveLogoUrl();
  const html = buildPurchaseOrderPdfHtml(order, { logoUrl });

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!frameDoc) {
    document.body.removeChild(iframe);
    throw new Error("Could not prepare the purchase order PDF.");
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  await waitForImages(frameDoc.body);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  await pdf.html(frameDoc.body, {
    margin: [10, 10, 10, 10],
    autoPaging: "text",
    html2canvas: { scale: 0.28, useCORS: true, logging: false },
    width: 190,
    windowWidth: 794,
  });

  pdf.save(filename ?? purchaseOrderPdfFilename(order));
  document.body.removeChild(iframe);
}

/** Opens a print-ready PO document; user saves via Print → Save as PDF. */
export async function printPurchaseOrderDocument(order: PurchaseOrder, filename?: string): Promise<void> {
  await downloadPurchaseOrderPdfFile(order, filename);
}

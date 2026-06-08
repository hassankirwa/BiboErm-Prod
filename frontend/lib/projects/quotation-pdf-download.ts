import type { ApiQuotation } from "@/lib/api/crm/types";
import { prepareHtml2CanvasClone } from "@/lib/html2canvas-safe-clone";

export const BIBO_LOGO_PATH = "/bibo-logo.png";

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

export function quotationPdfFilename(
  quotation: Pick<ApiQuotation, "project_number" | "quotation_number" | "id">,
): string {
  const base =
    quotation.project_number ||
    quotation.quotation_number ||
    (quotation.id ? `quotation-${quotation.id}` : "quotation-draft");
  const slug = base
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${slug || "quotation"}.pdf`;
}

/** Generates a PDF from a rendered quotation preview element and triggers download. */
export async function downloadQuotationPdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const cloneMarker = "data-quotation-pdf-root";

  await waitForImages(element);

  element.setAttribute(cloneMarker, "");

  try {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const captureWidth = Math.max(element.scrollWidth, element.offsetWidth, 1100);

    await pdf.html(element, {
      margin: [8, 8, 8, 8],
      autoPaging: "text",
      html2canvas: {
        scale: 0.4,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: captureWidth,
        onclone: (clonedDocument: Document) => {
          const clonedElement = clonedDocument.querySelector(`[${cloneMarker}]`);
          if (!(clonedElement instanceof HTMLElement)) {
            throw new Error("Could not prepare quotation preview for PDF export.");
          }
          prepareHtml2CanvasClone(element, clonedElement);
          clonedElement.removeAttribute(cloneMarker);
        },
      },
      width: 277,
      windowWidth: captureWidth,
    });

    pdf.save(filename);
  } finally {
    element.removeAttribute(cloneMarker);
  }
}

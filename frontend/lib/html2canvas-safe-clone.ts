const MODERN_COLOR_PATTERN =
  /\b(?:oklab|oklch|lab|lch|color-mix)\([^()]*(?:\([^()]*\)[^()]*)*\)/gi;

const resolvedColorCache = new Map<string, string>();

/** Resolves a modern color function to rgb()/hex via the browser (html2canvas-safe). */
function resolveModernColor(color: string): string {
  const cached = resolvedColorCache.get(color);
  if (cached) return cached;

  const probe = document.createElement("span");
  probe.style.setProperty("color", color);
  probe.style.setProperty("position", "absolute");
  probe.style.setProperty("visibility", "hidden");
  document.documentElement.appendChild(probe);
  const resolved = getComputedStyle(probe).color || "rgb(128, 128, 128)";
  document.documentElement.removeChild(probe);

  resolvedColorCache.set(color, resolved);
  return resolved;
}

export function sanitizeCssText(css: string): string {
  return css.replace(MODERN_COLOR_PATTERN, (match) => resolveModernColor(match));
}

function serializeRule(rule: CSSRule): string {
  if (rule instanceof CSSStyleRule) {
    return sanitizeCssText(rule.cssText);
  }

  if ("cssRules" in rule && rule.cssRules.length > 0) {
    const openBrace = rule.cssText.indexOf("{");
    const header = openBrace >= 0 ? rule.cssText.slice(0, openBrace + 1) : "";
    const inner = serializeRules(rule.cssRules);
    return inner ? `${header}${inner}}` : "";
  }

  return sanitizeCssText(rule.cssText);
}

function serializeRules(rules: CSSRuleList): string {
  return Array.from(rules)
    .map(serializeRule)
    .filter(Boolean)
    .join("\n");
}

function collectSanitizedStylesheets(): string {
  let css = "";

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += `${serializeRules(sheet.cssRules)}\n`;
    } catch {
      // Ignore cross-origin stylesheets that cannot be read.
    }
  }

  return css.trim();
}

/**
 * Replaces cloned-document stylesheets with sanitized copies so html2canvas
 * never parses lab()/oklch() while layout rules (flex, grid, tables) stay intact.
 */
export function prepareHtml2CanvasClone(_sourceRoot: HTMLElement, cloneRoot: HTMLElement): void {
  const doc = cloneRoot.ownerDocument;
  doc.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => node.remove());

  const sanitizedCss = collectSanitizedStylesheets();
  if (!sanitizedCss) return;

  const style = doc.createElement("style");
  style.textContent = sanitizedCss;
  doc.head.appendChild(style);
}

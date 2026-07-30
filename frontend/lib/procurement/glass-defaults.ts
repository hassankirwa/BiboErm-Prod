/** Default glass type / tint options for procurement glass orders. */

export const GLASS_ORDER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "Single Strength Glass", label: "Single Strength Glass" },
  { value: "Double Strength Glass", label: "Double Strength Glass" },
  { value: "Thicker Glass Options", label: "Thicker Glass Options" },
  { value: "Laminated Glass", label: "Laminated Glass" },
  { value: "Tempered Glass", label: "Tempered Glass" },
  { value: "Low-E Glass", label: "Low-E Glass" },
  { value: "other", label: "Other" },
];

export const GLASS_ORDER_TINT_OPTIONS: { value: string; label: string }[] = [
  { value: "Clear", label: "Clear" },
  { value: "Bronze", label: "Bronze" },
  { value: "Grey", label: "Grey" },
  { value: "Green", label: "Green" },
  { value: "Blue", label: "Blue" },
  { value: "Reflective", label: "Reflective" },
  { value: "Frosted", label: "Frosted" },
  { value: "Obscure", label: "Obscure" },
  { value: "other", label: "Other" },
];

export const GLASS_ORDER_CUSTOM_VALUE = "other" as const;

function isKnownOption(
  options: { value: string; label: string }[],
  value?: string | null,
): boolean {
  if (!value?.trim()) return false;
  return options.some(
    (option) => option.value === value && option.value !== GLASS_ORDER_CUSTOM_VALUE,
  );
}

export function resolveGlassOrderSelectValue(
  options: { value: string; label: string }[],
  value?: string | null,
): string {
  if (!value?.trim()) return "";
  if (isKnownOption(options, value)) return value;
  return GLASS_ORDER_CUSTOM_VALUE;
}

export function isKnownGlassOrderOption(
  options: { value: string; label: string }[],
  value?: string | null,
): boolean {
  return isKnownOption(options, value);
}

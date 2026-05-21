export function BiboLogoMark({
  size = 38,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      aria-hidden
      className={className}
    >
      <rect x="3" y="6" width="22" height="48" rx="1.5" fill="#E63946" />
      <rect x="6" y="9" width="16" height="42" rx="0.5" fill="#FFFFFF" />
      <path d="M22 9 L42 14 L42 51 L22 51 Z" fill="#E63946" />
      <path d="M24 12 L40 16 L40 49 L24 49 Z" fill="#BFE3F4" />
      <line x1="32" y1="14" x2="32" y2="50" stroke="#FFFFFF" strokeWidth="1.2" />
      <line x1="24" y1="32" x2="40" y2="32" stroke="#FFFFFF" strokeWidth="1.2" />
      <circle cx="25" cy="32" r="1.5" fill="#1F2937" />
    </svg>
  );
}

export function BiboLogoLockup({
  scale = 1,
  dark = false,
  className,
}: {
  scale?: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 10 * scale }}
    >
      <BiboLogoMark size={36 * scale} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 24 * scale,
            letterSpacing: "-0.01em",
            color: dark ? "#ffffff" : "var(--foreground)",
          }}
        >
          BIBO
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 8 * scale,
            letterSpacing: "0.18em",
            color: dark ? "rgba(255,255,255,0.85)" : "#1F2937",
            marginTop: 3 * scale,
          }}
        >
          WINDOWS & DOORS
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { BiboLogoLockup } from "./bibo-logo-mark";

export function AuthCardLayout({
  children,
  wide = false,
  extraWide = false,
  centered = true,
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** ~20% wider than `wide` — onboarding forms */
  extraWide?: boolean;
  centered?: boolean;
}) {
  const widthClass = extraWide
    ? "max-w-[624px]"
    : wide
      ? "max-w-[520px]"
      : "max-w-[420px]";

  return (
    <div className="auth-page-bg relative flex min-h-screen min-h-[100dvh] items-center justify-center px-4 py-10">
      <Image
        src="/background.jpeg"
        alt=""
        fill
        className="object-cover object-center opacity-40"
        priority
        sizes="100vw"
      />
      <div className="auth-page-overlay absolute inset-0" aria-hidden />

      <div className={`auth-card relative z-10 w-full ${widthClass}`}>
        {centered && (
          <div className="mb-6 flex justify-center">
            <Link href="/">
              <BiboLogoLockup scale={0.95} />
            </Link>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

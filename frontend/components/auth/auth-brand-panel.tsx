import Image from "next/image";
import { BiboLogoMark } from "./bibo-logo-mark";

const stats = [
  { value: "11", label: "Departments" },
  { value: "20", label: "Modules" },
  { value: "1×", label: "Login" },
];

export function AuthBrandPanel() {
  return (
    <aside
      className="login-brand-panel relative flex shrink-0 flex-col overflow-hidden bg-primary px-6 pb-8 pt-6 text-primary-foreground sm:px-8 sm:pb-10 sm:pt-8 lg:min-h-screen lg:w-1/2 lg:px-12 lg:py-10 xl:px-16"
      aria-label="BIBO Windows & Doors"
    >
      <div className="relative z-10 flex min-h-full flex-col">
        <div className="flex items-center gap-2.5 lg:hidden">
          <BiboLogoMark size={32} />
          <span className="text-lg font-extrabold tracking-tight">BIBO</span>
        </div>
        <Image
          src="/image.png"
          alt="BIBO Windows & Doors"
          width={200}
          height={56}
          className="hidden h-auto w-[140px] max-w-full brightness-0 invert sm:w-[160px] lg:block lg:w-[180px]"
          priority
        />

        <div className="mt-6 flex flex-col sm:mt-8 lg:mt-0 lg:flex-1 lg:justify-center lg:max-w-lg lg:py-12">
          <h1 className="max-w-[16rem] text-xl font-bold leading-snug tracking-tight sm:max-w-none sm:text-2xl lg:text-[2.375rem] lg:leading-[1.15] xl:text-[2.75rem]">
            Run every job from one workspace.
          </h1>
          <p className="login-brand-subcopy mt-4 max-w-md text-sm leading-relaxed text-white/90 sm:text-base lg:mt-5">
            CRM, estimates, production, dispatch and installs — all the way
            through to client handover.
          </p>
        </div>

        <div className="login-brand-stats mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-8 sm:gap-6 lg:mt-auto lg:max-w-md lg:gap-8">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold leading-none sm:text-3xl lg:text-4xl">
                {value}
              </p>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-white/85 sm:text-xs">
                {label}
              </p>
            </div>
          ))}
        </div>

        <p className="login-brand-copyright relative z-10 mt-8 text-xs text-white/70 lg:mt-10">
          © 2026 Bibo Windows & Doors
        </p>
      </div>

      <svg
        className="pointer-events-none absolute -bottom-10 -right-10 opacity-[0.18]"
        width="380"
        height="380"
        viewBox="0 0 200 200"
        aria-hidden
      >
        <g stroke="white" strokeWidth="0.8" fill="none">
          <rect x="30" y="30" width="140" height="140" rx="2" />
          <line x1="100" y1="30" x2="100" y2="170" />
          <line x1="30" y1="100" x2="170" y2="100" />
          <rect x="40" y="40" width="50" height="50" />
          <rect x="110" y="40" width="50" height="50" />
          <rect x="40" y="110" width="50" height="50" />
          <rect x="110" y="110" width="50" height="50" />
        </g>
      </svg>
    </aside>
  );
}

import Image from "next/image";

export function AuthFormPanel({ children }: { children: React.ReactNode }) {
  return (
    <main className="login-form-panel relative flex flex-1 flex-col lg:min-h-screen lg:w-1/2">
      <Image
        src="/background.jpeg"
        alt=""
        fill
        className="object-cover object-center"
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <div className="login-form-overlay absolute inset-0" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16 xl:px-20">
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </div>
    </main>
  );
}

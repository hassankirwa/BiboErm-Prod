import Image from "next/image";

export function CrmPageBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 min-h-full w-full min-w-0">
      <Image
        src="/background.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center md:object-[72%_center]"
      />
      <div className="absolute inset-0 bg-[#f5f5f5]/80 md:bg-gradient-to-r md:from-[#f5f5f5]/55 md:via-[#f5f5f5]/20 md:to-transparent" />
    </div>
  );
}

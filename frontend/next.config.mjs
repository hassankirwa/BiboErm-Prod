import path from "path";
import { fileURLToPath } from "url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: frontendRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/design",
        destination: "/projects/design",
        permanent: false,
      },
      {
        source: "/quotation",
        destination: "/quotation/proforma",
        permanent: false,
      },
      {
        source: "/projects/quotations",
        destination: "/quotation/proforma",
        permanent: false,
      },
      {
        source: "/projects/quotations/:path*",
        destination: "/quotation/proforma/:path*",
        permanent: false,
      },
      {
        source: "/field",
        destination: "/site-ops/my-visits",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

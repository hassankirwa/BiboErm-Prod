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
        source: "/crm/site-visits/my-visits",
        destination: "/site-ops/my-visits",
        permanent: false,
      },
      {
        source: "/crm/site-visits/my-visits/:path*",
        destination: "/site-ops/my-visits/:path*",
        permanent: false,
      },
      {
        source: "/crm/site-visits/today",
        destination: "/site-ops/today",
        permanent: false,
      },
      {
        source: "/crm/site-visits/today/:path*",
        destination: "/site-ops/today/:path*",
        permanent: false,
      },
      {
        source: "/crm/site-visits",
        destination: "/site-ops/visits",
        permanent: false,
      },
      {
        source: "/crm/site-visits/:path*",
        destination: "/site-ops/visits/:path*",
        permanent: false,
      },
      {
        source: "/crm/field-day",
        destination: "/site-ops/field-day",
        permanent: false,
      },
      {
        source: "/crm/field-day/:path*",
        destination: "/site-ops/field-day/:path*",
        permanent: false,
      },
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

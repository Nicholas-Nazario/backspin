import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  logging: {
    incomingRequests: { ignore: [/\/api\/(?:auth|spotify)\/callback/] },
  },
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;

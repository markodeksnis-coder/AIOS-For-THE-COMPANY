import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The libSQL client ships native bindings + non-JS files (READMEs picked
  // up by a dynamic require) that webpack can't bundle — load them at
  // runtime via require() instead, same as any other native Node module.
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql", "libsql"],
};

export default nextConfig;

import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Unit tests only, for pure business logic (src/lib) — no React/DOM
// rendering, no live network, no database. Mirrors tsconfig's `@/*` alias
// so test files can import the same way app code does.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // src/lib/db.ts constructs its PrismaLibSQL adapter eagerly at module
    // load time — any test file that transitively imports it (e.g. via
    // @/lib/brain, even for a function that never touches the DB) throws
    // an unhandled rejection ("URL_INVALID: ... 'undefined'") the moment
    // DATABASE_URL isn't set, which is the case in CI's `npm run test`
    // step (only the later `npm run build` step gets real secrets — see
    // build-check.yml). A syntactically valid but fake URL here is enough:
    // construction succeeds, and nothing in this suite ever runs a real
    // query against it.
    env: {
      DATABASE_URL: "file:./vitest-placeholder.db",
    },
  },
});

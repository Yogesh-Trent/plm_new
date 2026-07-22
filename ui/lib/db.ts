import "server-only";
import { neon } from "@neondatabase/serverless";

// Server-only Neon client. Importing this from any client component throws at
// build time (via `server-only`), so DATABASE_URL never reaches the browser.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to ui/.env (git-ignored). See IMPLEMENTATION.md.",
  );
}

// `sql` is a tagged-template function; interpolated values are sent as bound
// parameters (never string-concatenated), so this is injection-safe.
export const sql = neon(connectionString);

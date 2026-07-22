// Cookie name shared between the edge proxy (presence check) and the server-only
// auth module (signature verification). Kept free of `server-only`/node imports
// so `proxy.ts` can import it.
export const SESSION_COOKIE = "plm_session";

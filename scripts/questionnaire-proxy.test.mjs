import { afterEach, beforeEach, expect, mock, test } from "bun:test";
let signedIn = true;
mock.module("@/lib/auth-server", () => ({ getCurrentAdmin: async () => signedIn ? { id: "verified-admin", name: "Test admin", email: "admin@example.test", role: "admin" } : null }));
const { POST } = await import("../app/api/questionnaires/route");
const originalFetch = globalThis.fetch;
const originalToken = process.env.QUESTIONNAIRE_ADMIN_TOKEN;
const originalWorkspace = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const originalSite = process.env.CLIENT_PORTAL_CONVEX_SITE_URL;
let forwarded;
beforeEach(() => {
  signedIn = true; forwarded = undefined;
  process.env.QUESTIONNAIRE_ADMIN_TOKEN = "dummy-test-credential-".repeat(3);
  process.env.CLIENT_PORTAL_CONVEX_SITE_URL = "https://portal.example.test";
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL = "https://portal.example.test";
  globalThis.fetch = mock(async (input, init) => { forwarded = { input: String(input), init: init ?? {} }; return Response.json({ version: "fixture-version" }); });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWorkspace === undefined) delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL; else process.env.NEXT_PUBLIC_CONVEX_SITE_URL = originalWorkspace;
  if (originalToken === undefined) delete process.env.QUESTIONNAIRE_ADMIN_TOKEN; else process.env.QUESTIONNAIRE_ADMIN_TOKEN = originalToken;
  if (originalSite === undefined) delete process.env.CLIENT_PORTAL_CONVEX_SITE_URL; else process.env.CLIENT_PORTAL_CONVEX_SITE_URL = originalSite;
});
const request = (body = { operation: "load" }, origin = "http://localhost:3001") => new Request("http://localhost:3001/api/questionnaires", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
test("rejects cross-origin mutations before forwarding", async () => {
  expect((await POST(request(undefined, "https://untrusted.example.test"))).status).toBe(403);
  expect(forwarded).toBeUndefined();
});
test("requires a live authenticated administrator", async () => {
  signedIn = false;
  expect((await POST(request())).status).toBe(401);
  expect(forwarded).toBeUndefined();
});
test("derives the actor on the server and keeps the token out of the response", async () => {
  const response = await POST(request({ operation: "publish", actor: "forged-browser-actor" }));
  expect(response.status).toBe(200);
  expect(Boolean(forwarded?.input === "https://portal.example.test/questionnaire-admin")).toBe(true);
  expect(JSON.parse(String(forwarded.init.body)).actor).toBe("verified-admin");
  expect(Boolean(forwarded.init.headers.authorization?.startsWith("Bearer "))).toBe(true);
  const text = await response.text();
  expect(text.includes("dummy-test-credential")).toBe(false);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
test("fails closed when the service connection is missing", async () => {
  delete process.env.QUESTIONNAIRE_ADMIN_TOKEN;
  expect((await POST(request())).status).toBe(503);
  expect(forwarded).toBeUndefined();
});

test("rejects a questionnaire connection to a different database", async () => {
  process.env.CLIENT_PORTAL_CONVEX_SITE_URL = "http://127.0.0.1:3221";
  expect((await POST(request())).status).toBe(503);
  expect(forwarded).toBeUndefined();
});

test("fails closed for a malformed connection URL", async () => {
  process.env.CLIENT_PORTAL_CONVEX_SITE_URL = "invalid-url";
  expect((await POST(request())).status).toBe(503);
  expect(forwarded).toBeUndefined();
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

// This smoke test provisions and removes a fixture only on anonymous local Convex.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
assert.equal(new URL(convexUrl).hostname, "127.0.0.1", "Use local Convex for this test.");
assert.match(process.env.CONVEX_DEPLOYMENT ?? "", /^anonymous:/, "Cloud deployments are excluded.");
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const fixture = {
  name: "Auth Smoke Test",
  email: `auth-${randomBytes(5).toString("hex")}@example.test`,
  username: `test_${randomBytes(5).toString("hex")}`,
  password: randomBytes(24).toString("base64url"),
};
const cookies = new Map();
let userId;

function cli(args, allowMissing = false) {
  const result = spawnSync("bunx", ["convex", ...args], { encoding: "utf8" });
  if (allowMissing && /not found/.test(result.stderr)) return undefined;
  assert.equal(result.status, 0, `Convex command failed: ${args.slice(0, 2).join(" ")}`);
  return result.stdout.trim();
}
const originalEmails = cli(["env", "get", "ADMIN_EMAILS"], true);
const testEmails = [originalEmails, fixture.email].filter(Boolean).join(",");

async function request(path, body, authenticated = true) {
  const headers = { Origin: origin };
  if (body) headers["Content-Type"] = "application/json";
  if (authenticated) headers.Cookie = [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
  const response = await fetch(`${origin}${path}`, {
    method: body ? "POST" : "GET", headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  if (authenticated) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const split = pair.indexOf("=");
      const key = pair.slice(0, split);
      const value = pair.slice(split + 1);
      if (value) cookies.set(key, value);
      else cookies.delete(key);
    }
  }
  return response;
}

async function assertLoginRedirect(response, destination) {
  const html = await response.text();
  assert.ok(
    response.headers.get("location") === destination ||
      html.includes(`NEXT_REDIRECT;replace;${destination};`) ||
      html.includes(`url=${destination}`),
    `Expected redirect to ${destination}`,
  );
  assert.ok(!html.includes(fixture.email), "Protected account data must not leak.");
}

try {
  cli(["env", "set", "ADMIN_EMAILS", testEmails]);
  userId = JSON.parse(cli(["run", "provision:createAdmin", JSON.stringify(fixture)])).id;
  console.log("PASS internal admin provisioning");

  await assertLoginRedirect(await request("/", undefined, false), "/login");
  console.log("PASS unauthenticated root redirects to login");

  await assertLoginRedirect(await request("/dashboard", undefined, false), "/login");
  console.log("PASS unauthenticated dashboard redirect");

  const publicSignup = await request("/api/auth/sign-up/email", fixture, false);
  assert.ok(!publicSignup.ok);
  console.log("PASS public password sign-up blocked");

  const anonymous = new ConvexHttpClient(convexUrl);
  await assert.rejects(() => anonymous.mutation(makeFunctionReference("provision:createAdmin"), fixture));
  assert.equal(await anonymous.query(makeFunctionReference("auth:getCurrentUser"), {}), null);
  console.log("PASS provisioning inaccessible to browser clients and anonymous user query returns null");

  const wrongPassword = await request("/api/auth/sign-in/email", { email: fixture.email, password: "wrong-password" });
  assert.equal(wrongPassword.status, 401);
  console.log("PASS invalid credentials rejected");

  const emailLogin = await request("/api/auth/sign-in/email", { email: fixture.email, password: fixture.password });
  assert.equal(emailLogin.status, 200);
  const session = await (await request("/api/auth/get-session")).json();
  assert.equal(session.user.email, fixture.email);
  const dashboard = await (await request("/dashboard")).text();
  assert.ok(dashboard.includes(fixture.email));
  assert.ok(dashboard.includes(fixture.name));
  console.log("PASS email login, stored session, and authenticated dashboard");

  await assertLoginRedirect(await request("/"), "/dashboard");
  console.log("PASS authenticated root redirects to dashboard");

  const loginPage = await request("/login");
  assert.ok(loginPage.headers.get("location") === "/dashboard" || (await loginPage.text()).includes("NEXT_REDIRECT;replace;/dashboard;"));
  console.log("PASS signed-in users skip the login page");

  const tokenResponse = await (await request("/api/auth/convex/token")).json();
  const authenticated = new ConvexHttpClient(convexUrl);
  authenticated.setAuth(tokenResponse.token);
  assert.equal((await authenticated.query(makeFunctionReference("auth:getCurrentUser"), {})).email, fixture.email);
  assert.equal((await authenticated.query(makeFunctionReference("auth:getCurrentUser"), {})).role, "admin");
  cli(["env", "set", "ADMIN_EMAILS", "no-access@example.test"]);
  assert.equal(await authenticated.query(makeFunctionReference("auth:getCurrentUser"), {}), null);
  await assertLoginRedirect(await request("/dashboard"), "/login");
  const revokedLogin = await request("/api/auth/sign-in/email", { email: fixture.email, password: fixture.password });
  assert.equal(revokedLogin.status, 403);
  cli(["env", "set", "ADMIN_EMAILS", testEmails]);
  console.log("PASS removing admin access blocks existing sessions and new logins");

  assert.equal((await request("/api/auth/sign-out", {})).status, 200);
  assert.equal(await (await request("/api/auth/get-session")).json(), null);
  assert.equal(await authenticated.query(makeFunctionReference("auth:getCurrentUser"), {}), null);
  await assertLoginRedirect(await request("/dashboard"), "/login");
  await assertLoginRedirect(await request("/"), "/login");
  console.log("PASS sign-out invalidates cookies, backend session, and dashboard access");

  const usernameLogin = await request("/api/auth/sign-in/username", { username: fixture.username, password: fixture.password });
  assert.equal(usernameLogin.status, 200);
  assert.equal((await (await request("/api/auth/get-session")).json()).user.email, fixture.email);
  const usernameToken = await (await request("/api/auth/convex/token")).json();
  authenticated.setAuth(usernameToken.token);
  assert.equal((await authenticated.query(makeFunctionReference("auth:getCurrentUser"), {})).role, "admin");
  console.log("PASS username/password login");

  cli(["run", "adminAccounts:revoke", JSON.stringify({ authUserId: userId })]);
  assert.equal(await authenticated.query(makeFunctionReference("auth:getCurrentUser"), {}), null);
  await assertLoginRedirect(await request("/"), "/login");
  assert.equal((await request("/api/auth/sign-in/email", { email: fixture.email, password: fixture.password })).status, 403);
  await request("/api/auth/sign-out", {});
  console.log("PASS revoking the admin role blocks existing sessions and new logins");
} finally {
  if (userId) {
    cli(["run", "adminAccounts:revoke", JSON.stringify({ authUserId: userId })]);
    for (const model of ["session", "account", "user"]) {
      cli(["run", "--component", "betterAuth", "adapter:deleteMany", JSON.stringify({
        input: { model, where: [{ field: model === "user" ? "_id" : "userId", value: userId }] },
        paginationOpts: { numItems: 100, cursor: null },
      })]);
    }
  }
  if (originalEmails === undefined) cli(["env", "remove", "ADMIN_EMAILS"]);
  else cli(["env", "set", "ADMIN_EMAILS", originalEmails]);
  console.log("Removed test account and restored ADMIN_EMAILS.");
}

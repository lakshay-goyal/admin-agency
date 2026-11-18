import { getCurrentAdmin } from "@/lib/auth-server";

/** The browser only sends editor data; credentials and actor identity stay on the server. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: "Use the admin dashboard to make this request." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "JSON is required." }, { status: 415 });
  let admin;
  try { admin = await getCurrentAdmin(); } catch { return Response.json({ error: "Administrator authentication is unavailable." }, { status: 503 }); }
  if (!admin) return Response.json({ error: "Administrator access is required." }, { status: 401 });
  const siteUrl = process.env.CLIENT_PORTAL_CONVEX_SITE_URL;
  const workspaceSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  const token = process.env.QUESTIONNAIRE_ADMIN_TOKEN;
  if (!siteUrl || !token || token.length < 32) return Response.json({ error: "The questionnaire connection is not configured on the admin server." }, { status: 503 });
  try {
    if (!workspaceSiteUrl || new URL(siteUrl).origin !== new URL(workspaceSiteUrl).origin) throw new Error("Database mismatch");
  } catch {
    return Response.json({ error: "Questionnaires and the admin workspace must use the same Convex database. Check the server connection." }, { status: 503 });
  }
  try {
    const url = new URL("/questionnaire-admin", siteUrl);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Invalid endpoint");
    if (Number(request.headers.get("content-length") ?? 0) > 800_000) return Response.json({ error: "Request is too large." }, { status: 413 });
    const text = await request.text();
    if (text.length > 800_000) return Response.json({ error: "Request is too large." }, { status: 413 });
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid request." }, { status: 400 });
    const response = await fetch(url, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, actor: admin.id }),
    });
    return Response.json(await response.json(), { status: response.status, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not reach the client questionnaire service. Try again or check the server connection." }, { status: 502 });
  }
}

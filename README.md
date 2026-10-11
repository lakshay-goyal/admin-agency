# Admin dashboard

Next.js App Router, Better Auth, and Convex. The login page uses the project's shared shadcn `login-02` components.

- `/` redirects to `/login` or `/dashboard` according to the current session.
- `/login` accepts an email or username and password, plus Google sign-in once configured.
- `/dashboard` requires a live session, an approved admin email, and a stored `admin` role. Authenticated administrators skip the login page.
- Public password sign-up is disabled. Admin accounts and their roles are created through an internal Convex mutation. Google login can link to a provisioned administrator account.
- Removing an address from `ADMIN_EMAILS` revokes dashboard access, including for existing sessions.

## Connect your Convex database

The current `.env.local` points to an **anonymous local development database**. It is not your cloud database. This local data directory and environment file are ignored by Git. Two requested administrators have been provisioned there; passwords are managed and hashed by Better Auth.

To connect the existing `webAgency` cloud project:

```bash
bun install
bunx convex login
bunx convex dev --configure existing --team lakshay-goyal-60e0c --project webagency --dev-deployment cloud --once
```

Convex writes the deployment and public URLs to `.env.local`. Use the exact HTTP Actions URL supplied by Convex, including any regional subdomain. The existing development deployment is `fabulous-giraffe-91` in `ap-southeast-2`.

Set these variables **on the Convex deployment**, through its Settings → Environment Variables or the CLI:

| Variable | Value |
| --- | --- |
| `SITE_URL` | `http://localhost:3000` in development; the admin site's HTTPS origin in production |
| `BETTER_AUTH_SECRET` | A random secret of at least 32 characters |
| `ADMIN_EMAILS` | Comma-separated approved administrator emails; empty means no access |
| `GOOGLE_CLIENT_ID` | Google OAuth web application client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

For example:

```bash
bunx convex env set SITE_URL http://localhost:3000
bunx convex env set ADMIN_EMAILS 'admin@your-company.com'
```

Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32` and save it in Convex's environment settings. Keep secrets off the frontend and out of Git. Configure each deployment separately.

Next.js needs `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` from Convex; `.env.example` documents these. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally. Keep it aligned with the backend's `SITE_URL`.

Start both services in separate terminals:

```bash
bun run dev:backend
bun run dev
```

For anonymous local development, run `CONVEX_AGENT_MODE=anonymous bun run dev:backend`. Keep this process running; `convex dev --once` stops the local backend when it finishes.

## Create a password admin account

Add the administrator's email to `ADMIN_EMAILS` first. Then run:

```bash
bun run admin:create
```

Enter the name, email, username, and a password of at least 12 characters. The password is hidden and is not written to shell history. This uses the authenticated CLI to call `provision:createAdmin`, an **internal mutation inaccessible to browser clients**. It does not create a session; sign in at `/login` afterward.

Provision every administrator before their first login, including those who will use Google. Their `admin` role is stored in the `adminAccounts` table, linked to the Better Auth component user ID. The email allowlist lives in the Convex environment; no administrator credentials or email addresses are hardcoded in application source.

## Manage multiple administrators

Set `ADMIN_EMAILS` to all approved addresses, separated by commas, then run `bun run admin:create` once per new administrator. Do this on the same deployment the frontend uses. Keep each account's password private; Better Auth stores a hash in its component, not a plaintext password in the application database.

To remove access immediately, remove that email from `ADMIN_EMAILS`. To revoke the stored role too, call the internal `adminAccounts:revoke` function through the Convex dashboard or authenticated CLI with `{ "authUserId": "<Better Auth user ID>" }`. Both existing dashboard sessions and future logins enforce the allowlist and role.

## Enable Google sign-in

Create an OAuth client of type **Web application** in Google Cloud Console. Add:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Use the admin site's HTTPS origin and the same `/api/auth/callback/google` path in production. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Convex. If the Google OAuth application is in testing mode, add administrators as test users in its consent configuration.

The login page automatically enables its Google button when both backend variables exist. It stays disabled while credentials are missing. Better Auth handles the OAuth callback and redirects successful sign-ins to `/dashboard`; failures return to `/login` with a readable error.

## Verify

```bash
bunx tsc --noEmit
bun run build
bun run lint
```

With the local Convex backend and Next.js running:

```bash
bun run test:auth
```

This smoke test refuses cloud deployments. It creates a temporary local admin, checks provisioning restrictions, invalid credentials, email and username login, live session queries, dashboard redirects, admin revocation, and sign-out, then deletes its fixture and restores the original allowlist. Google OAuth requires real Google credentials and an interactive browser login for complete verification.

The existing shared `components/ui/carousel.tsx` and `hooks/use-mobile.ts` currently fail the `react-hooks/set-state-in-effect` ESLint rule. The new authentication files pass lint.

## Implementation notes

Auth data belongs to the official `@convex-dev/better-auth` component. The Next.js `/api/auth/[...all]` handler proxies requests to Convex; `convex/auth.config.ts` registers its JWT issuer. Server pages validate the session and admin access through `auth:getCurrentUser`, and the dashboard also subscribes to that query for client-side revocation.

The app keeps its Next.js Cache Components configuration. Request-time auth is inside a Suspense boundary, and the login settings query runs after `connection()` to avoid prerendering request-specific SDK behavior.

Better Auth is pinned to the patched `1.6.33` release line supported by the current Convex adapter. A narrow cast at the provider prop addresses [Convex's known client type incompatibility](https://github.com/get-convex/better-auth/issues/420); it does not change the runtime client or weaken the app's own types.

Official setup guides: [Convex + Better Auth for Next.js](https://labs.convex.dev/better-auth/framework-guides/next), [Better Auth usage](https://better-auth.com/docs/basic-usage), and [Google OAuth](https://better-auth.com/docs/authentication/google).

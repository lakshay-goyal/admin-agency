# Admin dashboard

Next.js App Router, Better Auth, and Convex. The login page uses the project's shared shadcn `login-02` components.

- `/` redirects to `/login` or `/dashboard` according to the current session.
- `/login` accepts an email or username and password, plus Google sign-in once configured.
- `/dashboard` requires a live session, an approved admin email, and a stored `admin` role. Authenticated administrators skip the login page.
- The dashboard is a client operations workspace: a searchable client sidebar, overview and data-completeness checks, the full onboarding brief, delivery stages and progress, agreement and billing, uploaded files, and the client-visible activity timeline.
- Client password sign-up is available on the shared backend. It does not grant an administrator role. Admin accounts and their roles are created through an internal Convex mutation. Google login can link to a provisioned administrator account.
- Removing an address from `ADMIN_EMAILS` revokes dashboard access, including for existing sessions.

## Admin dashboard

The dashboard reads and writes the client workspace tables that the public app already uses:

| Table | What the admin sees and edits |
| --- | --- |
| `onboarding` | Every saved onboarding answer, its state, priority, and admin note. The brief is grouped into phases and can be filtered by missing answers or follow-ups. |
| `engagements` | Plan, fees, currency, scope, exclusions, third-party costs, billing details, agreement/advance references, verified emails, and dependencies. |
| `projects` | Client-facing project name, summary, status, current stage, overall progress, next step, and dates. |
| `projectStages` | Each delivery stage's status, progress, dates, note, and client visibility. Saving a stage recalculates overall progress and the current stage. |
| `documents` | File metadata, category, review status, and the note shown to the client. File bytes stay in Convex storage. |
| `projectActivity` | The client-visible timeline. Admins can publish new updates directly from the Activity tab. |

Client account details (name, email, verification) come from Better Auth and are read-only in this dashboard. Project record edits, stage progress, agreement changes, answer corrections, file reviews, and activity updates are persisted immediately and appear in the client workspace through Convex subscriptions.

### Connect the client data

The admin app must use the **same Convex deployment** as the client app. `convex/schema.ts` mirrors the client app's tables so this dashboard can query them. If you connect the admin app to the existing `webAgency` project, keep the two schema files aligned whenever the client data model changes. In particular, the client app's schema must also declare the `adminAccounts` table (or both apps must deploy from one shared `convex/` directory); otherwise a client-app deploy can remove the admin role table.

The dashboard shows a helpful empty state when it cannot see client records. That usually means the admin app is pointed at a separate local deployment.

### Local preview data

For a quick visual preview on a development deployment only:

```sh
bunx convex env set ALLOW_DEMO_DATA true
bunx convex run demo:seed
```

Remove the variable when you are done:

```sh
bunx convex env remove ALLOW_DEMO_DATA
```

The seed contains four example clients at different stages. Never enable `ALLOW_DEMO_DATA` on production.

## Connect your Convex database

Both apps' current private `.env.local` files point to the same `webAgency` cloud development deployment. The questionnaire bridge points there too. Local fixture databases remain separate and are never used for cloud client records. Environment files are ignored by Git; passwords are managed and hashed by Better Auth.

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

## Manage live onboarding questionnaires

Open `/dashboard/questionnaires`, also linked from the client sidebar. Choose the global **New clients** scope or a specific client from the portal backend. Edit questions, choices, hints, fields, conditions, routing and phases; save a draft, then publish with a reason. Global releases leave existing clients unchanged. A client-specific release preserves responses by stable question ID and archives the previous brief before requesting review from that client. After a global publication, **Apply published version to existing clients** opens a searchable checkbox dropdown with individual and Select all selection. Only selected clients move to that format; saved values stay prefilled, and only the final accuracy confirmation must be supplied again. Removed questions retain their answers for restoration if that question returns.

This feature uses an authenticated server-to-server connection to the same client portal database as the admin workspace. The route rejects a bridge URL pointing at a different deployment. Configure `CLIENT_PORTAL_CONVEX_SITE_URL` and `QUESTIONNAIRE_ADMIN_TOKEN` on the admin Next.js server, and the matching token on the client portal Convex backend. These are server settings, never public frontend variables. The shared cloud development connection is configured and verified; production settings must be configured separately.

See the client app's `docs/onboarding-versioning.md` for migration, safeguards, data ownership and verification. `bun test scripts/questionnaire-proxy.test.mjs` checks the proxy authorization boundary with a mocked admin session.

Run `bun run check:shared-backend --environment` with both sibling checkouts present before pushing backend changes. The canonical backend is `../next-app/convex`; both mirrors must remain identical. See `../next-app/docs/onboarding-integration-audit.md` for findings and verification.

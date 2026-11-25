# Cloudflare migration

The storefront runs through vinext and the Cloudflare Vite plugin. Keep Printful as the catalog source; Stripe, Resend, and fulfillment remain external services.

## Local development

1. Install the pinned dependencies with `pnpm install --frozen-lockfile`.
2. Generate Cloudflare binding types with `pnpm types:cloudflare`.
3. Initialize the local D1 simulation with `pnpm migrate:d1:local`.
4. Start the Worker-backed development server with `pnpm dev`.

The `staging` mode binds to the existing `masidy-staging-db` name, but `--local` keeps both migrations and requests in the local simulator. It does not change the remote staging database.

For local integrations, create a git-ignored `.dev.vars` file with the runtime secret names listed below. Do not commit real values.

## Cloudflare resources

Production uses a separate EU D1 database, `masidy-store-production`, and does not point at the existing staging database. The production database and `VINEXT_KV_CACHE` namespace are provisioned, their identifiers are recorded in `cloudflare.config.ts`, and the initial schema is applied.

The production Worker is `masidy-store1`; both `masidy.store` and `www.masidy.store` route to it. The Git deployment must target this same Worker. Until a successful Git-triggered deployment publishes the storefront, the Worker may continue to serve its dashboard-created `Hello World` response. `workers.dev` and preview URLs remain disabled.

Apply migrations only after reviewing the target and backing up any existing data. The old `/api/migrate` endpoint no longer changes schemas; migrations are managed with the D1 CLI.

## Runtime configuration

Configure all six values below as Worker secrets on the production Worker, not as plain-text variables. Confirm they are present on `masidy-store1` before retrying the Git deployment. For local testing, use `.dev.vars`:

- `PRINTFUL_API_TOKEN`
- `STRIPE_LIVE_SECRET_KEY`
- `STRIPE_SECRET_KEY` (checkout falls back to this when the live key is unset)
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `ADMIN_SETUP_TOKEN` (one-time initial admin setup; rotate it after promoting the intended account)

`PRINTFUL_STORE_ID` is optional and is a non-secret Worker variable; set it in `cloudflare.config.ts` only when using a Printful account token that needs an explicit store selection.

`PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `USE_PAYMENT_LINKS` are non-secret Worker variables. The public site URL defaults to `https://www.masidy.store`; the local staging value defaults to `http://localhost:3001`. Update the staging value before deploying a preview to a public hostname. The Stripe publishable key is not a secret key.

To promote the intended existing account, set `ADMIN_SETUP_TOKEN` in the Worker, sign in as that account, then send `POST /api/admin/make-admin` with `Authorization: Bearer <ADMIN_SETUP_TOKEN>`. The endpoint only promotes an account while no admin exists. After successful setup, rotate the token to a fresh random value; keep the secret binding provisioned for future deployments.

## Data cutover

An initial read-only snapshot was copied from PostgreSQL into EU D1: 2 users, 2 sessions, 0 password-reset tokens, 3 orders, and 0 email logs. Password hashes and session tokens were preserved; order JSON and timestamps were converted for SQLite. The source PostgreSQL database was not changed. The D1 copy passed row-count, order-JSON, and foreign-key checks. Because the old store may still receive changes, take and verify one final data sync immediately before cutover.

The source database remains unchanged, and the production domain already routes to `masidy-store1`. After deployment and secret configuration, test login, admin setup, Printful catalog loading, Stripe checkout/webhooks, and email delivery before considering the production cutover complete.

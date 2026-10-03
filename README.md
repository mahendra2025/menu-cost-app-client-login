# Menu Cost App - Client Login Version

This is a Next.js app for the Menu Cost workflow with client login backed by PostgreSQL through Prisma.

## Pages

1. `/app/event` - Event details + upload/paste menu
2. `/app/manpower` - Function-wise staffing plan
3. `/app/extra-cost` - Transport, gas/fuel and disposable supplies
4. `/app/cost` - Dish cost + extra cost + profit
5. `/app/final-costing` - Final selling price, total cost and profit
6. `/app/profile` - Business profile, plan status, logout
7. `/admin/users` - Admin creates client user ID and password
8. `/admin/dishes` - Admin manages shared dishes and rates
9. `/admin/recipes` - Admin manages recipes and ingredient costing

## Login

### Simple single-user login

Add these values to `.env.local` when only one person should use the app:

```txt
SINGLE_USER_ID=owner
SINGLE_USER_PASSWORD=choose-a-strong-password
SINGLE_USER_BUSINESS_NAME=My Catering Business
```

Restart the app, open `/login`, and sign in with that user ID and password. The app creates the account automatically on the first successful login. While these settings are present, all other client and admin credentials are rejected and public signup is disabled.

### Multi-user login

Admin login:

```txt
Set ADMIN_USER_ID and ADMIN_PASSWORD in your environment.
```

Client login:

1. Login as admin.
2. Open Admin Users.
3. Create client user ID and password.
4. Give that ID/password to the client.
5. Client logs in and uses the app.

## If client does not pay

Admin changes client status from `ACTIVE` to `EXPIRED`.

Expired client can only open Profile and Logout. Event upload, manpower, cost and final costing are locked.

## Run locally

### Option 1: Local Docker database

1. Start PostgreSQL:

```bash
docker compose up -d
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Push the Prisma schema into the database:

```bash
npm run db:push
```

4. Start the app:

```bash
npm install
npm run dev
```

Recommended environment:

```bash
ADMIN_USER_ID=admin
ADMIN_PASSWORD=change-this-now
ADMIN_SESSION_SECRET=change-this-too
DATABASE_URL=your-database-url
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_KEEP_ALIVE=30m
```

You can copy `.env.example` to `.env.local` and fill in your real values.

If `ADMIN_USER_ID`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, or `DATABASE_URL` are missing, the server will now fail with a clear error instead of silently misbehaving.

## Self-hosted AI menu detection

The app supports Ollama as its primary AI provider, so menu extraction and new-recipe generation can run on your own computer or server without a cloud API key. Ollama structured outputs extract event details, functions, dishes, and categories from pasted or OCR menu text. Saved catalog and ingredient rates remain authoritative, and all financial calculations stay deterministic.

Start the optional Docker service and download the model once:

```bash
docker compose --profile ai up -d ollama
docker compose exec ollama ollama pull qwen3:8b
```

Then configure the Next.js server:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

If Ollama runs on a different machine, use that private server URL instead. Do not expose port `11434` publicly; keep it behind your private network or firewall. When `OLLAMA_BASE_URL` is set, Ollama is used even if an OpenAI key is also present.

OpenAI remains an optional fallback when Ollama is not configured:

```bash
OPENAI_API_KEY=your-openai-project-key
OPENAI_MENU_MODEL=gpt-5.6-sol
```

If neither provider is available, the existing local menu parser is used automatically. Existing saved dishes and recipes still calculate normally; only AI extraction and recipe generation are skipped.

## CaterersOS event + recipe sync

Completed costings can automatically create or update events in CaterersOS. The integration is tenant-aware: every Menu Cost tenant stores its own CaterersOS workspace ID, so customer data cannot be routed through one global workspace setting. The Admin Recipes page fans the global recipe master out to active, linked CaterersOS workspaces.

Configure the Menu Costing server with:

```bash
CATERERSOS_API_URL=https://your-caterersos-domain.com
CATERERSOS_SYNC_SECRET=the-same-long-random-secret-used-by-caterersos
```

Do not configure `CATERERSOS_WORKSPACE_ID` globally. Link each tenant from `/admin/caterersos`; the mapping is stored in PostgreSQL on the tenant record. Configure CaterersOS with the matching `MENU_COSTING_SYNC_SECRET`.

Saving a costing to history sends the event, function, menu, manpower, extra-cost, and financial-summary data only to that tenant's linked CaterersOS workspace. The `costingId` is used as the idempotency key, so saving again updates the existing CaterersOS event.

The Menu Costing history save remains successful if CaterersOS is temporarily unavailable or a tenant is not linked. Recipe saves also remain successful if a CaterersOS workspace is unavailable; the Recipes screen reports full or partial fleet-sync status.

## Razorpay subscriptions

Create a monthly ₹999 plan in the Razorpay Dashboard, then configure:

```bash
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_PLAN_PRO_ID=plan_your_monthly_plan_id
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_SUBSCRIPTION_CYCLES=12
```

Set the Razorpay webhook URL to:

```txt
https://www.menu-costing.com/api/webhooks/razorpay
```

Subscribe to subscription authenticated, activated, charged, pending, halted, cancelled, and completed events. Use separate keys, plan IDs, and webhook secrets for Test and Live modes.

## Optional Google dish verification

The owner review queue always includes a one-click Google search. Existing Google Custom Search JSON API customers can also show results inside the app by configuring:

```bash
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_api_key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_programmable_search_engine_id
```

Without these optional variables, the owner verifies a dish in a normal Google search tab before confirming it and entering the manual rate.

Open:

```txt
http://localhost:3000
```

### Option 2: Existing PostgreSQL server

Set `DATABASE_URL` in `.env` to your existing PostgreSQL instance, then run:

```bash
npm install
npm run db:push
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Important

- Admin login is configured through environment variables.
- Client accounts are stored in PostgreSQL and managed from `/admin/users`.
- Client-side work data is still stored in browser `localStorage`, so each browser keeps its own event/menu/cost draft data.


## Event Manager

Open `/app/event-manager` from the workspace navigation to browse the latest
100 drafts and 100 saved costings, search by event/client/date, and filter by
planning status. Select an event to review its menu and calculated costs, edit
client contacts and planning notes, or continue in the existing event, costing,
and quotation screens. Planning status is independent of costing completion.

Attachments are stored in PostgreSQL and downloaded through authenticated,
tenant-scoped endpoints. Each file must be non-empty and at most 5 MB; supported
formats are PDF, PNG, JPEG, WebP, DOCX, XLSX, CSV and TXT.

Deployment requires the `20261003163000_add_event_files` Prisma migration and
regenerating the Prisma client. This adds two tables without changing existing
event or costing records. Follow the environment's normal migration workflow;
if it has a divergent migration history, reconcile that history before deployment.

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

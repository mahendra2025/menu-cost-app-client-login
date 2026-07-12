# Menu Cost App - Client Login Version

This is a Next.js app for the Menu Cost workflow with client login backed by PostgreSQL through Prisma.

## Pages

1. `/app/event` - Event details + upload/paste menu
2. `/app/menu` - Menu dishes category-wise
3. `/app/cost` - Dish cost + extra cost + profit
4. `/app/pdf` - Print / Save as PDF
5. `/app/profile` - Business profile, plan status, logout
6. `/admin/users` - Admin creates client user ID and password

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

Expired client can only open Profile and Logout. Event upload, menu, cost and PDF are locked.

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
```

You can copy `.env.example` to `.env.local` and fill in your real values.

If `ADMIN_USER_ID`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, or `DATABASE_URL` are missing, the server will now fail with a clear error instead of silently misbehaving.

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

- Admin login is hard-coded as `admin / admin123`.
- Client accounts are stored in PostgreSQL and managed from `/admin/users`.
- Client-side work data is still stored in browser `localStorage`, so each browser keeps its own event/menu/cost draft data.

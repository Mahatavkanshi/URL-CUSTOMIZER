# URL Customizer (URL Shortener)

A modern URL shortener built with Next.js + PostgreSQL + Prisma.

## Features

- Create short URLs with optional custom slug
- Redirect using dynamic short code route
- Click tracking per short URL
- Optional expiration date for each link
- Expired-link fallback page
- Admin login to manage links
- Edit/delete links from dashboard
- Search and pagination in analytics table
- Copy short URL, QR code generation, and UTM presets
- API rate limiting (Redis-backed when `REDIS_URL` is configured)

## Tech Stack

- Next.js (App Router, TypeScript)
- Prisma ORM
- PostgreSQL
- ioredis (optional Redis rate limiting)
- Tailwind CSS (via `@import "tailwindcss"`)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create env file from template:

```bash
# macOS/Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

3. Update `.env` values:

- `DATABASE_URL`
- `ADMIN_PASSWORD_HASH`
- `AUTH_SECRET`
- `REDIS_URL` (optional)

4. Generate Prisma client / run migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

5. Start development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Create Admin Password Hash

Use the helper script:

```bash
npm run hash:password -- "your-strong-password"
```

Copy the `ENV value:` output into `.env` as `ADMIN_PASSWORD_HASH`.

## Environment Safety (Important)

- `.env` is ignored by git in `.gitignore`
- `.env.*` is ignored by git
- Only `.env.example` is tracked for GitHub

This prevents secrets from being pushed to GitHub.

## Screenshots

### Home Page
![Home Page](docs/home.png)

### Admin Dashboard
![Admin Dashboard](docs/admin.png)

### QR Preview
![QR Preview](docs/qr.png)

## Useful Routes

- `/` Home + create short URL
- `/login` Admin login
- `/links` Link management dashboard
- `/expired` Expired link fallback page
- `/api/shorten` Create short URL API
- `/api/health` App/DB/rate-limit health check

## Scripts

- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `npm run start` - Start production build
- `npm run lint` - Run ESLint
- `npm run hash:password -- "..."` - Generate bcrypt hash for admin password

# GameTok Web App

This Next.js application provides the swipeable shell for GameTok, delivering arcade and hyper-casual games inside an iframe runtime. It is designed for mobile web (PWA) and integrates with Supabase and PostHog.

## Scripts
- `npm run dev` — start local development server.
- `npm run build` — production build.
- `npm run start` — serve the production build.
- `npm run lint` — lint the codebase.
- `npm run typecheck` — run TypeScript checks.
- `npm run test` — execute Vitest unit tests.

## Environment Variables
Copy `.env.example` to `.env.local` and fill in the Supabase + PostHog credentials. See the root `README.md` and `docs/` for detailed architecture and analytics specs.

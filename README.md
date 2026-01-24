# Auction House

A decentralized art auction platform built with Next.js 14 and Solana.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18, Tailwind CSS
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Blockchain**: Solana (Devnet/Mainnet)
- **Cache/Rate Limiting**: Upstash Redis
- **Error Tracking**: Sentry
- **Testing**: Vitest, Playwright

## Features

- Wallet-based authentication (Phantom, Solflare, etc.)
- Create and manage art auctions
- Real-time bidding with anti-snipe protection
- Top 3 collateral locking system
- Cascade settlement for failed payments
- Full-text search with tag filtering
- Rate limiting (3 tiers)
- Content moderation and reporting

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Supabase account
- Solana wallet (for testing)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd auction-house

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
```

### Environment Setup

Edit `.env.local` with your credentials:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Upstash Redis (optional, for distributed rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Security
CRON_SECRET=your-secure-random-string-min-16-chars
JWT_SECRET=your-jwt-secret-min-32-chars

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Database Setup

Apply migrations via Supabase CLI or Dashboard. See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

```bash
# Using Supabase CLI
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Running the App

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run unit tests (watch mode) |
| `npm run test:run` | Run unit tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run Playwright E2E tests |

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── auth/      # Wallet authentication
│   │   ├── auctions/  # Auction CRUD + bidding
│   │   ├── settlements/ # Payment settlement
│   │   ├── health/    # Health check endpoint
│   │   └── cron/      # Scheduled tasks
│   ├── auction/       # Auction pages
│   ├── create/        # Create auction page
│   └── profile/       # User profile
├── components/        # React components
├── hooks/             # Custom React hooks
├── lib/
│   ├── auth/          # JWT utilities
│   ├── errors/        # Error classes and handlers
│   ├── rate-limit/    # Rate limiting
│   ├── solana/        # Blockchain utilities
│   ├── supabase/      # Database client
│   └── validation/    # Zod schemas
└── types/             # TypeScript types
```

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth` | POST | Wallet authentication |
| `/api/auctions` | GET, POST | List/create auctions |
| `/api/auctions/[id]` | GET, DELETE | Get/delete auction |
| `/api/auctions/[id]/bid` | POST | Place bid |
| `/api/settlements/cascade` | GET, POST | Process settlements |
| `/api/users/[address]` | GET, PATCH | User profile |

See [docs/API.md](./docs/API.md) for complete API documentation.

## Rate Limits

| Tier | Limit | Endpoints |
|------|-------|-----------|
| Strict | 5/min | Auth, bidding |
| Moderate | 10/min | Create auction, upload |
| Lenient | 30/min | Read operations |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass and coverage is 80%+
5. Submit a pull request

## License

MIT

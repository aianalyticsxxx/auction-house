# Deployment Guide

This guide covers deploying Auction House to production.

## Pre-Deployment Checklist

### Code Quality
- [ ] `npm run build` - No build errors
- [ ] `npm run typecheck` - No type errors
- [ ] `npm run lint` - No lint errors
- [ ] `npm run test:run` - All tests passing
- [ ] `npm run test:coverage` - 80%+ coverage

### Security
- [ ] All secrets rotated from development values
- [ ] JWT_SECRET is cryptographically random (32+ chars)
- [ ] CRON_SECRET is cryptographically random (16+ chars)
- [ ] No `.env.local` in git history
- [ ] Rate limiting tested and working

### Database
- [ ] All migrations applied to production database
- [ ] RPC functions verified
- [ ] RLS policies enabled and tested
- [ ] Backup created before deployment

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC endpoint |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` or `devnet` |

### Recommended

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | JWT signing secret (32+ chars) |
| `CRON_SECRET` | Cron job authorization (16+ chars) |
| `UPSTASH_REDIS_REST_URL` | Redis URL for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication token |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side Sentry DSN |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload token |

### Generating Secure Secrets

```bash
# Generate JWT_SECRET (32 characters)
openssl rand -base64 32

# Generate CRON_SECRET (16 characters)
openssl rand -hex 16
```

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Select the `main` branch

### 2. Configure Environment Variables

Add all required environment variables in Vercel dashboard:
- Settings → Environment Variables
- Add each variable for Production environment

### 3. Configure Build Settings

Vercel auto-detects Next.js. Default settings work:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. Deploy

Push to main branch to trigger deployment, or use:
```bash
vercel --prod
```

### 5. Configure Cron Jobs

Create `vercel.json` for scheduled tasks:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-statuses",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/settlements/cascade",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## Database Migration

### Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Manual Migration

1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order:
   - `001_initial_schema.sql`
   - `002_cascade_support.sql`
   - `003_search_support.sql`
   - `004_notifications.sql`
   - `20260109_update_top_3_bids.sql`
   - `20260110_storage_policies.sql`
   - `20260111_place_bid_function.sql`
   - `20260112_fix_top_3_logic.sql`
   - `20260113_collateral_system.sql`

### Verify Migrations

```sql
-- Check all functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- Check tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

---

## Solana Configuration

### For Production (Mainnet)

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

**Recommended**: Use a dedicated RPC provider for better reliability:
- Helius
- QuickNode
- Triton
- Alchemy

### RPC Rate Limits

Public Solana RPC has strict rate limits. For production:
1. Get a dedicated RPC endpoint
2. Configure the URL in environment variables
3. Monitor RPC usage

---

## Upstash Redis Setup

For distributed rate limiting across multiple instances:

### 1. Create Redis Database

1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Select region closest to your deployment

### 2. Get Credentials

Copy from Upstash dashboard:
- REST URL
- REST Token

### 3. Configure Environment

```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

---

## Sentry Setup

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Copy the DSN

### 2. Configure Environment

```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=your-auth-token  # For source maps
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### 3. Verify Integration

After deployment, trigger a test error:
```bash
curl https://your-domain.com/api/health
```

Check Sentry dashboard for the event.

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.com/api/health
```

Expected: `{"status":"healthy",...}`

### 2. Auth Flow

1. Open the app
2. Connect wallet
3. Sign authentication message
4. Verify session created

### 3. Create Auction

1. Navigate to Create page
2. Fill in auction details
3. Submit and verify creation

### 4. Place Bid

1. Open an active auction
2. Place a bid
3. Verify bid appears

### 5. Error Tracking

1. Check Sentry for any errors
2. Monitor for 24 hours
3. Set up alerts for error spikes

---

## Monitoring

### Health Checks

Set up external monitoring for `/api/health`:
- UptimeRobot
- Pingdom
- Better Uptime

Configure alerts for:
- Response time > 2s
- Status code != 200
- Service degradation

### Error Monitoring

Configure Sentry alerts for:
- Error rate > 1%
- New error types
- Unhandled exceptions

### Performance

Monitor in Vercel Analytics:
- Core Web Vitals
- API response times
- Cold start frequency

---

## Rollback Procedure

If issues occur after deployment:

### 1. Immediate Rollback (Vercel)

```bash
vercel rollback
```

Or use Vercel dashboard:
- Deployments → Select previous deployment → Promote to Production

### 2. Database Rollback

If migration caused issues:
1. Restore from backup
2. Or run rollback migration manually

### 3. Secret Rotation

If secrets were compromised:
1. Generate new secrets
2. Update in Vercel dashboard
3. Redeploy

---

## Scaling Considerations

### Database
- Enable connection pooling in Supabase
- Consider read replicas for high traffic
- Index frequently queried columns

### Rate Limiting
- Use Upstash Redis for distributed rate limiting
- Adjust limits based on traffic patterns

### Caching
- Enable Vercel Edge caching for static content
- Consider CDN for images

### RPC
- Use dedicated Solana RPC provider
- Consider websocket connections for real-time updates

# Production Launch Checklist

Step-by-step guide to deploy Auction House to production.

---

## Phase 1: Pre-Deployment Verification

### 1.1 Code Quality
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:run` - all tests pass

### 1.2 Security Audit
- [ ] No hardcoded secrets in codebase
- [ ] `.env.local` is in `.gitignore`
- [ ] No `console.log` statements (use Pino logger)
- [ ] All API routes have rate limiting
- [ ] All user inputs validated with Zod

### 1.3 Test Coverage
- [ ] Run `npm run test:coverage`
- [ ] Review uncovered critical paths
- [ ] Add tests for any gaps in auth/bid/settlement

---

## Phase 2: Infrastructure Setup

### 2.1 Supabase Production
- [ ] Create production Supabase project
- [ ] Apply all migrations in order:
  ```bash
  supabase link --project-ref YOUR_PROD_PROJECT
  supabase db push
  ```
- [ ] Verify RLS policies are enabled
- [ ] Verify all RPC functions exist:
  ```sql
  SELECT routine_name FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
  ```
- [ ] Create database backup schedule
- [ ] Enable connection pooling (Settings → Database → Connection Pooling)

### 2.2 Upstash Redis
- [ ] Create Upstash Redis database
- [ ] Select region closest to Vercel deployment
- [ ] Copy REST URL and token
- [ ] Test connection

### 2.3 Sentry
- [ ] Create Sentry project (Next.js)
- [ ] Copy DSN
- [ ] Generate auth token for source maps
- [ ] Configure alert rules:
  - Error rate > 1% in 5 minutes
  - New error types
  - Unhandled exceptions

### 2.4 Solana RPC
- [ ] Choose RPC provider (Helius, QuickNode, Triton)
- [ ] Create account and get API key
- [ ] Configure mainnet-beta endpoint
- [ ] Test connection and rate limits

---

## Phase 3: Vercel Deployment

### 3.1 Project Setup
- [ ] Connect GitHub repository to Vercel
- [ ] Select production branch (`main`)

### 3.2 Environment Variables
Add all variables in Vercel dashboard (Settings → Environment Variables):

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-rpc-provider.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

**Security (generate fresh values):**
```bash
# Generate these locally, paste into Vercel
openssl rand -base64 32  # JWT_SECRET
openssl rand -hex 16     # CRON_SECRET
```
```
JWT_SECRET=<generated-value>
CRON_SECRET=<generated-value>
```

**Upstash:**
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**Sentry:**
```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=auction-house
```

### 3.3 Cron Jobs
Create `vercel.json` in project root:
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
- [ ] Commit and push `vercel.json`

### 3.4 Deploy
- [ ] Trigger deployment (push to main or manual)
- [ ] Verify build succeeds
- [ ] Check deployment logs for errors

---

## Phase 4: Post-Deployment Verification

### 4.1 Health Check
```bash
curl https://your-domain.com/api/health
```
Expected: `{"status":"healthy",...}`

- [ ] Supabase: `up`
- [ ] Redis: `up`
- [ ] Solana: `up` with current slot

### 4.2 Functional Tests

**Authentication:**
- [ ] Connect wallet (Phantom/Solflare)
- [ ] Sign authentication message
- [ ] Verify JWT token created
- [ ] Refresh page, session persists

**Create Auction:**
- [ ] Navigate to /create
- [ ] Fill form with valid data
- [ ] Upload image
- [ ] Submit and verify creation
- [ ] Check auction appears in listings

**Place Bid:**
- [ ] Open active auction
- [ ] Place bid above reserve
- [ ] Verify bid appears
- [ ] Check collateral locked message

**Rate Limiting:**
- [ ] Make 6 rapid requests to /api/auth
- [ ] Verify 429 response on 6th request

### 4.3 Error Tracking
- [ ] Trigger test error (e.g., invalid API call)
- [ ] Verify error appears in Sentry
- [ ] Check source maps are working (readable stack traces)

### 4.4 Cron Jobs
- [ ] Wait 5 minutes
- [ ] Check Vercel logs for cron executions
- [ ] Verify auction statuses update correctly

---

## Phase 5: Monitoring Setup

### 5.1 Uptime Monitoring
Set up external monitoring (UptimeRobot, Better Uptime, Pingdom):
- [ ] Monitor: `https://your-domain.com/api/health`
- [ ] Check interval: 1 minute
- [ ] Alert on: Response time > 3s, Status != 200

### 5.2 Sentry Alerts
Configure in Sentry dashboard:
- [ ] Alert: Error rate > 1% (5 min window)
- [ ] Alert: New issue created
- [ ] Alert: Issue regression
- [ ] Notification: Email + Slack/Discord

### 5.3 Vercel Analytics
- [ ] Enable Web Analytics (Settings → Analytics)
- [ ] Review Core Web Vitals baseline
- [ ] Set up speed insights

### 5.4 Database Monitoring
In Supabase dashboard:
- [ ] Enable query performance insights
- [ ] Set up slow query alerts (> 1s)
- [ ] Monitor connection pool usage

---

## Phase 6: Go-Live

### 6.1 DNS Configuration
- [ ] Point domain to Vercel
- [ ] Verify SSL certificate active
- [ ] Test www and non-www redirects

### 6.2 Final Checks
- [ ] All Phase 4 tests pass on production domain
- [ ] Health check returns healthy
- [ ] No errors in Sentry
- [ ] Cron jobs executing

### 6.3 Announcement
- [ ] Update any landing pages
- [ ] Notify beta users
- [ ] Monitor closely for first 24 hours

---

## Rollback Plan

If critical issues occur:

### Immediate (< 5 min)
```bash
vercel rollback
```
Or: Vercel Dashboard → Deployments → Previous → Promote to Production

### Database Issues
1. Pause new deployments
2. Restore from Supabase backup
3. Re-apply only safe migrations

### Secret Compromise
1. Rotate affected secrets immediately
2. Update in Vercel dashboard
3. Redeploy
4. Audit access logs

---

## Post-Launch (First Week)

### Daily
- [ ] Check Sentry for new errors
- [ ] Review uptime reports
- [ ] Monitor API response times

### After 24 Hours
- [ ] Review error patterns
- [ ] Check cron job success rate
- [ ] Verify settlement cascade working

### After 7 Days
- [ ] Analyze usage patterns
- [ ] Review performance metrics
- [ ] Plan optimization based on real data
- [ ] Consider scaling if needed

---

## Quick Reference

| Service | Dashboard |
|---------|-----------|
| Vercel | https://vercel.com/dashboard |
| Supabase | https://supabase.com/dashboard |
| Upstash | https://console.upstash.com |
| Sentry | https://sentry.io |

| Health Check | Command |
|--------------|---------|
| API | `curl https://your-domain.com/api/health` |
| Build | `npm run build` |
| Types | `npm run typecheck` |
| Tests | `npm run test:run` |

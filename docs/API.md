# API Documentation

Base URL: `https://your-domain.com/api`

All endpoints return JSON. Authentication is via wallet signature.

## Authentication

### POST /auth

Authenticate with Solana wallet signature.

**Request:**
```json
{
  "walletAddress": "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
  "signature": "base58-encoded-signature",
  "message": "Sign this message to authenticate with Auction House: <nonce>"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "wallet_address": "7nYmD...",
    "username": null,
    "avatar_url": null,
    "credits": 0
  },
  "token": "jwt-session-token"
}
```

**Errors:**
- `400` - Invalid wallet address or signature format
- `401` - Signature verification failed
- `429` - Rate limited (5 requests/minute)

---

## Health

### GET /health

Check system health status.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "supabase": { "status": "up" },
    "redis": { "status": "up" },
    "solana": { "status": "up", "slot": 123456789 }
  }
}
```

**Response (503):**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "supabase": { "status": "up" },
    "redis": { "status": "down", "error": "Connection refused" },
    "solana": { "status": "up" }
  }
}
```

---

## Auctions

### GET /auctions

List auctions with filtering and search.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `upcoming`, `current`, `past`, `settling`, `completed`, `failed`, `active` |
| `q` | string | Full-text search query |
| `tags` | string | Comma-separated tags to filter by |
| `minPrice` | number | Minimum reserve price (lamports) |
| `maxPrice` | number | Maximum reserve price (lamports) |
| `sort` | string | Sort order: `newest`, `ending_soon`, `price_low`, `price_high`, `most_bids` |
| `trending` | boolean | Show trending auctions |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset (default: 0) |

**Response (200):**
```json
{
  "auctions": [
    {
      "id": "uuid",
      "title": "Digital Artwork #1",
      "description": "A beautiful piece...",
      "image_url": "https://...",
      "tags": ["digital", "abstract"],
      "reserve_price": 100000000,
      "min_bid_increment": 10000000,
      "start_time": "2024-01-15T10:00:00Z",
      "end_time": "2024-01-20T10:00:00Z",
      "status": "current",
      "highest_bid": 150000000,
      "bids_count": 5,
      "creator": {
        "id": "uuid",
        "wallet_address": "7nYmD...",
        "username": "artist123"
      }
    }
  ]
}
```

### POST /auctions

Create a new auction. Requires authentication.

**Request:**
```json
{
  "walletAddress": "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
  "title": "My Artwork",
  "description": "A beautiful piece of digital art",
  "imageUrl": "https://storage.example.com/image.jpg",
  "tags": ["digital", "abstract"],
  "reservePrice": 100000000,
  "minBidIncrement": 10000000,
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-20T10:00:00Z"
}
```

**Validation:**
- `title`: 3-100 characters
- `description`: 10-2000 characters
- `imageUrl`: Valid URL
- `tags`: Max 10 tags, each 2-30 characters
- `reservePrice`: >= 0 lamports
- `minBidIncrement`: >= 1000 lamports
- `startTime`: Must be in future
- `endTime`: Must be after startTime, max 30 days duration

**Response (201):**
```json
{
  "auction": {
    "id": "uuid",
    "title": "My Artwork",
    "status": "upcoming",
    "moderation_status": "pending"
  }
}
```

**Errors:**
- `400` - Validation error
- `404` - User not found
- `403` - User is restricted
- `429` - Rate limited (10 requests/minute)

### GET /auctions/[id]

Get auction details by ID.

**Response (200):**
```json
{
  "auction": {
    "id": "uuid",
    "title": "Digital Artwork",
    "description": "...",
    "image_url": "https://...",
    "status": "current",
    "creator": { ... },
    "bids": [
      {
        "id": "uuid",
        "amount": 150000000,
        "bidder": { "wallet_address": "..." },
        "created_at": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

### DELETE /auctions/[id]

Delete an auction. Only creator can delete. Cannot delete auctions with bids.

**Request:**
```json
{
  "walletAddress": "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `403` - Not the auction creator
- `400` - Auction has bids and cannot be deleted

---

## Bidding

### POST /auctions/[id]/bid

Place a bid on an auction. Requires authentication.

**Request:**
```json
{
  "walletAddress": "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
  "amount": 150000000
}
```

**Validation:**
- Auction must be in `current` status
- Amount must exceed current highest bid + min increment
- Amount must exceed reserve price if no bids
- Cannot bid on own auction

**Response (200):**
```json
{
  "bid": {
    "id": "uuid",
    "amount": 150000000,
    "is_top_3": true
  },
  "extended": true,
  "newEndTime": "2024-01-20T10:10:00Z"
}
```

**Anti-Snipe Protection:**
If a bid is placed within the last 10 minutes, the auction is extended by 10 minutes.

**Errors:**
- `400` - Invalid bid amount or auction not active
- `403` - Cannot bid on own auction
- `429` - Rate limited (5 requests/minute)

### DELETE /bids/[id]

Delete a bid. Only bidder can delete. Cannot delete top 3 bids.

**Request:**
```json
{
  "walletAddress": "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB"
}
```

**Errors:**
- `403` - Not the bidder or bid is in top 3

---

## Settlements

### GET /settlements/cascade

Get pending settlements count.

**Response (200):**
```json
{
  "count": 5
}
```

### POST /settlements/cascade

Process cascade settlements (cron job). Requires CRON_SECRET.

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response (200):**
```json
{
  "processed": 3,
  "results": [...]
}
```

### GET /settlements/auction/[id]

Get settlement status for an auction.

**Response (200):**
```json
{
  "settlement": {
    "id": "uuid",
    "auction_id": "uuid",
    "winner_id": "uuid",
    "amount": 150000000,
    "status": "pending_payment",
    "cascade_position": 1,
    "deadline": "2024-01-21T10:00:00Z"
  }
}
```

### POST /settlements/[id]/verify

Verify a payment transaction.

**Request:**
```json
{
  "txSignature": "solana-transaction-signature",
  "walletAddress": "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB"
}
```

**Response (200):**
```json
{
  "success": true,
  "settlement": {
    "status": "completed"
  }
}
```

---

## Users

### GET /users/[address]

Get user profile by wallet address.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "wallet_address": "7nYmD...",
    "username": "artist123",
    "avatar_url": "https://...",
    "credits": 150,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PATCH /users/[address]

Update user profile. Requires authentication.

**Request:**
```json
{
  "username": "new_username",
  "avatarUrl": "https://..."
}
```

---

## Reports

### POST /reports

Report an auction or user.

**Request:**
```json
{
  "walletAddress": "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
  "auctionId": "uuid",
  "reason": "spam",
  "description": "This auction contains spam content"
}
```

**Valid Reasons:** `spam`, `inappropriate`, `copyright`, `fraud`, `other`

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Rate Limiting

Rate limits are enforced per IP address (or wallet if authenticated).

| Tier | Limit | Window | Endpoints |
|------|-------|--------|-----------|
| Strict | 5 | 1 min | `/auth`, `/auctions/[id]/bid` |
| Moderate | 10 | 1 min | `/auctions` (POST), `/upload` |
| Lenient | 30 | 1 min | All GET endpoints |

When rate limited, response includes:
```json
{
  "error": "Too many requests. Please try again later."
}
```

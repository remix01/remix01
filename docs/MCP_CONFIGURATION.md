# Model Context Protocol (MCP) Configuration

## Overview

The `.mcp.json` file configures the Model Context Protocol servers for the remix01 project. This enables integration with various services like Supabase, Stripe, GitHub, Vercel, and Upstash Redis.

## Configuration File

**Location:** `/vercel/share/v0-project/.mcp.json`

### MCP Servers

#### 1. **Supabase MCP Server**
- **Purpose:** Direct database access, real-time subscriptions, and authentication management
- **Status:** ✅ Connected
- **Environment Variables Required:**
  - `SUPABASE_URL` - Base URL (already set: `https://whabaeatixtymbccwigu.supabase.co`)
  - `SUPABASE_ANON_KEY` - Public anon key (uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for backend operations

#### 2. **Upstash MCP Server**
- **Purpose:** Redis caching, rate limiting, and QStash queue management
- **Status:** Available
- **Environment Variables Required:**
  - `UPSTASH_REDIS_REST_URL` - Redis REST endpoint
  - `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token
  - `QSTASH_TOKEN` - QStash API token for scheduled jobs

#### 3. **Stripe MCP**
- **Purpose:** Payment processing, subscription management, and financial operations
- **Status:** ✅ Connected (with missing `STRIPE_MCP_KEY`)
- **Environment Variables Required:**
  - `STRIPE_SECRET_KEY` - API secret key
  - `STRIPE_MCP_KEY` - MCP-specific integration key (**Missing** - needs to be added)

#### 4. **GitHub MCP**
- **Purpose:** Repository management, issue tracking, and code collaboration
- **Status:** Available (optional)
- **Environment Variables Required:**
  - `GITHUB_PERSONAL_ACCESS_TOKEN` - GitHub PAT with repo/workflow permissions

#### 5. **Vercel MCP**
- **Purpose:** Deployment management, environment variables, and project configuration
- **Status:** Available (optional)
- **Environment Variables Required:**
  - `VERCEL_TOKEN` - Vercel API token

#### 6. **Filesystem MCP**
- **Purpose:** Local file system operations
- **Path:** `/vercel/share/v0-project` (project root)
- **Status:** ✅ Configured

## Setup Instructions

### Step 1: Set Environment Variables

Add the following variables to your Vercel project settings or `.env.local`:

```bash
# Supabase (already configured)
SUPABASE_URL=https://whabaeatixtymbccwigu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (partially configured - missing STRIPE_MCP_KEY)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_MCP_KEY=your-mcp-key

# Upstash (optional)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
QSTASH_TOKEN=...

# GitHub (optional)
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...

# Vercel (optional)
VERCEL_TOKEN=...
```

### Step 2: Verify Configuration

The `.mcp.json` file automatically uses environment variables via `${VAR_NAME}` syntax. No manual path adjustments needed.

### Step 3: Test MCP Servers

```bash
# List available MCP servers
npx mcp list

# Test a specific server
npx mcp test supabase
npx mcp test stripe
```

## Current Status

| Server | Status | Notes |
|--------|--------|-------|
| Supabase | ✅ Ready | All env vars configured |
| Upstash | 🟡 Available | Needs env var setup if using |
| Stripe | ⚠️ Partial | Missing `STRIPE_MCP_KEY` |
| GitHub | 🟡 Available | Optional, needs PAT |
| Vercel | 🟡 Available | Optional, needs token |
| Filesystem | ✅ Ready | Points to project root |

## Usage Examples

### In TypeScript/Node.js

```typescript
// Supabase operations
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)

// Stripe operations
const invoice = await stripe.invoices.create({
  customer: customerId,
  auto_advance: true,
})

// Redis caching
await redis.setex(`user:${id}`, 3600, JSON.stringify(user))
```

### In AI Assistants/Claude

You can use the MCP servers to:
- Query the database directly
- Manage Stripe payments programmatically
- Access GitHub repositories
- Deploy to Vercel
- Cache frequently accessed data in Redis

## Troubleshooting

### Missing Environment Variables
If a server fails to initialize, check:
1. All required env vars are set in Vercel project settings
2. Variables are correctly prefixed (e.g., `NEXT_PUBLIC_*` for client-side)
3. No typos in variable names

### Supabase Connection Issues
- Verify `SUPABASE_URL` matches your project
- Check that anon key hasn't been rotated recently
- Ensure RLS policies allow the operations

### Stripe Integration Issues
- **Missing `STRIPE_MCP_KEY`**: Contact Stripe support to obtain MCP integration key
- Verify `STRIPE_SECRET_KEY` is live mode or test mode (consistent)

## Next Steps

1. **Add Missing Stripe MCP Key** - Required for Stripe operations
2. **Configure Upstash** (optional) - If using Redis caching or QStash
3. **Add GitHub Token** (optional) - For repository management
4. **Test All Integrations** - Use MCP test commands

## Documentation Links

- [Supabase MCP](https://supabase.com/docs/reference/mcp)
- [Stripe MCP](https://stripe.com/docs/mcp)
- [Upstash MCP](https://upstash.com/docs/mcp)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)

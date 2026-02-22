# Revify Outreach - Enterprise Architecture

## Executive Summary

Revify Outreach is a multi-tenant B2B SaaS for AI-powered lead research and personalized email outreach, deeply integrated with GoHighLevel CRM.

**Target Architecture**: Hybrid (Supabase + GHL)
- **Supabase**: Users, auth, API keys, settings, usage tracking, billing
- **GHL**: Contacts, research results, email history (CRM data)

---

## Architecture Decision: Why Hybrid?

### Option Comparison

| Aspect | Minimal (GHL-Centric) | **Hybrid (Recommended)** | Supabase-Primary |
|--------|----------------------|-------------------------|------------------|
| Complexity | Simple | Moderate | Complex |
| Time to MVP | 1-2 weeks | 3-4 weeks | 6+ weeks |
| Multi-tenant | Difficult | Native | Native |
| Analytics | Limited | Full | Full |
| GHL Dependency | 100% | ~60% | ~20% |
| Future CRMs | Hard | Possible | Easy |
| Billing | Manual | Integrated | Integrated |

### Why Hybrid Wins

1. **Your data stays in GHL** - Research results, contacts, emails live where your users already work
2. **App data is independent** - User accounts, billing, usage don't depend on GHL
3. **Multi-tenant ready** - Each user has their own GHL location, API keys, settings
4. **Analytics & billing** - Track usage, charge per research credit, show ROI
5. **Scales to enterprise** - Can add teams, roles, white-labeling later

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Dashboard  │  │   Research  │  │    Email    │  │  Settings  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js API Routes)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  /api/auth  │  │/api/research│  │  /api/ghl   │  │ /api/usage │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    SUPABASE     │  │   AI SERVICES   │  │   GOHIGHLEVEL   │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │   Auth    │  │  │  │  OpenAI   │  │  │  │ Contacts  │  │
│  ├───────────┤  │  │  ├───────────┤  │  │  ├───────────┤  │
│  │   Users   │  │  │  │  Gemini   │  │  │  │ Companies │  │
│  ├───────────┤  │  │  ├───────────┤  │  │  ├───────────┤  │
│  │ API Keys  │  │  │  │  Tavily   │  │  │  │ Research  │  │
│  ├───────────┤  │  │  └───────────┘  │  │  │  (custom) │  │
│  │  Usage    │  │  │                 │  │  ├───────────┤  │
│  ├───────────┤  │  │                 │  │  │  Emails   │  │
│  │ Billing   │  │  │                 │  │  └───────────┘  │
│  └───────────┘  │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Data Flow

### Research Flow
```
1. User initiates research (company name, website)
2. Backend checks user credits (Supabase)
3. Backend fetches user's API keys (Supabase, decrypted)
4. Backend calls Tavily + AI provider
5. Research results returned
6. Backend logs usage (Supabase)
7. User can push to GHL (stored in GHL custom fields)
```

### Authentication Flow
```
1. User signs up (Google OAuth or email/password)
2. Supabase creates user record
3. User completes onboarding (GHL location ID, API keys)
4. Keys encrypted and stored in Supabase
5. User can now access research features
```

---

## What Goes Where

### Supabase (App Data)

| Table | Purpose | Why Supabase |
|-------|---------|--------------|
| `users` | User accounts | Auth source of truth |
| `organizations` | Multi-user teams | Multi-tenant isolation |
| `api_keys` | Encrypted API keys | Security - never in GHL |
| `user_settings` | Preferences | App-specific |
| `usage_records` | Token/credit usage | Billing & analytics |
| `subscriptions` | Stripe billing | Payment tracking |
| `research_metadata` | Research log (not results) | Analytics & history |
| `audit_logs` | Security events | Compliance |

### GoHighLevel (CRM Data)

| Entity | Purpose | Why GHL |
|--------|---------|---------|
| Contacts | Lead records | User's CRM |
| Companies | Business records | User's CRM |
| Custom Fields | Research JSON | Attached to contacts |
| Tags | Segmentation | User's workflow |
| Pipelines | Deal stages | User's sales process |
| Emails | Outreach history | User's CRM |

---

## Database Schema (Supabase)

### Core Tables

```sql
-- Organizations (multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (encrypted)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'gemini', 'anthropic', 'tavily', 'ghl'
  encrypted_key TEXT NOT NULL,
  key_hint TEXT, -- Last 4 chars for display
  is_valid BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- GHL Configuration
CREATE TABLE ghl_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,
  custom_field_mappings JSONB DEFAULT '{}',
  sync_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  default_ai_provider TEXT DEFAULT 'gemini',
  default_research_depth TEXT DEFAULT 'standard',
  default_email_tone TEXT DEFAULT 'professional',
  ui_preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Records
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  action_type TEXT NOT NULL, -- 'research', 'email', 'bulk_research'
  provider TEXT, -- AI provider used
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  credits_used DECIMAL(10,4) DEFAULT 0,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}', -- company name, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research Metadata (not the full results - those go to GHL)
CREATE TABLE research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  company_name TEXT NOT NULL,
  company_website TEXT,
  industry TEXT,
  research_depth TEXT,
  ai_provider TEXT,
  confidence_score DECIMAL(3,2),
  ghl_company_id TEXT, -- Reference to GHL
  ghl_pushed_at TIMESTAMPTZ,
  credits_used DECIMAL(10,4),
  duration_ms INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (Stripe)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_id TEXT NOT NULL, -- 'free', 'starter', 'pro', 'enterprise'
  status TEXT DEFAULT 'active',
  credits_limit INTEGER DEFAULT 100, -- Monthly credit limit
  credits_used INTEGER DEFAULT 0,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Users can only see their organization's data
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view org API keys"
  ON api_keys FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Only admins/owners can modify API keys
CREATE POLICY "Admins can modify API keys"
  ON api_keys FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin')
  );
```

---

## API Structure

### Authentication Endpoints
```
POST /api/auth/signup        - Create account
POST /api/auth/login         - Email/password login
GET  /api/auth/callback      - OAuth callback
POST /api/auth/logout        - Sign out
GET  /api/auth/me            - Current user
```

### Research Endpoints
```
POST /api/research           - Run single research
POST /api/research/bulk      - Run bulk research
GET  /api/research/history   - Get research history
GET  /api/research/:id       - Get research details
```

### GHL Integration
```
GET  /api/ghl/companies      - List companies
GET  /api/ghl/contacts       - List contacts
POST /api/ghl/push           - Push research to GHL
GET  /api/ghl/sync-status    - Check sync status
```

### Settings & Admin
```
GET  /api/settings           - Get user settings
PUT  /api/settings           - Update settings
GET  /api/api-keys           - List API keys (hints only)
POST /api/api-keys           - Add/update API key
DELETE /api/api-keys/:provider - Remove API key
```

### Billing
```
GET  /api/billing/usage      - Usage stats
GET  /api/billing/subscription - Current plan
POST /api/billing/checkout   - Create Stripe checkout
POST /api/billing/webhook    - Stripe webhooks
```

---

## Observability Layer

Based on enterprise architecture patterns, we'll implement a lightweight but comprehensive observability system.

### Metrics We Track

```typescript
// Usage Metrics
interface UsageMetric {
  organization_id: string;
  user_id: string;
  metric_type: 'research' | 'email' | 'ghl_sync' | 'api_call';
  provider?: string;  // 'openai', 'gemini', 'tavily', 'ghl'
  duration_ms: number;
  success: boolean;
  error_code?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

// System Health
interface HealthCheck {
  service: 'supabase' | 'openai' | 'tavily' | 'ghl';
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  checked_at: Date;
}
```

### Database Tables for Observability

```sql
-- API Call Logs (for debugging and analytics)
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX idx_api_logs_org_created ON api_logs(organization_id, created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint, created_at DESC);

-- Aggregate metrics (computed hourly/daily)
CREATE TABLE usage_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL, -- 'hourly', 'daily', 'monthly'
  metric_type TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  total_duration_ms BIGINT DEFAULT 0,
  total_credits DECIMAL(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, period_start, period_type, metric_type)
);
```

### Observability Service

```typescript
// lib/observability.ts
class ObservabilityService {
  // Log API calls
  async logApiCall(params: {
    organizationId: string;
    userId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    durationMs: number;
    error?: string;
  }) { /* ... */ }

  // Track research metrics
  async trackResearch(params: {
    organizationId: string;
    userId: string;
    companyName: string;
    researchType: 'quick' | 'standard' | 'deep';
    provider: string;
    durationMs: number;
    success: boolean;
    creditsUsed: number;
  }) { /* ... */ }

  // Get dashboard metrics
  async getDashboardMetrics(organizationId: string, days: number = 30) {
    return {
      totalResearches: number,
      successRate: number,
      avgDuration: number,
      creditUsage: number,
      topCompanies: string[],
      dailyTrend: { date: string, count: number }[]
    };
  }
}
```

### Error Tracking with Sentry

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
    }
    return event;
  }
});

// Wrap API handlers
export function withErrorTracking(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          url: req.url,
          method: req.method,
        }
      });
      throw error;
    }
  };
}
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkSupabase(),
    checkOpenAI(),
    checkTavily(),
    checkGHL(),
  ]);

  const results = {
    status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      supabase: checks[0],
      openai: checks[1],
      tavily: checks[2],
      ghl: checks[3],
    }
  };

  return Response.json(results);
}
```

---

## Security Considerations

### API Key Encryption
```typescript
// Use Supabase Vault or custom encryption
import { createCipheriv, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY; // 32 bytes

export function encryptApiKey(plainKey: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainKey), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function decryptApiKey(encryptedKey: string): string {
  const [ivHex, encryptedHex, tagHex] = encryptedKey.split(':');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8');
}
```

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Encryption
API_KEY_ENCRYPTION_KEY=32-byte-hex-string

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App
NEXT_PUBLIC_APP_URL=https://app.revifyoutreach.com
```

---

## Pricing Model Recommendation

### Credit-Based System
- **1 Research Credit** = 1 company research (any depth)
- **Email generation** = Free (included with research)
- **GHL sync** = Free (included)

### Plans

| Plan | Monthly | Credits | Features |
|------|---------|---------|----------|
| **Free** | $0 | 10 | Single user, basic research |
| **Starter** | $49 | 100 | 2 users, standard + deep research |
| **Pro** | $149 | 500 | 5 users, priority support, bulk research |
| **Enterprise** | Custom | Unlimited | White-label, API access, dedicated support |

---

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Set up Supabase project
2. Implement auth (Google OAuth + email)
3. Create database tables
4. Build API routes
5. Migrate localStorage to Supabase

### Phase 2: Feature Migration (Week 2)
1. Connect research to backend API
2. Implement usage tracking
3. Add API key management
4. Build settings UI

### Phase 3: Billing & Polish (Week 3)
1. Integrate Stripe
2. Add onboarding flow
3. Implement credit system
4. Add usage dashboard

### Phase 4: Launch Prep (Week 4)
1. Error logging (Sentry)
2. Documentation
3. Beta testing
4. Deploy to production

---

## File Structure (New)

```
/revify-outreach/
├── /app/                    # Next.js App Router
│   ├── /api/               # API routes
│   │   ├── /auth/
│   │   ├── /research/
│   │   ├── /ghl/
│   │   ├── /settings/
│   │   └── /billing/
│   ├── /(auth)/            # Auth pages (login, signup)
│   ├── /(dashboard)/       # Protected app pages
│   │   ├── /dashboard/
│   │   ├── /research/
│   │   ├── /bulk/
│   │   ├── /email/
│   │   ├── /history/
│   │   └── /settings/
│   ├── /onboarding/        # Onboarding wizard
│   └── layout.tsx
├── /components/
│   ├── /ui/                # Base UI components
│   ├── /research/          # Research components
│   ├── /bulk/              # Bulk research
│   ├── /settings/          # Settings components
│   └── /onboarding/        # Onboarding steps
├── /lib/
│   ├── supabase/           # Supabase client & helpers
│   ├── stripe/             # Stripe helpers
│   └── utils/              # Utility functions
├── /services/              # Business logic
├── /types/                 # TypeScript types
└── /styles/                # Global styles
```

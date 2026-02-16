# Revify Outreach: Pricing & Financial Model
## Investor Pitch Deck - Financial Analysis

---

## Executive Summary

**Product:** AI-powered B2B sales intelligence and outreach platform
**Target Market:** Mid-market sales teams ($50M-$2B companies)
**Core Value:** Research automation that takes 2-3 hours → 30 seconds

---

## Section 1: Pricing Model Comparison

### Model A: Pure SaaS (Platform-Managed API Keys)
You absorb API costs, charge premium subscription

### Model B: BYOK Hybrid
Free tier with platform keys, paid tiers require customer API keys

### Model C: Usage-Based + Platform Fee
Low base fee + per-research charges

### Model D: Pure BYOK Platform
All tiers require customer API keys, you charge platform access only

---

## Section 2: Cost Structure Analysis

### Fixed Costs (Monthly)

| Item | Cost | Notes |
|------|------|-------|
| Supabase Pro | $25 | Database + Auth |
| Vercel Pro | $20 | Hosting |
| Domain + SSL | $2 | Annual amortized |
| Monitoring (Sentry) | $26 | Error tracking |
| Analytics | $0-50 | PostHog/Mixpanel |
| **Total Fixed** | **~$125/mo** | |

### Variable Costs (Per Research)

| Research Type | OpenAI Cost | Tavily Cost | Total API Cost |
|---------------|-------------|-------------|----------------|
| Quick (1 credit) | $0.03 | $0.02 | **$0.05** |
| Standard (2 credits) | $0.08 | $0.04 | **$0.12** |
| Deep (5 credits) | $0.35 | $0.08 | **$0.43** |

**Weighted Average Cost per Research:** ~$0.15 (assuming 60% quick, 30% standard, 10% deep)

### Email Generation Cost
| Item | Cost |
|------|------|
| GPT-4o per email | ~$0.02 |

---

## Section 3: Revenue Models - Detailed Breakdown

---

### MODEL A: Pure SaaS (You Pay API Costs)

**Pricing:**
| Tier | Price | Credits | Your API Cost | Gross Margin |
|------|-------|---------|---------------|--------------|
| Free | $0 | 10 | $1.50 | -100% |
| Starter | $49/mo | 150 | $22.50 | 54% |
| Pro | $149/mo | 500 | $75.00 | 50% |
| Enterprise | $399/mo | 2000 | $300.00 | 25% |

**Pros:**
- Simple customer experience
- No BYOK friction
- Premium positioning

**Cons:**
- Margin compression at scale
- Heavy users kill profitability
- API cost volatility risk

**Year 1 Projection (Conservative):**

| Metric | Month 6 | Month 12 |
|--------|---------|----------|
| Free Users | 500 | 2,000 |
| Starter | 50 | 150 |
| Pro | 15 | 50 |
| Enterprise | 3 | 10 |
| **MRR** | $7,332 | $23,350 |
| **API Costs** | $3,825 | $12,175 |
| **Gross Profit** | $3,507 | $11,175 |
| **Gross Margin** | 48% | 48% |

**ARR Month 12:** $280,200
**Gross Profit:** $134,100

---

### MODEL B: BYOK Hybrid (Recommended)

**Pricing:**
| Tier | Price | Credits | API Cost to You | Gross Margin |
|------|-------|---------|-----------------|--------------|
| Free | $0 | 10 | $1.50 | -100% |
| Starter | $29/mo | 100 (or 150 BYOK) | $0* | **100%*** |
| Pro | $79/mo | 500 (or unlimited BYOK) | $0* | **100%*** |
| Enterprise | $199/mo | Unlimited BYOK | $0* | **100%*** |

*BYOK users pay their own API costs directly to OpenAI/Tavily

**Pros:**
- Near 100% gross margin on paid tiers
- Scales infinitely without cost risk
- Enterprise compliance friendly
- Transparent value proposition

**Cons:**
- Slightly more friction (API key setup)
- Lower perceived value for non-technical users
- Requires good onboarding UX

**Year 1 Projection (Conservative):**

| Metric | Month 6 | Month 12 |
|--------|---------|----------|
| Free Users | 500 | 2,000 |
| Starter (80% BYOK) | 60 | 200 |
| Pro (95% BYOK) | 20 | 75 |
| Enterprise (100% BYOK) | 5 | 15 |
| **MRR** | $4,315 | $14,660 |
| **API Costs** | $825 | $2,400 |
| **Gross Profit** | $3,490 | $12,260 |
| **Gross Margin** | 81% | 84% |

**ARR Month 12:** $175,920
**Gross Profit:** $147,120

**Key Insight:** Lower revenue but MUCH higher margins. More sustainable.

---

### MODEL C: Usage-Based + Platform Fee

**Pricing:**
| Tier | Base Fee | Per Research | Per Email |
|------|----------|--------------|-----------|
| Free | $0 | 10 free, then blocked | - |
| Pay-as-you-go | $0 | $0.50 | $0.10 |
| Pro | $49/mo | $0.25 | $0.05 |
| Enterprise | $149/mo | $0.15 | $0.03 |

**Pros:**
- Aligns cost with value delivered
- Low barrier to entry
- Heavy users pay more

**Cons:**
- Unpredictable revenue
- Complex billing
- Harder to forecast

**Year 1 Projection:**

| Metric | Month 6 | Month 12 |
|--------|---------|----------|
| Free Users | 800 | 3,000 |
| Pay-as-you-go | 100 | 400 |
| Pro | 30 | 100 |
| Enterprise | 5 | 15 |
| Avg researches/user | 45 | 50 |
| **MRR** | $6,925 | $24,750 |
| **API Costs** | $2,500 | $8,500 |
| **Gross Profit** | $4,425 | $16,250 |
| **Gross Margin** | 64% | 66% |

**ARR Month 12:** $297,000
**Gross Profit:** $195,000

---

### MODEL D: Pure BYOK Platform

**Pricing:**
| Tier | Price | Researches/mo | Features |
|------|-------|---------------|----------|
| Starter | $19/mo | 50 | Core research + email |
| Pro | $49/mo | 500 | + Bulk, GHL, templates |
| Enterprise | $149/mo | Unlimited | + Priority, custom prompts |

All tiers require BYOK. No free tier (trial only).

**Pros:**
- 100% gross margin
- Simplest billing
- Pure platform value
- No API risk whatsoever

**Cons:**
- Higher barrier to entry
- No free tier for viral growth
- Requires strong value demonstration

**Year 1 Projection:**

| Metric | Month 6 | Month 12 |
|--------|---------|----------|
| Trial Users | 300 | 1,000 |
| Starter | 40 | 120 |
| Pro | 25 | 80 |
| Enterprise | 8 | 25 |
| **MRR** | $3,177 | $8,405 |
| **API Costs** | $0 | $0 |
| **Gross Profit** | $3,177 | $8,405 |
| **Gross Margin** | **100%** | **100%** |

**ARR Month 12:** $100,860
**Gross Profit:** $100,860

---

## Section 4: Model Comparison Summary

| Model | ARR (Y1) | Gross Margin | Scalability | Customer Friction |
|-------|----------|--------------|-------------|-------------------|
| A: Pure SaaS | $280K | 48% | Medium | Low |
| B: BYOK Hybrid | $176K | 84% | High | Medium |
| C: Usage-Based | $297K | 66% | Medium | Low |
| D: Pure BYOK | $101K | 100% | Very High | High |

---

## Section 5: 3-Year Financial Projection (Model B - Recommended)

### Revenue Growth

| Year | Customers | MRR | ARR | Gross Margin |
|------|-----------|-----|-----|--------------|
| Y1 | 290 | $14.7K | $176K | 84% |
| Y2 | 950 | $52K | $624K | 89% |
| Y3 | 2,400 | $145K | $1.74M | 92% |

### Customer Mix (Year 3)

| Tier | Customers | % of Revenue |
|------|-----------|--------------|
| Free | 8,000 | 0% |
| Starter ($29) | 1,500 | 30% |
| Pro ($79) | 700 | 38% |
| Enterprise ($199) | 200 | 32% |

### Unit Economics

| Metric | Value |
|--------|-------|
| CAC (Customer Acquisition Cost) | $150 |
| LTV (Lifetime Value) | $1,200 |
| LTV:CAC Ratio | 8:1 |
| Payback Period | 2.5 months |
| Monthly Churn | 3% |
| Net Revenue Retention | 115% |

---

## Section 6: Why BYOK Hybrid Wins

### 1. Margin Protection at Scale

```
Traditional SaaS at 10K customers:
Revenue: $500K/mo
API Costs: $250K/mo
Gross Profit: $250K (50%)

BYOK Hybrid at 10K customers:
Revenue: $350K/mo
API Costs: $15K/mo (free tier only)
Gross Profit: $335K (96%)
```

### 2. Enterprise Sales Advantage

| Objection | BYOK Answer |
|-----------|-------------|
| "We can't send data to third parties" | "Use your own API keys - data goes direct to OpenAI" |
| "What are the hidden costs?" | "You see every API call on your OpenAI dashboard" |
| "How do we control spend?" | "Set your own rate limits in OpenAI console" |

### 3. Competitive Moat

- **Clay.com**: $149-499/mo, credits system, platform keys
- **Apollo.io**: $49-99/mo, limited AI features
- **Revify (BYOK)**: $29-199/mo, unlimited with own keys

**Positioning:** "The only sales intelligence platform that doesn't profit from your API usage"

---

## Section 7: Implementation Roadmap

### Phase 1: MVP Launch (Current)
- Free tier with platform keys (10 credits)
- Basic BYOK support exists
- Manual billing

### Phase 2: Stripe Integration (Week 1-2)
- Implement subscription billing
- Add usage tracking dashboard
- BYOK detection and credit unlocking

### Phase 3: Growth Features (Week 3-4)
- API cost transparency for users
- Team/seat management
- Usage analytics dashboard

### Phase 4: Enterprise (Month 2-3)
- SSO/SAML
- Custom contracts
- SLA guarantees
- Dedicated support

---

## Section 8: Key Metrics to Track

### North Star Metric
**Weekly Active Researches (WAR)** - measures actual value delivery

### Supporting Metrics

| Category | Metric | Target |
|----------|--------|--------|
| Acquisition | Signups/week | 100+ |
| Activation | Research within 24h | 40% |
| Retention | Week 4 retention | 25% |
| Revenue | MRR growth | 15% MoM |
| Efficiency | CAC:LTV | >5:1 |

---

## Section 9: Risk Analysis

### Model A Risks (Pure SaaS)
| Risk | Impact | Mitigation |
|------|--------|------------|
| API price increases | High | None - margin compression |
| Heavy users | High | Usage caps, tier upgrades |
| OpenAI outages | High | Multi-provider fallback |

### Model B Risks (BYOK Hybrid)
| Risk | Impact | Mitigation |
|------|--------|------------|
| BYOK setup friction | Medium | Excellent onboarding, video guides |
| Users blame you for API costs | Low | Clear cost attribution UI |
| Free tier abuse | Low | Strict limits, no BYOK on free |

---

## Section 10: Fundraising Context

### Seed Round Metrics Target

| Metric | Target | Model B Achievable |
|--------|--------|-------------------|
| ARR | $500K | Month 18 |
| MRR Growth | 15%+ MoM | Yes |
| Gross Margin | >70% | 84-92% |
| Net Retention | >100% | 115% |
| Customers | 500+ | Month 15 |

### Use of Funds (Hypothetical $1M Seed)

| Category | Amount | Purpose |
|----------|--------|---------|
| Engineering | $400K | 2 senior devs, 18 months |
| Sales/Marketing | $350K | Content, ads, 1 AE |
| Operations | $150K | Legal, accounting, tools |
| Buffer | $100K | Runway extension |

**Runway:** 24 months to Series A metrics

---

## Recommendation

### Go with Model B: BYOK Hybrid

**Why:**
1. **84%+ gross margins** - sustainable at any scale
2. **Enterprise-ready** - BYOK is a feature, not a limitation
3. **Competitive differentiation** - transparent pricing
4. **Lower risk** - no API cost volatility
5. **Faster path to profitability** - can bootstrap if needed

**Pricing to Launch:**

| Tier | Price | Value Prop |
|------|-------|------------|
| Free | $0 | 10 researches, platform keys |
| Starter | $29/mo | 100 credits OR unlimited with BYOK |
| Pro | $79/mo | 500 credits OR unlimited with BYOK + bulk + GHL |
| Enterprise | $199/mo | BYOK required, unlimited, priority support |

---

## Appendix: Competitive Landscape

| Competitor | Pricing | Model | Our Advantage |
|------------|---------|-------|---------------|
| Clay | $149-499/mo | Credits | 5x cheaper, BYOK option |
| Apollo | $49-99/mo | Seats | Deeper AI research |
| ZoomInfo | $15K+/yr | Enterprise | 10x cheaper, modern UX |
| Lusha | $29-51/mo | Credits | Better research quality |
| Seamless.ai | $147/mo | Credits | Transparent pricing |

---

*Document generated for Revify Outreach pitch deck preparation*
*Last updated: February 2026*

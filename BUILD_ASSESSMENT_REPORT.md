# Sniffd / Revify Outreach - Comprehensive Build Assessment Report
**Date:** February 11, 2026
**Team:** UX/UI Reviewer, Backend Architect, Security Specialist
**Status:** Enterprise v2 Branch Assessment

---

## Executive Summary

The Sniffd/Revify Outreach application demonstrates **solid architectural foundations** with Next.js 14 App Router, Supabase multi-tenancy, and thoughtful design system choices. However, the assessment identified **1 CRITICAL security vulnerability** (plaintext API key storage in onboarding), **8 HIGH priority issues** across security and backend domains, and **15 MEDIUM priority issues** spanning UX, backend, and security.

**Key Strengths:**
- Strong RLS-based multi-tenant architecture with proper organization scoping
- Distinctive design system (teal + gold palette, Space Grotesk typography)
- AES-256-GCM encryption infrastructure (when used correctly)
- Well-structured service layer with clear separation of concerns
- Good accessibility foundation (ARIA, focus management, reduced motion support)

**Critical Gaps:**
- Onboarding flow stores API keys in plaintext (bypasses encryption)
- No input validation on 65% of API routes (Zod schemas exist but unused)
- Missing dashboard landing page (first route in navigation is broken)
- No rate limiting on any endpoint (financial/abuse risk)
- Inconsistent error handling creates security information leakage

---

## Assessment Findings by Severity

### CRITICAL (Immediate Action Required)

#### 1. **[SECURITY] API Keys Stored as Plaintext via Onboarding**
- **Location:** `app/onboarding/page.tsx:142`, `app/onboarding/wizard/page.tsx:144`
- **Issue:** Both onboarding pages save keys with `encrypted_key: key` and `// TODO: Encrypt in production` comment. Settings page correctly calls `encryptApiKey()`, but onboarding bypasses it.
- **Impact:** All API keys entered during initial setup (OpenAI, Anthropic, Gemini, Tavily, Apollo) are stored as plaintext in the database. Database compromise immediately exposes all user credentials.
- **Effort:** LOW (15 minutes)
- **Fix:** Replace `encrypted_key: key` with `encrypted_key: encryptApiKey(key).encrypted` in both files

#### 2. **[UX] Missing Dashboard Landing Page**
- **Location:** Navigation links to `/dashboard` but no `app/(dashboard)/dashboard/page.tsx` exists
- **Issue:** First item in navigation returns 404 or shows fallback page
- **Impact:** Broken first impression for users immediately after login. Critical UX failure.
- **Effort:** MEDIUM (2-4 hours for proper metrics dashboard)
- **Fix:** Create dashboard page with key metrics (credits remaining, recent research, quick actions)

---

### HIGH PRIORITY (Fix This Sprint)

#### 3. **[BACKEND] No Input Validation on Core Routes**
- **Location:** `/api/research/route.ts`, `/api/email/route.ts`, `/api/ghl/push/route.ts`
- **Issue:** 65% of API routes accept `request.json()` without Zod validation. Schemas exist in `/lib/validation/index.ts` but only `/api/keys` uses them.
- **Impact:** Injection attacks, malformed data causing crashes, no type safety at runtime
- **Effort:** MEDIUM (1-2 hours to apply existing schemas to all routes)
- **Fix:** Apply `validateInput(researchInputSchema, body)` pattern to all routes

#### 4. **[BACKEND] Phantom Table References Break Features**
- **Location:** `/api/drafts/route.ts:31`, `/api/email/route.ts:142-167`, `/api/research/[id]/preview/route.ts:60-84`
- **Issue:** Code references `research_results` table that doesn't exist in schema (leftover from old version). Causes silent failures in email drafts and preview endpoints.
- **Impact:** Email drafts and research previews may fail unpredictably
- **Effort:** MEDIUM (2-3 hours to refactor to use `research_sessions.research_output`)
- **Fix:** Replace all `research_results` queries with JSONB queries on `research_sessions`

#### 5. **[BACKEND] Inconsistent Error Handling Across Routes**
- **Location:** All API routes - only `/api/keys` and `/api/prompts` use structured pattern
- **Issue:** 19 out of 21 routes use ad-hoc try/catch with raw `NextResponse.json({ error })` instead of the established `handleApiError()` pattern
- **Impact:** No Sentry integration, no structured error codes, no retry headers, security information leakage in error messages
- **Effort:** MEDIUM (3-4 hours to standardize all routes)
- **Fix:** Adopt `handleApiError()` + custom error classes across all routes

#### 6. **[SECURITY] IDOR Vulnerability in Research Preview**
- **Location:** `/app/api/research/[id]/preview/route.ts:37-41`
- **Issue:** Query filters by session ID but NOT by `organization_id`. Relies solely on RLS with no application-level defense-in-depth.
- **Impact:** If RLS is misconfigured, any user can access any org's research by guessing UUIDs
- **Effort:** LOW (5 minutes)
- **Fix:** Add `.eq('organization_id', userData.organization_id)` to query

#### 7. **[SECURITY] Auth Bypass Flag in Production Code**
- **Location:** `lib/supabase/middleware.ts:5-15`
- **Issue:** `const BYPASS_AUTH = false;` - Hardcoded auth bypass toggle exists. Single accidental change disables all auth.
- **Impact:** If set to true, entire app becomes publicly accessible
- **Effort:** LOW (2 minutes)
- **Fix:** Remove the bypass flag and conditional block entirely

#### 8. **[SECURITY] Missing Critical Security Headers**
- **Location:** `next.config.js:30-50`
- **Issue:** No HSTS, no CSP, no Permissions-Policy. Only X-Frame-Options and X-Content-Type-Options present.
- **Impact:** Vulnerable to protocol downgrade, XSS not mitigated, unrestricted browser features
- **Effort:** LOW (15 minutes)
- **Fix:** Add HSTS, CSP, and Permissions-Policy headers to Next.js config

#### 9. **[UX] Color Inconsistency (Emerald vs Teal)**
- **Location:** `settings/page.tsx` (multiple lines), `email/page.tsx:12`
- **Issue:** Design system defines teal (#0d5c63) as primary, but settings page uses `emerald-500` throughout. Brand dissonance.
- **Impact:** Settings page feels like a different app. Users perceive quality as lower.
- **Effort:** LOW (15 minutes - search and replace)
- **Fix:** Replace all `emerald-*` with `teal-*` equivalents

#### 10. **[UX] Apollo Page Contains Hardcoded Demo Data**
- **Location:** `apollo/page.tsx:127-150+`
- **Issue:** Page includes hardcoded `DEMO_PEOPLE` array (Sarah Chen, etc.) shown when API isn't configured
- **Impact:** Users see fake data that could be confused for real contacts. Trust issue.
- **Effort:** LOW (30 minutes)
- **Fix:** Replace with empty state + "Configure Apollo API key in Settings" message

---

### MEDIUM PRIORITY (Fix Next Sprint)

#### 11. **[SECURITY] No Rate Limiting on Any API Route**
- **Location:** All API routes (21 total)
- **Issue:** `RateLimitError` class exists but is never used. No rate limiting middleware implemented.
- **Impact:** Financial abuse (running up AI costs on `/api/research`), API key brute-forcing on `/api/validate-key`, DoS attacks
- **Effort:** HIGH (4-6 hours to implement Redis-based rate limiter)
- **Fix:** Implement Upstash Redis rate limiting middleware or Vercel rate limiting

#### 12. **[SECURITY] Unauthenticated Validate-Key Endpoint**
- **Location:** `/app/api/validate-key/route.ts`
- **Issue:** Endpoint accepts `{provider, key}` and validates against external APIs with NO auth check
- **Impact:** Unauthenticated attackers can use as API key validation oracle
- **Effort:** LOW (10 minutes)
- **Fix:** Add authentication check to route

#### 13. **[SECURITY] Hardcoded Crypto Salt**
- **Location:** `lib/crypto/index.ts:18`
- **Issue:** `scryptSync(encKey, 'revify-salt', 32)` uses static salt. If encryption key leaks, all keys across all environments can be decrypted.
- **Impact:** Single point of failure for encryption system
- **Effort:** MEDIUM (2-3 hours to implement per-key salt)
- **Fix:** Generate salt per operation and store with IV:authTag:encrypted

#### 14. **[BACKEND] Race Condition in Credit System**
- **Location:** `/api/research/route.ts:110-121` and `:326-329`
- **Issue:** Read credits → check → consume. Between read and write, concurrent request can also pass check. The `increment_credits_used()` DB function exists but isn't used.
- **Impact:** Users can exceed credit limits via concurrent requests
- **Effort:** LOW (15 minutes)
- **Fix:** Use `increment_credits_used()` DB function or SELECT FOR UPDATE

#### 15. **[BACKEND] Duplicated Auth Boilerplate**
- **Location:** Every API route (8-12 lines repeated)
- **Issue:** All routes repeat the same auth pattern (getUser → check org → return 401/400)
- **Impact:** Maintenance burden, inconsistency risk
- **Effort:** MEDIUM (2-3 hours to create and apply middleware wrapper)
- **Fix:** Extract into `withAuth(handler)` middleware function

#### 16. **[BACKEND] N+1 Query Pattern in Research Route**
- **Location:** `/api/research/route.ts`
- **Issue:** 10 sequential database queries per request (user, org, subscription, keys, prompt, insert, etc.). Many could be parallelized.
- **Impact:** Slower response times (sequential round-trips to DB)
- **Effort:** MEDIUM (1-2 hours)
- **Fix:** Use `Promise.all()` for independent queries

#### 17. **[BACKEND] Email Drafts Scoped to User Instead of Organization**
- **Location:** `email_drafts` table schema
- **Issue:** Drafts are scoped to `user_id` only, not `organization_id`. If user changes org, drafts follow them (potential data leakage).
- **Impact:** Multi-tenant data isolation violation
- **Effort:** MEDIUM (2-3 hours including migration)
- **Fix:** Add `organization_id` column to `email_drafts` table and update RLS policies

#### 18. **[UX] Monolithic Page Components (1,400+ lines)**
- **Location:** `research/page.tsx` (1,433 lines), `bulk/page.tsx` (~800 lines)
- **Issue:** Single component with 20+ state variables and all display logic inline
- **Impact:** Maintenance difficulty, performance (full page re-renders), cognitive overload
- **Effort:** HIGH (8-12 hours to refactor into sub-components)
- **Fix:** Extract into `ResearchForm`, `ResearchResults`, `CompanyProfileCard`, etc.

#### 19. **[UX] Inconsistent Component Usage (CSS vs React)**
- **Location:** Multiple pages mix `.btn-primary` CSS classes with `<Button>` React components
- **Issue:** Two parallel systems exist - CSS class-based (globals.css) and React component-based (components/ui/). No clear standard.
- **Impact:** Maintenance nightmare, changes don't propagate consistently
- **Effort:** HIGH (6-8 hours to standardize)
- **Fix:** Migrate all CSS class usage to React component system

#### 20. **[UX] Settings Page Mobile Padding + Touch Targets**
- **Location:** `settings/page.tsx:404,409` (padding), `:419` (tabs)
- **Issue:** Fixed `px-8` without responsive variants (unlike all other pages). Tab buttons missing `min-h-[44px]`.
- **Impact:** Mobile UI cramped, tabs violate touch target guidelines
- **Effort:** LOW (10 minutes)
- **Fix:** Change to `px-4 sm:px-8` and add `min-h-[44px]` to tabs

#### 21. **[UX] Email Outreach Requires GHL (No Fallback)**
- **Location:** `components/email/OutreachWizard.tsx`
- **Issue:** OutreachWizard immediately loads GHL companies. If not configured, users see empty/error state with no alternative.
- **Impact:** Feature completely gated behind GHL setup
- **Effort:** MEDIUM (3-4 hours)
- **Fix:** Add "Connect GHL first" message with settings link, or allow manual company entry

#### 22. **[BACKEND] Direct Fetch Instead of OpenAI SDK**
- **Location:** `researchServiceV3_2.ts:214-227`
- **Issue:** Uses raw `fetch('https://api.openai.com/v1/chat/completions')` instead of OpenAI SDK (which is already a dependency)
- **Impact:** No retry logic, no streaming, no proper error typing
- **Effort:** LOW (30 minutes)
- **Fix:** Replace with OpenAI SDK calls

#### 23. **[BACKEND] QueueService Uses Class Pattern (Breaks Convention)**
- **Location:** `lib/queue/queueService.ts`
- **Issue:** Only class-based service in entire codebase. All others use functional exports.
- **Impact:** Architectural inconsistency, memory note explicitly states "functional export pattern"
- **Effort:** MEDIUM (1-2 hours)
- **Fix:** Refactor to functional pattern matching other services

#### 24. **[SECURITY] Error Messages Expose Internal Details**
- **Location:** Multiple routes (research preview, drafts, GHL, Apollo)
- **Issue:** Catch blocks return `error.message` directly to clients
- **Impact:** Database errors, connection strings, file paths could leak
- **Effort:** LOW (covered by #5 - standardize error handling)
- **Fix:** Use `handleApiError()` consistently

#### 25. **[SECURITY] Gemini API Key in URL Query Parameter**
- **Location:** `/app/api/validate-key/route.ts:164`
- **Issue:** `https://generativelanguage.googleapis.com/v1/models?key=${key}` - Key passed as query param
- **Impact:** Keys logged in server/proxy/CDN access logs
- **Effort:** LOW (10 minutes)
- **Fix:** Use `Authorization: Bearer` header instead

---

### LOW PRIORITY (Technical Debt / Polish)

#### 26. **[UX] Queue Page Not in Navigation**
- **Location:** `/queue` page exists but not in `Sidebar.tsx` navigation array
- **Fix:** Add to navigation or remove page if deprecated

#### 27. **[UX] Navigation Label Clarity**
- **Issue:** "Analytics" (links to `/history`) is actually research history, not analytics
- **Fix:** Rename to "Research History" or "History"

#### 28. **[UX] No Breadcrumbs on Detail Pages**
- **Issue:** History detail page has back arrow but no breadcrumb context
- **Fix:** Add breadcrumb: `Analytics > Company Name`

#### 29. **[UX] Settings Tabs Missing ARIA Pattern**
- **Issue:** Tab buttons lack `role="tablist"` / `role="tab"` / `aria-selected`
- **Fix:** Add proper ARIA tab pattern

#### 30. **[BACKEND] Schema Consolidation**
- **Issue:** Main `schema.sql` is incomplete. Migrations add 5+ tables (research_queue, ghl_companies, apollo_imports) not in main schema.
- **Fix:** Merge all migration tables into main schema file

#### 31. **[BACKEND] No Soft Delete Pattern**
- **Issue:** All deletes are hard deletes (drafts, keys). Enterprise apps need audit trail.
- **Fix:** Add `deleted_at` column and soft delete pattern

#### 32. **[BACKEND] Missing Retry/Backoff on External APIs**
- **Issue:** All external API calls (OpenAI, Tavily, GHL, Apollo) have no retry logic
- **Fix:** Add exponential backoff for transient failures

#### 33. **[BACKEND] GHL Companies Fetched Live (No Cache Usage)**
- **Issue:** `/api/ghl/companies` fetches live every time. Cache table `ghl_companies` exists but unused.
- **Fix:** Use cache table with TTL refresh

#### 34. **[BACKEND] Fire-and-Forget Import Risk**
- **Issue:** Apollo import uses `.then().catch()` fire-and-forget. If function is killed, job stuck in 'processing' forever.
- **Fix:** Add stuck job detector or dead letter queue

#### 35. **[SECURITY] Dashboard Route Protection Uses Allowlist**
- **Issue:** Middleware protects explicit paths. New routes must be manually added or they're unprotected. `/apollo` is NOT in the list.
- **Fix:** Use denylist pattern (protect everything under `/(dashboard)/`)

#### 36. **[SECURITY] `select('*')` Over-Fetching**
- **Issue:** Multiple routes select all columns from sensitive tables (ghl_config includes encrypted keys)
- **Fix:** Select only needed columns explicitly

#### 37. **[SECURITY] No Audit Logging for Sensitive Operations**
- **Issue:** `audit_logs` table exists but nothing writes to it. No forensic capability.
- **Fix:** Log failed auth, key access, role changes

#### 38. **[SECURITY] Legacy Plaintext Key Fallback**
- **Issue:** `decryptApiKey()` silently accepts plaintext if no `:` separator. Masks the onboarding bug.
- **Fix:** Throw error for plaintext, force migration

---

## Consolidated Priority Action Plan

### 🚨 IMMEDIATE (Deploy Hotfix)
**Estimated Time:** 30 minutes
**Impact:** Critical security vulnerabilities

1. Fix onboarding plaintext API key storage (#1)
   - Files: `app/onboarding/page.tsx`, `app/onboarding/wizard/page.tsx`
   - Change: `encrypted_key: encryptApiKey(key).encrypted`

2. Remove auth bypass flag (#7)
   - File: `lib/supabase/middleware.ts`
   - Change: Delete lines 5-15

3. Fix IDOR in research preview (#6)
   - File: `app/api/research/[id]/preview/route.ts`
   - Change: Add `.eq('organization_id', userData.organization_id)`

---

### ⚡ THIS SPRINT (Week 1-2)
**Estimated Time:** 20-24 hours
**Impact:** High-priority functionality and security

**Backend (12 hours):**
4. Apply Zod validation to all routes (#3) - 2 hours
5. Fix phantom `research_results` table references (#4) - 3 hours
6. Standardize error handling (#5) - 4 hours
7. Extract auth middleware (#15) - 3 hours

**Security (4 hours):**
8. Add security headers (#8) - 0.5 hours
9. Add auth to validate-key endpoint (#12) - 0.5 hours
10. Implement rate limiting (#11) - 3 hours

**UX (6 hours):**
11. Create dashboard landing page (#2) - 3 hours
12. Fix color inconsistency (emerald → teal) (#9) - 0.5 hours
13. Remove Apollo demo data (#10) - 0.5 hours
14. Settings mobile padding + touch targets (#20) - 0.5 hours
15. Add error boundaries to pages (#9 from UX report) - 2 hours

---

### 📋 NEXT SPRINT (Week 3-4)
**Estimated Time:** 25-30 hours
**Impact:** Medium-priority architecture and UX improvements

**Backend (12 hours):**
16. Fix credit system race condition (#14) - 0.5 hours
17. Parallelize sequential queries (#16) - 2 hours
18. Add organization_id to email_drafts (#17) - 3 hours
19. Replace raw fetch with OpenAI SDK (#22) - 0.5 hours
20. Refactor QueueService to functional (#23) - 2 hours
21. Add retry/backoff to external APIs (#32) - 3 hours
22. Consolidate schema.sql (#30) - 1 hour

**Security (4 hours):**
23. Improve crypto salt handling (#13) - 3 hours
24. Fix Gemini key in URL (#25) - 0.5 hours
25. Add audit logging (#37) - 0.5 hours

**UX (12 hours):**
26. Break up monolithic page components (#18) - 10 hours
27. Fix email wizard GHL requirement (#21) - 2 hours

---

### 🔧 ONGOING (Technical Debt)
**Estimated Time:** 30-40 hours
**Impact:** Long-term maintainability

28. Standardize component system (CSS vs React) (#19) - 8 hours
29. Add GHL cache usage (#33) - 2 hours
30. Add soft delete pattern (#31) - 4 hours
31. Fix dashboard route protection allowlist (#35) - 2 hours
32. Add breadcrumbs to detail pages (#28) - 1 hour
33. Improve navigation labels (#27) - 0.5 hours
34. Fix Queue page navigation (#26) - 0.5 hours
35. Add settings ARIA patterns (#29) - 1 hour
36. Fix select('*') over-fetching (#36) - 2 hours
37. Add stuck job detector for imports (#34) - 3 hours
38. Remove plaintext key fallback (#38) - 1 hour

---

## Risk Assessment

### Current Production Risks (If Deployed)

**CRITICAL:**
- Plaintext API keys in database (onboarding path) - **Data breach exposure**
- Missing dashboard page - **Broken user onboarding**

**HIGH:**
- No rate limiting - **Financial abuse / DoS**
- Unauthenticated key validation endpoint - **Key brute-forcing**
- No input validation on research/email/GHL routes - **Injection attacks**

**MEDIUM:**
- Credit race condition - **Users can exceed limits**
- Missing security headers - **XSS/downgrade attacks**
- Error messages leaking internals - **Information disclosure**

---

## Testing Recommendations

### Security Testing Required
1. **Penetration test** the API key encryption flow (onboarding vs settings)
2. **Load test** research endpoint without rate limiting to measure abuse potential
3. **IDOR testing** on all `[id]` routes (research, drafts, apollo imports)
4. **SQL injection fuzzing** on all routes without Zod validation
5. **Concurrent request testing** for credit system race condition

### UX Testing Required
1. **First-run experience** with fresh account (dashboard landing, onboarding encryption)
2. **Mobile device testing** on settings page (padding, touch targets)
3. **Color consistency review** across all pages post-fix
4. **Error state testing** with missing API keys (GHL, Apollo)

### Performance Testing Required
1. **Research route latency** with sequential DB queries
2. **Vercel function timeout risk** on deep research (3+ external API calls)
3. **GHL sync** with large contact lists (1000+ businesses)

---

## Architecture Recommendations

### Pattern Standardization Needed
1. **Error Handling:** Adopt `handleApiError()` + custom error classes universally
2. **Input Validation:** Apply Zod schemas to 100% of API routes
3. **Auth Middleware:** Extract into reusable `withAuth()` wrapper
4. **Service Pattern:** Migrate all class-based services to functional exports
5. **Component System:** Standardize on React components, deprecate CSS classes in pages

### Missing Infrastructure
1. **Rate Limiting:** Implement Upstash Redis or Vercel rate limiter
2. **Audit Logging:** Actually use the `audit_logs` table for sensitive operations
3. **Error Monitoring:** Ensure Sentry integration works with standardized error handling
4. **Caching Layer:** Use existing cache tables (ghl_companies) instead of live fetches

---

## What's Working Well

### Architecture Strengths
✅ **Multi-tenant RLS** - Proper organization scoping on all tables with `get_user_org_id()` helper
✅ **Encryption infrastructure** - AES-256-GCM implementation is solid (when used)
✅ **Service layer separation** - Clean boundaries between routes, services, and DB
✅ **Research pipeline** - V3.2 hybrid engine is well-structured with clear stages
✅ **202 + polling pattern** - Apollo imports use correct async pattern for long operations

### UX Strengths
✅ **Design system foundation** - Distinctive teal + gold palette, excellent typography
✅ **Accessibility** - Skip links, ARIA, focus management, reduced motion support
✅ **Mobile-first nav** - Bottom nav with overflow menu is the right pattern
✅ **Progressive loading** - Research progress steps with time estimation
✅ **Reusable components** - Button, Card, Badge, Input are well-designed

### Security Strengths
✅ **Supabase auth** - Cookie-based SSR (not JWT in localStorage)
✅ **UUID-based IDs** - Not sequential, reduces enumeration risk
✅ **Role-based access** - Owner/admin checks on sensitive operations
✅ **Credit enforcement** - Subscription checks before expensive operations

---

## Conclusion

The build is **functional but not production-ready**. The critical security issue (plaintext onboarding keys) MUST be fixed before any production deployment. The missing dashboard page breaks the user's first experience.

With the **Immediate + This Sprint** fixes (24.5 hours total), the app reaches **production-viable** state:
- Security vulnerabilities patched
- Core user flows functional
- Input validation and error handling standardized
- Rate limiting prevents abuse
- Brand consistency restored

The **Next Sprint** work (29.5 hours) addresses architectural debt and improves maintainability. The **Ongoing** items (30-40 hours) are long-term quality improvements that can be prioritized based on user feedback and team velocity.

**Recommended Next Steps:**
1. Deploy the **Immediate** hotfix (30 min) to staging environment
2. Run security tests (penetration test, IDOR testing, concurrent credit test)
3. Execute **This Sprint** plan (20-24 hours) with daily progress reviews
4. User acceptance testing before production deployment

---

**Report Generated By:**
- UX/UI Reviewer (15 issues identified, 10 positive findings)
- Backend Architect (18 issues identified, 10 architectural strengths)
- Security Specialist (14 issues identified, 10 positive security findings)

**Total Issues:** 47 findings (1 critical, 8 high, 17 medium, 21 low)
**Total Remediation Estimate:** 75-95 hours across 4 sprints

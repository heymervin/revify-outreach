# Deep Research Prompt Fixes - Version 2

**Date:** 2026-02-25
**File:** `lib/research/researchServiceV3_2.ts`
**Status:** ✅ FIXED - Ready for testing

---

## Problems Identified from Live Test

Tested the prompt with 3 companies (Alamo Group Inc., All American Poly, Almo Corporation) and found:

1. **Intent Signals:** 2 out of 3 companies returned ZERO intent signals despite clear evidence in the data
2. **Public Company Revenue:** Failed to find SEC filing data for Alamo Group (NYSE: ALG)
3. **Date Format:** AI outputted "Dec 11, 2025" instead of required "2025-12-11" format

---

## Fixes Applied

### Fix #1: Intent Signal Search Protocol - **MAJOR REWRITE**

**Problem:** AI was reporting "searched and found nothing" when obvious signals existed in the provided data.

**Solution:** Added explicit 4-step protocol:

**STEP 1:** Extract obvious signals from data you ALREADY HAVE
- Added explicit examples: "scraping", "$166M acquisition", "new production line"
- Created "PERFECT fit" category with examples (manual scraping, spreadsheets)
- Listed specific phrases to search for: "scraping product listings", "manually tracking"

**STEP 2:** Check if you have 3+ signals (if yes, skip to STEP 3)

**STEP 3:** Apply fit score calibration guide
- **perfect**: Manual work Revology automates, active vendor RFP
- **good**: Hiring pricing/analytics roles, M&A integration
- **moderate**: General growth signals

**STEP 4:** Validate and flag gaps

**KEY ADDITION:**
> "**IMPORTANT**: If you found M&A activity, capex investments, or manual work descriptions in the provided data but did NOT add them as intent signals, you have FAILED this protocol."

This creates accountability - the AI can't claim it searched if it ignored signals in the data.

---

### Fix #2: Public Company Revenue - **CLARIFIED SEARCH PROCESS**

**Problem:** AI wasn't finding SEC filing data for public companies.

**Solution:** Added explicit 4-step search process:

**STEP 1:** Identify if company is public
- Search for ticker symbol, stock exchange (NYSE, NASDAQ)
- Search for "publicly traded", "public company"

**STEP 2:** Search for revenue in priority order
- Look for "10-K", "10-Q", "annual report", "SEC filing"
- Look for Yahoo Finance, Bloomberg, investor relations data
- Look for earnings reports, quarterly results

**STEP 3:** Format correctly with source citation

**STEP 4:** If not found, flag CRITICAL FAILURE
> "DO NOT proceed without flagging as: 'CRITICAL ERROR: Public company revenue not found despite mandatory search of SEC filings, annual reports, and financial databases in the provided text.'"

Added clarification:
> "This likely means the data sources are incomplete, not that revenue doesn't exist"

---

### Fix #3: Date Format Enforcement - **ADDED CONVERSION TABLE**

**Problem:** AI was outputting "Dec 11, 2025" instead of "2025-12-11".

**Solution:** Added explicit conversion requirements:

**CONVERSION TABLE:**
```
"Jan" OR "January" → "01"
"Feb" OR "February" → "02"
"Mar" OR "March" → "03"
[... all 12 months]
"Dec" OR "December" → "12"
```

**CONVERSION EXAMPLES:**
- ❌ "Dec 11, 2025" → ✅ "2025-12-11"
- ❌ "December 2025" → ✅ "2025-12"
- ❌ "Q3 2025" (if October) → ✅ "2025-10"

**FINAL CHECK:**
> "Scan every 'date' and 'timeframe' field in your JSON output. If you see ANY date that doesn't match YYYY-MM or YYYY-MM-DD format, you have FAILED this requirement. Go back and convert it."

---

### Fix #4: PRE-OUTPUT VALIDATION CHECKLIST - **NEW ADDITION**

Added a final validation checklist the AI must complete BEFORE outputting JSON:

```
### ✅ PUBLIC COMPANY REVENUE CHECK
- [ ] If ownership_type is "Public", did you find revenue from SEC/financial sources?
- [ ] If not found, did you flag "CRITICAL ERROR" in research_gaps?

### ✅ INTENT SIGNALS CHECK
- [ ] Did you scan the provided data for M&A, capex, acquisitions, manual scraping?
- [ ] If you found any, did you add them to intent_signals array?
- [ ] Do you have at least 3 intent signals (or flagged the gap)?
- [ ] Did you apply fit_score correctly (manual work = perfect, not good)?

### ✅ DATE FORMAT CHECK
- [ ] Scan EVERY date field in recent_signals array
- [ ] Scan EVERY timeframe field in intent_signals array
- [ ] Are ALL dates in YYYY-MM or YYYY-MM-DD format?
- [ ] Did you convert "Dec 11, 2025" to "2025-12-11"?
```

**Enforcement:**
> "If ANY checkbox above is unchecked, DO NOT OUTPUT YET. Go back and fix the issue."

---

## Key Improvements Summary

| Issue | Before | After |
|-------|--------|-------|
| **Intent Signal Detection** | Vague "search across data" | Explicit 4-step protocol with examples and accountability |
| **Public Company Revenue** | Generic "must find revenue" | 4-step search process with specific sources and failure clarification |
| **Date Format** | "Use YYYY-MM format" | Conversion table + examples + final scan requirement |
| **Validation** | None | Pre-output checklist with forced verification |

---

## Changes to Prompt Structure

### Added Sections:
1. **STEP 1: Extract obvious intent signals** (lines ~192-220)
2. **CRITICAL: Execute web search if data not in provided sources** (line ~176)
3. **YOU MUST CONVERT ALL DATES** with conversion table (lines ~247-287)
4. **PRE-OUTPUT VALIDATION CHECKLIST** (lines ~289-315)

### Strengthened Language:
- Changed "Look for" → "STEP 1: Extract", "STEP 2: Search", "STEP 3: Apply"
- Added "you have FAILED this protocol" accountability statements
- Added "DO NOT OUTPUT YET" enforcement for validation failures
- Added specific examples throughout (not just abstract instructions)

---

## Test Plan

### Test Case 1: Alamo Group Inc. (Public Company)
**Expected Results:**
- ✅ Revenue: "$1.58B (FY2024 from 10-K)" (if in SERP data) OR flag as CRITICAL ERROR
- ✅ Intent signals: At least 3 (Petersen acquisition $166.5M, pricing pressure from earnings, etc.)
- ✅ Dates: All in "2025-12-XX" format, not "Dec XX, 2025"

### Test Case 2: Almo Corporation (Manual Scraping)
**Expected Results:**
- ✅ Intent signal: "Scraping product listings" = **PERFECT fit** (not good, not moderate)
- ✅ Signal_type: "technology_initiative" or "hiring"
- ✅ Fit justification: "Manual work that Revology automates"

### Test Case 3: All American Poly (Already Working)
**Expected Results:**
- ✅ Should continue to work (3 intent signals)
- ✅ Dates: Verify "2025-02" not "Feb 2025"

---

## Deployment Checklist

Before deploying to production:

1. ✅ **Code Review:** Verify prompt changes are syntactically correct
2. ⏳ **Unit Test:** Run test with Alamo Group, Almo Corp, All American Poly
3. ⏳ **Compare Results:** Ensure all 3 fixes now pass
4. ⏳ **Regression Test:** Test 2-3 other companies to ensure no new issues
5. ⏳ **Model Comparison:** If Gemini still fails, test with OpenAI GPT-4o
6. ⏳ **Production Deploy:** Update live research endpoint

---

## Risk Assessment

**LOW RISK** - Changes are additive and clarifying:
- No changes to data pipeline or schema
- No changes to API endpoints or integrations
- Only strengthening existing instructions with more explicit steps
- Backward compatible (output schema unchanged)

**Potential Issues:**
- Prompt length increased ~30% (more tokens = slightly higher cost)
- If model still doesn't follow instructions, may need to switch from Gemini to OpenAI
- Very strict validation might cause some research to fail if dates are truly unavailable

**Mitigation:**
- Monitor API costs after deployment
- Have fallback to OpenAI ready if Gemini doesn't improve
- Research gaps will clearly document when strict requirements can't be met

---

## Next Steps

1. Test the updated prompt with the same 3 companies
2. Compare results to the original test
3. If all 3 fixes pass, deploy to production
4. If issues persist, consider switching from Gemini to OpenAI model

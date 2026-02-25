/**
 * Live Deep Research Test Script
 *
 * Tests the Deep research prompt fixes with real API calls.
 * Validates all three critical fixes:
 * 1. Intent signal detection
 * 2. Public company revenue detection
 * 3. Date format compliance
 *
 * Usage:
 *   npm run ts-node scripts/test_deep_research_live.ts -- "Alamo Group Inc." "Manufacturing"
 *
 * Or run with default test companies:
 *   npm run ts-node scripts/test_deep_research_live.ts
 */

import { performDeepResearchV3_2 } from '../lib/research/researchServiceV3_2';
import { ResearchInputV3 } from '../types/researchTypesV3';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Test companies with known characteristics
const TEST_COMPANIES = [
  {
    name: 'Alamo Group Inc.',
    industry: 'Manufacturing',
    website: 'https://www.alamo-group.com',
    expectedOwnership: 'Public',
    expectedRevenue: true, // Should find SEC filing revenue
    description: 'Public company (NYSE: ALG) - should find $1.5B+ revenue from 10-K',
  },
  {
    name: 'Almo Corporation',
    industry: 'Distribution',
    website: 'https://www.almo.com',
    expectedOwnership: 'Private',
    description: 'Should detect "scraping product listings" as PERFECT fit intent signal',
  },
  {
    name: 'All American Poly',
    industry: 'Manufacturing',
    website: 'https://www.allamericanpoly.com',
    expectedOwnership: 'Private',
    description: 'General manufacturing - should find 3+ intent signals',
  },
];

/**
 * Validate date format
 */
function isValidDateFormat(date: string): boolean {
  const validPattern = /^\d{4}-(0[1-9]|1[0-2])(-([0-2][0-9]|3[0-1]))?$/;
  return validPattern.test(date);
}

/**
 * Analyze research output and report on fix compliance
 */
function analyzeResearch(research: any, companyName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 ANALYSIS: ${companyName}\n`);

  const profile = research.company_profile || {};
  const intentSignals = research.intent_signals || [];
  const recentSignals = research.recent_signals || [];
  const researchGaps = research.research_gaps || [];

  // Company Profile
  console.log(`🏢 Company Profile:`);
  console.log(`   Name: ${profile.confirmed_name || 'Unknown'}`);
  console.log(`   Industry: ${profile.industry || 'Unknown'}`);
  console.log(`   Ownership: ${profile.ownership_type || 'Unknown'}`);
  console.log(`   Revenue: ${profile.estimated_revenue || 'Not found'}`);
  if (profile.revenue_source) {
    console.log(`   Revenue Source: ${profile.revenue_source}`);
  }

  // Fix #1: Intent Signal Detection
  console.log(`\n✅ FIX #1: INTENT SIGNAL DETECTION`);
  console.log(`   Count: ${intentSignals.length} signals`);
  console.log(`   Status: ${intentSignals.length >= 3 ? '✅ PASS' : '❌ FAIL'} (target: 3+)`);

  if (intentSignals.length > 0) {
    console.log(`\n   Signals Found:`);
    intentSignals.slice(0, 5).forEach((signal: any, idx: number) => {
      console.log(`   ${idx + 1}. [${signal.fit_score?.toUpperCase() || 'UNKNOWN'}] ${signal.description?.slice(0, 80)}...`);
      console.log(`      Type: ${signal.signal_type}, Timeframe: ${signal.timeframe}`);
    });
    if (intentSignals.length > 5) {
      console.log(`   ... and ${intentSignals.length - 5} more`);
    }
  } else {
    console.log(`   ⚠️  No intent signals found!`);
    if (researchGaps.length > 0) {
      console.log(`   Research gaps noted: ${researchGaps[0]}`);
    }
  }

  // Fix #2: Public Company Revenue
  if (profile.ownership_type === 'Public') {
    console.log(`\n✅ FIX #2: PUBLIC COMPANY REVENUE`);
    const hasRevenue = !!profile.estimated_revenue && profile.estimated_revenue !== 'Not found';
    const hasSource = !!profile.revenue_source;
    const pass = hasRevenue && hasSource;

    console.log(`   Revenue Found: ${hasRevenue ? '✅ YES' : '❌ NO'}`);
    console.log(`   Source Cited: ${hasSource ? '✅ YES' : '❌ NO'}`);
    console.log(`   Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);

    if (!pass) {
      const criticalError = researchGaps.find((gap: string) =>
        gap.includes('CRITICAL ERROR') && gap.includes('Public company revenue')
      );
      if (criticalError) {
        console.log(`   ✅ Critical error properly flagged: "${criticalError}"`);
      } else {
        console.log(`   ❌ No critical error flag found in research_gaps`);
      }
    }
  } else {
    console.log(`\n⏭️  FIX #2: SKIPPED (not a public company)`);
  }

  // Fix #3: Date Format Compliance
  console.log(`\n✅ FIX #3: DATE FORMAT COMPLIANCE`);

  const allDates: string[] = [];

  recentSignals.forEach((signal: any) => {
    if (signal.date) allDates.push(signal.date);
  });

  intentSignals.forEach((signal: any) => {
    if (signal.timeframe) allDates.push(signal.timeframe);
  });

  const invalidDates = allDates.filter(date => !isValidDateFormat(date));

  console.log(`   Total Dates: ${allDates.length}`);
  console.log(`   Invalid Dates: ${invalidDates.length}`);
  console.log(`   Status: ${invalidDates.length === 0 ? '✅ PASS' : '❌ FAIL'} (target: 0 invalid)`);

  if (invalidDates.length > 0) {
    console.log(`\n   ❌ Invalid date formats found:`);
    invalidDates.forEach(date => {
      console.log(`      "${date}"`);
    });
  } else if (allDates.length > 0) {
    console.log(`   ✅ Sample valid dates: ${allDates.slice(0, 3).join(', ')}`);
  }

  // Overall Assessment
  const intentPass = intentSignals.length >= 3;
  const revenuePass = profile.ownership_type !== 'Public' ||
    (!!profile.estimated_revenue && !!profile.revenue_source);
  const datePass = invalidDates.length === 0;
  const overallPass = intentPass && revenuePass && datePass;

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📋 OVERALL: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Fix #1 (Intent Signals): ${intentPass ? '✅' : '❌'}`);
  console.log(`   Fix #2 (Public Revenue): ${revenuePass ? '✅' : '❌'}`);
  console.log(`   Fix #3 (Date Format): ${datePass ? '✅' : '❌'}`);
  console.log(`${'='.repeat(70)}\n`);

  return overallPass;
}

/**
 * Run live test
 */
async function runLiveTest() {
  const args = process.argv.slice(2);

  let companies = TEST_COMPANIES;

  // Allow specifying a custom company
  if (args.length >= 2 && !args[0].startsWith('--')) {
    companies = [
      {
        name: args[0],
        industry: args[1],
        website: args[2] || '',
        description: 'Custom test company',
      },
    ];
  }

  console.log(`\n🚀 Deep Research Live Test\n`);
  console.log(`Testing ${companies.length} companies...\n`);

  // Check for required API keys
  const tavilyKey = process.env.TAVILY_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!tavilyKey) {
    console.error('❌ TAVILY_API_KEY not found in .env.local');
    process.exit(1);
  }

  if (!geminiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API keys found\n');

  const results: { company: string; pass: boolean }[] = [];

  for (const company of companies) {
    console.log(`\n${'▶'.repeat(35)}`);
    console.log(`\n🔬 Testing: ${company.name}`);
    console.log(`   Expected: ${company.description}\n`);

    const input: ResearchInputV3 = {
      companyName: company.name,
      industry: company.industry,
      website: company.website,
    };

    try {
      console.log('⏳ Running Deep research (this may take 2-3 minutes)...\n');

      const startTime = Date.now();

      const result = await performDeepResearchV3_2(
        input,
        tavilyKey,
        null, // No custom prompt - use hardcoded prompt with fixes
        {
          provider: 'gemini',
          model: 'gemini-3-pro-preview',
        },
        (progress) => {
          console.log(`   ${progress}`);
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Research completed in ${duration}s`);

      // Analyze results
      const pass = analyzeResearch(result, company.name);
      results.push({ company: company.name, pass });

    } catch (error: any) {
      console.error(`\n❌ Error during research:`, error.message);
      results.push({ company: company.name, pass: false });
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n📈 FINAL SUMMARY\n`);

  const passCount = results.filter(r => r.pass).length;
  const totalCount = results.length;
  const passRate = (passCount / totalCount * 100).toFixed(1);

  results.forEach(result => {
    console.log(`   ${result.pass ? '✅' : '❌'} ${result.company}`);
  });

  console.log(`\n   Pass Rate: ${passCount}/${totalCount} (${passRate}%)`);
  console.log(`   Target: >70%\n`);

  if (parseFloat(passRate) >= 70) {
    console.log(`✅ SUCCESS - Prompt fixes are working correctly!\n`);
  } else {
    console.log(`❌ FAILURE - Fixes not meeting quality threshold.\n`);
    console.log(`   Consider:\n`);
    console.log(`   1. Switching from Gemini to OpenAI GPT-4o`);
    console.log(`   2. Further strengthening prompt instructions`);
    console.log(`   3. Rolling back to previous version\n`);
  }

  console.log(`${'='.repeat(70)}\n`);
}

// Run the test
runLiveTest().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

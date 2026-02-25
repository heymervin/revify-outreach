/**
 * Deep Research Quality Monitor
 *
 * Validates the three critical fixes in production Deep research results:
 * 1. Intent signal detection (3+ signals)
 * 2. Public company revenue detection
 * 3. Date format compliance (YYYY-MM or YYYY-MM-DD)
 *
 * Usage:
 *   npm run ts-node scripts/monitor_deep_research_quality.ts
 *
 * Options:
 *   --limit N    Number of recent sessions to check (default: 20)
 *   --verbose    Show detailed analysis for each session
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface QualityReport {
  sessionId: string;
  companyName: string;
  createdAt: string;
  ownershipType: string | null;

  // Fix #1: Intent Signals
  intentSignalCount: number;
  intentSignalPass: boolean;

  // Fix #2: Public Company Revenue
  hasRevenue: boolean;
  revenueSource: string | null;
  publicCompanyRevenuePass: boolean;

  // Fix #3: Date Format Compliance
  totalDates: number;
  invalidDates: string[];
  dateFormatPass: boolean;

  // Overall
  overallPass: boolean;
}

/**
 * Validate date format (YYYY-MM or YYYY-MM-DD)
 */
function isValidDateFormat(date: string): boolean {
  if (!date) return false;

  // Valid patterns: YYYY-MM or YYYY-MM-DD
  const validPattern = /^\d{4}-(0[1-9]|1[0-2])(-([0-2][0-9]|3[0-1]))?$/;
  return validPattern.test(date);
}

/**
 * Extract all dates from research output
 */
function extractAllDates(research: any): string[] {
  const dates: string[] = [];

  // Recent signals dates
  if (research.recent_signals && Array.isArray(research.recent_signals)) {
    research.recent_signals.forEach((signal: any) => {
      if (signal.date) dates.push(signal.date);
    });
  }

  // Intent signals timeframes
  if (research.intent_signals && Array.isArray(research.intent_signals)) {
    research.intent_signals.forEach((signal: any) => {
      if (signal.timeframe) dates.push(signal.timeframe);
    });
  }

  return dates;
}

/**
 * Analyze a single research session
 */
function analyzeSession(session: any): QualityReport {
  const research = typeof session.research_output === 'string'
    ? JSON.parse(session.research_output)
    : session.research_output;

  const companyProfile = research.company_profile || {};
  const ownershipType = companyProfile.ownership_type;
  const intentSignals = research.intent_signals || [];
  const revenue = companyProfile.estimated_revenue;
  const revenueSource = companyProfile.revenue_source;

  // Fix #1: Intent Signal Detection
  const intentSignalCount = intentSignals.length;
  const intentSignalPass = intentSignalCount >= 3;

  // Fix #2: Public Company Revenue
  const isPublic = ownershipType === 'Public';
  const hasRevenue = !!revenue && revenue !== 'Not found in sources';
  const publicCompanyRevenuePass = !isPublic || (isPublic && hasRevenue && !!revenueSource);

  // Fix #3: Date Format Compliance
  const allDates = extractAllDates(research);
  const invalidDates = allDates.filter(date => !isValidDateFormat(date));
  const dateFormatPass = invalidDates.length === 0;

  // Overall pass: all three fixes must pass
  const overallPass = intentSignalPass && publicCompanyRevenuePass && dateFormatPass;

  return {
    sessionId: session.id,
    companyName: session.company_name,
    createdAt: session.created_at,
    ownershipType,
    intentSignalCount,
    intentSignalPass,
    hasRevenue,
    revenueSource,
    publicCompanyRevenuePass,
    totalDates: allDates.length,
    invalidDates,
    dateFormatPass,
    overallPass,
  };
}

/**
 * Main monitoring function
 */
async function monitorQuality() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 20;
  const verbose = args.includes('--verbose');

  console.log(`\n🔍 Deep Research Quality Monitor\n`);
  console.log(`Analyzing last ${limit} Deep research sessions...\n`);

  // Fetch recent Deep research sessions
  const { data: sessions, error } = await supabase
    .from('research_sessions')
    .select('id, company_name, research_type, research_output, created_at')
    .eq('research_type', 'deep')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching sessions:', error);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log('⚠️  No Deep research sessions found.');
    return;
  }

  console.log(`✅ Found ${sessions.length} sessions\n`);

  // Analyze each session
  const reports: QualityReport[] = [];

  for (const session of sessions) {
    try {
      const report = analyzeSession(session);
      reports.push(report);

      if (verbose) {
        console.log(`\n📊 ${report.companyName} (${report.sessionId.slice(0, 8)}...)`);
        console.log(`   Created: ${new Date(report.createdAt).toLocaleDateString()}`);
        console.log(`   Ownership: ${report.ownershipType || 'Unknown'}`);
        console.log(`   Intent Signals: ${report.intentSignalCount} ${report.intentSignalPass ? '✅' : '❌'}`);
        console.log(`   Public Company Revenue: ${report.publicCompanyRevenuePass ? '✅' : '❌'}`);
        console.log(`   Date Format: ${report.totalDates} dates, ${report.invalidDates.length} invalid ${report.dateFormatPass ? '✅' : '❌'}`);
        if (report.invalidDates.length > 0) {
          console.log(`      Invalid dates: ${report.invalidDates.join(', ')}`);
        }
        console.log(`   Overall: ${report.overallPass ? '✅ PASS' : '❌ FAIL'}`);
      }
    } catch (err) {
      console.error(`❌ Error analyzing session ${session.id}:`, err);
    }
  }

  // Calculate aggregate metrics
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📈 AGGREGATE METRICS (${reports.length} sessions)\n`);

  const intentSignalPassCount = reports.filter(r => r.intentSignalPass).length;
  const publicCompanies = reports.filter(r => r.ownershipType === 'Public');
  const publicCompanyRevenuePassCount = publicCompanies.filter(r => r.publicCompanyRevenuePass).length;
  const dateFormatPassCount = reports.filter(r => r.dateFormatPass).length;
  const overallPassCount = reports.filter(r => r.overallPass).length;

  const intentSignalRate = (intentSignalPassCount / reports.length * 100).toFixed(1);
  const publicRevenueRate = publicCompanies.length > 0
    ? (publicCompanyRevenuePassCount / publicCompanies.length * 100).toFixed(1)
    : 'N/A';
  const dateFormatRate = (dateFormatPassCount / reports.length * 100).toFixed(1);
  const overallPassRate = (overallPassCount / reports.length * 100).toFixed(1);

  console.log(`Fix #1: Intent Signal Detection`);
  console.log(`  ${intentSignalPassCount}/${reports.length} sessions with 3+ signals (${intentSignalRate}%)`);
  console.log(`  Target: >70% | Status: ${parseFloat(intentSignalRate) >= 70 ? '✅ PASS' : '⚠️  NEEDS IMPROVEMENT'}\n`);

  console.log(`Fix #2: Public Company Revenue`);
  console.log(`  ${publicCompanyRevenuePassCount}/${publicCompanies.length} public companies with revenue found (${publicRevenueRate}%)`);
  if (publicCompanies.length > 0) {
    console.log(`  Target: >90% | Status: ${parseFloat(publicRevenueRate) >= 90 ? '✅ PASS' : '⚠️  NEEDS IMPROVEMENT'}\n`);
  } else {
    console.log(`  No public companies in sample\n`);
  }

  console.log(`Fix #3: Date Format Compliance`);
  console.log(`  ${dateFormatPassCount}/${reports.length} sessions with all dates valid (${dateFormatRate}%)`);
  console.log(`  Target: 100% | Status: ${parseFloat(dateFormatRate) === 100 ? '✅ PASS' : '⚠️  NEEDS IMPROVEMENT'}\n`);

  console.log(`Overall Quality`);
  console.log(`  ${overallPassCount}/${reports.length} sessions passed all checks (${overallPassRate}%)`);
  console.log(`  Target: >70% | Status: ${parseFloat(overallPassRate) >= 70 ? '✅ PASS' : '⚠️  NEEDS IMPROVEMENT'}\n`);

  // Average intent signal count
  const avgIntentSignals = (reports.reduce((sum, r) => sum + r.intentSignalCount, 0) / reports.length).toFixed(1);
  console.log(`Average Intent Signals per Company: ${avgIntentSignals}`);
  console.log(`  Before fixes: ~1.0 | Target: >3.5\n`);

  // Summary
  console.log(`${'='.repeat(60)}\n`);

  if (parseFloat(overallPassRate) >= 70) {
    console.log(`✅ QUALITY THRESHOLD MET - Prompt fixes are working correctly!\n`);
  } else {
    console.log(`⚠️  QUALITY THRESHOLD NOT MET - Consider rollback or model switch.\n`);
  }

  // Failed sessions details
  const failedSessions = reports.filter(r => !r.overallPass);
  if (failedSessions.length > 0 && failedSessions.length <= 5) {
    console.log(`\n❌ Failed Sessions (${failedSessions.length}):\n`);
    failedSessions.forEach(report => {
      console.log(`   • ${report.companyName}`);
      if (!report.intentSignalPass) console.log(`      - Only ${report.intentSignalCount} intent signals`);
      if (!report.publicCompanyRevenuePass) console.log(`      - Public company missing revenue`);
      if (!report.dateFormatPass) console.log(`      - ${report.invalidDates.length} invalid date(s): ${report.invalidDates.join(', ')}`);
    });
    console.log('');
  }
}

// Run the monitor
monitorQuality().catch(console.error);

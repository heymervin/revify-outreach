/**
 * Bulk Upload Companies to GHL
 *
 * Uses Tavily to search for real companies, OpenAI to structure data,
 * and GHL objects API to create business records.
 *
 * Usage: npx tsx scripts/bulkUploadCompanies.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
const TAVILY_API_KEY = env.TAVILY_API_KEY;
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const GHL_API_KEY = env.GHL_API_KEY;
const GHL_LOCATION_ID = env.GHL_LOCATION_ID;

if (!TAVILY_API_KEY || !OPENAI_API_KEY || !GHL_API_KEY || !GHL_LOCATION_ID) {
  console.error('Missing required env vars. Check .env.local');
  process.exit(1);
}

interface Company {
  name: string;
  industry: string;
  website: string;
}

// ---- Fetch with timeout and retry ----
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeoutMs = 60000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return resp;
    } catch (err: any) {
      console.error(`  Attempt ${attempt}/${retries} failed: ${err.message || err}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error('All retries exhausted');
}

// ---- Tavily Search ----
async function tavilySearch(query: string): Promise<{ title: string; url: string; content: string }[]> {
  try {
    const resp = await fetchWithRetry('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: 10,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error(`Tavily error for "${query}": ${err}`);
      return [];
    }
    const data = await resp.json();
    return (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.content || '',
    }));
  } catch (err: any) {
    console.error(`Tavily search failed for "${query}": ${err.message}`);
    return [];
  }
}

// ---- OpenAI Extract ----
async function extractCompanies(searchResults: string, industry: string): Promise<Company[]> {
  const prompt = `You are a data extraction assistant. From the following web search results about ${industry} companies, extract a list of real company names and their official websites.

RULES:
- Only include real, verifiable companies
- Each company must have a name and website URL
- Do NOT include news sites, blog sites, or list aggregator sites as companies
- Do NOT include duplicate companies
- If you can't find a company's website from the search results, use your knowledge to provide it
- Return ONLY companies in the ${industry} industry

SEARCH RESULTS:
${searchResults}

Return a JSON array of objects with "name" and "website" fields. Example:
[{"name": "Procter & Gamble", "website": "https://www.pg.com"}]

Return ONLY the JSON array, no other text.`;

  try {
    const resp = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`OpenAI error: ${err}`);
      return [];
    }

    const data = await resp.json();
    const content = data.choices[0]?.message?.content || '[]';
    const parsed = JSON.parse(content);
    const companies = Array.isArray(parsed) ? parsed : (parsed.companies || parsed.data || []);
    return companies
      .filter((c: any) => c.name && c.website)
      .map((c: any) => ({
        name: c.name.trim(),
        industry,
        website: c.website.trim(),
      }));
  } catch (err: any) {
    console.error(`OpenAI extraction failed: ${err.message}`);
    return [];
  }
}

// ---- GHL Upload ----
async function uploadToGHL(company: Company): Promise<boolean> {
  try {
    const resp = await fetchWithRetry('https://services.leadconnectorhq.com/objects/business/records/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        properties: {
          name: company.name,
          industry: company.industry,
          website: company.website,
        },
      }),
    }, 2, 30000);

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`GHL upload failed for "${company.name}": ${err}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`GHL upload error for "${company.name}": ${err.message}`);
    return false;
  }
}

// ---- Search Queries per Industry ----
const SEARCH_QUERIES: Record<string, string[]> = {
  Manufacturing: [
    'top 100 largest manufacturing companies USA list',
    'biggest manufacturing companies America by revenue 2024',
    'Fortune 500 manufacturing companies list',
    'medium sized manufacturing companies United States',
    'industrial manufacturing companies list with websites',
    'aerospace manufacturing companies USA',
    'automotive manufacturing companies America',
    'chemical manufacturing companies USA list',
    'food manufacturing companies United States largest',
    'electronics manufacturing companies USA list',
    'steel metal manufacturing companies America',
    'pharmaceutical manufacturing companies USA list',
    'plastics packaging manufacturing companies',
    'machinery equipment manufacturing companies USA',
  ],
  Retail: [
    'top 100 largest retail companies USA list',
    'biggest retail chains America 2024',
    'Fortune 500 retail companies list',
    'specialty retail companies United States',
    'e-commerce retail companies USA list',
    'grocery retail companies America largest',
    'fashion apparel retail companies USA',
    'home improvement retail companies list',
    'electronics retail companies America',
    'department store retail companies USA',
    'discount retail companies United States list',
    'luxury retail companies America',
    'sporting goods retail companies USA',
    'pet retail companies USA list',
  ],
  'Consumer Packaged Goods': [
    'top 100 CPG companies USA list',
    'largest consumer packaged goods companies America',
    'FMCG companies United States list 2024',
    'food and beverage CPG companies USA',
    'household products companies America list',
    'personal care CPG companies USA',
    'snack food companies United States',
    'beverage companies America largest list',
    'cleaning products companies USA',
    'health wellness CPG companies list',
    'beauty cosmetics companies America',
    'organic natural food companies USA list',
    'frozen food companies United States',
    'dairy companies USA largest list',
  ],
  Distribution: [
    'top 100 largest distribution companies USA',
    'wholesale distribution companies America list',
    'food distribution companies United States largest',
    'industrial distribution companies USA list',
    'electronics distribution companies America',
    'pharmaceutical distribution companies USA',
    'building materials distribution companies list',
    'chemical distribution companies America',
    'automotive parts distribution companies USA',
    'medical supply distribution companies list',
    'janitorial supply distribution companies',
    'electrical supply distribution companies USA',
    'HVAC distribution companies America list',
    'plumbing distribution companies USA',
  ],
};

// ---- Main ----
async function main() {
  const outputPath = path.join(__dirname, 'companies.json');

  // Load existing companies if re-running
  let allCompanies: Company[] = [];
  if (fs.existsSync(outputPath)) {
    allCompanies = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    console.log(`Loaded ${allCompanies.length} existing companies from cache`);
  }

  const existingNames = new Set(allCompanies.map(c => c.name.toLowerCase()));

  // Phase 1: Search & Extract
  if (allCompanies.length < 900) {
    console.log('\n=== Phase 1: Searching for companies ===\n');

    for (const [industry, queries] of Object.entries(SEARCH_QUERIES)) {
      const industryCount = allCompanies.filter(c => c.industry === industry).length;
      if (industryCount >= 250) {
        console.log(`${industry}: Already have ${industryCount} companies, skipping search`);
        continue;
      }

      console.log(`\nSearching for ${industry} companies...`);

      for (const query of queries) {
        console.log(`  Query: "${query}"`);
        const results = await tavilySearch(query);

        if (results.length === 0) {
          console.log(`  No results`);
          continue;
        }

        // Combine search results into text for OpenAI
        const searchText = results
          .map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
          .join('\n\n---\n\n');

        const companies = await extractCompanies(searchText, industry);

        let newCount = 0;
        for (const company of companies) {
          const key = company.name.toLowerCase();
          if (!existingNames.has(key)) {
            existingNames.add(key);
            allCompanies.push(company);
            newCount++;
          }
        }

        console.log(`  Found ${companies.length} companies, ${newCount} new`);

        // Save progress after each query
        fs.writeFileSync(outputPath, JSON.stringify(allCompanies, null, 2));

        // Rate limit: small delay between queries
        await new Promise(r => setTimeout(r, 500));
      }

      const finalCount = allCompanies.filter(c => c.industry === industry).length;
      console.log(`${industry}: Total ${finalCount} companies`);
    }

    console.log(`\nTotal companies collected: ${allCompanies.length}`);

    // Print breakdown
    const breakdown: Record<string, number> = {};
    for (const c of allCompanies) {
      breakdown[c.industry] = (breakdown[c.industry] || 0) + 1;
    }
    console.log('Breakdown:', breakdown);
  }

  // Phase 2: Upload to GHL
  console.log('\n=== Phase 2: Uploading to GHL ===\n');

  // Track which companies have been uploaded
  const uploadedPath = path.join(__dirname, 'uploaded.json');
  let uploadedNames: Set<string> = new Set();
  if (fs.existsSync(uploadedPath)) {
    const uploaded = JSON.parse(fs.readFileSync(uploadedPath, 'utf-8'));
    uploadedNames = new Set(uploaded);
    console.log(`${uploadedNames.size} companies already uploaded`);
  }

  const toUpload = allCompanies.filter(c => !uploadedNames.has(c.name.toLowerCase()));
  console.log(`${toUpload.length} companies to upload\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toUpload.length; i++) {
    const company = toUpload[i];
    const success = await uploadToGHL(company);

    if (success) {
      successCount++;
      uploadedNames.add(company.name.toLowerCase());

      // Save uploaded state every 10 companies
      if (successCount % 10 === 0) {
        fs.writeFileSync(uploadedPath, JSON.stringify([...uploadedNames], null, 2));
      }
    } else {
      failCount++;
    }

    // Progress log
    if ((i + 1) % 25 === 0 || i === toUpload.length - 1) {
      console.log(`Progress: ${i + 1}/${toUpload.length} (${successCount} success, ${failCount} failed)`);
    }

    // Rate limit: 200ms between GHL calls
    await new Promise(r => setTimeout(r, 200));
  }

  // Final save
  fs.writeFileSync(uploadedPath, JSON.stringify([...uploadedNames], null, 2));

  console.log(`\n=== Done ===`);
  console.log(`Total uploaded: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Companies data saved to: ${outputPath}`);
}

main().catch(console.error);

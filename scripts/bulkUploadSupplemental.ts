/**
 * Supplemental bulk upload - adds more companies to reach ~1000
 * Focuses on industries with fewer companies (Retail, CPG)
 *
 * Usage: npx tsx scripts/bulkUploadSupplemental.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

interface Company {
  name: string;
  industry: string;
  website: string;
}

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
    if (!resp.ok) { console.error(`Tavily error: ${await resp.text()}`); return []; }
    const data = await resp.json();
    return (data.results || []).map((r: any) => ({ title: r.title || '', url: r.url || '', content: r.content || '' }));
  } catch (err: any) { console.error(`Tavily failed: ${err.message}`); return []; }
}

async function extractCompanies(searchResults: string, industry: string): Promise<Company[]> {
  const prompt = `You are a data extraction assistant. From the following web search results about ${industry} companies, extract a list of real company names and their official websites.

RULES:
- Only include real, verifiable companies
- Each company must have a name and website URL
- Do NOT include news sites, blog sites, or list aggregator sites
- Do NOT include duplicate companies
- If you can't find a website from search results, use your knowledge to provide it
- Return ONLY companies in the ${industry} industry

SEARCH RESULTS:
${searchResults}

Return JSON: {"companies": [{"name": "...", "website": "https://..."}]}`;

  try {
    const resp = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) { console.error(`OpenAI error: ${await resp.text()}`); return []; }
    const data = await resp.json();
    const content = data.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const companies = Array.isArray(parsed) ? parsed : (parsed.companies || parsed.data || []);
    return companies.filter((c: any) => c.name && c.website).map((c: any) => ({
      name: c.name.trim(), industry, website: c.website.trim(),
    }));
  } catch (err: any) { console.error(`OpenAI failed: ${err.message}`); return []; }
}

async function uploadToGHL(company: Company): Promise<boolean> {
  try {
    const resp = await fetchWithRetry('https://services.leadconnectorhq.com/objects/business/records/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GHL_API_KEY}`, 'Version': '2021-07-28' },
      body: JSON.stringify({ locationId: GHL_LOCATION_ID, properties: { name: company.name, industry: company.industry, website: company.website } }),
    }, 2, 30000);
    if (!resp.ok) { console.error(`GHL failed for "${company.name}": ${await resp.text()}`); return false; }
    return true;
  } catch (err: any) { console.error(`GHL error for "${company.name}": ${err.message}`); return false; }
}

// Supplemental queries targeting gaps
const SUPPLEMENTAL_QUERIES: Record<string, string[]> = {
  Retail: [
    'outdoor recreation retail companies USA',
    'furniture home decor retail companies America',
    'automotive retail companies USA list',
    'bookstore retail companies United States',
    'jewelry retail companies America',
    'convenience store chains USA list',
    'office supply retail companies',
    'toy retail companies United States',
    'craft hobby retail companies America',
    'shoe footwear retail companies USA',
    'vitamin supplement retail companies',
    'wholesale club retail companies USA',
    'dollar store chains America list',
    'fast fashion retail companies USA',
    'organic grocery retail companies',
  ],
  'Consumer Packaged Goods': [
    'pet food companies USA list',
    'baby products companies America',
    'candy confectionery companies United States',
    'cereal companies USA list',
    'condiment sauce companies America',
    'paper products companies USA',
    'soap detergent companies United States',
    'energy drink companies America list',
    'wine spirits companies USA',
    'coffee tea companies United States list',
    'ice cream companies America',
    'meat processing companies USA list',
    'baked goods companies United States',
    'vitamin supplement brands companies USA',
    'canned food companies America list',
  ],
  Manufacturing: [
    'textile manufacturing companies USA list',
    'furniture manufacturing companies America',
    'glass manufacturing companies United States',
    'paper pulp manufacturing companies USA',
    'semiconductor manufacturing companies America list',
    'defense manufacturing companies USA',
    'medical device manufacturing companies',
    'battery manufacturing companies USA list',
  ],
  Distribution: [
    'wine spirits distribution companies USA',
    'office supply distribution companies America',
    'packaging distribution companies USA list',
    'safety equipment distribution companies',
    'restaurant supply distribution companies USA',
    'pet supply distribution companies America',
    'IT hardware distribution companies USA list',
    'flooring distribution companies United States',
  ],
};

async function main() {
  const outputPath = path.join(__dirname, 'companies.json');
  const uploadedPath = path.join(__dirname, 'uploaded.json');

  let allCompanies: Company[] = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  const existingNames = new Set(allCompanies.map(c => c.name.toLowerCase()));
  let uploadedNames: Set<string> = new Set();
  if (fs.existsSync(uploadedPath)) {
    uploadedNames = new Set(JSON.parse(fs.readFileSync(uploadedPath, 'utf-8')));
  }

  console.log(`Starting with ${allCompanies.length} companies`);
  const breakdown: Record<string, number> = {};
  for (const c of allCompanies) { breakdown[c.industry] = (breakdown[c.industry] || 0) + 1; }
  console.log('Current:', breakdown);

  // Phase 1: More searches
  console.log('\n=== Supplemental Search ===\n');
  const newCompanies: Company[] = [];

  for (const [industry, queries] of Object.entries(SUPPLEMENTAL_QUERIES)) {
    console.log(`\nSearching for more ${industry} companies...`);
    for (const query of queries) {
      console.log(`  Query: "${query}"`);
      const results = await tavilySearch(query);
      if (results.length === 0) { console.log(`  No results`); continue; }

      const searchText = results.map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n---\n\n');
      const companies = await extractCompanies(searchText, industry);

      let newCount = 0;
      for (const company of companies) {
        const key = company.name.toLowerCase();
        if (!existingNames.has(key)) {
          existingNames.add(key);
          allCompanies.push(company);
          newCompanies.push(company);
          newCount++;
        }
      }
      console.log(`  Found ${companies.length}, ${newCount} new`);
      fs.writeFileSync(outputPath, JSON.stringify(allCompanies, null, 2));
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\nNew companies found: ${newCompanies.length}`);
  console.log(`Total: ${allCompanies.length}`);
  const finalBreakdown: Record<string, number> = {};
  for (const c of allCompanies) { finalBreakdown[c.industry] = (finalBreakdown[c.industry] || 0) + 1; }
  console.log('Breakdown:', finalBreakdown);

  // Phase 2: Upload new companies
  const toUpload = newCompanies.filter(c => !uploadedNames.has(c.name.toLowerCase()));
  console.log(`\n=== Uploading ${toUpload.length} new companies ===\n`);

  let success = 0, fail = 0;
  for (let i = 0; i < toUpload.length; i++) {
    const ok = await uploadToGHL(toUpload[i]);
    if (ok) { success++; uploadedNames.add(toUpload[i].name.toLowerCase()); }
    else { fail++; }
    if ((i + 1) % 25 === 0 || i === toUpload.length - 1) {
      console.log(`Progress: ${i + 1}/${toUpload.length} (${success} success, ${fail} failed)`);
    }
    if (success % 10 === 0) fs.writeFileSync(uploadedPath, JSON.stringify([...uploadedNames], null, 2));
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(uploadedPath, JSON.stringify([...uploadedNames], null, 2));
  console.log(`\n=== Done ===`);
  console.log(`New uploaded: ${success}, Failed: ${fail}`);
  console.log(`Grand total in GHL: ${uploadedNames.size}`);
}

main().catch(console.error);

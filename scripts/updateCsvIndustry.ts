/**
 * Update industry for CSV-uploaded companies to "Actual Data"
 *
 * Usage: npx tsx scripts/updateCsvIndustry.ts
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
const GHL_API_KEY = env.GHL_API_KEY;
const GHL_LOCATION_ID = env.GHL_LOCATION_ID;

if (!GHL_API_KEY || !GHL_LOCATION_ID) {
  console.error('Missing GHL_API_KEY or GHL_LOCATION_ID in .env.local');
  process.exit(1);
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeoutMs = 30000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return resp;
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error('All retries exhausted');
}

interface BusinessRecord {
  id: string;
  properties: { name?: string; industry?: string };
}

async function searchAllBusinesses(): Promise<BusinessRecord[]> {
  const all: BusinessRecord[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const resp = await fetchWithRetry('https://services.leadconnectorhq.com/objects/business/records/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
      },
      body: JSON.stringify({ locationId: GHL_LOCATION_ID, page, pageLimit: 100 }),
    });

    if (!resp.ok) {
      console.error('Search failed:', await resp.text());
      break;
    }

    const data = await resp.json();
    const records = data.records || [];
    all.push(...records);

    if (records.length < 100) hasMore = false;
    else page++;
  }

  return all;
}

async function updateIndustry(recordId: string, industry: string): Promise<boolean> {
  const resp = await fetchWithRetry(
    `https://services.leadconnectorhq.com/objects/business/records/${recordId}?locationId=${GHL_LOCATION_ID}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
      },
      body: JSON.stringify({ properties: { industry } }),
    }
  );

  if (!resp.ok) {
    console.error(`  Failed to update ${recordId}:`, await resp.text());
    return false;
  }
  return true;
}

async function main() {
  // Load the names we uploaded from CSV
  const uploadedPath = path.join(__dirname, 'csv_uploaded.json');
  if (!fs.existsSync(uploadedPath)) {
    console.error('No csv_uploaded.json found. Run uploadCsvCompanies.ts first.');
    process.exit(1);
  }
  const uploadedNames: string[] = JSON.parse(fs.readFileSync(uploadedPath, 'utf-8'));
  const nameSet = new Set(uploadedNames.map(n => n.toLowerCase()));

  console.log(`Looking for ${nameSet.size} CSV-uploaded companies in GHL...\n`);

  const allRecords = await searchAllBusinesses();
  console.log(`Found ${allRecords.length} total business records in GHL`);

  // Filter to only the ones from our CSV upload
  const toUpdate = allRecords.filter(r => r.properties.name && nameSet.has(r.properties.name.toLowerCase()));
  console.log(`${toUpdate.length} match the CSV upload — updating industry to "Actual Data"\n`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < toUpdate.length; i++) {
    const record = toUpdate[i];
    process.stdout.write(`[${i + 1}/${toUpdate.length}] ${record.properties.name}... `);

    if (await updateIndustry(record.id, 'Actual Data')) {
      success++;
      console.log('OK');
    } else {
      fail++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${success}`);
  console.log(`Failed: ${fail}`);
}

main().catch(console.error);

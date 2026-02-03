/**
 * Upload Companies from CSV to GHL
 *
 * Reads Company_Research_Results.csv and creates business records in GHL.
 *
 * Usage: npx tsx scripts/uploadCsvCompanies.ts
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

interface CsvCompany {
  emailDomain: string;
  name: string;
  industry: string;
  website: string;
}

function parseCsv(filePath: string): CsvCompany[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  // Skip header row
  const dataLines = lines.slice(1);
  const companies: CsvCompany[] = [];

  for (const line of dataLines) {
    // Handle quoted fields (e.g. "Omni Cable, LLC")
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    if (fields.length >= 4 && fields[1]) {
      companies.push({
        emailDomain: fields[0],
        name: fields[1],
        industry: fields[2],
        website: fields[3],
      });
    }
  }

  return companies;
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
      console.error(`  Attempt ${attempt}/${retries} failed: ${err.message || err}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error('All retries exhausted');
}

async function uploadToGHL(company: CsvCompany): Promise<boolean> {
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
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`  FAILED "${company.name}": ${err}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`  ERROR "${company.name}": ${err.message}`);
    return false;
  }
}

async function main() {
  const csvPath = '/Users/mervindecastro/cowork/Company_Research_Results.csv';

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const companies = parseCsv(csvPath);
  console.log(`Parsed ${companies.length} companies from CSV\n`);

  // Track uploads to allow resume
  const uploadedPath = path.join(__dirname, 'csv_uploaded.json');
  let uploadedNames: Set<string> = new Set();
  if (fs.existsSync(uploadedPath)) {
    const uploaded = JSON.parse(fs.readFileSync(uploadedPath, 'utf-8'));
    uploadedNames = new Set(uploaded);
    console.log(`${uploadedNames.size} companies already uploaded (from previous run)\n`);
  }

  const toUpload = companies.filter(c => !uploadedNames.has(c.name.toLowerCase()));
  console.log(`${toUpload.length} companies to upload\n`);

  if (toUpload.length === 0) {
    console.log('Nothing to upload — all companies already uploaded.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toUpload.length; i++) {
    const company = toUpload[i];
    process.stdout.write(`[${i + 1}/${toUpload.length}] ${company.name}... `);

    const success = await uploadToGHL(company);

    if (success) {
      successCount++;
      uploadedNames.add(company.name.toLowerCase());
      console.log('OK');

      // Save progress every 10
      if (successCount % 10 === 0) {
        fs.writeFileSync(uploadedPath, JSON.stringify([...uploadedNames], null, 2));
      }
    } else {
      failCount++;
    }

    // Rate limit: 200ms between GHL calls
    await new Promise(r => setTimeout(r, 200));
  }

  // Final save
  fs.writeFileSync(uploadedPath, JSON.stringify([...uploadedNames], null, 2));

  console.log(`\n=== Done ===`);
  console.log(`Uploaded: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total in GHL (this batch): ${uploadedNames.size}`);
}

main().catch(console.error);

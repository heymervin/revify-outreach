#!/usr/bin/env python3
"""
Import GHL contacts from CSV into Supabase ghl_contacts table.
Enriches each contact with businessId from GHL API.
Source: lib/supabase/Export_Contacts_All_Feb_2026_9_06_PM.csv

Resume-safe: saves progress to import_contacts_progress.json after each batch.
Re-run to pick up from where it left off.
"""

import csv
import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

# ─── Config ──────────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'lib', 'supabase',
                        'Export_Contacts_All_Feb_2026_9_06_PM.csv')
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), 'import_contacts_progress.json')
FAILED_FILE   = os.path.join(os.path.dirname(__file__), 'import_contacts_progress.failed.json')

SUPABASE_URL     = 'https://cncrfqufgjzuijiedukn.supabase.co'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuY3JmcXVmZ2p6dWlqaWVkdWtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxNDA5OCwiZXhwIjoyMDg1MTkwMDk4fQ.n_4XBtAc6kDDIcA3ntCxCq9HNeaQ9uyM6nnl9iUF7yo'
ORGANIZATION_ID  = '61be2052-1833-4989-b5cf-4b35801177a6'
GHL_ACCOUNT_ID   = '5bc9ac3b-0b0c-4747-8373-8e7ac49b5413'

# ⚠️  Fill in your GHL Private Integration Token before running
GHL_TOKEN = 'pit-078ce502-8037-4bcb-8fe2-d1b79e5929e6'

GHL_API_BASE    = 'https://services.leadconnectorhq.com'
GHL_API_VERSION = '2021-07-28'

BATCH_SIZE       = 10    # concurrent GHL API calls per batch
BATCH_DELAY      = 0.15  # seconds between batches (rate limiting)
UPSERT_BATCH     = 100   # rows per Supabase upsert

# ─── Headers ─────────────────────────────────────────────────────────────────
SUPABASE_HEADERS = {
    'apikey':        SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates,return=minimal',
}

GHL_HEADERS = {
    'Authorization': f'Bearer {GHL_TOKEN}',
    'Accept':        'application/json',
    'Version':       GHL_API_VERSION,
    'User-Agent':    'python-httpx/0.27',
}


# ─── Progress checkpoint ──────────────────────────────────────────────────────
def load_progress():
    """Load set of already-processed ghl_ids from checkpoint file."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return set(json.load(f))
    return set()


def save_progress(done: set):
    """Persist the done set to disk."""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(list(done), f)


# ─── CSV ─────────────────────────────────────────────────────────────────────
def read_csv():
    """Read contacts from export CSV. Returns list of dicts."""
    contacts = []
    with open(CSV_PATH, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ghl_id = row.get('Contact Id', '').strip()
            if not ghl_id:
                continue
            contacts.append({
                'ghl_id':          ghl_id,
                'first_name':      row.get('First Name', '').strip() or None,
                'last_name':       row.get('Last Name', '').strip() or None,
                'email':           row.get('Email', '').strip() or None,
                'company_name':    row.get('Company Name', '').strip() or None,
                'job_function':    row.get('Job Function', '').strip() or None,
                'seniority_level': row.get('Seniority Level', '').strip() or None,
                'job_title':       row.get('Job Title - Hub Spot', '').strip() or None,
            })
    return contacts


# ─── GHL API ─────────────────────────────────────────────────────────────────
def fetch_business_id(ghl_id: str):
    """
    Fetch a single contact from GHL API and return (ghl_id, business_id).
    Returns (ghl_id, None) on any error — contact is still stored without business_id.
    """
    url = f'{GHL_API_BASE}/contacts/{ghl_id}'
    req = urllib.request.Request(url, headers=GHL_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            business_id = data.get('contact', {}).get('businessId') or None
            return ghl_id, business_id
    except Exception as e:
        print(f'  ⚠  Failed to fetch businessId for {ghl_id}: {e}')
        return ghl_id, None


# ─── Supabase upsert ──────────────────────────────────────────────────────────
def upsert_rows(rows: list):
    """Upsert rows into ghl_contacts. Returns (status_code, error_str_or_None)."""
    url = f'{SUPABASE_URL}/rest/v1/ghl_contacts?on_conflict=organization_id,ghl_id'
    body = json.dumps(rows).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=SUPABASE_HEADERS, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    if GHL_TOKEN == 'YOUR_GHL_PRIVATE_INTEGRATION_TOKEN':
        print('❌  Set GHL_TOKEN in the script before running.')
        return

    print(f'Reading CSV: {CSV_PATH}')
    all_contacts = read_csv()
    print(f'Found {len(all_contacts):,} contacts in CSV')

    done = load_progress()
    print(f'Checkpoint: {len(done):,} already processed')

    pending = [c for c in all_contacts if c['ghl_id'] not in done]
    print(f'Remaining:  {len(pending):,}\n')

    if not pending:
        print('✅  All contacts already processed!')
        return

    total     = len(pending)
    processed = 0
    failed    = 0
    start     = time.time()
    now       = datetime.now(timezone.utc).isoformat()

    upsert_buffer = []

    for batch_start in range(0, total, BATCH_SIZE):
        batch = pending[batch_start:batch_start + BATCH_SIZE]

        # Fetch businessId only for contacts with a company name (others have none)
        needs_fetch = [c['ghl_id'] for c in batch if c['company_name']]
        skipped     = [c['ghl_id'] for c in batch if not c['company_name']]

        if needs_fetch:
            with ThreadPoolExecutor(max_workers=3) as ex:
                fetched = list(ex.map(fetch_business_id, needs_fetch))
        else:
            fetched = []

        results = fetched + [(ghl_id, None) for ghl_id in skipped]

        biz_map = dict(results)

        # Build rows
        for contact in batch:
            upsert_buffer.append({
                'organization_id': ORGANIZATION_ID,
                'ghl_account_id':  GHL_ACCOUNT_ID,
                'ghl_id':          contact['ghl_id'],
                'business_id':     biz_map.get(contact['ghl_id']),
                'first_name':      contact['first_name'],
                'last_name':       contact['last_name'],
                'email':           contact['email'],
                'company_name':    contact['company_name'],
                'job_function':    contact['job_function'],
                'seniority_level': contact['seniority_level'],
                'job_title':       contact['job_title'],
                'synced_at':       now,
            })

        # Flush buffer when it hits UPSERT_BATCH or on last batch
        is_last = (batch_start + BATCH_SIZE) >= total
        while len(upsert_buffer) >= UPSERT_BATCH or (is_last and upsert_buffer):
            chunk = upsert_buffer[:UPSERT_BATCH]
            upsert_buffer = upsert_buffer[UPSERT_BATCH:]

            status, err = upsert_rows(chunk)
            if err:
                print(f'  ✗ Upsert failed ({status}): {err[:300]}')
                failed += len(chunk)
                # Persist failed IDs for manual review
                failed_ids = [row['ghl_id'] for row in chunk]
                existing = []
                if os.path.exists(FAILED_FILE):
                    with open(FAILED_FILE) as f:
                        existing = json.load(f)
                with open(FAILED_FILE, 'w') as f:
                    json.dump(existing + failed_ids, f)
            else:
                processed += len(chunk)
                for row in chunk:
                    done.add(row['ghl_id'])
                save_progress(done)

            if not upsert_buffer:
                break

        # Progress line
        total_done = processed + failed
        elapsed    = time.time() - start
        rate       = total_done / elapsed if elapsed > 0 else 1
        eta        = (total - total_done) / rate if rate > 0 else 0
        pct        = total_done / total * 100
        print(f'  [{pct:5.1f}%] {total_done:,}/{total:,} — '
              f'{processed:,} ok, {failed:,} failed — ~{eta:.0f}s remaining')

        time.sleep(BATCH_DELAY)

    elapsed = time.time() - start
    print(f'\n✅  Done in {elapsed:.1f}s')
    print(f'   Processed: {processed:,}')
    print(f'   Failed:    {failed:,}')
    print(f'   Progress file: {PROGRESS_FILE}')
    if failed:
        print(f'   Failed file: {FAILED_FILE}')


if __name__ == '__main__':
    main()

import { createClient } from '@supabase/supabase-js';

const MAIN_URL = 'https://xvflgagfwqwfjjrjknby.supabase.co';
const DEV_URL = 'https://hnqtfvforhcgbmvfqyti.supabase.co';
const BUCKET = 'expense-receipts';

const MAIN_KEY = process.env.MAIN_SERVICE_KEY;
const DEV_KEY = process.env.DEV_SERVICE_KEY;

if (!MAIN_KEY || !DEV_KEY) {
  console.error('Set MAIN_SERVICE_KEY and DEV_SERVICE_KEY env vars.');
  process.exit(1);
}

const MAIN = createClient(MAIN_URL, MAIN_KEY);
const DEV = createClient(DEV_URL, DEV_KEY);

async function listAll(client, prefix = '') {
  const out = [];
  const { data, error } = await client.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const obj of data) {
    const full = prefix ? `${prefix}/${obj.name}` : obj.name;
    if (obj.id === null) {
      const nested = await listAll(client, full);
      out.push(...nested);
    } else {
      out.push(full);
    }
  }
  return out;
}

const mainFiles = await listAll(MAIN);
const devFiles = new Set(await listAll(DEV));
const missing = mainFiles.filter((f) => !devFiles.has(f));

console.log(`Main: ${mainFiles.length}, Dev: ${devFiles.size}, Missing: ${missing.length}`);

let copied = 0;
let failed = 0;
for (const path of missing) {
  const { data: blob, error: dErr } = await MAIN.storage
    .from(BUCKET)
    .download(path);
  if (dErr) {
    console.error('download fail', path, dErr.message);
    failed++;
    continue;
  }
  const { error: uErr } = await DEV.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true });
  if (uErr) {
    console.error('upload fail', path, uErr.message);
    failed++;
  } else {
    copied++;
    console.log('copied', path);
  }
}

console.log(`\nDone. Copied: ${copied}, Failed: ${failed}`);

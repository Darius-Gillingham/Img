// File: cleanerC.js
// Commit: update Supabase client to use SERVICE_ROLE instead of SERVICE_KEY to align with deployment env

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('=== Running cleanerC.js ===');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const DIR = './data/generated';

async function uploadPrompts(file) {
  const fullPath = path.join(DIR, file);
  const data = await fs.readFile(fullPath, 'utf-8');
  const parsed = JSON.parse(data);
  const prompts = parsed.prompts;

  for (const prompt of prompts) {
    await supabase.from('dalle_prompts').insert({ prompt });
  }

  await fs.unlink(fullPath);
  await fs.unlink(fullPath + '.done');

  console.log(`✓ Uploaded and deleted ${file}`);
}

async function run() {
  const files = await fs.readdir(DIR);
  for (const file of files) {
    if (!file.endsWith('.json') || !file.startsWith('generated-prompts-')) continue;
    const donePath = path.join(DIR, file + '.done');
    try {
      await fs.access(donePath);
      await uploadPrompts(file);
    } catch {
      continue;
    }
  }
}

run().catch((err) => console.error('✗ cleanerC failed:', err));

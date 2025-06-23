// File: cleanerC.ts
// Commit: upload finalized GPT prompt files to Supabase after '.done' flag is present

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('=== Running cleanerC.ts ===');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DIR = './data/generated';

async function getFinishedFiles(): Promise<string[]> {
  const files = await fs.readdir(DIR);
  return files
    .filter((f) => f.startsWith('generated-prompts-') && f.endsWith('.json'))
    .filter(async (f) => {
      const donePath = path.join(DIR, f + '.done');
      try {
        await fs.access(donePath);
        return true;
      } catch {
        return false;
      }
    });
}

async function uploadPrompts(file: string): Promise<void> {
  const fullPath = path.join(DIR, file);
  const data = await fs.readFile(fullPath, 'utf-8');
  const parsed = JSON.parse(data);
  const prompts: string[] = parsed.prompts;

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

// File: cleanerB.ts
// Commit: upload completed wordset files to Supabase and delete after '.done' flag detected

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('=== Running cleanerB.ts ===');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DIR = './data/prompts';

async function getFinishedFiles(): Promise<string[]> {
  const files = await fs.readdir(DIR);
  return files
    .filter((f) => f.startsWith('wordsets-') && f.endsWith('.json'))
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

async function uploadWordsets(file: string): Promise<void> {
  const fullPath = path.join(DIR, file);
  const data = await fs.readFile(fullPath, 'utf-8');
  const parsed = JSON.parse(data);
  const wordsets: string[][] = parsed.wordsets;

  for (const ws of wordsets) {
    const [noun1, noun2, verb, adjective1, adjective2, style, setting, era, mood] = ws;
    await supabase.from('wordsets').insert({
      noun1, noun2, verb, adjective1, adjective2, style, setting, era, mood
    });
  }

  await fs.unlink(fullPath);
  await fs.unlink(fullPath + '.done');

  console.log(`✓ Uploaded and deleted ${file}`);
}

async function run() {
  const files = await fs.readdir(DIR);
  for (const file of files) {
    if (!file.endsWith('.json') || !file.startsWith('wordsets-')) continue;
    const donePath = path.join(DIR, file + '.done');
    try {
      await fs.access(donePath);
      await uploadWordsets(file);
    } catch {
      continue;
    }
  }
}

run().catch((err) => console.error('✗ cleanerB failed:', err));

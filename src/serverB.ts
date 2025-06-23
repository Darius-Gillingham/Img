// File: serverB.ts
// Commit: resolve Supabase row typing error by using unknown-to-typed cast

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

console.log('=== Running serverB.ts ===');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const COMPONENT_COLUMNS = [
  'noun1',
  'noun2',
  'verb',
  'adjective1',
  'adjective2',
  'style',
  'setting',
  'era',
  'mood'
];

const OUTPUT_DIR = './data/prompts';

function getTimestampFilename(): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14); // YYYYMMDDHHMMSS
  return `wordsets-${timestamp}.json`;
}

async function getRandomValue(column: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('prompt_components')
    .select(column)
    .order('RANDOM()')
    .limit(1);

  if (error || !data || data.length === 0) {
    console.warn(`✗ Failed to fetch random ${column}:`, error || 'No data');
    return null;
  }

  const raw = data[0] as unknown;
  const row = raw as { [key: string]: string };

  return row[column] || null;
}

async function createWordset(): Promise<string[] | null> {
  const wordset: string[] = [];

  for (const column of COMPONENT_COLUMNS) {
    const value = await getRandomValue(column);
    if (!value) {
      console.warn(`✗ Missing value for ${column}, skipping wordset`);
      return null;
    }
    wordset.push(value);
  }

  return wordset;
}

async function run(batchSize = 20) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const wordsets: string[][] = [];

  for (let i = 0; i < batchSize; i++) {
    const wordset = await createWordset();
    if (wordset) {
      wordsets.push(wordset);
      console.log(`✓ Created wordset #${i + 1}`);
    }
  }

  const filename = getTimestampFilename();
  const filepath = path.join(OUTPUT_DIR, filename);

  await fs.writeFile(
    filepath,
    JSON.stringify({ wordsets }, null, 2),
    'utf-8'
  );

  console.log(`✓ Saved ${wordsets.length} wordsets to ${filepath}`);
}

run().catch((err) => {
  console.error('✗ serverB failed:', err);
});

// File: cleanerD.js
// Commit: convert TypeScript image cleaner to JavaScript with Supabase Storage upload and post-upload deletion preserved

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('=== Running cleanerD.js ===');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DIR = './data/images';
const BUCKET = 'dalle-images';

async function uploadImage(filename) {
  const filepath = path.join(DIR, filename);
  const data = await fs.readFile(filepath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, data, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error(`✗ Failed to upload ${filename}:`, error);
    return;
  }

  await fs.unlink(filepath);
  console.log(`✓ Uploaded and deleted ${filename}`);
}

async function run() {
  const files = await fs.readdir(DIR);
  for (const file of files) {
    if (!file.endsWith('.png')) continue;
    await uploadImage(file);
  }
}

run().catch((err) => console.error('✗ cleanerD failed:', err));

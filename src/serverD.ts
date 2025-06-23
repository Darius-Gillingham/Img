// File: serverD.ts
// Commit: add .done flag after completing all images for a prompt file

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import OpenAI from 'openai';

dotenv.config();

console.log('=== Running serverD.ts ===');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const PROMPT_DIR = './data/generated';
const IMAGE_DIR = './data/images';

async function ensureImageDir() {
  await fs.mkdir(IMAGE_DIR, { recursive: true });
}

async function loadPromptFiles(): Promise<string[]> {
  const files = await fs.readdir(PROMPT_DIR);
  return files
    .filter((f) => f.startsWith('generated-prompts-') && f.endsWith('.json'))
    .filter(async (f) => {
      try {
        await fs.access(path.join(PROMPT_DIR, f + '.done'));
        return false; // already done
      } catch {
        return true;
      }
    });
}

async function loadPromptsFromFile(file: string): Promise<string[]> {
  const content = await fs.readFile(path.join(PROMPT_DIR, file), 'utf-8');
  const parsed = JSON.parse(content);
  return Array.isArray(parsed.prompts) ? parsed.prompts : [];
}

async function downloadImage(url: string, filename: string) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  await fs.writeFile(path.join(IMAGE_DIR, filename), res.data);
  console.log(`✓ Saved image: ${filename}`);
}

async function generateImage(prompt: string, index: number, batchTag: string) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024'
  });

  if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error(`No image data returned for prompt: ${prompt}`);
  }

  const url = response.data[0].url;
  if (!url) {
    throw new Error(`Image URL missing for prompt: ${prompt}`);
  }

  const filename = `image-${batchTag}-${index + 1}.png`;
  await downloadImage(url, filename);
}

function getBatchTagFromFilename(filename: string): string {
  return filename.replace(/^generated-prompts-/, '').replace(/\.json$/, '');
}

async function run() {
  await ensureImageDir();
  const files = await loadPromptFiles();

  if (files.length === 0) {
    console.log('No unprocessed prompt files found.');
    return;
  }

  for (const file of files) {
    const prompts = await loadPromptsFromFile(file);
    const batchTag = getBatchTagFromFilename(file);

    console.log(`→ Rendering ${prompts.length} prompts from ${file}`);

    for (let i = 0; i < prompts.length; i++) {
      try {
        await generateImage(prompts[i], i, batchTag);
      } catch (err) {
        console.warn(`✗ Failed to generate image #${i + 1}:`, err);
      }
    }

    await fs.writeFile(path.join(PROMPT_DIR, file + '.done'), '', 'utf-8');
    console.log(`✓ Flagged ${file} as complete`);
  }

  console.log('✓ All image generations complete.');
}

run().catch((err) => {
  console.error('✗ serverD failed:', err);
});

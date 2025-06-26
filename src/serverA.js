// File: serverA-componentPopulator.js
// Commit: switch Supabase env var from SERVICE_KEY to SERVICE_ROLE to match .env and Railway config

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

console.log('=== Running serverA-componentPopulator.js ===');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateComponentSet() {
  const prompt = `Generate a richly creative and non-generic combination of the following:

- Two unique nouns (noun1, noun2)
- One expressive verb (verb)
- Two distinct adjectives (adjective1, adjective2)
- One artistic style (style)
- One setting or location (setting)
- One era or time period (era)
- One emotional mood (mood)

Return a strictly valid JSON object using **these exact keys**:

{
  "noun1": "...",
  "noun2": "...",
  "verb": "...",
  "adjective1": "...",
  "adjective2": "...",
  "style": "...",
  "setting": "...",
  "era": "...",
  "mood": "..."
}

Do not explain. Just return the JSON. Avoid obvious or common combinations. Focus on unusual, vivid, or surreal ideas.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 1.5,
    top_p: 0.95,
    messages: [
      {
        role: 'system',
        content: 'You are an AI designed to generate diverse prompt components for creative image generation.'
      },
      { role: 'user', content: prompt }
    ]
  });

  const content = response.choices[0].message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    console.warn('✗ Failed to parse GPT output as JSON:', content);
    return null;
  }
}

async function isDuplicate(set) {
  const { data, error } = await supabase
    .from('prompt_components')
    .select('id')
    .match(set)
    .limit(1);

  if (error) {
    console.warn('✗ Error checking for duplicates:', error);
    return false;
  }

  return data.length > 0;
}

async function insertComponentSet(set) {
  const { error } = await supabase.from('prompt_components').insert(set);
  if (error) {
    console.error('✗ Insert failed:', error);
  } else {
    console.log(`✓ Inserted set: ${JSON.stringify(set)}`);
  }
}

async function runBatch(batchSize = 10) {
  for (let i = 0; i < batchSize; i++) {
    const set = await generateComponentSet();
    if (!set) continue;

    const duplicate = await isDuplicate(set);
    if (duplicate) {
      console.log('→ Skipping duplicate:', set);
      continue;
    }

    await insertComponentSet(set);
  }

  console.log('✓ Batch complete.');
}

runBatch().catch((err) => {
  console.error('✗ Batch failed:', err);
});

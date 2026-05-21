import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function loadPrompt(filename) {
  return fs.readFileSync(path.join(__dirname, '..', 'prompts', filename), 'utf-8');
}

async function introduce(name, systemPrompt) {
  const res = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    config: { systemInstruction: systemPrompt },
    contents: '自己紹介してください。',
  });

  console.log(`\n【${name}】`);
  console.log(res.text);
  console.log(`(使用トークン: ${res.usageMetadata?.totalTokenCount ?? '—'})`);
  return res.text;
}

async function main() {
  console.log('=== Digital Doppelganger ===');

  const generalPrompt = loadPrompt('general.txt');
  const doppelPrompt  = loadPrompt('doppel.txt');

  await introduce('一般人AI', generalPrompt);
  await introduce('Digital Doppelganger', doppelPrompt);
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});

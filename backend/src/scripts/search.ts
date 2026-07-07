/**
 * 検索デバッグCLI: 質問に対する類似チャンクとスコアを表示する（閾値調整用）。
 *
 *   npm run search -- "有給休暇はいつから取れますか？"
 */
import 'dotenv/config';
import { embedQuery } from '../lib/gemini';
import { searchSimilar } from '../lib/vectorStore';

async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question) {
    console.error('使い方: npm run search -- "質問文"');
    process.exit(1);
  }

  const queryVec = await embedQuery(question);
  const hits = searchSimilar(queryVec, 5);

  console.log(`質問: ${question}\n`);
  for (const hit of hits) {
    console.log(`  score=${hit.score.toFixed(4)}  ${hit.docName} §${hit.section}`);
    console.log(`    ${hit.text.slice(0, 60).replace(/\n/g, ' ')}…\n`);
  }
}

main().catch((err) => {
  console.error('search失敗:', err instanceof Error ? err.message : err);
  process.exit(1);
});

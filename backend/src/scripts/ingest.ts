/**
 * インジェスト（取り込み）CLI: backend/docs/*.md → チャンク分割 → 埋め込み → data/embeddings.json
 *
 *   npm run ingest            … 埋め込みAPIを呼んで embeddings.json を再生成
 *   npm run ingest -- --dry-run … APIを呼ばずチャンク分割の結果だけを表示（キー不要）
 */
import 'dotenv/config';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chunkMarkdown, type Chunk } from '../lib/chunker';
import { embedDocument, isRateLimitError, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '../lib/gemini';
import type { EmbeddingStore, StoredChunk } from '../lib/vectorStore';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(HERE, '../../docs');
const OUT_PATH = path.join(HERE, '../../data/embeddings.json');

// 無料枠のRPM制限に収まるよう、埋め込みAPIは1件ずつ間隔を空けて呼ぶ
const CALL_INTERVAL_MS = 700;
const BACKOFF_MS = [5_000, 15_000, 30_000];

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.error(`docs/ にMarkdownがありません: ${DOCS_DIR}`);
    process.exit(1);
  }

  const chunks: Chunk[] = files.flatMap((file) =>
    chunkMarkdown(file, readFileSync(path.join(DOCS_DIR, file), 'utf-8')),
  );

  console.log(`文書 ${files.length} 件 → チャンク ${chunks.length} 件\n`);
  for (const c of chunks) {
    console.log(`  ${c.id}  ${String(c.text.length).padStart(4)}字  §${c.section}`);
  }

  if (dryRun) {
    console.log('\n--dry-run のため埋め込みAPIは呼びません。');
    return;
  }

  console.log('\n埋め込みを生成します（無料枠対策で1件ずつ順次実行）…');
  const stored: StoredChunk[] = [];
  for (const [i, chunk] of chunks.entries()) {
    // 見出しパスを本文の先頭に付けて埋め込むと、条文番号などでの検索精度が上がる
    const input = `${chunk.docName} ${chunk.section}\n${chunk.text}`;
    const embedding = await embedWithRetry(input, chunk.id);
    stored.push({ ...chunk, embedding });
    process.stdout.write(`\r  ${i + 1}/${chunks.length} 完了`);
    await sleep(CALL_INTERVAL_MS);
  }
  console.log();

  const store: EmbeddingStore = {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    createdAt: new Date().toISOString(),
    chunks: stored,
  };
  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(store));

  // self-check: 次元数と正規化（ノルム≒1）を確認
  const first = stored[0].embedding;
  const norm = Math.sqrt(first.reduce((s, v) => s + v * v, 0));
  console.log(`\n保存しました: ${OUT_PATH}`);
  console.log(`  chunks=${stored.length}  dimensions=${first.length}  norm(先頭チャンク)=${norm.toFixed(4)}`);
  if (first.length !== EMBEDDING_DIMENSIONS || Math.abs(norm - 1) > 0.01) {
    console.error('  ⚠ self-check失敗: 次元数または正規化が想定と異なります');
    process.exit(1);
  }
  console.log('  self-check OK');
}

async function embedWithRetry(text: string, id: string): Promise<number[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await embedDocument(text);
    } catch (err) {
      if (isRateLimitError(err) && attempt < BACKOFF_MS.length) {
        const wait = BACKOFF_MS[attempt];
        console.warn(`\n  429発生 (${id})。${wait / 1000}秒待って再試行します…`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('\ningest失敗:', err instanceof Error ? err.message : err);
  process.exit(1);
});

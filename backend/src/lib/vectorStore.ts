/**
 * 自前の簡易ベクトルストア。
 *
 * 数十〜数千チャンク規模なら全件走査（O(n)）で十分応答できるため、
 * ベクトルDBを導入せず、埋め込みをJSONファイルに永続化して起動時にメモリへ読む。
 * 全ベクトルはingest時にL2正規化済みなので、コサイン類似度は内積と一致する。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export type StoredChunk = {
  id: string;
  docName: string;
  section: string;
  text: string;
  embedding: number[];
};

export type EmbeddingStore = {
  model: string;
  dimensions: number;
  createdAt: string;
  chunks: StoredChunk[];
};

export type ScoredChunk = StoredChunk & { score: number };

const STORE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/embeddings.json',
);

let cache: EmbeddingStore | null = null;

export function loadStore(): EmbeddingStore {
  if (!cache) {
    cache = JSON.parse(readFileSync(STORE_PATH, 'utf-8')) as EmbeddingStore;
  }
  return cache;
}

export function searchSimilar(queryVec: number[], k: number): ScoredChunk[] {
  const store = loadStore();
  return store.chunks
    .map((chunk) => ({ ...chunk, score: dot(queryVec, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function listDocNames(): string[] {
  return [...new Set(loadStore().chunks.map((c) => c.docName))];
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
}

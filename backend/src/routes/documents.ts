import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Router } from 'express';
import type { DocsResponse } from '../../../shared/types';
import { chunkMarkdown } from '../lib/chunker';
import { embedDocument, isRateLimitError, EMBEDDING_DIMENSIONS } from '../lib/gemini';
import {
  addDocument,
  hasDoc,
  listDocNames,
  removeDocument,
  type StoredChunk,
} from '../lib/vectorStore';

const ALLOWED_EXT = ['.md', '.txt'];
const MAX_CONTENT_CHARS = 100_000;
const MAX_CHUNKS = 60;

const DOCS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../docs');

/**
 * 同梱のサンプル規程かどうか。backend/docs/ に原本ファイルが存在する文書は
 * `npm run ingest` の生成元＝デモの土台なので、画面からの削除対象にしない。
 */
function isSeedDoc(docName: string): boolean {
  // パス区切りを含む名前はディレクトリトラバーサル防止のため常に不正扱い
  if (docName.includes('/') || docName.includes('\\') || docName.includes('..')) return true;
  return existsSync(path.join(DOCS_DIR, docName));
}

export const documentsRouter = Router();

/** 読み込み済みドキュメント一覧（削除可否フラグ付き） */
documentsRouter.get('/docs', (_req, res) => {
  const body: DocsResponse = {
    docs: listDocNames().map((name) => ({ name, deletable: !isSeedDoc(name) })),
  };
  res.json(body);
});

/** アップロードされた文書の削除（同梱のサンプル規程は保護） */
documentsRouter.delete('/documents/:docName', (req, res) => {
  const docName = req.params.docName;
  if (!hasDoc(docName)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (isSeedDoc(docName)) {
    res.status(403).json({ error: 'protected' });
    return;
  }
  const removedChunks = removeDocument(docName);
  res.json({ docName, removedChunks });
});

/**
 * 文書アップロード。受け取ったテキストをその場でチャンク分割・埋め込みし、
 * ベクトルストアに追記する（再起動不要で検索対象になる）。
 * バイナリ（PDF等）は対象外で、Markdown/テキストのみ受け付ける。
 */
documentsRouter.post('/documents', async (req, res) => {
  const { filename, content } = (req.body ?? {}) as {
    filename?: unknown;
    content?: unknown;
  };

  if (typeof filename !== 'string' || typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'filename and content are required' });
    return;
  }
  const lower = filename.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    res.status(400).json({ error: 'unsupported_type' });
    return;
  }
  if (content.length > MAX_CONTENT_CHARS) {
    res.status(400).json({ error: 'too_large' });
    return;
  }
  if (hasDoc(filename)) {
    res.status(409).json({ error: 'duplicate' });
    return;
  }

  const chunks = chunkMarkdown(filename, content);
  if (chunks.length === 0) {
    res.status(400).json({ error: 'empty' });
    return;
  }
  if (chunks.length > MAX_CHUNKS) {
    res.status(400).json({ error: 'too_many_chunks' });
    return;
  }

  try {
    const stored: StoredChunk[] = [];
    for (const chunk of chunks) {
      // 見出しパスを本文先頭に付けて埋め込む（ingestと同じ方針で検索精度を揃える）
      const input = `${chunk.docName} ${chunk.section}\n${chunk.text}`;
      const embedding = await embedWithRetry(input);
      stored.push({ ...chunk, embedding });
    }
    addDocument(stored);
    res.json({ docName: filename, chunks: stored.length, dimensions: EMBEDDING_DIMENSIONS });
  } catch (err) {
    if (isRateLimitError(err)) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    console.error('upload error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

/** 429のときだけ2秒待って1回リトライする */
async function embedWithRetry(text: string): Promise<number[]> {
  try {
    return await embedDocument(text);
  } catch (err) {
    if (!isRateLimitError(err)) throw err;
    await new Promise((r) => setTimeout(r, 2_000));
    return embedDocument(text);
  }
}

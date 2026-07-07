import { Router } from 'express';
import type { Answer, ChatRequest, DocsResponse } from '../../../shared/types';
import { embedQuery, generateAnswer, isRateLimitError } from '../lib/gemini';
import { searchSimilar, listDocNames } from '../lib/vectorStore';

const TOP_K = 4;
/**
 * 検索スコアの足切り閾値。scripts/search.ts での実測に基づく:
 * 関連質問のtop-1は0.70〜0.80、無関係質問のtop-1は0.52〜0.63だったため中間の0.65とした
 */
export const SCORE_THRESHOLD = 0.65;
const MAX_QUESTION_CHARS = 500;
const EXCERPT_CHARS = 200;

const NOT_FOUND_TEXT =
  'ご質問に関連する記載は、読み込み済みのドキュメントからは見つかりませんでした。お手数ですが、質問の表現を変えるか、担当部署へ直接お問い合わせください。';

export const chatRouter = Router();

chatRouter.get('/docs', (_req, res) => {
  const body: DocsResponse = { docs: listDocNames() };
  res.json(body);
});

chatRouter.post('/chat', async (req, res) => {
  const { question } = (req.body ?? {}) as Partial<ChatRequest>;
  if (typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ error: 'question is required' });
    return;
  }
  if (question.length > MAX_QUESTION_CHARS) {
    res.status(400).json({ error: `question must be <= ${MAX_QUESTION_CHARS} chars` });
    return;
  }

  try {
    const queryVec = await withRateLimitRetry(() => embedQuery(question.trim()));
    const hits = searchSimilar(queryVec, TOP_K).filter((h) => h.score >= SCORE_THRESHOLD);

    // ガードレール: 十分似ているチャンクが無ければLLMを呼ばずに正直に返す
    // （ハルシネーション防止と無料枠の節約を兼ねる）
    if (hits.length === 0) {
      const body: Answer = { text: NOT_FOUND_TEXT, sources: [] };
      res.json(body);
      return;
    }

    const text = await withRateLimitRetry(() => generateAnswer(question.trim(), hits));
    const body: Answer = {
      text,
      sources: hits.map((h) => ({
        docName: h.docName,
        section: h.section,
        excerpt: h.text.length > EXCERPT_CHARS ? `${h.text.slice(0, EXCERPT_CHARS)}…` : h.text,
      })),
    };
    res.json(body);
  } catch (err) {
    if (isRateLimitError(err)) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    console.error('chat error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

/** 429のときだけ2秒待って1回リトライする */
async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isRateLimitError(err)) throw err;
    await new Promise((r) => setTimeout(r, 2_000));
    return fn();
  }
}

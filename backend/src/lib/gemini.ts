/**
 * Gemini API との連携をここに集約する。
 * すべて Google AI Studio の無料枠で動く（課金登録なし＝超過時は429になるだけ）。
 */
import { GoogleGenAI } from '@google/genai';
import { normalize } from './vectorStore';

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const CHAT_MODEL = 'gemini-2.5-flash';
export const EMBEDDING_DIMENSIONS = 768;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error(
        'GEMINI_API_KEY が設定されていません。backend/.env を確認してください（雛形: .env.example）',
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** 文書チャンク用の埋め込み（L2正規化して返す） */
export async function embedDocument(text: string): Promise<number[]> {
  return embed(text, 'RETRIEVAL_DOCUMENT');
}

/** 検索クエリ用の埋め込み（L2正規化して返す） */
export async function embedQuery(text: string): Promise<number[]> {
  return embed(text, 'RETRIEVAL_QUERY');
}

async function embed(text: string, taskType: string): Promise<number[]> {
  const res = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values) throw new Error('埋め込みAPIのレスポンスが不正です');
  // 768次元指定時は正規化されずに返るため、保存・検索の前に必ず正規化する
  return normalize(values);
}

/** 検索でヒットした抜粋を根拠に、日本語で回答を生成する */
export async function generateAnswer(
  question: string,
  contexts: { docName: string; section: string; text: string }[],
): Promise<string> {
  const contextBlock = contexts
    .map((c, i) => `[${i + 1}] ${c.docName} §${c.section}\n${c.text}`)
    .join('\n\n');

  const prompt = `あなたは社内規程に関する質問に答えるアシスタントです。
以下の抜粋のみを根拠に、日本語で簡潔に回答してください。
抜粋に記載がない内容は推測せず、「文書からは見つかりませんでした」と答えてください。

【参考資料】
${contextBlock}

【質問】${question}`;

  const res = await getClient().models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      // 思考モードを無効化してレイテンシと無料枠トークンを節約
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  });
  const text = res.text;
  if (!text) throw new Error('回答生成APIのレスポンスが空です');
  return text.trim();
}

/** レート制限(429)エラーかどうかの判定 */
export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
}

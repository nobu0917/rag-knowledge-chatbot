import type { Answer } from '../../../shared/types';

/** HTTPステータス付きのAPIエラー（429=レート制限 などをUI側で出し分ける） */
export class ApiError extends Error {
  constructor(public status: number) {
    super(`API error: ${status}`);
  }
}

/**
 * 回答取得API。バックエンド（Express + Gemini + 自前ベクトル検索）に問い合わせる。
 * 開発時は vite.config.ts の proxy 設定で /api → localhost:3100 に転送される。
 */
export async function getAnswer(question: string): Promise<Answer> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}

/** 読み込み済みドキュメント一覧を取得する */
export async function getDocs(): Promise<string[]> {
  const res = await fetch('/api/docs');
  if (!res.ok) throw new ApiError(res.status);
  const body: { docs: string[] } = await res.json();
  return body.docs;
}

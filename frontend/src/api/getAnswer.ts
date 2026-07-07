import type { Answer } from '../../../shared/types';

/**
 * HTTPステータス付きのAPIエラー（429=レート制限 などをUI側で出し分ける）。
 * status=0 はバックエンドに到達できなかったことを表す（未起動・ネットワーク断など）。
 * code はバックエンドが返すエラー種別（duplicate / unsupported_type など）。
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
  ) {
    super(`API error: ${status}${code ? ` (${code})` : ''}`);
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
  }).catch(() => {
    throw new ApiError(0);
  });
  if (!res.ok) {
    // バックエンド未起動時はViteのproxyが非JSONの500を返すため、JSONかどうかで接続不能と区別する
    const body = await res.json().catch(() => null);
    throw new ApiError(body === null ? 0 : res.status);
  }
  return res.json();
}

/** 読み込み済みドキュメント一覧を取得する */
export async function getDocs(): Promise<string[]> {
  const res = await fetch('/api/docs');
  if (!res.ok) throw new ApiError(res.status);
  const body: { docs: string[] } = await res.json();
  return body.docs;
}

export type UploadResult = { docName: string; chunks: number };

/**
 * 文書をアップロードして読み込ませる。ファイル本文をテキストとして送信し、
 * バックエンドでチャンク分割・埋め込み・ベクトルストア追記まで行う。
 */
export async function uploadDocument(file: File): Promise<UploadResult> {
  const content = await file.text();
  const res = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, content }),
  }).catch(() => {
    throw new ApiError(0);
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body === null ? 0 : res.status, body?.error);
  }
  return res.json();
}

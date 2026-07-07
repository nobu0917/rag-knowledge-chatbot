/**
 * フロントエンド・バックエンド間で共有する型定義。
 * POST /api/chat のリクエスト/レスポンスはこの型に従う（docs/api仕様はREADME参照）。
 */

/** 回答の根拠となる出典1件 */
export type Source = {
  docName: string;
  /** 文書内のセクション見出しパス（例: "第4章 休暇 > 第22条 年次有給休暇"） */
  section: string;
  excerpt: string;
};

/** チャットの回答 */
export type Answer = {
  text: string;
  sources: Source[];
};

/** POST /api/chat リクエストボディ */
export type ChatRequest = {
  question: string;
};

/** 読み込み済みドキュメント1件の情報 */
export type DocInfo = {
  name: string;
  /** true=アップロードされた文書（削除可）。false=同梱のサンプル規程（保護対象） */
  deletable: boolean;
};

/** GET /api/docs レスポンス */
export type DocsResponse = {
  docs: DocInfo[];
};

import type { Source } from '../../shared/types';

export type { Source, Answer } from '../../shared/types';

export type ChatMessage = {
  id: number;
  role: 'user' | 'bot';
  text: string;
  sources?: Source[];
  /** APIエラー由来のメッセージ（赤系スタイルで表示） */
  isError?: boolean;
};

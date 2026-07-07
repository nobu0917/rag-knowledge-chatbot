import { useEffect, useRef, useState } from 'react';
import { getAnswer, getDocs, uploadDocument, deleteDocument, ApiError } from './api/getAnswer';
import { Sidebar } from './components/Sidebar';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import type { ChatMessage } from './types';
import type { DocInfo } from '../../shared/types';

let nextId = 100;

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) {
    return 'アクセスが集中しています（無料枠のレート制限）。1分ほど待ってから、もう一度送信してください。';
  }
  if (err instanceof ApiError && err.status !== 0) {
    return 'サーバーでエラーが発生しました。時間をおいて再度お試しください。';
  }
  return 'サーバーに接続できません。バックエンド（backend: npm run dev）が起動しているか確認してください。';
}

function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return 'サーバーに接続できません。バックエンドが起動しているか確認してください。';
    }
    if (err.status === 429) {
      return 'アクセスが集中しています（無料枠のレート制限）。1分ほど待ってから、もう一度お試しください。';
    }
    switch (err.code) {
      case 'unsupported_type':
        return '対応していない形式です。Markdown（.md）またはテキスト（.txt）を選んでください。';
      case 'too_large':
        return 'ファイルが大きすぎます。10万文字以内の文書にしてください。';
      case 'too_many_chunks':
        return '文書が長すぎます。分割してから読み込ませてください。';
      case 'duplicate':
        return '同じ名前の文書がすでに読み込まれています。';
      case 'empty':
        return '読み取れる本文がありませんでした。';
    }
  }
  return '読み込みに失敗しました。時間をおいて再度お試しください。';
}

export default function App() {
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: 'bot',
      text: 'こんにちは。社内ドキュメントに関する質問にお答えします。「有給休暇の申請方法は？」「経費精算の期限は？」などと聞いてみてください。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocs()
      .then(setDocs)
      .catch(() => setDocs([]));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { id: nextId++, role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const answer = await getAnswer(question);
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'bot', text: answer.text, sources: answer.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'bot', text: errorMessage(err), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleSend();
    }
  };

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const { docName, chunks } = await uploadDocument(file);
      const list = await getDocs();
      setDocs(list);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: 'bot',
          text: `「${docName}」を読み込みました（${chunks}件のセクションに分割）。この文書の内容について質問できます。`,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'bot', text: uploadErrorMessage(err), isError: true },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docName: string) => {
    if (uploading) return;
    if (!window.confirm(`「${docName}」を削除しますか？\n削除すると、この文書は回答の根拠に使われなくなります。`)) {
      return;
    }
    try {
      await deleteDocument(docName);
      const list = await getDocs();
      setDocs(list);
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'bot', text: `「${docName}」を削除しました。` },
      ]);
    } catch (err) {
      const text =
        err instanceof ApiError && err.code === 'protected'
          ? 'この文書は同梱のサンプル規程のため削除できません。'
          : err instanceof ApiError && err.status === 0
            ? 'サーバーに接続できません。バックエンドが起動しているか確認してください。'
            : '削除に失敗しました。時間をおいて再度お試しください。';
      setMessages((prev) => [...prev, { id: nextId++, role: 'bot', text, isError: true }]);
    }
  };

  return (
    <div className="app">
      <Sidebar docs={docs} uploading={uploading} onUpload={handleUpload} onDelete={handleDelete} />
      <main className="chat-area">
        <header className="chat-header">
          <h1>社内ドキュメント アシスタント</h1>
          <span className="proto-badge">Gemini + 自前ベクトル検索</span>
        </header>

        <div className="chat-log">
          {messages.map((m) => (
            <ChatMessageBubble key={m.id} message={m} />
          ))}
          {loading && (
            <div className="message-row message-row-bot">
              <div className="avatar">🤖</div>
              <div className="bubble bubble-bot bubble-loading">
                <span className="thinking-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                考え中…
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="input-bar">
          <input
            className="question-input"
            type="text"
            placeholder="質問を入力してください（例：有給休暇はいつから取れますか？）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={loading || input.trim() === ''}
          >
            送信
          </button>
        </div>
      </main>
    </div>
  );
}

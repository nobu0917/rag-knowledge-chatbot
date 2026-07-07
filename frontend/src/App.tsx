import { useEffect, useRef, useState } from 'react';
import { getAnswer, getDocs, ApiError } from './api/getAnswer';
import { Sidebar } from './components/Sidebar';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import type { ChatMessage } from './types';

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

export default function App() {
  const [docs, setDocs] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: 'bot',
      text: 'こんにちは。社内ドキュメントに関する質問にお答えします。「有給休暇の申請方法は？」「経費精算の期限は？」などと聞いてみてください。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="app">
      <Sidebar docs={docs} />
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

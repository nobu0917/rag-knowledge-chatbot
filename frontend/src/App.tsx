import { useEffect, useRef, useState } from 'react';
import { getAnswer } from './api/getAnswer';
import { Sidebar } from './components/Sidebar';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import type { ChatMessage, DocFile } from './types';

const INITIAL_DOCS: DocFile[] = [
  { id: 1, name: '就業規則.pdf' },
  { id: 2, name: '経費精算マニュアル.pdf' },
  { id: 3, name: '情報セキュリティ規程.docx' },
  { id: 4, name: '出張旅費規程.pdf' },
];

const DUMMY_ADD_NAMES = [
  '育児介護休業規程.pdf',
  '社用車管理規程.docx',
  '福利厚生ガイド.pdf',
  '安全衛生管理規程.docx',
];

let nextId = 100;

export default function App() {
  const [docs, setDocs] = useState<DocFile[]>(INITIAL_DOCS);
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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAddDoc = () => {
    setDocs((prev) => {
      const name = DUMMY_ADD_NAMES[prev.length % DUMMY_ADD_NAMES.length];
      return [...prev, { id: nextId++, name }];
    });
  };

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
      <Sidebar docs={docs} onAddDoc={handleAddDoc} />
      <main className="chat-area">
        <header className="chat-header">
          <h1>社内ドキュメント アシスタント</h1>
          <span className="proto-badge">プロトタイプ（回答はモック）</span>
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

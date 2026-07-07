import 'dotenv/config';
import express from 'express';
import { chatRouter } from './routes/chat';
import { loadStore } from './lib/vectorStore';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', chatRouter);

const port = Number(process.env.PORT ?? 3100);

// 起動前チェック: 設定ミスは起動時に明確なメッセージで落とす
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
  console.error('GEMINI_API_KEY が未設定です。backend/.env を作成してください（雛形: .env.example）');
  process.exit(1);
}
try {
  const store = loadStore();
  console.log(`ベクトルストア読込: ${store.chunks.length}チャンク / ${store.dimensions}次元 (${store.model})`);
} catch {
  console.error('data/embeddings.json がありません。先に `npm run ingest` を実行してください');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});

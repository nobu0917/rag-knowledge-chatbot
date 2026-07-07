import { useRef } from 'react';

type Props = {
  docs: string[];
  uploading: boolean;
  onUpload: (file: File) => void;
};

function docIcon(name: string): string {
  if (name.endsWith('.pdf')) return '📕';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📘';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.txt')) return '📄';
  return '📄';
}

export function Sidebar({ docs, uploading, onUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // 同じファイルを連続で選べるように値をリセット
    e.target.value = '';
  };

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">読み込み済みドキュメント</h2>
      <ul className="doc-list">
        {docs.length === 0 && <li className="doc-empty">サーバーに接続できません</li>}
        {docs.map((name) => (
          <li key={name} className="doc-item" title={name}>
            <span className="doc-icon">{docIcon(name)}</span>
            <span className="doc-name">{name}</span>
          </li>
        ))}
      </ul>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,text/markdown,text/plain"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        className="add-doc-button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '読み込み中…' : '＋ ドキュメントを追加'}
      </button>
      <p className="add-doc-hint">Markdown（.md）/ テキスト（.txt）に対応</p>
    </aside>
  );
}

import { useRef } from 'react';
import type { DocInfo } from '../../../shared/types';

type Props = {
  docs: DocInfo[];
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete: (docName: string) => void;
};

function docIcon(name: string): string {
  if (name.endsWith('.pdf')) return '📕';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📘';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.txt')) return '📄';
  return '📄';
}

export function Sidebar({ docs, uploading, onUpload, onDelete }: Props) {
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
        {docs.map((doc) => (
          <li key={doc.name} className="doc-item" title={doc.name}>
            <span className="doc-icon">{docIcon(doc.name)}</span>
            <span className="doc-name">{doc.name}</span>
            {doc.deletable && (
              <button
                className="doc-delete-button"
                title={`「${doc.name}」を削除`}
                aria-label={`「${doc.name}」を削除`}
                onClick={() => onDelete(doc.name)}
                disabled={uploading}
              >
                🗑
              </button>
            )}
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

import type { DocFile } from '../types';

type Props = {
  docs: DocFile[];
  onAddDoc: () => void;
};

function docIcon(name: string): string {
  if (name.endsWith('.pdf')) return '📕';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📘';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📗';
  return '📄';
}

export function Sidebar({ docs, onAddDoc }: Props) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">読み込み済みドキュメント</h2>
      <ul className="doc-list">
        {docs.map((doc) => (
          <li key={doc.id} className="doc-item" title={doc.name}>
            <span className="doc-icon">{docIcon(doc.name)}</span>
            <span className="doc-name">{doc.name}</span>
          </li>
        ))}
      </ul>
      <button className="add-doc-button" onClick={onAddDoc}>
        ＋ ドキュメントを追加
      </button>
    </aside>
  );
}

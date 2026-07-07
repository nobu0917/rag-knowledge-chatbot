type Props = {
  docs: string[];
};

function docIcon(name: string): string {
  if (name.endsWith('.pdf')) return '📕';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📘';
  if (name.endsWith('.md')) return '📝';
  return '📄';
}

export function Sidebar({ docs }: Props) {
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
    </aside>
  );
}

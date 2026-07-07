/**
 * Markdown文書を「セクション見出し単位」でチャンクに分割する。
 *
 * 規程文書は条文（### 第N条）ごとに意味が完結するため、固定長分割ではなく
 * 見出し構造をそのままチャンク境界として使う。見出しパスは出典表示にも使う。
 */

export type Chunk = {
  id: string;
  docName: string;
  /** 見出しパス（例: "第4章 休暇 > 第22条（年次有給休暇）"） */
  section: string;
  /** チャンク本文（見出しを除く） */
  text: string;
};

const MAX_CHUNK_CHARS = 800;
const OVERLAP_CHARS = 100;

type RawSection = { section: string; text: string };

export function chunkMarkdown(docName: string, markdown: string): Chunk[] {
  // 条文（見出し）単位で1チャンク。短い条文でも独立させ、出典ラベルと1対1に保つ
  const sections = splitByHeadings(markdown);
  const sized = sections.flatMap(splitLongSection);

  const baseName = docName.replace(/\.md$/, '');
  return sized.map((s, i) => ({
    id: `${baseName}-${String(i).padStart(4, '0')}`,
    docName,
    section: s.section,
    text: s.text,
  }));
}

/** ## / ### 見出しで分割し、見出しパスを組み立てる */
function splitByHeadings(markdown: string): RawSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: RawSection[] = [];
  let h2 = '';
  let h3 = '';
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join('\n').trim();
    buf = [];
    if (!text) return;
    const section = [h2, h3].filter(Boolean).join(' > ') || '前文';
    sections.push({ section, text });
  };

  for (const line of lines) {
    const m2 = line.match(/^##\s+(.+)$/);
    const m3 = line.match(/^###\s+(.+)$/);
    if (m2) {
      flush();
      h2 = m2[1].trim();
      h3 = '';
    } else if (m3) {
      flush();
      h3 = m3[1].trim();
    } else if (/^#\s/.test(line) || /^>\s/.test(line)) {
      // 文書タイトルと注記（引用行）は検索対象にしない
      continue;
    } else {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

/** 上限を超えるセクションのみ段落境界で分割し、末尾をオーバーラップさせる */
function splitLongSection(s: RawSection): RawSection[] {
  if (s.text.length <= MAX_CHUNK_CHARS) return [s];

  const paragraphs = s.text.split(/\n{2,}/);
  const parts: string[] = [];
  let current = '';

  for (const p of paragraphs) {
    if (current && current.length + p.length + 2 > MAX_CHUNK_CHARS) {
      parts.push(current);
      current = current.slice(-OVERLAP_CHARS) + '\n\n' + p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) parts.push(current);

  return parts.map((text, i) => ({
    section: parts.length > 1 ? `${s.section}（${i + 1}/${parts.length}）` : s.section,
    text,
  }));
}

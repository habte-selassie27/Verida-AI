// Tiny dependency-free markdown renderer for blog post content. Supports the
// pragmatic subset the admin editor produces: headings (h1-h3), paragraphs,
// **bold**, *italic*, `inline code`, fenced code blocks, `-` lists, `>` quotes,
// `---` rules, and `[text](url)` links. No raw HTML is ever rendered.
import type { ReactNode } from 'react';

const INLINE_RE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/;

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;
  while (rest.length > 0) {
    const match = INLINE_RE.exec(rest);
    if (match === null) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) {
      nodes.push(rest.slice(0, match.index));
    }
    const key = `${keyPrefix}${index}`;
    if (match[2] !== undefined) {
      nodes.push(<strong key={key}>{parseInline(match[2], `${key}-b-`)}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={key}>{parseInline(match[4], `${key}-i-`)}</em>);
    } else if (match[6] !== undefined) {
      nodes.push(<code key={key}>{match[6]}</code>);
    } else if (match[8] !== undefined && match[9] !== undefined) {
      const href = match[9];
      const external = /^https?:\/\//.test(href);
      nodes.push(
        <a key={key} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {match[8]}
        </a>,
      );
    }
    rest = rest.slice(match.index + match[0].length);
    index += 1;
  }
  return nodes;
}

const PARAGRAPH_STOP = /^(#{1,3}\s|```|>\s?|[-*]\s+|\s*(?:---|\*\*\*)\s*$)/;

function parseBlocks(markdown: string): ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test((lines[i] ?? '').trim())) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push(
        <pre key={key}>
          <code className={language ? `language-${language}` : undefined}>{code.join('\n')}</code>
        </pre>,
      );
      key += 1;
      continue;
    }

    // Headings
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const content = parseInline(heading[2] ?? '', `${key}-`);
      if (level === 1) {
        blocks.push(<h1 key={key}>{content}</h1>);
      } else if (level === 2) {
        blocks.push(<h2 key={key}>{content}</h2>);
      } else {
        blocks.push(<h3 key={key}>{content}</h3>);
      }
      key += 1;
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*(?:---|\*\*\*)\s*$/.test(line)) {
      blocks.push(<hr key={key} />);
      key += 1;
      i += 1;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quote.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(<blockquote key={key}>{parseInline(quote.join('\n'), `${key}-`)}</blockquote>);
      key += 1;
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        items.push(
          <li key={items.length}>
            {parseInline((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''), `${key}-${items.length}-`)}
          </li>,
        );
        i += 1;
      }
      blocks.push(<ul key={key}>{items}</ul>);
      key += 1;
      continue;
    }

    // Paragraph — gather until a blank line or a new block marker.
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (next.trim().length === 0 || PARAGRAPH_STOP.test(next)) break;
      paragraph.push(next);
      i += 1;
    }
    blocks.push(<p key={key}>{parseInline(paragraph.join(' '), `${key}-`)}</p>);
    key += 1;
  }

  return blocks;
}

export function Markdown({ content }: { content: string }) {
  return <div className="blog-md">{parseBlocks(content)}</div>;
}

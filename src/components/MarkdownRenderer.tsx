import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownProps) {
  // Break down content into blocks: code blocks vs text blocks
  const parts = splitIntoBlocks(content);

  return (
    <div className="space-y-3 leading-relaxed text-sm">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={part.language || 'text'}
              code={part.code}
            />
          );
        }
        return <FormattedParagraph key={index} text={part.text} />;
      })}
    </div>
  );
}

function splitIntoBlocks(text: string): Array<{ type: 'text' | 'code'; text: string; code: string; language?: string }> {
  const blocks: Array<{ type: 'text' | 'code'; text: string; code: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
        code: '',
      });
    }
    blocks.push({
      type: 'code',
      text: '',
      language: match[1] || 'bash',
      code: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: 'text',
      text: text.slice(lastIndex),
      code: '',
    });
  }

  return blocks;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400">
        <span className="font-mono uppercase font-semibold text-emerald-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono text-zinc-200">
        <pre className="m-0 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function FormattedParagraph({ text }: { text: string }) {
  if (!text || text.trim() === '') return null;

  // Split by double newlines into logical paragraphs or list blocks
  const paragraphs = text.split(/\n{2,}/);

  return (
    <>
      {paragraphs.map((para, idx) => {
        const lines = para.split('\n');

        // Check if paragraph is a header
        if (para.startsWith('### ')) {
          return <h3 key={idx} className="text-sm font-semibold text-emerald-500 mt-3 mb-1.5">{renderInline(para.slice(4))}</h3>;
        }
        if (para.startsWith('## ')) {
          return <h2 key={idx} className="text-base font-semibold opacity-95 mt-4 mb-2">{renderInline(para.slice(3))}</h2>;
        }
        if (para.startsWith('# ')) {
          return <h1 key={idx} className="text-lg font-bold opacity-100 mt-5 mb-2.5">{renderInline(para.slice(2))}</h1>;
        }

        // Horizontal Rule
        if (para.trim() === '---' || para.trim() === '***') {
          return <hr key={idx} className="my-3 border-t border-current opacity-20" />;
        }

        // Check if paragraph is a list
        const isBulletList = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
        if (isBulletList) {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 my-2 pl-1 opacity-90 text-xs md:text-sm">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  {renderInline(l.trim().replace(/^[-*]\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        const isNumberedList = lines.every(l => /^\d+\.\s+/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol key={idx} className="list-decimal list-inside space-y-1 my-2 pl-1 opacity-90 text-xs md:text-sm">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  {renderInline(l.trim().replace(/^\d+\.\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        // Regular paragraph with potential soft breaks
        return (
          <p key={idx} className="leading-relaxed opacity-95 text-xs md:text-sm">
            {lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {renderInline(line)}
                {lineIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode[] {
  // Parse inline elements: `code`, **bold**, *italic*
  const elements: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      elements.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-emerald-400 font-mono text-[11px] border border-zinc-700/50">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      elements.push(
        <strong key={match.index} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      elements.push(
        <em key={match.index} className="italic opacity-80">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

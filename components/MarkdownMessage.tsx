import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
}

const CodeBlock = ({ className, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const isInline = !match && !String(children).includes('\n');

  if (isInline) {
    return (
      <code className="bg-slate-700/50 text-blue-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    if (!children) return;
    const textToCopy = String(children).replace(/\n$/, '');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden bg-slate-950 border border-slate-700/50">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs text-slate-400">
        <span className="font-mono">{match ? match[1] : 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
          title="Copy code"
        >
          {isCopied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <code className="font-mono text-sm text-slate-200" {...props}>
          {children}
        </code>
      </div>
    </div>
  );
};

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-slate max-w-none break-words text-sm md:text-base leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Use the custom CodeBlock component for code elements
          code: CodeBlock,
          // Override generic styling
          p({ children }) {
            return <p className="mb-4 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-4 mb-4 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-4 mb-4 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-slate-600 pl-4 py-1 my-4 italic text-slate-400 bg-slate-800/30 rounded-r">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
             return (
                 <div className="overflow-x-auto my-6 rounded-lg border border-slate-700">
                     <table className="min-w-full divide-y divide-slate-700 text-sm">
                         {children}
                     </table>
                 </div>
             )
          },
          thead({ children }) {
              return <thead className="bg-slate-800">{children}</thead>
          },
          th({ children }) {
              return <th className="px-4 py-3 text-left font-semibold text-slate-200">{children}</th>
          },
          td({ children }) {
              return <td className="px-4 py-3 text-slate-300 border-t border-slate-700">{children}</td>
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
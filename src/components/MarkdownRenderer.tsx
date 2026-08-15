import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copied, setCopied] = useState(false);

  // Configure marked for clean, standard GitHub Flavored Markdown
  const htmlContent = useMemo(() => {
    if (!content) return '';
    try {
      marked.setOptions({
        breaks: true,
        gfm: true
      });
      const rawHtml = marked.parse(content) as string;
      return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel', 'class'],
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'a', 'span', 'div', 'hr', 'mark', 'kbd', 'del', 'sup', 'sub'
        ]
      });
    } catch (e) {
      console.error('[MarkdownRenderer] Error parsing markdown:', e);
      return DOMPurify.sanitize(content);
    }
  }, [content]);

  return (
    <div 
      className={`prose-accountant prose-sm max-w-none text-inherit leading-relaxed font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;

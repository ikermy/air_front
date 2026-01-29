import React, { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
    text: string;
}

/**
 * MarkdownRenderer - компонент для отображения текста с поддержкой Markdown.
 * @param {string} text - Текст, который нужно отобразить.
 * @returns {JSX.Element} - Отформатированный текст в виде HTML.
 */
const MarkdownRenderer: FC<MarkdownRendererProps> = ({ text }) => {
    return (
        <ReactMarkdown
            children={text}
            remarkPlugins={[remarkGfm]} // Поддержка GitHub Flavored Markdown (таблицы, чекбоксы и т.д.)
            rehypePlugins={[rehypeRaw]} // Поддержка встроенного HTML в Markdown
        />
    );
};

export default MarkdownRenderer;


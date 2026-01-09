"use client";

import React from "react";

// Simplified MDX components for react-markdown
type MDXComponentProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

type HeadingProps = MDXComponentProps;
type ParagraphProps = MDXComponentProps;
type CodeProps = {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};
type LinkProps = {
  href?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

// A comprehensive MDX components mapping for ReactMarkdown
export const mdxComponents = {
  // Headings
  h1: ({ children, ...props }: HeadingProps) => (
    <h1 className="text-2xl font-extrabold my-6 text-black dark:text-white" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: HeadingProps) => (
    <h2 className="text-xl font-bold my-5 text-black dark:text-white" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: HeadingProps) => (
    <h3 className="text-lg font-semibold my-4 text-black dark:text-white" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: HeadingProps) => (
    <h4 className="text-lg font-semibold my-3 text-black dark:text-white" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }: HeadingProps) => (
    <h5 className="text-lg font-medium my-2 text-black dark:text-white" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }: HeadingProps) => (
    <h6 className="text-md font-medium my-1 text-black dark:text-white" {...props}>
      {children}
    </h6>
  ),

  // Paragraph
  p: ({ children, ...props }: ParagraphProps) => (
    <p
      className="text-base !font-normal mb-4 leading-relaxed text-neutral-800 dark:text-neutral-200"
      {...props}
    >
      {children}
    </p>
  ),

  // Inline text styles
  strong: ({ children, ...props }: MDXComponentProps) => (
    <strong className="font-bold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: MDXComponentProps) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  del: ({ children, ...props }: MDXComponentProps) => (
    <del className="line-through text-red-500" {...props}>
      {children}
    </del>
  ),
  inlineCode: ({ children, ...props }: CodeProps) => (
    <code
      className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-1 py-0.5 rounded text-sm font-mono"
      {...props}
    >
      {children}
    </code>
  ),
  br: (props: MDXComponentProps) => <br {...props} />,

  // Lists
  ul: ({ children, ...props }: MDXComponentProps) => (
    <ul className="list-disc list-inside mb-4 text-neutral-200" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: MDXComponentProps) => (
    <ol className="list-decimal list-inside mb-4 text-neutral-800 dark:text-neutral-200" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: MDXComponentProps) => (
    <li className="mb-1 ml-4" {...props}>
      {children}
    </li>
  ),

  // Blockquotes
  blockquote: ({ children, ...props }: MDXComponentProps) => (
    <blockquote
      className="border-l-4 border-neutral-400 dark:border-neutral-500 pl-4 italic my-4 text-neutral-700 dark:text-neutral-300"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Thematic break
  hr: (props: MDXComponentProps) => (
    <hr className="my-6 border-neutral-400 dark:border-neutral-600" {...props} />
  ),

  // Links
  a: ({ href, children, ...props }: LinkProps) => (
    <a
      className="text-blue-400 underline hover:text-blue-600"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),

  // Code blocks
  code: ({ className, children, ...props }: CodeProps) => {
    // Inline code - always render as inline
    return (
      <code
        className={`${
          className || ""
        } bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-1 py-0.5 rounded text-sm font-mono`}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: MDXComponentProps) => (
    <pre
      className="bg-neutral-200 dark:bg-neutral-800 p-4 rounded-lg overflow-x-auto my-4"
      {...props}
    >
      {children}
    </pre>
  ),

  // Other
  mark: ({ children, ...props }: MDXComponentProps) => (
    <mark
      className="bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white"
      {...props}
    >
      {children}
    </mark>
  ),
  sub: ({ children, ...props }: MDXComponentProps) => (
    <sub {...props}>{children}</sub>
  ),
  sup: ({ children, ...props }: MDXComponentProps) => (
    <sup {...props}>{children}</sup>
  ),

  // Fallback: render any other tags as-is
  wrapper: ({ children }: MDXComponentProps) => <>{children}</>,
};

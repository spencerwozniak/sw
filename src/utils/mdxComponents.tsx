"use client";

import type { Components } from "react-markdown";

// Minimal MDX components mapping for ReactMarkdown. Everything renders bare
// inside the surrounding `.prose` container; only links get behaviour
// (open in a new tab) with no classes of their own.
export const mdxComponents: Components = {
  a: ({ node, href, children, ...props }) => {
    void node; // react-markdown v10 passes the hast `node`; exclude it from the DOM spread
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

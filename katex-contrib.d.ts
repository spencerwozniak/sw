declare module "katex/contrib/auto-render" {
  interface AutoRenderOptions {
    throwOnError?: boolean;
    errorColor?: string;
    delimiters?: Array<{ left: string; right: string; display?: boolean }>;
    [key: string]: unknown;
  }
  function renderMathInElement(
    element: HTMLElement,
    options?: AutoRenderOptions,
  ): void;
  export default renderMathInElement;
}

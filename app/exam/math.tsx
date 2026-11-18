import "server-only";
import katex from "katex";
import "katex/dist/katex.min.css";

export function renderMath(text: string) {
  return text.split(/(\\\$|\$(?:\\.|[^$\\\r\n])+\$)/).map((part, index) => {
    if (index % 2 === 0) return part;
    if (part === "\\$") return "$";
    const html = katex.renderToString(part.slice(1, -1), {
      throwOnError: false,
      trust: false,
      maxSize: 20,
    });
    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

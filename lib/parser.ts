// 直接引用内部入口，避免 pdf-parse 包入口在 debug 分支误读测试文件
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

/** 按扩展名解析 PDF/DOCX/TXT/MD → 纯文本，不支持的类型抛错 */
export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return (await pdfParse(buffer)).text;
    case "docx":
      return (await mammoth.extractRawText({ buffer })).value;
    case "txt":
    case "md":
      return buffer.toString("utf-8");
    default:
      throw new Error(`不支持的文件类型: .${ext}`);
  }
}

/** 滑窗分块：默认 500 字、重叠 50 字，优先在句号/换行等边界截断 */
export function chunkText(text: string, size = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const cut = Math.max(
        ...["。", "\n", "！", "？", "；", ". "].map((s) => text.lastIndexOf(s, end))
      );
      if (cut > start + size / 2) end = cut + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

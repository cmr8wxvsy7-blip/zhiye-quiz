import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ImportResult } from "../../types";
import { parsePdfText } from "./pdf-parser";

interface PdfTextItem {
  str: string;
  transform: number[];
}

function itemLines(items: PdfTextItem[]): string {
  const rows: Array<{ y: number; items: Array<{ x: number; text: string }> }> =
    [];

  for (const item of items) {
    if (!item.str?.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const row = rows.find((candidate) => Math.abs(candidate.y - y) < 2.2);
    if (row) {
      row.items.push({ x, text: item.str });
    } else {
      rows.push({ y, items: [{ x, text: item.str }] });
    }
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) =>
      row.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

export async function parsePdf(buffer: ArrayBuffer): Promise<ImportResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
  });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  const pageCount = document.numPages;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemLines(content.items as PdfTextItem[]));
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  const result = parsePdfText(pages.join("\n"));
  if (result.questions.length === 0) {
    result.issues.unshift({
      row: 0,
      message:
    pageCount === 0
          ? "PDF 没有可读取页面"
          : "PDF 没有识别到完整题目与答案。需要文字型 PDF，并优先选择带答案的题本。",
    });
  }
  return result;
}

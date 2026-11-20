import type { ImportResult } from "../../types";

export async function parseQuestionFile(file: File): Promise<ImportResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (extension === "xlsx") {
    const { parseExcel } = await import("./excel");
    return parseExcel(buffer);
  }
  if (extension === "docx") {
    const { parseWord } = await import("./word");
    return parseWord(buffer);
  }
  if (extension === "pdf") {
    const { parsePdf } = await import("./pdf");
    return parsePdf(buffer);
  }

  return {
    questions: [],
    issues: [
      {
        row: 0,
        message:
          extension === "doc"
            ? "暂不支持旧版 .doc，请在 Word 中另存为 .docx"
            : extension === "xls"
              ? "暂不支持旧版 .xls，请在 Excel 中另存为 .xlsx"
              : "只支持 .xlsx、.docx 和 .pdf 文件",
      },
    ],
  };
}

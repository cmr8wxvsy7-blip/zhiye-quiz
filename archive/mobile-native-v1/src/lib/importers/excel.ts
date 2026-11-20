import type ExcelJS from "exceljs";
import type { ImportResult, Question } from "../../types";
import { buildQuestion, type QuestionFields } from "./shared";

type SemanticField =
  | "type"
  | "stem"
  | "answer"
  | "hint"
  | "explanation"
  | "tags"
  | "difficulty";

const HEADER_ALIASES: Record<SemanticField, string[]> = {
  type: ["类型", "题型", "type", "questiontype"],
  stem: ["题目", "题干", "问题", "question", "stem"],
  answer: ["答案", "正确答案", "answer", "correctanswer"],
  hint: ["提示", "提示语", "hint"],
  explanation: ["解析", "答案解析", "解释", "explanation"],
  tags: ["标签", "分类", "知识点", "tags", "category"],
  difficulty: ["难度", "difficulty", "level"],
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）()【】[\]]/g, "");
}

function getCellText(row: ExcelJS.Row, column: number): string {
  const value = row.getCell(column).text;
  return String(value ?? "").trim();
}

function detectHeader(
  row: ExcelJS.Row,
  columnCount: number,
): {
  fields: Partial<Record<SemanticField, number>>;
  options: Record<string, number>;
} {
  const fields: Partial<Record<SemanticField, number>> = {};
  const options: Record<string, number> = {};

  for (let column = 1; column <= columnCount; column += 1) {
    const value = normalizeHeader(getCellText(row, column));
    if (!value) continue;

    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      SemanticField,
      string[],
    ][]) {
      if (aliases.some((alias) => value === normalizeHeader(alias))) {
        fields[field] = column;
      }
    }

    const optionMatch =
      value.match(/^选项([a-h])$/) ??
      value.match(/^([a-h])$/) ??
      value.match(/^([a-h])选项$/);
    if (optionMatch) {
      options[optionMatch[1].toUpperCase()] = column;
    }
  }

  return { fields, options };
}

export async function parseExcel(buffer: ArrayBuffer): Promise<ImportResult> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets.find(
    (candidate) => candidate.actualRowCount > 0,
  );
  if (!sheet) {
    return {
      questions: [],
      issues: [{ row: 1, message: "Excel 文件中没有可读取的工作表" }],
    };
  }

  const columnCount = Math.max(sheet.columnCount, 1);
  const { fields, options } = detectHeader(sheet.getRow(1), columnCount);
  if (!fields.stem) {
    return {
      questions: [],
      issues: [
        {
          row: 1,
          message: "未找到“题目/题干”列，请先下载标准模板",
        },
      ],
    };
  }
  if (!fields.answer) {
    return {
      questions: [],
      issues: [
        {
          row: 1,
          message: "未找到“答案”列，请先下载标准模板",
        },
      ],
    };
  }
  const stemColumn = fields.stem;
  const answerColumn = fields.answer;

  const questions: Question[] = [];
  const issues: ImportResult["issues"] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = Object.fromEntries(
      Array.from({ length: columnCount }, (_, index) => [
        index + 1,
        getCellText(row, index + 1),
      ]),
    );
    if (Object.values(values).every((value) => !value)) return;

    const questionOptions = Object.fromEntries(
      Object.entries(options)
        .map(([label, column]) => [label, getCellText(row, column)])
        .filter(([, value]) => value),
    );

    const importFields: QuestionFields = {
      type: fields.type ? getCellText(row, fields.type) : undefined,
      stem: getCellText(row, stemColumn),
      answer: getCellText(row, answerColumn),
      hint: fields.hint ? getCellText(row, fields.hint) : undefined,
      explanation: fields.explanation
        ? getCellText(row, fields.explanation)
        : undefined,
      tags: fields.tags ? getCellText(row, fields.tags) : undefined,
      difficulty: fields.difficulty
        ? getCellText(row, fields.difficulty)
        : undefined,
      options: questionOptions,
    };

    const parsed = buildQuestion(importFields);
    if (parsed.question) {
      questions.push(parsed.question);
    } else if (parsed.issue) {
      issues.push({ row: rowNumber, message: parsed.issue.message });
    }
  });

  return { questions, issues };
}

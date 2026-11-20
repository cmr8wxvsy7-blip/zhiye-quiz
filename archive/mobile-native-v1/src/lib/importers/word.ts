import type { ImportResult, Question } from "../../types";
import {
  buildQuestion,
  extractLabeledValue,
  type QuestionFields,
} from "./shared";

const QUESTION_START = /^\s*(?:第\s*)?\d+\s*(?:[.、．题]|$)/;
const FIELD_LINE =
  /^\s*(?:题型|类型|答案|参考答案|提示|解析|答案解析|难度|标签)\s*[:：]/i;

function isQuestionStart(line: string): boolean {
  return QUESTION_START.test(line) || /^\s*(?:题目|题干)\s*[:：]/.test(line);
}

function cleanStem(lines: string[]): string {
  const combined = lines
    .join("\n")
    .replace(/^\s*(?:第\s*)?\d+\s*[.、．题]\s*/, "")
    .replace(/^\s*(?:题目|题干)\s*[:：]\s*/i, "")
    .trim();
  return combined;
}

function extractInlineType(text: string): string {
  return text.match(/(?:题型|类型)\s*[:：]\s*([^\n]+)/i)?.[1]?.trim() ?? "";
}

function extractOptions(
  lines: string[],
): { options: Record<string, string>; stemLines: string[] } {
  const options: Record<string, string> = {};
  const stemLines: string[] = [];

  for (const line of lines) {
    const singleOption = line.match(
      /^\s*[（(]?([A-Ha-h])[）)]?\s*[.、．:：]\s*(.+?)\s*$/,
    );
    if (singleOption) {
      options[singleOption[1].toUpperCase()] = singleOption[2].trim();
      continue;
    }

    const inlineOptions = [
      ...line.matchAll(/(?:^|\s)([A-H])[.、．]\s*(.+?)(?=\s+[A-H][.、．]|$)/g),
    ];
    if (inlineOptions.length >= 2) {
      inlineOptions.forEach((match) => {
        options[match[1].toUpperCase()] = match[2].trim();
      });
      continue;
    }

    if (!FIELD_LINE.test(line)) {
      stemLines.push(line);
    }
  }

  return { options, stemLines };
}

function parseBlock(lines: string[]): Omit<Question, "id"> | null {
  const text = lines.join("\n");
  const answer = extractLabeledValue(text, ["参考答案", "答案", "answer"]);
  if (!answer) return null;

  const type = extractInlineType(text);
  const hint = extractLabeledValue(text, ["提示", "hint"]);
  const explanation = extractLabeledValue(text, [
    "答案解析",
    "解析",
    "explanation",
  ]);
  const tags = extractLabeledValue(text, ["标签", "知识点", "tags"]);
  const difficulty = extractLabeledValue(text, ["难度", "difficulty", "level"]);

  const cleanedLines = lines.filter((line) => !FIELD_LINE.test(line));
  const { options, stemLines } = extractOptions(cleanedLines);
  const stem = cleanStem(stemLines);

  const fields: QuestionFields = {
    type,
    stem,
    options,
    answer,
    hint,
    explanation,
    tags,
    difficulty,
  };

  return buildQuestion(fields).question ?? null;
}

function splitQuestionBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isQuestionStart(line) && current.some((item) => item.trim())) {
      blocks.push(current);
      current = [line];
      continue;
    }
    if (line.trim()) {
      current.push(line.trim());
    }
  }

  if (current.length) {
    blocks.push(current);
  }
  return blocks;
}

function parseWordTable(table: HTMLTableElement): Question[] {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length < 2) return [];

  const headers = Array.from(rows[0].querySelectorAll("th,td")).map((cell) =>
    cell.textContent?.trim() ?? "",
  );
  const stemIndex = headers.findIndex((header) =>
    /题目|题干|question|stem/i.test(header),
  );
  const answerIndex = headers.findIndex((header) =>
    /答案|answer/i.test(header),
  );
  if (stemIndex < 0 || answerIndex < 0) return [];

  const typeIndex = headers.findIndex((header) =>
    /类型|题型|type/i.test(header),
  );
  const hintIndex = headers.findIndex((header) => /提示|hint/i.test(header));
  const explanationIndex = headers.findIndex((header) =>
    /解析|explanation/i.test(header),
  );
  const optionColumns = headers
    .map((header, index) => ({
      index,
      label: header.match(/^(?:选项)?([A-H])$/i)?.[1]?.toUpperCase(),
    }))
    .filter((item): item is { index: number; label: string } => Boolean(item.label));

  return rows
    .slice(1)
    .map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) =>
      cell.textContent?.trim() ?? "",
    ))
    .map((cells) => {
      const options = Object.fromEntries(
        optionColumns.map(({ label, index }) => [label, cells[index] ?? ""]),
      );
      return buildQuestion({
        stem: cells[stemIndex],
        answer: cells[answerIndex],
        type: typeIndex >= 0 ? cells[typeIndex] : "",
        hint: hintIndex >= 0 ? cells[hintIndex] : "",
        explanation: explanationIndex >= 0 ? cells[explanationIndex] : "",
        options,
      }).question;
    })
    .filter((question): question is Question => Boolean(question));
}

export async function parseWord(buffer: ArrayBuffer): Promise<ImportResult> {
  const { default: mammoth } = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const document = new DOMParser().parseFromString(result.value, "text/html");
  const questions = [
    ...Array.from(document.querySelectorAll("table")).flatMap(parseWordTable),
  ];

  const lines = Array.from(
    document.querySelectorAll("p, li, h1, h2, h3"),
  )
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean);
  const blocks = splitQuestionBlocks(lines);
  for (const block of blocks) {
    const parsed = parseBlock(block);
    if (parsed) {
      questions.push({ ...parsed, id: crypto.randomUUID() });
    }
  }

  const issues = result.messages
    .filter((message) => message.type === "warning")
    .map((message) => ({ row: 0, message: message.message }));

  if (questions.length === 0) {
    issues.push({
      row: 0,
      message:
        "没有识别到题目。请确保每题以“1.”等序号开头，并包含答案字段。",
    });
  }

  return { questions, issues };
}

import { createId } from "../id";
import {
  normalizeAnswerLetters,
  normalizeType,
} from "../questions";
import type { ImportIssue, Question, QuestionType } from "../../types";

export interface QuestionFields {
  type?: string;
  stem?: string;
  options?: Record<string, string>;
  answer?: string;
  hint?: string;
  explanation?: string;
  tags?: string;
  difficulty?: string;
}

export interface ParsedQuestion {
  question?: Question;
  issue?: Omit<ImportIssue, "row">;
}

export function parseDifficulty(value = ""): 0 | 1 | 2 {
  const normalized = value.trim().toLowerCase();
  if (/^(2|3|难|高|挑战|hard)$/.test(normalized)) return 2;
  if (/^(1|2|中|进阶|medium)$/.test(normalized)) return 1;
  return 0;
}

export function buildQuestion(fields: QuestionFields): ParsedQuestion {
  const stem = fields.stem?.trim();
  if (!stem) {
    return { issue: { message: "缺少题干" } };
  }

  const options = Object.entries(fields.options ?? {})
    .filter(([, value]) => value.trim())
    .sort(([left], [right]) => left.localeCompare(right));
  const answerText = fields.answer?.trim() ?? "";
  const inferredType: QuestionType = options.length
    ? normalizeAnswerLetters(answerText).length > 1
      ? "multiple"
      : "single"
    : "text";
  const type = normalizeType(fields.type ?? "") ?? inferredType;

  if (!answerText) {
    return { issue: { message: "缺少答案" } };
  }

  if (type !== "text" && options.length < 2) {
    return { issue: { message: "选择题至少需要两个选项" } };
  }

  const letters = normalizeAnswerLetters(answerText);
  if (type !== "text" && letters.length === 0) {
    return { issue: { message: "选择题答案未识别到 A-H 选项字母" } };
  }

  if (type === "single" && letters.length !== 1) {
    return { issue: { message: "单选题答案必须只有一个选项字母" } };
  }

  const labels = new Set(options.map(([label]) => label));
  const missingLetter = letters.find((letter) => !labels.has(letter));
  if (type !== "text" && missingLetter) {
    return { issue: { message: `答案引用了不存在的选项 ${missingLetter}` } };
  }

  return {
    question: {
      id: createId("question"),
      type,
      stem,
      options: options.map(([, value]) => value.trim()),
      answer: type === "text" ? [answerText] : letters,
      hint: fields.hint?.trim() || undefined,
      explanation: fields.explanation?.trim() || undefined,
      tags: (fields.tags ?? "")
        .split(/[,，、;；]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      difficulty: parseDifficulty(fields.difficulty),
    },
  };
}

export function extractLabeledValue(text: string, labels: string[]): string {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:题型|类型|答案|参考答案|提示|解析|答案解析|难度|标签)\\s*[:：]|$)`,
    "i",
  );
  return text.match(pattern)?.[1]?.trim() ?? "";
}

import type {
  GradeResult,
  PracticeScope,
  Question,
  QuestionType,
} from "../types";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single: "单选",
  multiple: "多选",
  text: "大题",
};

export const PRACTICE_SCOPE_LABEL: Record<PracticeScope, string> = {
  all: "全部题目",
  choice: "选择题",
  text: "填空 / 大题",
};

export function matchesPracticeScope(
  question: Question,
  scope: PracticeScope,
): boolean {
  if (scope === "all") return true;
  if (scope === "choice") {
    return question.type === "single" || question.type === "multiple";
  }
  return question.type === "text";
}

export function normalizeType(value: string): QuestionType | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return null;

  if (
    ["单选", "单项选择", "单选题", "single", "singlechoice"].includes(normalized)
  ) {
    return "single";
  }
  if (
    ["多选", "多项选择", "多选题", "multiple", "multiplechoice"].includes(
      normalized,
    )
  ) {
    return "multiple";
  }
  if (
    [
      "大题",
      "简答",
      "简答题",
      "问答",
      "问答题",
      "填空",
      "名词解释",
      "text",
      "shortanswer",
      "essay",
    ].includes(normalized)
  ) {
    return "text";
  }
  return null;
}

export function normalizeAnswerLetters(value: string): string[] {
  const compact = value
    .toUpperCase()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/[^A-H]/g, "");
  return [...new Set(compact.split(""))].sort();
}

export function normalizeAnswerArray(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function sameAnswerSet(left: string[], right: string[]): boolean {
  const a = normalizeAnswerArray(left);
  const b = normalizeAnswerArray(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function gradeQuestion(
  question: Question,
  answer: string[],
  manualScore?: number,
): GradeResult {
  if (question.type === "text") {
    const score = manualScore ?? 0;
    return {
      score,
      correct: score >= 1,
      partial: score > 0 && score < 1,
    };
  }

  const correct = sameAnswerSet(answer, question.answer);
  return {
    score: correct ? 1 : 0,
    correct,
    partial: false,
  };
}

export function getDirectAnswer(question: Question): string {
  if (question.type === "text") {
    return question.answer.join("\n");
  }
  return question.answer
    .map((letter) => {
      const index = letter.charCodeAt(0) - 65;
      const option = question.options[index];
      return option ? `${letter}. ${option}` : letter;
    })
    .join("\n");
}

export function getDifficultyLabel(difficulty: Question["difficulty"]): string {
  return ["基础", "进阶", "挑战"][difficulty] ?? "基础";
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

import type { Question } from "../types";

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？；：、“”‘’（）()《》〈〉,.!?;:'"[\]\-_/\\]/g, "");
}

export function questionDuplicateKey(question: Question): string {
  const stem = normalizeText(question.stem);
  if (question.type === "text") {
    return [
      question.type,
      stem,
      normalizeText(question.answer.join("")),
    ].join("|");
  }

  return [
    question.type,
    stem,
    question.options.map(normalizeText).sort().join("|"),
  ].join("|");
}

export interface DedupeResult {
  questions: Question[];
  duplicatesInFile: number;
  duplicatesInLibrary: number;
}

export function dedupeQuestions(
  incoming: Question[],
  existing: Question[],
): DedupeResult {
  const libraryKeys = new Set(existing.map(questionDuplicateKey));
  const seenKeys = new Set<string>();
  const questions: Question[] = [];
  let duplicatesInFile = 0;
  let duplicatesInLibrary = 0;

  for (const question of incoming) {
    const key = questionDuplicateKey(question);
    if (seenKeys.has(key)) {
      duplicatesInFile += 1;
      continue;
    }
    seenKeys.add(key);
    if (libraryKeys.has(key)) {
      duplicatesInLibrary += 1;
      continue;
    }
    questions.push(question);
  }

  return { questions, duplicatesInFile, duplicatesInLibrary };
}

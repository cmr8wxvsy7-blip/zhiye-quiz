import { buildQuestion } from "./shared";
import type {
  ImportIssue,
  ImportResult,
  Question,
  QuestionType,
} from "../../types";

const CHAPTER_PATTERN =
  /^(?:导论|绪论|第[一二三四五六七八九十百零〇]+章)(?:\s+.*)?$/;
const QUESTION_PATTERN = /^(\d{1,3})\s*[.．、]\s*(.+)$/;
const SINGLE_HEADING =
  /^[（(]一[）)]\s*单选题[：:]?$/;
const MULTIPLE_HEADING =
  /^[（(]二[）)]\s*多选题[：:]?$/;
const TEXT_HEADING = /^二、\s*主观题[：:]?$/;

interface QuestionDraft {
  number: number;
  type: QuestionType;
  lines: string[];
}

interface ChapterSection {
  title: string;
  lines: string[];
}

function cleanLine(line: string): string {
  return line.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function splitChapters(lines: string[]): ChapterSection[] {
  const chapters: ChapterSection[] = [];
  let current: ChapterSection = { title: "PDF 题库", lines: [] };

  for (const line of lines) {
    if (CHAPTER_PATTERN.test(line) && current.lines.some(Boolean)) {
      chapters.push(current);
      current = { title: line, lines: [] };
      continue;
    }
    if (
      CHAPTER_PATTERN.test(line) &&
      current.lines.filter(Boolean).every((item) => /^=== PDF PAGE/.test(item))
    ) {
      current.title = line;
      continue;
    }
    current.lines.push(line);
  }
  if (current.lines.some(Boolean)) chapters.push(current);
  return chapters;
}

function countCompactAnswers(line: string): number {
  return [
    ...line.matchAll(
      /(\d{1,3})\s*[.．、:：]?\s*[（(]?([A-H](?:\s*[,，、]?\s*[A-H])*)[）)]?/g,
    ),
  ].length;
}

function findAnswerBoundary(lines: string[]): number {
  const explicit = lines.findIndex((line) =>
    /^参考答案\s*[：:]?$/.test(line),
  );
  if (explicit >= 0) return explicit;

  const compactIndex = lines.findIndex(
    (line, index) => index > 4 && countCompactAnswers(line) >= 2,
  );
  if (compactIndex < 0) return -1;

  for (
    let index = compactIndex;
    index >= Math.max(0, compactIndex - 10);
    index -= 1
  ) {
    if (/^一、\s*选择题/.test(lines[index])) return index;
  }
  return compactIndex;
}

function splitOptionLine(
  line: string,
): Array<{ letter: string; text: string }> {
  const matches = [
    ...line.matchAll(/(?:^|\s)([A-H])(?:[.．、:：]\s*|\s+)/g),
  ];

  if (
    matches.length === 0 &&
    /^[A-H](?=[“”"'《（(])/.test(line.trim())
  ) {
    return [{ letter: line.trim()[0], text: line.trim().slice(1).trim() }];
  }

  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? line.length)
        : line.length;
    return {
      letter: match[1].toUpperCase(),
      text: line.slice(start, end).trim(),
    };
  });
}

function parseQuestionDrafts(
  lines: string[],
  chapterTitle: string,
  issues: ImportIssue[],
): QuestionDraft[] {
  const drafts: QuestionDraft[] = [];
  let type: QuestionType | null = null;
  let current: QuestionDraft | null = null;

  const flush = () => {
    if (current) drafts.push(current);
    current = null;
  };

  for (const line of lines) {
    if (SINGLE_HEADING.test(line)) {
      flush();
      type = "single";
      continue;
    }
    if (MULTIPLE_HEADING.test(line)) {
      flush();
      type = "multiple";
      continue;
    }
    if (TEXT_HEADING.test(line)) {
      flush();
      type = "text";
      continue;
    }
    if (/^一、\s*选择题/.test(line)) {
      flush();
      continue;
    }

    const question = line.match(QUESTION_PATTERN);
    if (question && type) {
      flush();
      current = {
        number: Number(question[1]),
        type,
        lines: [question[2]],
      };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();

  if (drafts.length === 0) {
    issues.push({
      row: 0,
      message: `${chapterTitle}未识别到题目`,
    });
  }
  return drafts;
}

function parseDraft(draft: QuestionDraft): {
  stem: string;
  options: Record<string, string>;
} {
  const stemParts: string[] = [];
  const options: Record<string, string> = {};
  let currentOption: string | null = null;

  for (const line of draft.lines) {
    const parsedOptions = splitOptionLine(line);
    if (parsedOptions.length > 0) {
      for (const option of parsedOptions) {
        options[option.letter] = option.text;
        currentOption = option.letter;
      }
      continue;
    }

    if (currentOption) {
      options[currentOption] = `${options[currentOption]}${line}`;
    } else {
      stemParts.push(line);
    }
  }

  return {
    stem: stemParts.join("").replace(/\s+/g, " ").trim(),
    options,
  };
}

function sliceAnswerSection(
  lines: string[],
  startPattern: RegExp,
  endPatterns: RegExp[],
): string[] {
  const start = lines.findIndex((line) => startPattern.test(line));
  if (start < 0) return [];
  const end = lines.findIndex(
    (line, index) =>
      index > start && endPatterns.some((pattern) => pattern.test(line)),
  );
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

function parseChoiceAnswers(
  answerLines: string[],
  type: "single" | "multiple",
): Map<number, string[]> {
  const section =
    type === "single"
      ? sliceAnswerSection(answerLines, /^[（(]一[）)]\s*单选题/, [
          /^[（(]二[）)]\s*多选题/,
          /^[（(]二[）)]\s*单选题/,
          TEXT_HEADING,
        ])
      : sliceAnswerSection(
          answerLines,
          /^[（(]二[）)]\s*(?:单选题|多选题)/,
          [TEXT_HEADING],
        );
  const text = section.join(" ");
  const answers = new Map<number, string[]>();

  for (const match of text.matchAll(
    /(\d{1,3})\s*[.．、:：]?\s*[（(]?([A-H](?:\s*[,，、]?\s*[A-H])*)[）)]?/g,
  )) {
    const letters = [
      ...new Set(match[2].replace(/[^A-H]/g, "").split("")),
    ].sort();
    answers.set(Number(match[1]), letters);
  }
  return answers;
}

function parseTextAnswers(answerLines: string[]): Map<number, string> {
  const section = sliceAnswerSection(answerLines, TEXT_HEADING, []);
  const result = new Map<number, string>();
  let currentNumber: number | null = null;
  let body: string[] = [];

  const flush = () => {
    if (currentNumber !== null) {
      const value = body.join("\n").trim();
      if (value) result.set(currentNumber, value);
    }
  };

  for (const line of section) {
    const question = line.match(QUESTION_PATTERN);
    if (question) {
      flush();
      currentNumber = Number(question[1]);
      body = [];
      continue;
    }
    if (/^答案要点\s*[：:]?/.test(line) || /^参考答案\s*[：:]?/.test(line)) {
      continue;
    }
    if (currentNumber !== null) body.push(line);
  }
  flush();
  return result;
}

export function parsePdfText(text: string): ImportResult {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  const chapters = splitChapters(lines);
  const questions: Question[] = [];
  const issues: ImportIssue[] = [];
  let chaptersWithoutAnswers = 0;

  for (const chapter of chapters) {
    const boundary = findAnswerBoundary(chapter.lines);
    if (boundary < 0) {
      chaptersWithoutAnswers += 1;
      continue;
    }

    const questionLines = chapter.lines.slice(0, boundary);
    const answerLines = chapter.lines.slice(boundary);
    const drafts = parseQuestionDrafts(questionLines, chapter.title, issues);
    const singleAnswers = parseChoiceAnswers(answerLines, "single");
    const multipleAnswers = parseChoiceAnswers(answerLines, "multiple");
    const textAnswers = parseTextAnswers(answerLines);

    for (const draft of drafts) {
      const parsed = parseDraft(draft);
      const answer =
        draft.type === "single"
          ? singleAnswers.get(draft.number)
          : draft.type === "multiple"
            ? multipleAnswers.get(draft.number)
            : textAnswers.has(draft.number)
              ? [textAnswers.get(draft.number)!]
              : undefined;

      if (!answer?.length) {
        issues.push({
          row: draft.number,
          message: `${chapter.title}第 ${draft.number} 题缺少答案`,
        });
        continue;
      }

      const built = buildQuestion({
        type: draft.type,
        stem: parsed.stem,
        options: parsed.options,
        answer: draft.type === "text" ? answer[0] : answer.join(","),
        tags: chapter.title,
      });
      if (built.question) {
        questions.push(built.question);
      } else if (built.issue) {
        issues.push({
          row: draft.number,
          message: `${chapter.title}第 ${draft.number} 题：${built.issue.message}`,
        });
      }
    }
  }

  if (chaptersWithoutAnswers > 0) {
    issues.unshift({
      row: 0,
      message: `${chaptersWithoutAnswers} 个章节未识别到答案区，请选择包含答案的 PDF`,
    });
  }

  return { questions, issues };
}

export type QuestionType = "single" | "multiple" | "text";
export type PracticeMode = "sequence" | "random" | "mistakes";
export type PracticeScope = "all" | "choice" | "text";

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  options: string[];
  answer: string[];
  hint?: string;
  explanation?: string;
  tags: string[];
  difficulty: 0 | 1 | 2;
}

export interface QuestionBank {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionStat {
  correct: number;
  wrong: number;
  hinted: number;
  lastResult: "correct" | "partial" | "wrong";
  updatedAt: string;
}

export interface BankProgress {
  questionStats: Record<string, QuestionStat>;
  lastQuestionId?: string;
  updatedAt: string;
}

export interface PracticeSnapshot {
  bankId: string;
  mode: PracticeMode;
  scope: PracticeScope;
  order: string[];
  index: number;
  answers: Record<string, string[]>;
  textAnswers: Record<string, string>;
  manualScores: Record<string, number>;
  submitted: Record<string, boolean>;
  hintStage: Record<string, number>;
  startedAt: string;
}

export interface AttemptRecord {
  id: string;
  bankId: string;
  bankTitle: string;
  mode: PracticeMode;
  scope: PracticeScope;
  startedAt: string;
  finishedAt: string;
  total: number;
  correct: number;
  partial: number;
  wrong: number;
  hinted: number;
  answers: Record<string, { answer: string[]; score: number; usedHint: boolean }>;
}

export interface AppData {
  version: 1;
  banks: QuestionBank[];
  activeBankId: string | null;
  progress: Record<string, BankProgress>;
  session: PracticeSnapshot | null;
  attempts: AttemptRecord[];
}

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ImportResult {
  questions: Question[];
  issues: ImportIssue[];
}

export interface GradeResult {
  score: number;
  correct: boolean;
  partial: boolean;
}

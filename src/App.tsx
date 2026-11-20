import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, type AppView } from "./components/AppShell";
import { createId } from "./lib/id";
import {
  gradeQuestion,
  matchesPracticeScope,
  PRACTICE_SCOPE_LABEL,
  shuffle,
} from "./lib/questions";
import { loadAppData, saveAppData } from "./lib/storage";
import { downloadJsonBackup, exportBankToExcel } from "./lib/template";
import type {
  AppData,
  AttemptRecord,
  PracticeMode,
  PracticeScope,
  PracticeSnapshot,
  Question,
  QuestionBank,
} from "./types";
import { HomePage } from "./pages/HomePage";
import { ImportPage } from "./pages/ImportPage";
import { PracticePage } from "./pages/PracticePage";
import { SummaryPage } from "./pages/SummaryPage";

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [view, setView] = useState<AppView>("home");
  const [lastAttempt, setLastAttempt] = useState<AttemptRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      (document.documentElement.dataset.theme as "light" | "dark" | undefined) ??
      "dark",
  );

  useEffect(() => {
    void loadAppData().then(setData);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".app-main");
    if (scroller) scroller.scrollTop = 0;
  }, [view]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .getElementById("theme-color")
      ?.setAttribute("content", theme === "dark" ? "#080b11" : "#f2f1ec");
  }, [theme]);

  useEffect(() => {
    if (localStorage.getItem("zhiye-theme")) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => setTheme(media.matches ? "dark" : "light");
    syncTheme();
    media.addEventListener("change", syncTheme);
    return () => media.removeEventListener("change", syncTheme);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("zhiye-theme", next);
    setTheme(next);
  }

  const activeBank = useMemo(
    () =>
      data?.banks.find((bank) => bank.id === data.activeBankId) ??
      data?.banks[0] ??
      null,
    [data],
  );

  function updateData(
    updater: (current: AppData) => AppData,
    persist = true,
  ) {
    setData((current) => {
      if (!current) return current;
      const next = updater(current);
      if (persist) void saveAppData(next);
      return next;
    });
  }

  function startPractice(
    bankId: string,
    mode: PracticeMode,
    scope: PracticeScope = "all",
  ) {
    if (!data) return;
    const bank = data.banks.find((item) => item.id === bankId);
    if (!bank) return;

    let available: Question[] = bank.questions.filter((question) =>
      matchesPracticeScope(question, scope),
    );
    if (mode === "mistakes") {
      const stats = data.progress[bank.id]?.questionStats ?? {};
      available = available.filter(
        (question) => stats[question.id]?.lastResult !== "correct",
      );
    }

    if (available.length === 0) {
      setNotice(
        mode === "mistakes"
          ? `目前没有${PRACTICE_SCOPE_LABEL[scope]}的待巩固题目。`
          : `这套题库没有${PRACTICE_SCOPE_LABEL[scope]}。`,
      );
      return;
    }

    const order = available.map((question) => question.id);
    const session: PracticeSnapshot = {
      bankId: bank.id,
      mode,
      scope,
      order: mode === "sequence" ? order : shuffle(order),
      index: 0,
      answers: {},
      textAnswers: {},
      manualScores: {},
      submitted: {},
      hintStage: {},
      startedAt: new Date().toISOString(),
    };
    updateData((current) => ({
      ...current,
      activeBankId: bank.id,
      session,
    }));
    setView("practice");
  }

  function resumePractice() {
    if (!data?.session) return;
    const bankExists = data.banks.some(
      (bank) => bank.id === data.session?.bankId,
    );
    if (!bankExists) {
      updateData((current) => ({ ...current, session: null }));
      setNotice("原练习题库已不存在，请重新开始。");
      return;
    }
    setView("practice");
  }

  function recordQuestionResult(
    questionId: string,
    score: number,
    correct: boolean,
    partial: boolean,
    usedHint: boolean,
  ) {
    if (!data?.session) return;
    const bankId = data.session.bankId;
    updateData((current) => {
      const bankProgress = current.progress[bankId] ?? {
        questionStats: {},
        updatedAt: new Date().toISOString(),
      };
      const previous = bankProgress.questionStats[questionId] ?? {
        correct: 0,
        wrong: 0,
        hinted: 0,
        lastResult: "wrong" as const,
        updatedAt: new Date().toISOString(),
      };
      const nextResult = correct ? "correct" : partial ? "partial" : "wrong";
      return {
        ...current,
        progress: {
          ...current.progress,
          [bankId]: {
            ...bankProgress,
            lastQuestionId: questionId,
            updatedAt: new Date().toISOString(),
            questionStats: {
              ...bankProgress.questionStats,
              [questionId]: {
                correct: previous.correct + (correct ? 1 : 0),
                wrong: previous.wrong + (score === 0 ? 1 : 0),
                hinted: previous.hinted + (usedHint ? 1 : 0),
                lastResult: nextResult,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      };
    });
  }

  function finishPractice(session: PracticeSnapshot) {
    if (!data) return;
    const bank = data.banks.find((item) => item.id === session.bankId);
    if (!bank) return;
    const map = new Map(bank.questions.map((question) => [question.id, question]));
    const answers: AttemptRecord["answers"] = {};
    let correct = 0;
    let partial = 0;
    let wrong = 0;
    let hinted = 0;

    session.order.forEach((questionId) => {
      const question = map.get(questionId);
      if (!question) return;
      const selected = session.answers[questionId] ?? [];
      const score = gradeQuestion(
        question,
        selected,
        session.manualScores[questionId],
      ).score;
      const usedHint = (session.hintStage[questionId] ?? 0) > 0;
      if (score >= 1) correct += 1;
      else if (score > 0) partial += 1;
      else wrong += 1;
      if (usedHint) hinted += 1;
      answers[questionId] = { answer: selected, score, usedHint };
    });

    const attempt: AttemptRecord = {
      id: createId("attempt"),
      bankId: bank.id,
      bankTitle: bank.title,
      mode: session.mode,
      scope: session.scope,
      startedAt: session.startedAt,
      finishedAt: new Date().toISOString(),
      total: session.order.length,
      correct,
      partial,
      wrong,
      hinted,
      answers,
    };

    updateData((current) => ({
      ...current,
      session: null,
      attempts: [attempt, ...current.attempts].slice(0, 60),
      activeBankId: bank.id,
    }));
    setLastAttempt(attempt);
    setView("summary");
  }

  function importQuestions(title: string, questions: Question[]) {
    if (questions.length === 0) return;
    const now = new Date().toISOString();
    const bank: QuestionBank = {
      id: createId("bank"),
      title,
      description: `从文件导入，共 ${questions.length} 道题。`,
      questions,
      createdAt: now,
      updatedAt: now,
    };
    updateData((current) => ({
      ...current,
      activeBankId: bank.id,
      banks: [bank, ...current.banks],
      progress: {
        ...current.progress,
        [bank.id]: { questionStats: {}, updatedAt: now },
      },
    }));
    setNotice(`已导入 ${questions.length} 道题。`);
    setView("home");
  }

  function restoreBackup(restored: AppData) {
    updateData(() => restored);
    setView("home");
    setNotice("备份已恢复。");
  }

  function deleteBank(bankId: string) {
    if (!data) return;
    const bank = data.banks.find((item) => item.id === bankId);
    if (!bank) return;
    const confirmed = window.confirm(
      `删除“${bank.title}”会移除该题库及其本地进度。练习记录会保留，但无法恢复题目。是否继续？`,
    );
    if (!confirmed) return;
    updateData((current) => {
      const banks = current.banks.filter((item) => item.id !== bankId);
      const progress = { ...current.progress };
      delete progress[bankId];
      return {
        ...current,
        banks,
        progress,
        activeBankId:
          current.activeBankId === bankId ? (banks[0]?.id ?? null) : current.activeBankId,
        session:
          current.session?.bankId === bankId ? null : current.session,
      };
    });
  }

  if (!data) {
    return (
      <div className="app-loading">
        <span />
        <p>正在整理题库…</p>
      </div>
    );
  }

  const sessionBank = data.session
    ? data.banks.find((bank) => bank.id === data.session?.bankId)
    : null;

  return (
    <>
      <AppShell
        view={view}
        onNavigate={setView}
      >
        <AnimatePresence mode="wait">
          {view === "home" && (
            <HomePage
              activeBank={activeBank}
              data={data}
              key="home"
              onBackup={() => downloadJsonBackup(data)}
              onDeleteBank={deleteBank}
              onExportBank={(bank) => void exportBankToExcel(bank)}
              onOpenImport={() => setView("import")}
              onResume={resumePractice}
              onSelectBank={(bankId) =>
                updateData((current) => ({ ...current, activeBankId: bankId }))
              }
              onStart={(mode, scope) => {
                if (activeBank) startPractice(activeBank.id, mode, scope);
              }}
              onToggleTheme={toggleTheme}
              theme={theme}
            />
          )}
          {view === "import" && (
            <ImportPage
              key="import"
              existingQuestions={data.banks.flatMap((bank) => bank.questions)}
              onBack={() => setView("home")}
              onImport={importQuestions}
              onRestore={restoreBackup}
            />
          )}
          {view === "practice" && data.session && sessionBank && (
            <PracticePage
              bank={sessionBank}
              initialSession={data.session}
              key={`practice-${data.session.bankId}`}
              onExit={() => setView("home")}
              onFinish={finishPractice}
              onQuestionResult={recordQuestionResult}
              onSessionChange={(session) =>
                updateData((current) => ({ ...current, session }))
              }
            />
          )}
          {view === "summary" && lastAttempt && (
            <SummaryPage
              attempt={lastAttempt}
              key="summary"
              onHome={() => setView("home")}
              onRestart={() =>
                startPractice(
                  lastAttempt.bankId,
                  "sequence",
                  lastAttempt.scope,
                )
              }
              onReviewMistakes={() =>
                startPractice(
                  lastAttempt.bankId,
                  "mistakes",
                  lastAttempt.scope,
                )
              }
            />
          )}
        </AnimatePresence>
      </AppShell>

      <AnimatePresence>
        {notice && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

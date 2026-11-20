import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  RotateCw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  getDirectAnswer,
  getDifficultyLabel,
  gradeQuestion,
  PRACTICE_SCOPE_LABEL,
} from "../lib/questions";
import type {
  PracticeMode,
  PracticeSnapshot,
  Question,
  QuestionBank,
} from "../types";
import { TypeBadge } from "../components/TypeBadge";

interface PracticePageProps {
  bank: QuestionBank;
  initialSession: PracticeSnapshot;
  onSessionChange: (session: PracticeSnapshot) => void;
  onExit: () => void;
  onFinish: (session: PracticeSnapshot) => void;
  onQuestionResult: (
    questionId: string,
    score: number,
    correct: boolean,
    partial: boolean,
    usedHint: boolean,
  ) => void;
}

const MODE_LABEL: Record<PracticeMode, string> = {
  sequence: "顺序练习",
  random: "随机练习",
  mistakes: "错题巩固",
};

function withUpdatedSession(
  session: PracticeSnapshot,
  patch: Partial<PracticeSnapshot>,
): PracticeSnapshot {
  return { ...session, ...patch };
}

export function PracticePage({
  bank,
  initialSession,
  onSessionChange,
  onExit,
  onFinish,
  onQuestionResult,
}: PracticePageProps) {
  const [session, setSession] = useState(initialSession);
  const [answerFlash, setAnswerFlash] = useState<"correct" | "wrong" | null>(
    null,
  );
  const reduceMotion = useReducedMotion();
  const questionMap = useMemo(
    () => new Map(bank.questions.map((question) => [question.id, question])),
    [bank.questions],
  );
  const currentQuestion = questionMap.get(session.order[session.index]);
  const submitted = currentQuestion
    ? Boolean(session.submitted[currentQuestion.id])
    : false;
  const selected = currentQuestion
    ? (session.answers[currentQuestion.id] ?? [])
    : [];
  const manualScore = currentQuestion
    ? session.manualScores[currentQuestion.id]
    : undefined;
  const hintStage = currentQuestion
    ? (session.hintStage[currentQuestion.id] ?? 0)
    : 0;
  const progress = Math.round(((session.index + 1) / session.order.length) * 100);
  const answerState = currentQuestion
    ? gradeQuestion(currentQuestion, selected, manualScore)
    : { correct: false, partial: false, score: 0 };
  const canMoveNext = submitted && (currentQuestion?.type !== "text" || manualScore !== undefined);
  const directAnswer = currentQuestion ? getDirectAnswer(currentQuestion) : "";

  useEffect(() => {
    if (!answerFlash) return;
    const timeout = window.setTimeout(() => setAnswerFlash(null), 700);
    return () => window.clearTimeout(timeout);
  }, [answerFlash]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!currentQuestion || submitted) return;
      if (event.key >= "1" && event.key <= "4") {
        const index = Number(event.key) - 1;
        if (currentQuestion.options[index] !== undefined) {
          event.preventDefault();
          toggleOption(String.fromCharCode(65 + index));
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!currentQuestion) {
    return (
      <div className="practice-missing">
        <CircleHelp size={28} strokeWidth={1.6} />
        <h1>题目无法读取</h1>
        <p>题库可能已被修改，请返回首页重新开始。</p>
        <button className="primary-button" onClick={onExit}>
          返回首页
        </button>
      </div>
    );
  }
  const question = currentQuestion;

  function commitSession(next: PracticeSnapshot) {
    setSession(next);
    onSessionChange(next);
  }

  function toggleOption(letter: string) {
    if (submitted) return;
    const current = session.answers[question.id] ?? [];
    const nextAnswer =
      question.type === "single"
        ? [letter]
        : current.includes(letter)
          ? current.filter((item) => item !== letter)
          : [...current, letter].sort();
    commitSession({
      ...session,
      answers: { ...session.answers, [question.id]: nextAnswer },
    });
  }

  function updateTextAnswer(value: string) {
    commitSession({
      ...session,
      textAnswers: { ...session.textAnswers, [question.id]: value },
    });
  }

  function revealHint() {
    commitSession({
      ...session,
      hintStage: { ...session.hintStage, [question.id]: 1 },
    });
  }

  function submitChoice() {
    if (submitted || selected.length === 0) return;
    const result = gradeQuestion(question, selected);
    commitSession({
      ...session,
      submitted: { ...session.submitted, [question.id]: true },
    });
    setAnswerFlash(result.correct ? "correct" : "wrong");
    onQuestionResult(
      question.id,
      result.score,
      result.correct,
      result.partial,
      hintStage > 0,
    );
  }

  function markText(score: number) {
    const result = gradeQuestion(question, selected, score);
    commitSession({
      ...session,
      submitted: { ...session.submitted, [question.id]: true },
      manualScores: {
        ...session.manualScores,
        [question.id]: score,
      },
    });
    setAnswerFlash(result.correct ? "correct" : "wrong");
    onQuestionResult(
      question.id,
      result.score,
      result.correct,
      result.partial,
      hintStage > 0,
    );
  }

  function showTextReference() {
    if (submitted) return;
    commitSession({
      ...session,
      submitted: { ...session.submitted, [question.id]: true },
    });
  }

  function goNext() {
    if (!canMoveNext) return;
    if (session.index >= session.order.length - 1) {
      onFinish(session);
      return;
    }
    commitSession(
      withUpdatedSession(session, {
        index: session.index + 1,
      }),
    );
  }

  const enterMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: {
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1] as const,
        },
      };

  return (
    <motion.div
      className="practice-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="practice-header">
        <button
          aria-label="返回题库"
          className="practice-back"
          onClick={onExit}
        >
          <ArrowLeft size={17} strokeWidth={1.9} />
          <span>题库</span>
        </button>
        <div className="practice-context">
          <strong>{bank.title}</strong>
          <span>
            {MODE_LABEL[session.mode]} · {PRACTICE_SCOPE_LABEL[session.scope]}
          </span>
        </div>
        <span className="practice-step-pill">
          {session.index + 1} / {session.order.length}
        </span>
      </header>

      <div className="practice-progress" aria-label={`练习进度 ${progress}%`}>
        <motion.span
          animate={{ width: `${progress}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
        />
      </div>

      <div className="practice-layout">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            className="question-sheet"
            key={currentQuestion.id}
            {...enterMotion}
          >
            <div className="question-meta">
              <span className="question-number">第 {session.index + 1} 题</span>
              <div>
                <TypeBadge type={currentQuestion.type} />
                <span className="difficulty-label">
                  {getDifficultyLabel(currentQuestion.difficulty)}
                </span>
              </div>
            </div>

            <h1 className="question-stem">{currentQuestion.stem}</h1>

            {currentQuestion.options.length > 0 ? (
              <div
                className={`option-list option-list--${currentQuestion.type}`}
                role={currentQuestion.type === "multiple" ? "group" : "radiogroup"}
              >
                {currentQuestion.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index);
                  const isSelected = selected.includes(letter);
                  const isCorrect =
                    submitted && currentQuestion.answer.includes(letter);
                  const isWrong =
                    submitted && isSelected && !currentQuestion.answer.includes(letter);
                  return (
                    <motion.button
                      className={`option-row ${isSelected ? "is-selected" : ""} ${
                        isCorrect ? "is-correct" : ""
                      } ${isWrong ? "is-wrong" : ""}`}
                      disabled={submitted}
                      initial={
                        reduceMotion ? false : { opacity: 0, y: 8, scale: 0.995 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      key={letter}
                      onClick={() => toggleOption(letter)}
                      transition={{
                        delay: reduceMotion ? 0 : 0.04 + index * 0.045,
                        duration: 0.26,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileTap={
                        reduceMotion || submitted ? undefined : { scale: 0.985 }
                      }
                    >
                      {isSelected && (
                        <motion.span
                          className="option-active-line"
                          layoutId="option-active-line"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="option-letter">{letter}</span>
                      <span className="option-text">{option}</span>
                      <span className="option-state">
                        {isCorrect ? (
                          <Check size={17} strokeWidth={2.2} />
                        ) : isWrong ? (
                          <X size={17} strokeWidth={2.2} />
                        ) : (
                          <span
                            className={`choice-indicator choice-indicator--${currentQuestion.type}`}
                          />
                        )}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="text-answer">
                <label htmlFor="long-answer">你的回答</label>
                <textarea
                  id="long-answer"
                  placeholder="先写结论，再补关键步骤…"
                  readOnly={submitted}
                  rows={7}
                  value={session.textAnswers[currentQuestion.id] ?? ""}
                  onChange={(event) => updateTextAnswer(event.target.value)}
                />
              </div>
            )}

            <AnimatePresence>
              {submitted && (
                <motion.div
                  className={`answer-panel ${
                    currentQuestion.type === "text"
                      ? manualScore === undefined
                        ? "is-review"
                        : answerState.correct
                          ? "is-correct"
                          : answerState.partial
                            ? "is-partial"
                            : "is-wrong"
                      : answerState.correct
                        ? "is-correct"
                        : "is-wrong"
                  }`}
                  initial={{ opacity: 0, height: 0, y: 8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.24 }}
                >
                  <div className="answer-status">
                    {currentQuestion.type === "text" ? (
                      manualScore === undefined ? (
                        <>
                          <Sparkles size={18} strokeWidth={1.8} />
                          <span>对照参考答案，给自己的回答评分</span>
                        </>
                      ) : answerState.correct ? (
                        <>
                          <CheckCircle2 size={18} strokeWidth={1.9} />
                          <span>已标记为掌握</span>
                        </>
                      ) : answerState.partial ? (
                        <>
                          <CircleHelp size={18} strokeWidth={1.9} />
                          <span>已标记为部分掌握</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={18} strokeWidth={1.9} />
                          <span>已加入待巩固</span>
                        </>
                      )
                    ) : answerState.correct ? (
                      <>
                        <CheckCircle2 size={18} strokeWidth={1.9} />
                        <span>回答正确</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={18} strokeWidth={1.9} />
                        <span>再对照一下答案</span>
                      </>
                    )}
                    {hintStage > 0 && <em>本题使用了提示</em>}
                  </div>

                  {currentQuestion.type === "text" ? (
                    <>
                      <div className="reference-answer">
                        <span>参考答案</span>
                        <p>{currentQuestion.answer[0]}</p>
                      </div>
                      {manualScore === undefined && (
                        <div className="self-grade">
                          <span>自评：</span>
                          <button onClick={() => markText(1)}>掌握</button>
                          <button onClick={() => markText(0.5)}>部分掌握</button>
                          <button onClick={() => markText(0)}>未掌握</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="correct-answer">
                      正确答案
                      <strong>{currentQuestion.answer.join("、")}</strong>
                    </p>
                  )}

                  {currentQuestion.explanation && (
                    <div className="explanation">
                      <span>解析</span>
                      <p>{currentQuestion.explanation}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="question-actions">
              <div className="question-tags">
                {currentQuestion.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              {!submitted ? (
                <button
                  className="primary-button"
                  disabled={
                    currentQuestion.type === "text"
                      ? !(session.textAnswers[currentQuestion.id] ?? "").trim()
                      : selected.length === 0
                  }
                  onClick={
                    currentQuestion.type === "text"
                      ? showTextReference
                      : submitChoice
                  }
                >
                  {currentQuestion.type === "text"
                    ? "对照参考答案"
                    : "提交答案"}
                  <ArrowRight size={17} strokeWidth={2} />
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={!canMoveNext}
                  onClick={goNext}
                >
                  {session.index === session.order.length - 1
                    ? "完成练习"
                    : "下一题"}
                  <ArrowRight size={17} strokeWidth={2} />
                </button>
              )}
            </div>
          </motion.section>
        </AnimatePresence>

        <motion.aside
          className={`hint-panel ${hintStage > 0 ? "is-open" : ""}`}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hint-heading">
            <span className="hint-icon">
              <Lightbulb size={20} strokeWidth={1.7} />
            </span>
            <div>
              <p>答案提示</p>
              <small>{hintStage === 0 ? "需要时直接显示" : "答案已显示"}</small>
            </div>
          </div>

          {hintStage === 0 ? (
            <div className="hint-empty">
              <p>先独立作答。需要时点击按钮，直接查看本题答案。</p>
              <button className="hint-button" onClick={revealHint}>
                <Sparkles size={16} strokeWidth={1.9} />
                显示答案
              </button>
            </div>
          ) : (
            <motion.div
              className="direct-answer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
            >
              <span>{currentQuestion.type === "text" ? "参考答案" : "正确答案"}</span>
              <p>{directAnswer}</p>
              {currentQuestion.hint && (
                <div className="extra-hint">
                  <strong>补充提示</strong>
                  <p>{currentQuestion.hint}</p>
                </div>
              )}
            </motion.div>
          )}

          <div className="hint-footnote">
            <RotateCw size={14} strokeWidth={1.8} />
            提交本题时会记录提示使用
          </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {answerFlash && (
          <motion.div
            aria-hidden="true"
            className={`answer-flash answer-flash--${answerFlash}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.16 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            {answerFlash === "correct" ? (
              <Check size={38} strokeWidth={1.8} />
            ) : (
              <X size={38} strokeWidth={1.8} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

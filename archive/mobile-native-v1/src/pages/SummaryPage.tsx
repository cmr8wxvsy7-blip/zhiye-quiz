import {
  ArrowRight,
  CheckCircle2,
  House,
  Lightbulb,
  RotateCcw,
  Target,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { PRACTICE_SCOPE_LABEL } from "../lib/questions";
import type { AttemptRecord } from "../types";

interface SummaryPageProps {
  attempt: AttemptRecord;
  onHome: () => void;
  onRestart: () => void;
  onReviewMistakes: () => void;
}

export function SummaryPage({
  attempt,
  onHome,
  onRestart,
  onReviewMistakes,
}: SummaryPageProps) {
  const reduceMotion = useReducedMotion();
  const percentage = attempt.total
    ? Math.round((attempt.correct / attempt.total) * 100)
    : 0;
  const hasWrong = attempt.wrong > 0 || attempt.partial > 0;
  const message =
    percentage >= 85
      ? "掌握得很稳。"
      : percentage >= 60
        ? "基础已经成形。"
        : "先把待巩固题目再走一遍。";

  return (
    <motion.div
      className="summary-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="summary-layout">
        <section className="summary-main">
          <p className="page-kicker">本次练习完成</p>
          <h1>{message}</h1>
          <p className="summary-bank">
            {attempt.bankTitle} · {PRACTICE_SCOPE_LABEL[attempt.scope]}
          </p>

          <div className="score-visual">
            <svg aria-hidden="true" viewBox="0 0 180 180">
              <circle className="score-track" cx="90" cy="90" r="74" />
              <motion.circle
                className="score-value"
                cx="90"
                cy="90"
                r="74"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: percentage / 100 }}
                transition={{
                  duration: reduceMotion ? 0 : 1.2,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.18,
                }}
              />
            </svg>
            <div className="score-copy">
              <strong>{percentage}</strong>
              <span>% 掌握</span>
            </div>
          </div>

          <div className="summary-actions">
            {hasWrong ? (
              <button className="primary-button" onClick={onReviewMistakes}>
                再练待巩固题目
                <ArrowRight size={17} strokeWidth={2} />
              </button>
            ) : (
              <button className="primary-button" onClick={onRestart}>
                再练一轮
                <RotateCcw size={17} strokeWidth={2} />
              </button>
            )}
            <button className="secondary-button" onClick={onHome}>
              <House size={16} strokeWidth={1.8} />
              返回首页
            </button>
          </div>
        </section>

        <aside className="summary-detail">
          <div className="summary-row">
            <span className="summary-row-icon summary-row-icon--green">
              <CheckCircle2 size={19} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{attempt.correct}</strong>
              <small>答对题目</small>
            </div>
          </div>
          <div className="summary-row">
            <span className="summary-row-icon summary-row-icon--amber">
              <Target size={19} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{attempt.partial}</strong>
              <small>部分掌握</small>
            </div>
          </div>
          <div className="summary-row">
            <span className="summary-row-icon summary-row-icon--red">
              <RotateCcw size={19} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{attempt.wrong}</strong>
              <small>待巩固题目</small>
            </div>
          </div>
          <div className="summary-row">
            <span className="summary-row-icon summary-row-icon--ink">
              <Lightbulb size={19} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{attempt.hinted}</strong>
              <small>使用提示</small>
            </div>
          </div>
          <div className="summary-total">
            本次共完成 <strong>{attempt.total}</strong> 道题
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

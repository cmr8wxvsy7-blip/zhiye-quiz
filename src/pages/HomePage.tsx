import {
  ArrowRight,
  BookOpen,
  Check,
  Database,
  Download,
  FileUp,
  Lightbulb,
  MoonStar,
  RotateCcw,
  SunMedium,
  Trash2,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type {
  AppData,
  PracticeMode,
  PracticeScope,
  QuestionBank,
} from "../types";

interface HomePageProps {
  data: AppData;
  activeBank: QuestionBank | null;
  onStart: (mode: PracticeMode, scope: PracticeScope) => void;
  onResume: () => void;
  onSelectBank: (bankId: string) => void;
  onDeleteBank: (bankId: string) => void;
  onBackup: () => void;
  onExportBank: (bank: QuestionBank) => void;
  onOpenImport: () => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
}

function getBankStats(data: AppData, bank: QuestionBank) {
  const stats = data.progress[bank.id]?.questionStats ?? {};
  const values = Object.values(stats);
  const answered = values.length;
  const correct = values.reduce((sum, item) => sum + item.correct, 0);
  const wrong = values.reduce((sum, item) => sum + item.wrong, 0);
  const hinted = values.reduce((sum, item) => sum + item.hinted, 0);
  const attempts = correct + wrong;

  return {
    answered,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    hinted,
    wrongCount: values.filter((item) => item.lastResult !== "correct").length,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export function HomePage({
  data,
  activeBank,
  onStart,
  onResume,
  onSelectBank,
  onDeleteBank,
  onBackup,
  onExportBank,
  onOpenImport,
  onToggleTheme,
  theme,
}: HomePageProps) {
  const [scope, setScope] = useState<PracticeScope>("all");
  const reduceMotion = useReducedMotion();
  const stats = activeBank ? getBankStats(data, activeBank) : null;
  const canResume =
    data.session && (!activeBank || data.session.bankId === activeBank.id);
  const completed =
    activeBank && stats
      ? Math.round(
          (stats.answered / Math.max(activeBank.questions.length, 1)) * 100,
        )
      : 0;
  const startLabel =
    scope === "all"
      ? "全部题目"
      : scope === "choice"
        ? "选择题"
        : "填空 / 大题";

  return (
    <motion.div
      className="page home-page native-page"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="home-toolbar">
        <div>
          <p className="page-kicker home-kicker">
            <strong>Cerces</strong>
            <span>{todayLabel()}</span>
          </p>
          <h1>今日练习</h1>
          <p className="page-lead">继续当前题库，或者开始一轮新的练习。</p>
        </div>
        <div className="home-actions">
          <button
            aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            className="toolbar-icon"
            onClick={onToggleTheme}
          >
            {theme === "dark" ? (
              <SunMedium size={17} strokeWidth={1.8} />
            ) : (
              <MoonStar size={17} strokeWidth={1.8} />
            )}
          </button>
          <button
            className="toolbar-action"
            onClick={onOpenImport}
          >
            <FileUp size={17} strokeWidth={1.8} />
            导入题库
          </button>
        </div>
      </header>

      {activeBank && stats ? (
        <section className="study-card" aria-labelledby="study-title">
          <motion.div
            className="study-card-copy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="study-label">
              <BookOpen size={16} strokeWidth={1.8} />
              继续学习
            </div>
            <h2 id="study-title">{activeBank.title}</h2>
            <p>
              {activeBank.questions.length} 道题
              <span>·</span>
              已练习 {stats.answered} 道
              <span>·</span>
              提示 {stats.hinted} 次
            </p>
            <div className="scope-picker" aria-label="练习范围">
              {(
                [
                  ["all", "全部"],
                  ["choice", "选择题"],
                  ["text", "填空 / 大题"],
                ] as const
              ).map(([value, label]) => (
                <button
                  aria-pressed={scope === value}
                  className={scope === value ? "is-active" : ""}
                  key={value}
                  onClick={() => setScope(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="study-actions">
              {canResume && scope === "all" ? (
                <button className="primary-button" onClick={onResume}>
                  继续练习
                  <ArrowRight size={16} strokeWidth={2} />
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => onStart("sequence", scope)}
                >
                  开始{startLabel}
                  <ArrowRight size={16} strokeWidth={2} />
                </button>
              )}
              <button
                className="plain-action"
                onClick={() => onStart("random", scope)}
              >
                <RotateCcw size={15} strokeWidth={1.8} />
                随机练习
              </button>
            </div>
          </motion.div>

          <div className="study-progress">
            <div className="progress-ring">
              <svg aria-hidden="true" viewBox="0 0 116 116">
                <circle className="progress-ring-track" cx="58" cy="58" r="48" />
                <motion.circle
                  className="progress-ring-value"
                  cx="58"
                  cy="58"
                  r="48"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: completed / 100 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.75,
                    delay: 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </svg>
              <div>
                <strong>{completed}</strong>
                <span>%</span>
              </div>
            </div>
            <div className="study-stats">
              <div>
                <strong>{stats.accuracy}%</strong>
                <span>正确率</span>
              </div>
              <div>
                <strong>{stats.wrongCount}</strong>
                <span>待巩固</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="empty-band">
          <Database size={26} strokeWidth={1.5} />
          <h2>还没有题库</h2>
          <p>导入 Excel 或 Word 文件，开始第一轮练习。</p>
          <button className="primary-button" onClick={onOpenImport}>
            导入题库
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </section>
      )}

      {activeBank && stats && stats.wrongCount > 0 && (
        <button
          className="review-row"
          onClick={() => onStart("mistakes", scope)}
        >
          <span className="review-row-icon">
            <Lightbulb size={18} strokeWidth={1.8} />
          </span>
          <span>
            <strong>复习待巩固题目</strong>
            <small>{stats.wrongCount} 道题需要再看一遍</small>
          </span>
          <ArrowRight size={17} strokeWidth={1.8} />
        </button>
      )}

      <section className="bank-section" aria-labelledby="bank-title">
        <div className="section-heading">
          <h2 id="bank-title">题库</h2>
          <span>{data.banks.length} 个题库</span>
        </div>

        <div className="bank-list">
          {data.banks.map((bank, index) => {
            const bankStats = getBankStats(data, bank);
            const active = bank.id === activeBank?.id;
            return (
              <motion.article
                className={`bank-row ${active ? "is-active" : ""}`}
                key={bank.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 + index * 0.035, duration: 0.28 }}
              >
                <button
                  className="bank-main"
                  onClick={() => onSelectBank(bank.id)}
                >
                  <span className={`bank-cover bank-cover--${index % 3}`}>
                    <span>{bank.title.trim().charAt(0) || "题"}</span>
                    <small>{bank.questions.length}</small>
                  </span>
                  <span className="bank-copy">
                    <strong>{bank.title}</strong>
                    <small>
                      {bank.questions.length} 道题 · {formatDate(bank.updatedAt)}{" "}
                      更新
                    </small>
                  </span>
                  {active && (
                    <span className="active-label">
                      <Check size={12} strokeWidth={2.2} />
                      当前
                    </span>
                  )}
                  <span className="bank-score">
                    {bankStats.answered ? `${bankStats.accuracy}%` : "未开始"}
                  </span>
                </button>
                <div className="bank-actions">
                  <button
                    aria-label={`导出 ${bank.title}`}
                    className="icon-button"
                    onClick={() => onExportBank(bank)}
                  >
                    <Database size={16} strokeWidth={1.7} />
                  </button>
                  <button
                    aria-label={`删除 ${bank.title}`}
                    className="icon-button icon-button--danger"
                    onClick={() => onDeleteBank(bank.id)}
                  >
                    <Trash2 size={16} strokeWidth={1.7} />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <footer className="page-footer">
        <span>数据仅保存在当前设备</span>
        <button className="footer-action" onClick={onBackup}>
          <Download size={12} strokeWidth={1.9} />
          备份
        </button>
      </footer>
    </motion.div>
  );
}

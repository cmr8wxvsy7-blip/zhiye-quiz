import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileType2,
  FileText,
  FileUp,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { parseQuestionFile } from "../lib/importers";
import {
  downloadExcelTemplate,
  downloadWordTemplate,
} from "../lib/template";
import type { AppData, ImportResult, Question } from "../types";
import { TypeBadge } from "../components/TypeBadge";

interface ImportPageProps {
  onBack: () => void;
  onImport: (title: string, questions: Question[]) => void;
  onRestore: (data: AppData) => void;
}

type ImportTab = "excel" | "word" | "pdf";

export function ImportPage({ onBack, onImport, onRestore }: ImportPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ImportTab>("excel");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [filename, setFilename] = useState("");
  const [bankTitle, setBankTitle] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importingRef = useRef(false);

  const accept = tab === "excel" ? ".xlsx" : tab === "word" ? ".docx" : ".pdf";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setResult(null);
    setIsParsing(true);
    setFilename(file.name);
    setBankTitle(file.name.replace(/\.(xlsx|docx)$/i, ""));
    try {
      const parsed = await parseQuestionFile(file);
      setResult(parsed);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "文件解析失败，请检查格式。",
      );
    } finally {
      setIsParsing(false);
    }
  }

  async function handleBackup(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (
        parsed.version !== 1 ||
        !Array.isArray(parsed.banks) ||
        !Array.isArray(parsed.attempts)
      ) {
        throw new Error("这不是有效的知页备份文件。");
      }
      const confirmed = window.confirm(
        "恢复备份会覆盖当前浏览器中的题库和练习进度。是否继续？",
      );
      if (confirmed) onRestore(parsed);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "备份文件无法读取。",
      );
    }
  }

  function confirmImport() {
    if (!result || result.questions.length === 0 || importingRef.current) return;
    importingRef.current = true;
    setIsImporting(true);
    onImport(bankTitle.trim() || "未命名题库", result.questions);
  }

  return (
    <motion.div
      className="page import-page"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={17} strokeWidth={1.9} />
        返回题库
      </button>

      <header className="page-header import-header">
        <div>
          <p className="page-kicker">新建题库</p>
          <h1>导入你的题目。</h1>
          <p className="page-lead">
            文件只在当前浏览器中解析。导入前可以检查题目、答案和提示。
          </p>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={17} strokeWidth={1.8} />
          本地解析，不上传服务器
        </div>
      </header>

      <div className="import-tabs" role="tablist" aria-label="文件类型">
        <button
          aria-selected={tab === "excel"}
          className={tab === "excel" ? "is-active" : ""}
          role="tab"
          onClick={() => {
            setTab("excel");
            setResult(null);
            setError("");
          }}
        >
          <FileSpreadsheet size={18} strokeWidth={1.8} />
          Excel 题库
        </button>
        <button
          aria-selected={tab === "word"}
          className={tab === "word" ? "is-active" : ""}
          role="tab"
          onClick={() => {
            setTab("word");
            setResult(null);
            setError("");
          }}
        >
          <FileText size={18} strokeWidth={1.8} />
          Word 文档
        </button>
        <button
          aria-selected={tab === "pdf"}
          className={tab === "pdf" ? "is-active" : ""}
          role="tab"
          onClick={() => {
            setTab("pdf");
            setResult(null);
            setError("");
          }}
        >
          <FileType2 size={18} strokeWidth={1.8} />
          PDF 题库
        </button>
      </div>

      {!result && (
        <motion.section
          className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void handleFile(event.dataTransfer.files[0]);
          }}
        >
          <input
            ref={fileInputRef}
            accept={accept}
            hidden
            type="file"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <span className="drop-icon">
            {isParsing ? (
              <LoaderCircle className="spin" size={27} strokeWidth={1.7} />
            ) : (
              <FileUp size={27} strokeWidth={1.6} />
            )}
          </span>
          <div>
            <h2>{isParsing ? "正在读取题目…" : "把文件拖到这里"}</h2>
            <p>
              {tab === "excel"
                ? "支持 .xlsx，建议使用标准列名，也兼容常见中英文表头。"
                : tab === "word"
                  ? "支持 .docx。请按“1. 题目 / A. 选项 / 答案：”组织内容。"
                  : "支持文字型 .pdf。请选择带答案的题本，或“习题及答案”合集。"}
            </p>
          </div>
          <button
            className="secondary-button"
            disabled={isParsing}
            onClick={() => fileInputRef.current?.click()}
          >
            选择文件
          </button>
        </motion.section>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} strokeWidth={1.8} />
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.section
            className="preview-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="preview-summary">
              <div className="preview-file">
                <span className="success-icon">
                  <CheckCircle2 size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>{filename}</strong>
                  <small>
                    识别 {result.questions.length} 道题
                    {result.issues.length
                      ? `，${result.issues.length} 条提示`
                      : "，没有发现问题"}
                  </small>
                </div>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setResult(null);
                  setError("");
                }}
              >
                <RotateCcw size={15} strokeWidth={1.9} />
                换一个文件
              </button>
            </div>

            {result.issues.length > 0 && (
              <div className="issue-list">
                {result.issues.slice(0, 8).map((issue, index) => (
                  <p key={`${issue.row}-${index}`}>
                    <AlertCircle size={15} strokeWidth={1.9} />
                    {issue.row ? `第 ${issue.row} 行：` : ""}
                    {issue.message}
                  </p>
                ))}
                {result.issues.length > 8 && (
                  <p className="issue-more">
                    还有 {result.issues.length - 8} 条提示未展开
                  </p>
                )}
              </div>
            )}

            {result.questions.length > 0 && (
              <>
                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>题型</th>
                        <th>题目</th>
                        <th>答案</th>
                        <th>提示</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.questions.slice(0, 12).map((question, index) => (
                        <tr key={question.id}>
                          <td>{String(index + 1).padStart(2, "0")}</td>
                          <td>
                            <TypeBadge type={question.type} />
                          </td>
                          <td className="preview-stem">{question.stem}</td>
                          <td>{question.answer.join(" / ")}</td>
                          <td>
                            {question.hint ? (
                              <span className="hint-present">
                                <Lightbulb size={14} strokeWidth={1.9} />
                                已识别
                              </span>
                            ) : (
                              <span className="muted">无</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.questions.length > 12 && (
                  <p className="preview-more">
                    预览前 12 道，完整导入 {result.questions.length} 道题。
                  </p>
                )}

                <div className="confirm-panel">
                  <label>
                    <span>题库名称</span>
                    <input
                      value={bankTitle}
                      onChange={(event) => setBankTitle(event.target.value)}
                      placeholder="输入题库名称"
                    />
                  </label>
                  <button
                    className="primary-button"
                    disabled={!bankTitle.trim() || isImporting}
                    onClick={confirmImport}
                  >
                    {isImporting
                      ? "正在导入…"
                      : `导入 ${result.questions.length} 道题`}
                    <Download size={17} strokeWidth={2} />
                  </button>
                </div>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <section className="import-help">
        <div>
          <p className="page-kicker">格式说明</p>
          <h2>
            {tab === "excel"
              ? "Excel 列名约定"
              : tab === "word"
                ? "Word 内容结构"
                : "PDF 题库结构"}
          </h2>
        </div>
        {tab === "excel" ? (
          <>
            <p>
              必需列：<code>题目</code>、<code>答案</code>。建议加入{" "}
              <code>类型</code>、<code>选项A-D</code>、<code>提示</code>、
              <code>解析</code>、<code>标签</code>、<code>难度</code>。
            </p>
            <button
              className="secondary-button"
              onClick={() => void downloadExcelTemplate()}
            >
              <Download size={16} strokeWidth={1.9} />
              下载 Excel 模板
            </button>
          </>
        ) : tab === "word" ? (
          <div className="word-format-example">
            <pre>{`1. 栈遵循什么原则？
A. 先进先出
B. 后进先出
答案：B
提示：回忆栈的插入和删除端。
解析：同一端插入和删除。`}</pre>
            <p>选择题答案可写为 A、A,C 或 AC；大题答案作为参考答案。</p>
            <button
              className="secondary-button"
              onClick={() => void downloadWordTemplate()}
            >
              <Download size={16} strokeWidth={1.9} />
              下载 Word 模板
            </button>
          </div>
        ) : (
          <div className="pdf-format-guide">
            <p>
              PDF 需要包含可复制文字。题库按“章节 → 单选题 / 多选题 /
              主观题 → 答案区”的顺序识别。
            </p>
            <div>
              <strong>推荐文件</strong>
              <span>名称包含“答案”或“习题及答案”的 PDF</span>
            </div>
            <div>
              <strong>当前不支持</strong>
              <span>扫描图片 PDF、无文字层 PDF、仅有题目但没有答案的 PDF</span>
            </div>
          </div>
        )}
      </section>

      <section className="restore-section">
        <div>
          <p className="page-kicker">迁移设备</p>
          <h2>恢复数据备份</h2>
          <p>导入知页导出的 JSON 文件，恢复题库、提示和练习进度。</p>
        </div>
        <input
          ref={backupInputRef}
          accept=".json,application/json"
          hidden
          type="file"
          onChange={(event) => void handleBackup(event.target.files?.[0])}
        />
        <button
          className="secondary-button"
          onClick={() => backupInputRef.current?.click()}
        >
          <FileUp size={16} strokeWidth={1.9} />
          选择备份文件
        </button>
      </section>
    </motion.div>
  );
}

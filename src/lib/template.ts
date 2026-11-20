import type ExcelJS from "exceljs";
import type { QuestionBank } from "../types";

const TEMPLATE_HEADERS = [
  "类型",
  "题目",
  "选项A",
  "选项B",
  "选项C",
  "选项D",
  "答案",
  "提示",
  "解析",
  "标签",
  "难度",
];

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function styleWorksheet(worksheet: ExcelJS.Worksheet): void {
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFF4F0E7" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF172019" },
  };
  header.height = 28;
  header.alignment = { vertical: "middle" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  worksheet.columns.forEach((column, index) => {
    column.width = index === 1 ? 44 : index === 7 || index === 8 ? 32 : 16;
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: TEMPLATE_HEADERS.length },
  };
}

export async function downloadExcelTemplate(): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("题库");
  worksheet.addRow(TEMPLATE_HEADERS);
  worksheet.addRow([
    "单选",
    "示例：栈遵循什么原则？",
    "先进先出",
    "后进先出",
    "随机访问",
    "按优先级访问",
    "B",
    "回忆栈的插入和删除发生在哪一端。",
    "栈只允许在同一端插入和删除，因此后进先出。",
    "数据结构,线性结构",
    "基础",
  ]);
  worksheet.addRow([
    "多选",
    "示例：以下哪些是线性结构？",
    "链表",
    "二叉树",
    "队列",
    "图",
    "A,C",
    "线性结构可以排成一条有序序列。",
    "链表和队列属于线性结构。",
    "数据结构",
    "进阶",
  ]);
  worksheet.addRow([
    "大题",
    "示例：简述进程和线程的区别。",
    "",
    "",
    "",
    "",
    "进程是资源分配单位；线程是调度单位。线程共享地址空间。",
    "从资源、地址空间和切换成本三个角度回答。",
    "按结论、原因、结果组织答案。",
    "操作系统",
    "进阶",
  ]);
  styleWorksheet(worksheet);
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "Cerces题库导入模板.xlsx",
  );
}

export async function downloadWordTemplate(): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import(
    "docx"
  );
  const document = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Cerces 题库 Word 导入模板",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "每题以序号开头。选择题使用 A-D 选项，答案写字母；大题答案作为参考答案。",
                italics: true,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "1. 栈遵循什么原则？", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "A. 先进先出" }),
          new Paragraph({ text: "B. 后进先出" }),
          new Paragraph({ text: "C. 随机访问" }),
          new Paragraph({ text: "D. 按优先级访问" }),
          new Paragraph({ text: "答案：B" }),
          new Paragraph({ text: "提示：回忆栈的插入和删除端。" }),
          new Paragraph({ text: "解析：同一端插入和删除，因此后进先出。" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "2. 以下哪些属于线性结构？", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "A. 链表" }),
          new Paragraph({ text: "B. 二叉树" }),
          new Paragraph({ text: "C. 队列" }),
          new Paragraph({ text: "D. 图" }),
          new Paragraph({ text: "答案：A,C" }),
          new Paragraph({ text: "解析：链表和队列属于线性结构。" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "3. 简述进程和线程的区别。", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text: "答案：进程是资源分配单位；线程是调度单位。线程共享进程地址空间，切换成本更低。",
          }),
          new Paragraph({ text: "提示：从资源、地址空间和切换成本三个角度回答。" }),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(document);
  triggerDownload(blob, "Cerces题库导入模板.docx");
}

export async function exportBankToExcel(bank: QuestionBank): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("题库");
  worksheet.addRow(TEMPLATE_HEADERS);

  bank.questions.forEach((question) => {
    worksheet.addRow([
      question.type === "single"
        ? "单选"
        : question.type === "multiple"
          ? "多选"
          : "大题",
      question.stem,
      question.options[0] ?? "",
      question.options[1] ?? "",
      question.options[2] ?? "",
      question.options[3] ?? "",
      question.answer.join(question.type === "text" ? "\n" : ","),
      question.hint ?? "",
      question.explanation ?? "",
      question.tags.join(","),
      ["基础", "进阶", "挑战"][question.difficulty],
    ]);
  });

  styleWorksheet(worksheet);
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${bank.title}.xlsx`,
  );
}

export function downloadJsonBackup(data: unknown): void {
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    `Cerces备份-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

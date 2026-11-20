import ExcelJS from "exceljs";
import { parseExcel } from "../src/lib/importers/excel";

describe("Excel 导入", () => {
  it("读取标准模板并生成题目", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("题库");
    sheet.addRow([
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
    ]);
    sheet.addRow([
      "单选",
      "栈遵循什么原则？",
      "先进先出",
      "后进先出",
      "随机访问",
      "无",
      "B",
      "查看同一端的操作",
      "后进先出",
      "数据结构",
      "基础",
    ]);
    sheet.addRow([
      "多选",
      "以下哪些是线性结构？",
      "链表",
      "二叉树",
      "队列",
      "图",
      "A,C",
      "",
      "",
      "数据结构",
      "进阶",
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const result = await parseExcel(buffer as ArrayBuffer);
    expect(result.questions).toHaveLength(2);
    expect(result.issues).toHaveLength(0);
    expect(result.questions[0].answer).toEqual(["B"]);
    expect(result.questions[1].type).toBe("multiple");
  });
});

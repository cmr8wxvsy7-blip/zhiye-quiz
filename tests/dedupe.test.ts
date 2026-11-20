import {
  dedupeQuestions,
  questionDuplicateKey,
} from "../src/lib/dedupe";
import type { Question } from "../src/types";

function question(
  id: string,
  stem: string,
  options = ["选项甲", "选项乙", "选项丙", "选项丁"],
  answer = ["A"],
): Question {
  return {
    id,
    type: "single",
    stem,
    options,
    answer,
    tags: [],
    difficulty: 0,
  };
}

describe("导入去重", () => {
  it("忽略空格和标点差异", () => {
    expect(questionDuplicateKey(question("a", "栈 遵循什么原则？"))).toBe(
      questionDuplicateKey(question("b", "栈遵循什么原则")),
    );
  });

  it("题干相同但选项不同不会误判", () => {
    const left = question("a", "下列说法正确的是", [
      "甲",
      "乙",
      "丙",
      "丁",
    ]);
    const right = question("b", "下列说法正确的是", [
      "子",
      "丑",
      "寅",
      "卯",
    ]);
    expect(questionDuplicateKey(left)).not.toBe(questionDuplicateKey(right));
  });

  it("排除文件内重复和已有题库重复", () => {
    const existing = [question("old", "已有题目")];
    const incoming = [
      question("a", "新题目"),
      question("b", "新 题 目。"),
      question("c", "已有题目"),
      question("d", "另一道新题"),
    ];
    const result = dedupeQuestions(incoming, existing);
    expect(result.questions.map((item) => item.id)).toEqual(["a", "d"]);
    expect(result.duplicatesInFile).toBe(1);
    expect(result.duplicatesInLibrary).toBe(1);
  });
});

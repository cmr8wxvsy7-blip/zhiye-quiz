import {
  getDirectAnswer,
  gradeQuestion,
  matchesPracticeScope,
  normalizeAnswerLetters,
  normalizeType,
} from "../src/lib/questions";
import type { Question } from "../src/types";

const single: Question = {
  id: "q1",
  type: "single",
  stem: "测试题",
  options: ["选项一", "选项二"],
  answer: ["B"],
  tags: [],
  difficulty: 0,
};

describe("题库规则", () => {
  it("识别常见题型名称", () => {
    expect(normalizeType("单选题")).toBe("single");
    expect(normalizeType("多项选择")).toBe("multiple");
    expect(normalizeType("简答题")).toBe("text");
  });

  it("清洗多选答案", () => {
    expect(normalizeAnswerLetters("A、C、a")).toEqual(["A", "C"]);
  });

  it("判断选择题答案", () => {
    expect(gradeQuestion(single, ["B"]).correct).toBe(true);
    expect(gradeQuestion(single, ["A"]).correct).toBe(false);
  });

  it("提示直接返回答案和选项内容", () => {
    expect(getDirectAnswer(single)).toBe("B. 选项二");
  });

  it("大题按自评分记录掌握程度", () => {
    const textQuestion: Question = {
      ...single,
      type: "text",
      options: [],
      answer: ["参考答案"],
    };
    expect(gradeQuestion(textQuestion, [], 1).correct).toBe(true);
    expect(gradeQuestion(textQuestion, [], 0.5).partial).toBe(true);
  });

  it("按选择题或填空大题过滤练习范围", () => {
    const textQuestion: Question = {
      ...single,
      id: "q2",
      type: "text",
      options: [],
      answer: ["参考答案"],
    };
    expect(matchesPracticeScope(single, "choice")).toBe(true);
    expect(matchesPracticeScope(textQuestion, "choice")).toBe(false);
    expect(matchesPracticeScope(textQuestion, "text")).toBe(true);
    expect(matchesPracticeScope(textQuestion, "all")).toBe(true);
  });
});

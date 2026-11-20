import { buildQuestion } from "../src/lib/importers/shared";

describe("导入字段校验", () => {
  it("根据多个答案字母推断多选题", () => {
    const result = buildQuestion({
      stem: "哪些属于线性结构？",
      options: { A: "链表", B: "二叉树", C: "队列" },
      answer: "A、C",
    });
    expect(result.question?.type).toBe("multiple");
    expect(result.question?.answer).toEqual(["A", "C"]);
  });

  it("拒绝不存在的选项答案", () => {
    const result = buildQuestion({
      type: "单选",
      stem: "测试",
      options: { A: "甲", B: "乙" },
      answer: "D",
    });
    expect(result.issue?.message).toContain("不存在的选项 D");
  });

  it("保留大题参考答案", () => {
    const result = buildQuestion({
      type: "大题",
      stem: "简述线程和进程的区别。",
      answer: "进程是资源分配单位，线程是调度单位。",
    });
    expect(result.question?.type).toBe("text");
    expect(result.question?.answer[0]).toContain("资源分配单位");
  });
});

import { parsePdfText } from "../src/lib/importers/pdf-parser";

describe("PDF 题库解析", () => {
  it("识别章节、单选、多选、大题和答案区", () => {
    const result = parsePdfText(`
导论
一、选择题
（一）单选题
1.第一道单选题？
A.选项甲
B.选项乙
C.选项丙
（二）多选题
1.第一道多选题？
A.选项甲 B.选项乙 C.选项丙
二、主观题
1.简述一个重要概念。
参考答案：
一、选择题
（一）单选题
1.A
（二）多选题
1.AC
二、主观题
1.简述一个重要概念。
答案要点：
这是主观题的参考答案。
`);

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].type).toBe("single");
    expect(result.questions[0].answer).toEqual(["A"]);
    expect(result.questions[1].type).toBe("multiple");
    expect(result.questions[1].answer).toEqual(["A", "C"]);
    expect(result.questions[2].type).toBe("text");
    expect(result.questions[2].answer[0]).toContain("参考答案");
  });

  it("拒绝只有题目、没有答案区的 PDF", () => {
    const result = parsePdfText(`
第一章 示例章节
一、选择题
（一）单选题
1.只有题目没有答案？
A.甲
B.乙
`);

    expect(result.questions).toHaveLength(0);
    expect(result.issues[0].message).toContain("包含答案");
  });
});

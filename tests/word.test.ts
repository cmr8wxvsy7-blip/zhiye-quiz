import { vi } from "vitest";

vi.mock("mammoth", () => ({
  default: {
    convertToHtml: vi.fn().mockResolvedValue({
      value: `
        <p>1. 栈遵循什么原则？</p>
        <p>A. 先进先出</p>
        <p>B. 后进先出</p>
        <p>答案：B</p>
        <p>提示：回忆栈的插入和删除端。</p>
        <p>解析：同一端插入和删除。</p>
      `,
      messages: [],
    }),
  },
}));

import { parseWord } from "../src/lib/importers/word";

describe("Word 导入", () => {
  it("解析题干、选项、直接答案和补充提示", async () => {
    const result = await parseWord(new ArrayBuffer(0));
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].type).toBe("single");
    expect(result.questions[0].options).toEqual(["先进先出", "后进先出"]);
    expect(result.questions[0].answer).toEqual(["B"]);
    expect(result.questions[0].hint).toContain("插入和删除端");
  });
});

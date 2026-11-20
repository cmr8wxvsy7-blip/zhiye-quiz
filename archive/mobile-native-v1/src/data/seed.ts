import type { AppData, Question, QuestionBank } from "../types";

const now = new Date().toISOString();

const questions: Question[] = [
  {
    id: "seed-stack",
    type: "single",
    stem: "在数据结构中，遵循“后进先出”原则的是哪一种结构？",
    options: ["队列", "栈", "链表", "哈希表"],
    answer: ["B"],
    hint: "想象一摞盘子：最后放上去的盘子会最先被拿走。",
    explanation:
      "栈只在同一端进行插入和删除，因此最后进入的元素最先离开，即后进先出。队列遵循先进先出。",
    tags: ["数据结构", "线性结构"],
    difficulty: 0,
  },
  {
    id: "seed-linear",
    type: "multiple",
    stem: "以下哪些属于线性结构？",
    options: ["链表", "二叉树", "队列", "图"],
    answer: ["A", "C"],
    hint: "线性结构中的数据元素可以排成一条有序序列，每个元素最多有一个直接前驱和一个直接后继。",
    explanation:
      "链表和队列中的元素可以构成线性序列。二叉树和图都属于非线性结构。",
    tags: ["数据结构", "线性结构"],
    difficulty: 1,
  },
  {
    id: "seed-hash",
    type: "text",
    stem: "简述哈希表产生冲突的常见原因，并写出两种常用的冲突处理方法。",
    options: [],
    answer: [
      "不同关键字经过哈希函数计算后得到相同的存储地址。常用处理方法包括链地址法、开放定址法、再哈希法和建立公共溢出区。",
    ],
    hint: "先解释“不同输入得到同一地址”，再从存储和探测两个方向寻找方法。",
    explanation:
      "完整答案应包含冲突定义，并至少给出两种处理方法。只写方法名称时，得分点不完整。",
    tags: ["数据结构", "哈希表"],
    difficulty: 2,
  },
  {
    id: "seed-complexity",
    type: "single",
    stem: "在有序数组中使用二分查找，平均时间复杂度是？",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    answer: ["B"],
    hint: "每次比较后，候选区间大约缩小为原来的一半。",
    explanation:
      "每次迭代将搜索范围缩小一半，因此时间复杂度为 O(log n)，但前提是数据已经有序。",
    tags: ["算法", "复杂度"],
    difficulty: 0,
  },
  {
    id: "seed-storage",
    type: "multiple",
    stem: "浏览器本地存储方案中，哪些可以保存结构化数据？",
    options: ["Cookie", "IndexedDB", "LocalStorage", "CSS 变量"],
    answer: ["B", "C"],
    hint: "思考哪些方案保存的是字符串或结构化对象，而不是样式值。",
    explanation:
      "IndexedDB 可以直接保存结构化数据。LocalStorage 保存字符串，但可以通过 JSON 序列化保存对象。Cookie 和 CSS 变量不适合作为完整题库存储。",
    tags: ["Web", "浏览器"],
    difficulty: 2,
  },
  {
    id: "seed-process",
    type: "text",
    stem: "说明进程和线程的主要区别。",
    options: [],
    answer: [
      "进程是资源分配的基本单位，拥有独立地址空间；线程是 CPU 调度的基本单位，同一进程内的线程共享地址空间和资源。线程切换通常比进程切换开销小，但隔离性更弱。",
    ],
    hint: "从资源归属、地址空间、调度单位和切换成本四个方面比较。",
    explanation:
      "答题时写出资源分配、调度单位、地址空间和切换开销，基本可以覆盖主要得分点。",
    tags: ["操作系统"],
    difficulty: 1,
  },
];

const bank: QuestionBank = {
  id: "seed-bank-cs",
  title: "计算机基础示例题库",
  description: "内置示例，覆盖单选、多选和简答题。",
  questions,
  createdAt: now,
  updatedAt: now,
};

export function createSeedData(): AppData {
  return {
    version: 1,
    banks: [bank],
    activeBankId: bank.id,
    progress: {
      [bank.id]: {
        questionStats: {},
        updatedAt: now,
      },
    },
    session: null,
    attempts: [],
  };
}

import type { ExamPaper } from "@/lib/exam";

export const examplePaper: ExamPaper = {
  title: "高等数学示例试卷",
  questions: [
    {
      type: "choice",
      stem: "计算极限 $\\lim_{x\\to 0}\\frac{\\sin x}{x}$。",
      options: ["$0$", "$1$", "$2$", "不存在"],
      answer: "$1$",
      analysis: "这是标准的三角函数极限，结果为 $1$。",
      score: 5,
      source_doc_id: null,
    },
    {
      type: "blank",
      stem: "函数 $f(x)=x^3$ 在 $x=2$ 处的导数是多少？",
      answer: "12",
      analysis: "由幂函数求导得 $f'(x)=3x^2$，代入 $x=2$。",
      score: 5,
      source_doc_id: null,
    },
  ],
};

export const exampleReview = [
  { name: "极限", stars: 5, summary: "先检查直接代入能否求值，再根据式子的结构使用因式分解、有理化或标准极限。" },
  { name: "导数", stars: 4, summary: "复习幂函数的求导法则。判断单调性时，先找临界点，再检查各区间内导数的符号。" },
];

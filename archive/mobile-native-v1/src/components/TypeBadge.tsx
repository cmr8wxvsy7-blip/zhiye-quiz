import type { QuestionType } from "../types";
import { QUESTION_TYPE_LABEL } from "../lib/questions";

export function TypeBadge({ type }: { type: QuestionType }) {
  return (
    <span className={`type-badge type-badge--${type}`}>
      {QUESTION_TYPE_LABEL[type]}
    </span>
  );
}

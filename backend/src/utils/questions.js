import { hashSecret } from "./auth.js";

function normalizeAnswer(value, type) {
  const trimmed = String(value || "").trim();
  if (type === "FLAG") {
    return trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function normalizeQuestionInput(questions = []) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question, index) => {
      const type = String(question.type || "TEXT").toUpperCase();
      const prompt = String(question.prompt || "").trim();
      const plainAnswer = String(question.answer || question.plainAnswer || "").trim();
      const blockId = String(question.blockId || `question-${index + 1}`).trim();
      const hints = Array.isArray(question.hints)
        ? question.hints.map((hint) => String(hint).trim()).filter(Boolean)
        : String(question.hints || "")
            .split("\n")
            .map((hint) => hint.trim())
            .filter(Boolean);
      const rawOptions = Array.isArray(question.options)
        ? question.options
        : String(question.options || "")
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean);
      const options = rawOptions.map((option) => String(option).trim()).filter(Boolean);

      if (!prompt || (!plainAnswer && !question.id) || !["TEXT", "FLAG", "MCQ"].includes(type)) return null;
      if (type === "MCQ" && !options.length) return null;

      return {
        id: question.id,
        blockId,
        type,
        prompt,
        plainAnswer,
        optionsJson: type === "MCQ" ? { options } : null,
        hints,
        order: Number.isInteger(Number(question.order)) ? Number(question.order) : index
      };
    })
    .filter(Boolean);
}

export async function hashQuestionAnswers(questions) {
  return Promise.all(
    questions.map(async (q) => ({
      blockId: q.blockId,
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      answerHash: q.plainAnswer ? await hashSecret(normalizeAnswer(q.plainAnswer, q.type)) : null,
      optionsJson: q.optionsJson,
      hints: q.hints,
      order: q.order
    }))
  );
}

export function normalizeSubmittedAnswer(value, type) {
  return normalizeAnswer(value, type);
}

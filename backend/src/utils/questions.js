import { hashSecret } from "./auth.js";

const HZD_TYPES = new Set(["hzd-question", "hzd-flag"]);

function normalizeAnswer(value, type) {
  const trimmed = String(value || "").trim();
  if (type === "FLAG") {
    return trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function getTrait(traits, name, fallback = "") {
  const trait = traits?.find((t) => t.name === name || t.attribute === name);
  if (!trait) return fallback;
  return trait.value ?? trait.default ?? fallback;
}

function walkComponents(components, visitor) {
  if (!Array.isArray(components)) return;
  for (const comp of components) {
    visitor(comp);
    if (comp.components?.length) {
      walkComponents(comp.components, visitor);
    }
  }
}

function collectPageComponents(layoutJson) {
  const roots = [];
  if (!layoutJson || typeof layoutJson !== "object") return roots;

  if (Array.isArray(layoutJson.pages)) {
    for (const page of layoutJson.pages) {
      const frames = page.frames || [];
      for (const frame of frames) {
        const wrapper = frame.component;
        if (wrapper?.components) {
          roots.push(...wrapper.components);
        }
      }
    }
  } else if (layoutJson.components) {
    roots.push(...layoutJson.components);
  }

  return roots;
}

export function extractQuestionsFromLayout(layoutJson) {
  const extracted = [];
  let order = 0;
  const roots = collectPageComponents(layoutJson);

  walkComponents(roots, (comp) => {
    const typeName = comp.type || comp.tagName;
    if (!HZD_TYPES.has(typeName)) return;

    const attrs = comp.attributes || {};
    const traits = comp.traits || [];
    const blockId = attrs.id || comp.attributes?.id || `block-${order}`;

    if (typeName === "hzd-flag") {
      const prompt = getTrait(traits, "prompt", attrs["data-prompt"] || "Submit the flag");
      const flagValue = getTrait(traits, "flag", attrs["data-flag"] || "");
      if (!flagValue) return;

      extracted.push({
        blockId,
        type: "FLAG",
        prompt,
        answerHash: null,
        plainAnswer: flagValue,
        optionsJson: null,
        hints: [],
        order: order++
      });
      return;
    }

    const answerType = (getTrait(traits, "answer-type", attrs["data-answer-type"] || "text") || "text").toLowerCase();
    const prompt = getTrait(traits, "prompt", attrs["data-prompt"] || "Answer this question");
    const correctAnswer = getTrait(traits, "correct-answer", attrs["data-correct-answer"] || "");
    const hintsRaw = getTrait(traits, "hints", attrs["data-hints"] || "");
    const hints = String(hintsRaw)
      .split("\n")
      .map((h) => h.trim())
      .filter(Boolean);

    if (answerType === "mcq") {
      const optionsRaw = getTrait(traits, "options", attrs["data-options"] || "");
      const options = String(optionsRaw)
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);

      if (!options.length || !correctAnswer) return;

      extracted.push({
        blockId,
        type: "MCQ",
        prompt,
        answerHash: null,
        plainAnswer: correctAnswer,
        optionsJson: { options },
        hints,
        order: order++
      });
      return;
    }

    const qType = answerType === "flag" ? "FLAG" : "TEXT";
    if (!correctAnswer) return;

    extracted.push({
      blockId,
      type: qType,
      prompt,
      answerHash: null,
      plainAnswer: correctAnswer,
      optionsJson: null,
      hints,
      order: order++
    });
  });

  return extracted;
}

export async function hashQuestionAnswers(questions) {
  return Promise.all(
    questions.map(async (q) => ({
      blockId: q.blockId,
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

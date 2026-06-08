import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { compareSecret } from "../utils/auth.js";
import { normalizeSubmittedAnswer } from "../utils/questions.js";

const router = express.Router();

router.get("/paths", async (req, res) => {
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      difficulty: true,
      coverImage: true,
      hours: true,
      order: true,
      pathModules: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          module: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              order: true,
              rooms: {
                where: { status: "PUBLISHED" },
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  description: true,
                  difficulty: true,
                  duration: true,
                  tasksCount: true,
                  order: true
                }
              }
            }
          }
        }
      }
    }
  });

  return res.json({ paths });
});

router.get("/rooms", async (req, res) => {
  const rooms = await prisma.room.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      difficulty: true,
      duration: true,
      tasksCount: true,
      order: true,
      module: {
        select: {
          title: true,
          slug: true
        }
      }
    }
  });

  return res.json({ rooms });
});

router.get("/rooms/:slug", async (req, res) => {
  const room = await prisma.room.findFirst({
    where: {
      slug: req.params.slug,
      status: "PUBLISHED"
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      difficulty: true,
      duration: true,
      tasksCount: true,
      order: true,
      contentHtml: true,
      contentCss: true,
      layoutJson: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          blockId: true,
          type: true,
          prompt: true,
          order: true,
          hints: true,
          optionsJson: true
        }
      },
      module: {
        select: {
          id: true,
          title: true,
          slug: true,
          pathModules: {
            select: {
              path: {
                select: {
                  id: true,
                  title: true,
                  slug: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  const safeQuestions = room.questions.map((q) => ({
    id: q.id,
    blockId: q.blockId,
    type: q.type,
    prompt: q.prompt,
    order: q.order,
    hints: q.hints,
    options: q.type === "MCQ" && q.optionsJson?.options ? q.optionsJson.options : undefined
  }));

  return res.json({
    room: {
      ...room,
      questions: safeQuestions
    }
  });
});

const submitSchema = z.object({
  questionId: z.string().min(1).optional(),
  blockId: z.string().min(1).optional(),
  answer: z.string().min(1)
});

router.post("/rooms/:slug/submit", async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { questionId, blockId, answer } = parsed.data;
  if (!questionId && !blockId) {
    return res.status(400).json({ message: "Provide questionId or blockId." });
  }

  const room = await prisma.room.findFirst({
    where: { slug: req.params.slug, status: "PUBLISHED" },
    select: { id: true }
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  const question = await prisma.question.findFirst({
    where: {
      roomId: room.id,
      ...(questionId ? { id: questionId } : { blockId })
    }
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found." });
  }

  if (!question.answerHash) {
    return res.status(400).json({ message: "This question has no configured answer." });
  }

  const normalized = normalizeSubmittedAnswer(answer, question.type);
  const correct = await compareSecret(normalized, question.answerHash);

  if (question.type === "FLAG" && !correct) {
    const flagPattern = /^hzd\{[^}]+\}$/i;
    if (!flagPattern.test(answer.trim())) {
      return res.json({
        correct: false,
        message: "Flags should look like HZD{your_answer}."
      });
    }
  }

  return res.json({
    correct,
    message: correct ? "Correct! Well done." : "Not quite — try again."
  });
});

export default router;

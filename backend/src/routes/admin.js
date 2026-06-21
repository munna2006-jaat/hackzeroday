import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAdminOrDev } from "../middleware/auth.js";
import { hashQuestionAnswers, normalizeQuestionInput } from "../utils/questions.js";
import { slugify, uniqueSlug } from "../utils/slug.js";

const router = express.Router();

router.use(requireAdminOrDev);

const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

const pathSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  coverImage: z.string().trim().max(500).optional().nullable(),
  status: contentStatusSchema.optional(),
  order: z.coerce.number().int().min(0).optional(),
  hours: z.coerce.number().int().min(0).optional()
});

const moduleSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  coverImage: z.string().trim().max(500).optional().nullable(),
  order: z.coerce.number().int().min(0).optional()
});

const roomSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  duration: z.string().trim().max(40).optional(),
  tasksCount: z.coerce.number().int().min(0).optional(),
  order: z.coerce.number().int().min(0).optional(),
  moduleId: z.string().min(1),
  status: contentStatusSchema.optional()
});

const questionInputSchema = z.object({
  id: z.string().optional(),
  blockId: z.string().trim().max(120).optional(),
  type: z.enum(["TEXT", "FLAG", "MCQ"]).default("TEXT"),
  prompt: z.string().trim().min(1).max(1000),
  answer: z.string().trim().max(1000).optional(),
  options: z.union([z.array(z.string()), z.string()]).optional(),
  hints: z.union([z.array(z.string()), z.string()]).optional(),
  order: z.coerce.number().int().min(0).optional()
});

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(160),
  contentHtml: z.string().optional().default(""),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
  questions: z.array(questionInputSchema).optional().default([])
});

const assignModuleSchema = z.object({
  moduleId: z.string().min(1),
  order: z.coerce.number().int().min(0).optional()
});

const pathInclude = {
  pathModules: {
    orderBy: { order: "asc" },
    include: {
      module: {
        include: {
          _count: { select: { rooms: true } }
        }
      }
    }
  }
};

const moduleInclude = {
  pathModules: {
    orderBy: { order: "asc" },
    include: { path: true }
  },
  _count: { select: { rooms: true } }
};

const roomInclude = {
  module: {
    include: {
      pathModules: {
        include: { path: true }
      }
    }
  }
};

router.get("/dashboard", async (req, res) => {
  const [pathsTotal, pathsPublished, pathsDraft, modulesTotal, roomsTotal, roomsPublished, roomsDraft] =
    await Promise.all([
      prisma.learningPath.count(),
      prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
      prisma.learningPath.count({ where: { status: "DRAFT" } }),
      prisma.module.count(),
      prisma.room.count(),
      prisma.room.count({ where: { status: "PUBLISHED" } }),
      prisma.room.count({ where: { status: "DRAFT" } })
    ]);

  return res.json({
    paths: { total: pathsTotal, published: pathsPublished, draft: pathsDraft },
    modules: { total: modulesTotal },
    rooms: { total: roomsTotal, published: roomsPublished, draft: roomsDraft }
  });
});

router.get("/paths", async (req, res) => {
  const paths = await prisma.learningPath.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: pathInclude
  });
  return res.json({ paths });
});

router.post("/paths", async (req, res) => {
  const parsed = pathSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { title, slug, description, difficulty, coverImage, status, order, hours } = parsed.data;
  const finalSlug = await uniqueSlug(prisma, "learningPath", slug || slugify(title));

  const path = await prisma.learningPath.create({
    data: {
      title,
      slug: finalSlug,
      description: description || "",
      difficulty: difficulty || "beginner",
      coverImage: coverImage || null,
      status: status || "DRAFT",
      order: order ?? 0,
      hours: hours ?? 0
    },
    include: pathInclude
  });

  return res.status(201).json({ path });
});

router.put("/paths/:id", async (req, res) => {
  const parsed = pathSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existing = await prisma.learningPath.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Path not found." });
  }

  const data = { ...parsed.data };
  if (data.slug || data.title) {
    data.slug = await uniqueSlug(
      prisma,
      "learningPath",
      data.slug || data.title || existing.title,
      existing.id
    );
  }

  const path = await prisma.learningPath.update({
    where: { id: req.params.id },
    data,
    include: pathInclude
  });

  return res.json({ path });
});

router.delete("/paths/:id", async (req, res) => {
  const existing = await prisma.learningPath.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Path not found." });
  }

  await prisma.learningPath.delete({ where: { id: req.params.id } });
  return res.json({ message: "Path deleted." });
});

router.post("/paths/:pathId/modules", async (req, res) => {
  const parsed = assignModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const path = await prisma.learningPath.findUnique({ where: { id: req.params.pathId } });
  if (!path) {
    return res.status(404).json({ message: "Path not found." });
  }

  const mod = await prisma.module.findUnique({ where: { id: parsed.data.moduleId } });
  if (!mod) {
    return res.status(404).json({ message: "Module not found." });
  }

  const assignment = await prisma.pathModule.upsert({
    where: {
      pathId_moduleId: {
        pathId: req.params.pathId,
        moduleId: parsed.data.moduleId
      }
    },
    create: {
      pathId: req.params.pathId,
      moduleId: parsed.data.moduleId,
      order: parsed.data.order ?? 0
    },
    update: {
      order: parsed.data.order ?? 0
    },
    include: {
      module: true,
      path: true
    }
  });

  return res.status(201).json({ assignment });
});

router.delete("/paths/:pathId/modules/:moduleId", async (req, res) => {
  const existing = await prisma.pathModule.findUnique({
    where: {
      pathId_moduleId: {
        pathId: req.params.pathId,
        moduleId: req.params.moduleId
      }
    }
  });

  if (!existing) {
    return res.status(404).json({ message: "Module is not assigned to this path." });
  }

  await prisma.pathModule.delete({
    where: {
      pathId_moduleId: {
        pathId: req.params.pathId,
        moduleId: req.params.moduleId
      }
    }
  });

  return res.json({ message: "Module unassigned from path." });
});

router.get("/modules", async (req, res) => {
  const modules = await prisma.module.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: moduleInclude
  });
  return res.json({ modules });
});

router.post("/modules", async (req, res) => {
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { title, slug, description, coverImage, order } = parsed.data;
  const finalSlug = await uniqueSlug(prisma, "module", slug || slugify(title));

  const mod = await prisma.module.create({
    data: {
      title,
      slug: finalSlug,
      description: description || "",
      coverImage: coverImage || null,
      order: order ?? 0
    },
    include: moduleInclude
  });

  return res.status(201).json({ module: mod });
});

router.put("/modules/:id", async (req, res) => {
  const parsed = moduleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existing = await prisma.module.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Module not found." });
  }

  const data = { ...parsed.data };
  if (data.slug || data.title) {
    data.slug = await uniqueSlug(prisma, "module", data.slug || data.title || existing.title, existing.id);
  }

  const mod = await prisma.module.update({
    where: { id: req.params.id },
    data,
    include: moduleInclude
  });

  return res.json({ module: mod });
});

router.delete("/modules/:id", async (req, res) => {
  const existing = await prisma.module.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Module not found." });
  }

  await prisma.module.delete({ where: { id: req.params.id } });
  return res.json({ message: "Module deleted." });
});

router.get("/rooms", async (req, res) => {
  const rooms = await prisma.room.findMany({
    orderBy: [{ moduleId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    include: {
      ...roomInclude,
      _count: { select: { tasks: true } }
    }
  });
  return res.json({ rooms });
});

router.post("/rooms", async (req, res) => {
  const parsed = roomSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const mod = await prisma.module.findUnique({ where: { id: parsed.data.moduleId } });
  if (!mod) {
    return res.status(404).json({ message: "Module not found." });
  }

  const { title, slug, description, difficulty, duration, tasksCount, order, moduleId, status } = parsed.data;
  const finalSlug = await uniqueSlug(prisma, "room", slug || slugify(title));

  const room = await prisma.room.create({
    data: {
      title,
      slug: finalSlug,
      description: description || "",
      difficulty: difficulty || "easy",
      duration: duration || "1h",
      tasksCount: tasksCount ?? 0,
      order: order ?? 0,
      moduleId,
      status: status || "DRAFT"
    },
    include: roomInclude
  });

  return res.status(201).json({ room });
});

router.put("/rooms/:id", async (req, res) => {
  const parsed = roomSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (parsed.data.moduleId) {
    const mod = await prisma.module.findUnique({ where: { id: parsed.data.moduleId } });
    if (!mod) {
      return res.status(404).json({ message: "Module not found." });
    }
  }

  const data = { ...parsed.data };
  if (data.slug || data.title) {
    data.slug = await uniqueSlug(prisma, "room", data.slug || data.title || existing.title, existing.id);
  }

  const room = await prisma.room.update({
    where: { id: req.params.id },
    data,
    include: roomInclude
  });

  return res.json({ room });
});

router.delete("/rooms/:id", async (req, res) => {
  const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Room not found." });
  }

  await prisma.room.delete({ where: { id: req.params.id } });
  return res.json({ message: "Room deleted." });
});

const roomContentSchema = z.object({
  tasks: z.array(taskSchema).optional().default([]),
  publish: z.boolean().optional()
});

const taskInclude = {
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
  }
};

function serializeTask(task) {
  return {
    ...task,
    questions: (task.questions || []).map((q) => ({
      id: q.id,
      blockId: q.blockId,
      type: q.type,
      prompt: q.prompt,
      order: q.order,
      hints: q.hints,
      options: q.type === "MCQ" && q.optionsJson?.options ? q.optionsJson.options : []
    }))
  };
}

async function replaceTaskQuestions(tx, taskId, questions) {
  const normalized = normalizeQuestionInput(questions);
  const hashedQuestions = await hashQuestionAnswers(normalized);
  const existingQuestions = await tx.question.findMany({ where: { taskId } });
  const existingById = new Map(existingQuestions.map((q) => [q.id, q]));
  const keepIds = [];

  for (const q of hashedQuestions) {
    const existing = q.id ? existingById.get(q.id) : null;
    const answerHash = q.answerHash || existing?.answerHash;
    if (!answerHash) continue;

    if (existing) {
      await tx.question.update({
        where: { id: existing.id },
        data: {
          blockId: q.blockId,
          type: q.type,
          prompt: q.prompt,
          answerHash,
          optionsJson: q.optionsJson,
          hints: q.hints,
          order: q.order
        }
      });
      keepIds.push(existing.id);
    } else {
      const created = await tx.question.create({
        data: {
          taskId,
          blockId: q.blockId,
          type: q.type,
          prompt: q.prompt,
          answerHash,
          optionsJson: q.optionsJson,
          hints: q.hints,
          order: q.order
        }
      });
      keepIds.push(created.id);
    }
  }

  await tx.question.deleteMany({
    where: {
      taskId,
      id: { notIn: keepIds }
    }
  });

  return keepIds.length;
}

router.get("/rooms/:id/content", async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: taskInclude
      }
    }
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  return res.json({ room: { ...room, tasks: room.tasks.map(serializeTask) } });
});

router.put("/rooms/:id/content", async (req, res) => {
  const parsed = roomContentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Room not found." });
  }

  const { tasks, publish } = parsed.data;

  const room = await prisma.$transaction(async (tx) => {
    let questionsSaved = 0;
    const existingTasks = await tx.task.findMany({ where: { roomId: req.params.id } });
    const validExistingIds = new Set(existingTasks.map((task) => task.id));
    const keepTaskIds = [];

    for (const [index, taskInput] of tasks.entries()) {
      const taskData = {
        title: taskInput.title,
        contentHtml: taskInput.contentHtml || "",
        imageUrl: taskInput.imageUrl || null,
        order: taskInput.order ?? index
      };
      const task =
        taskInput.id && validExistingIds.has(taskInput.id)
          ? await tx.task.update({ where: { id: taskInput.id }, data: taskData })
          : await tx.task.create({ data: { ...taskData, roomId: req.params.id } });
      keepTaskIds.push(task.id);
      questionsSaved += await replaceTaskQuestions(tx, task.id, taskInput.questions);
    }

    await tx.task.deleteMany({
      where: {
        roomId: req.params.id,
        id: { notIn: keepTaskIds }
      }
    });

    const updated = await tx.room.update({
      where: { id: req.params.id },
      data: {
        tasksCount: tasks.length,
        ...(publish ? { status: "PUBLISHED" } : {})
      },
      include: {
        ...roomInclude,
        tasks: {
          orderBy: { order: "asc" },
          include: taskInclude
        }
      }
    });

    return { room: updated, questionsSaved };
  });

  return res.json({
    room: { ...room.room, tasks: room.room.tasks.map(serializeTask) },
    questionsSaved: room.questionsSaved
  });
});

router.post("/rooms/:id/tasks", async (req, res) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const room = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        roomId: req.params.id,
        title: parsed.data.title,
        contentHtml: parsed.data.contentHtml || "",
        imageUrl: parsed.data.imageUrl || null,
        order: parsed.data.order ?? 0
      }
    });
    await replaceTaskQuestions(tx, created.id, parsed.data.questions);
    await tx.room.update({
      where: { id: req.params.id },
      data: { tasksCount: await tx.task.count({ where: { roomId: req.params.id } }) }
    });
    return tx.task.findUnique({ where: { id: created.id }, include: taskInclude });
  });

  return res.status(201).json({ task: serializeTask(task) });
});

router.put("/tasks/:taskId", async (req, res) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existing = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!existing) {
    return res.status(404).json({ message: "Task not found." });
  }

  const task = await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: req.params.taskId },
      data: {
        title: parsed.data.title,
        contentHtml: parsed.data.contentHtml || "",
        imageUrl: parsed.data.imageUrl || null,
        order: parsed.data.order ?? existing.order
      }
    });
    await replaceTaskQuestions(tx, req.params.taskId, parsed.data.questions);
    return tx.task.findUnique({ where: { id: req.params.taskId }, include: taskInclude });
  });

  return res.json({ task: serializeTask(task) });
});

router.delete("/tasks/:taskId", async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!existing) {
    return res.status(404).json({ message: "Task not found." });
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: req.params.taskId } });
    await tx.room.update({
      where: { id: existing.roomId },
      data: { tasksCount: await tx.task.count({ where: { roomId: existing.roomId } }) }
    });
  });

  return res.json({ message: "Task deleted." });
});

export default router;

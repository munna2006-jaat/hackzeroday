import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAdminOrDev } from "../middleware/auth.js";
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
  status: contentStatusSchema.optional(),
  contentHtml: z.string().optional().nullable(),
  layoutJson: z.unknown().optional().nullable()
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

  const { title, slug, description, order } = parsed.data;
  const finalSlug = await uniqueSlug(prisma, "module", slug || slugify(title));

  const mod = await prisma.module.create({
    data: {
      title,
      slug: finalSlug,
      description: description || "",
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
    include: roomInclude
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

  const { title, slug, description, difficulty, duration, tasksCount, order, moduleId, status, contentHtml, layoutJson } =
    parsed.data;
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
      status: status || "DRAFT",
      contentHtml: contentHtml ?? null,
      layoutJson: layoutJson ?? null
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

export default router;

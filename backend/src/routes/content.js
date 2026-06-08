import express from "express";
import { prisma } from "../config/prisma.js";

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
      layoutJson: true,
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

  return res.json({ room });
});

export default router;

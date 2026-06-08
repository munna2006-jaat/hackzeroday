import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { verifyToken } from "../utils/auth.js";

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  college: true,
  learningGoal: true,
  points: true,
  solvedCount: true,
  emailVerified: true,
  createdAt: true
};

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication token is required." });
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: adminUserSelect
    });

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication token is required." });
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: adminUserSelect
    });

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

/** Dev-stage guard: ADMIN JWT or x-admin-dev-key header. TODO: remove dev key bypass before production. */
export async function requireAdminOrDev(req, res, next) {
  const devKey = req.headers["x-admin-dev-key"];

  if (env.adminDevKey && devKey && devKey === env.adminDevKey) {
    req.isDevAdmin = true;
    return next();
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(403).json({
      message: "Admin access required. Provide a valid admin token or x-admin-dev-key header."
    });
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: adminUserSelect
    });

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

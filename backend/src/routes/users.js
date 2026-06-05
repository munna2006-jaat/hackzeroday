import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { compareSecret, hashSecret } from "../utils/auth.js";

const router = express.Router();

// Validation Schemas
const profileSchema = z.object({
  name: z.string().trim().max(80).min(1, "Name cannot be empty"),
  college: z.string().trim().max(120).min(1, "College name cannot be empty"),
  learningGoal: z.string().trim().max(80).optional().or(z.literal(""))
});

const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
});

// Static CTF data stored in memory for interactive demo
const ctfs = [
  {
    id: "campus-intra-1",
    title: "HackFest In-Campus CTF",
    type: "in-campus",
    college: "IIT Delhi",
    status: "active",
    date: "June 10, 2026",
    duration: "6 Hours",
    format: "Jeopardy",
    difficulty: "Beginner-Intermediate",
    challengesCount: 12,
    points: 1200,
    registeredUsers: new Set()
  },
  {
    id: "campus-intra-2",
    title: "ZeroDay In-House CTF",
    type: "in-campus",
    college: "Delhi Technological University",
    status: "active",
    date: "June 15, 2026",
    duration: "12 Hours",
    format: "Jeopardy",
    difficulty: "Intermediate",
    challengesCount: 18,
    points: 2000,
    registeredUsers: new Set()
  },
  {
    id: "campus-intra-3",
    title: "NSUT Cyber Shield",
    type: "in-campus",
    college: "Netaji Subhas University of Technology",
    status: "upcoming",
    date: "June 28, 2026",
    duration: "24 Hours",
    format: "Jeopardy",
    difficulty: "Advanced",
    challengesCount: 25,
    points: 3500,
    registeredUsers: new Set()
  },
  {
    id: "campus-intra-default",
    title: "Local Campus Boot CTF",
    type: "in-campus",
    college: "Other",
    status: "active",
    date: "June 20, 2026",
    duration: "8 Hours",
    format: "Jeopardy",
    difficulty: "Beginner",
    challengesCount: 10,
    points: 1000,
    registeredUsers: new Set()
  },
  {
    id: "clash-1",
    title: "Inter-College Cyber Clash #4",
    type: "college-vs-college",
    status: "active",
    date: "June 12, 2026",
    duration: "48 Hours",
    format: "Attack-Defense",
    difficulty: "Advanced",
    challengesCount: 30,
    points: 5000,
    registeredUsers: new Set(),
    matchup: "IIT Delhi vs DTU"
  },
  {
    id: "clash-2",
    title: "National College League (NCL) Qualifiers",
    type: "college-vs-college",
    status: "upcoming",
    date: "July 02, 2026",
    duration: "24 Hours",
    format: "Jeopardy",
    difficulty: "All Levels",
    challengesCount: 40,
    points: 4000,
    registeredUsers: new Set(),
    matchup: "All India Inter-College Open"
  }
];

// 1. Update Profile
router.put("/profile", requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { name, college, learningGoal } = parsed.data;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        college,
        learningGoal: learningGoal || null
      },
      select: {
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
      }
    });

    return res.json({
      message: "Profile updated successfully.",
      user: updatedUser
    });
  } catch (error) {
    console.error("[users] Profile update error:", error);
    return res.status(500).json({ message: "Failed to update profile." });
  }
});

// 2. Change Password
router.put("/change-password", requireAuth, async (req, res) => {
  const parsed = passwordChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { oldPassword, newPassword } = parsed.data;

  try {
    // Get full user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !(await compareSecret(oldPassword, user.passwordHash))) {
      return res.status(401).json({ message: "Incorrect old password." });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: await hashSecret(newPassword)
      }
    });

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[users] Password update error:", error);
    return res.status(500).json({ message: "Failed to update password." });
  }
});

// 3. Delete Account
router.delete("/delete-account", requireAuth, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.user.id }
    });
    return res.json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("[users] Account delete error:", error);
    return res.status(500).json({ message: "Failed to delete account." });
  }
});

// 4. Leaderboard API
router.get("/leaderboard", requireAuth, async (req, res) => {
  try {
    // Global User Leaderboard (top 50)
    const globalUsers = await prisma.user.findMany({
      take: 50,
      orderBy: { points: "desc" },
      select: {
        id: true,
        name: true,
        college: true,
        points: true,
        solvedCount: true
      }
    });

    // College Leaderboard
    const collegeGroups = await prisma.user.groupBy({
      by: ["college"],
      where: {
        college: { not: null, not: "" }
      },
      _sum: {
        points: true,
        solvedCount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          points: "desc"
        }
      }
    });

    const formattedColleges = collegeGroups.map((group, index) => ({
      rank: index + 1,
      college: group.college,
      points: group._sum.points || 0,
      solvedCount: group._sum.solvedCount || 0,
      studentCount: group._count.id
    }));

    return res.json({
      global: globalUsers.map((user, idx) => ({
        rank: idx + 1,
        ...user,
        name: user.name || "Anonymous Hacker"
      })),
      colleges: formattedColleges
    });
  } catch (error) {
    console.error("[users] Leaderboard error:", error);
    return res.status(500).json({ message: "Failed to load leaderboard." });
  }
});

// 5. CTFs list
router.get("/ctfs", requireAuth, (req, res) => {
  const userCollege = req.user.college || "";
  const userId = req.user.id;

  const responseCtfs = ctfs.map((ctf) => {
    return {
      id: ctf.id,
      title: ctf.title,
      type: ctf.type,
      college: ctf.college,
      status: ctf.status,
      date: ctf.date,
      duration: ctf.duration,
      format: ctf.format,
      difficulty: ctf.difficulty,
      challengesCount: ctf.challengesCount,
      points: ctf.points,
      matchup: ctf.matchup,
      registered: ctf.registeredUsers.has(userId),
      registrationCount: ctf.registeredUsers.size
    };
  });

  // Filter in-campus CTFs: show user's college CTFs. If user's college doesn't match predefined ones, fallback to default.
  const userInCampus = responseCtfs.filter(
    (c) => c.type === "in-campus" && (c.college.toLowerCase() === userCollege.toLowerCase() || (userCollege && c.id === "campus-intra-default"))
  );
  
  const collegeVsCollege = responseCtfs.filter((c) => c.type === "college-vs-college");

  return res.json({
    inCampus: userInCampus,
    collegeVsCollege,
    hasCollege: !!userCollege
  });
});

// 6. CTF Registration Toggle
router.post("/ctfs/:id/register", requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const ctf = ctfs.find((c) => c.id === id);
  if (!ctf) {
    return res.status(404).json({ message: "CTF event not found." });
  }

  let registered = false;
  if (ctf.registeredUsers.has(userId)) {
    ctf.registeredUsers.delete(userId);
    registered = false;
  } else {
    ctf.registeredUsers.add(userId);
    registered = true;
  }

  // Award mock points and solved count if user registers/unregisters (simulate CTF interaction)
  // Let's increment points for dynamic feel!
  prisma.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: registered ? 150 : -150
      },
      solvedCount: {
        increment: registered ? 1 : -1
      }
    }
  }).catch(err => console.error("Failed to update user score on register simulation:", err));

  return res.json({
    message: registered ? "Registered for CTF successfully! +150 Points awarded for training." : "Registration cancelled.",
    registered,
    registrationCount: ctf.registeredUsers.size
  });
});

export default router;

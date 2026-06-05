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

const createTeamSchema = z.object({
  teamName: z.string().trim().min(3, "Team name must be at least 3 characters.").max(48, "Team name is too long.")
});

const joinTeamSchema = z.object({
  inviteCode: z.string().trim().min(6, "Invite code is required.").max(16)
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

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "HZD-";

  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function publicTeam(team, userEmail) {
  if (!team) return null;

  return {
    id: team.id,
    eventId: team.eventId,
    teamName: team.teamName,
    college: team.college,
    inviteCode: team.inviteCode,
    captainId: team.captainId,
    memberEmails: team.memberEmails,
    maxMembers: team.maxMembers,
    memberCount: team.memberEmails.length,
    isCaptain: team.captain?.email === userEmail || false
  };
}

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
router.get("/ctfs", requireAuth, async (req, res) => {
  const userCollege = req.user.college || "";
  const userId = req.user.id;
  const userEmail = req.user.email;

  const userTeams = await prisma.ctfTeam.findMany({
    where: {
      OR: [
        { captainId: userId },
        { memberEmails: { has: userEmail } }
      ]
    },
    include: {
      captain: {
        select: { email: true }
      }
    }
  });

  const teamByEvent = new Map(userTeams.map((team) => [team.eventId, team]));

  const responseCtfs = ctfs.map((ctf) => {
    const team = teamByEvent.get(ctf.id);

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
      registrationCount: ctf.registeredUsers.size,
      team: publicTeam(team, userEmail),
      teamRequired: true,
      maxTeamSize: ctf.type === "college-vs-college" ? 5 : 4
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

// 7. Create team for CTF event
router.post("/ctfs/:id/team", requireAuth, async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const ctf = ctfs.find((event) => event.id === req.params.id);
  if (!ctf) {
    return res.status(404).json({ message: "CTF event not found." });
  }

  const existingTeam = await prisma.ctfTeam.findFirst({
    where: {
      eventId: ctf.id,
      OR: [
        { captainId: req.user.id },
        { memberEmails: { has: req.user.email } }
      ]
    }
  });

  if (existingTeam) {
    return res.status(409).json({ message: "You already have a team for this CTF." });
  }

  let inviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existingCode = await prisma.ctfTeam.findUnique({ where: { inviteCode } });
    if (!existingCode) break;
    inviteCode = generateInviteCode();
  }

  const team = await prisma.ctfTeam.create({
    data: {
      eventId: ctf.id,
      eventTitle: ctf.title,
      eventType: ctf.type,
      teamName: parsed.data.teamName,
      college: req.user.college || ctf.college || null,
      inviteCode,
      captainId: req.user.id,
      memberEmails: [req.user.email],
      maxMembers: ctf.type === "college-vs-college" ? 5 : 4
    },
    include: {
      captain: {
        select: { email: true }
      }
    }
  });

  ctf.registeredUsers.add(req.user.id);

  return res.status(201).json({
    message: "Team created. Share the invite code with your teammates.",
    team: publicTeam(team, req.user.email)
  });
});

// 8. Join team using invite code
router.post("/ctfs/:id/team/join", requireAuth, async (req, res) => {
  const parsed = joinTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const ctf = ctfs.find((event) => event.id === req.params.id);
  if (!ctf) {
    return res.status(404).json({ message: "CTF event not found." });
  }

  const inviteCode = parsed.data.inviteCode.toUpperCase();
  const team = await prisma.ctfTeam.findUnique({
    where: { inviteCode },
    include: {
      captain: {
        select: { email: true }
      }
    }
  });

  if (!team || team.eventId !== ctf.id) {
    return res.status(404).json({ message: "No team found for this event with that invite code." });
  }

  if (team.memberEmails.includes(req.user.email)) {
    return res.json({ message: "You are already in this team.", team: publicTeam(team, req.user.email) });
  }

  const existingTeam = await prisma.ctfTeam.findFirst({
    where: {
      eventId: ctf.id,
      OR: [
        { captainId: req.user.id },
        { memberEmails: { has: req.user.email } }
      ]
    }
  });

  if (existingTeam) {
    return res.status(409).json({ message: "You already belong to a team for this CTF." });
  }

  if (team.memberEmails.length >= team.maxMembers) {
    return res.status(409).json({ message: "This team is already full." });
  }

  const updatedTeam = await prisma.ctfTeam.update({
    where: { id: team.id },
    data: {
      memberEmails: [...team.memberEmails, req.user.email]
    },
    include: {
      captain: {
        select: { email: true }
      }
    }
  });

  ctf.registeredUsers.add(req.user.id);

  return res.json({
    message: "Joined team successfully.",
    team: publicTeam(updatedTeam, req.user.email)
  });
});

export default router;

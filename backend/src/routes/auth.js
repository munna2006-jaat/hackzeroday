import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { compareSecret, hashSecret, signToken } from "../utils/auth.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { createOtpRecordData } from "../utils/otp.js";

const router = express.Router();

const emailSchema = z.string().email().transform((value) => value.toLowerCase().trim());
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

const signupSchema = z.object({
  college: z.string().trim().max(120).optional().or(z.literal("")),
  email: emailSchema,
  learningGoal: z.string().trim().max(80).optional().or(z.literal("")),
  name: z.string().trim().max(80).optional().or(z.literal("")),
  password: passwordSchema
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

const otpSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
  purpose: z.enum(["EMAIL_VERIFY", "LOGIN"]).default("EMAIL_VERIFY")
});

const sendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(["EMAIL_VERIFY", "LOGIN"]).default("EMAIL_VERIFY")
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    college: user.college,
    learningGoal: user.learningGoal,
    emailVerified: user.emailVerified,
    role: user.role
  };
}

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { college, email, learningGoal, name, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(409).json({ message: "An account already exists with this email." });
  }

  const user = await prisma.user.create({
    data: {
      college: college || null,
      email,
      learningGoal: learningGoal || null,
      name: name || null,
      passwordHash: await hashSecret(password)
    }
  });

  const { data, otp } = await createOtpRecordData(user, "EMAIL_VERIFY");
  await prisma.emailOtp.create({ data });
  const emailResult = await sendOtpEmail({ email, otp, purpose: "EMAIL_VERIFY" });

  return res.status(201).json({
    message: "Account created. Check your email for the verification OTP.",
    token: signToken(user),
    user: publicUser(user),
    emailPreview: emailResult.preview
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await compareSecret(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  return res.json({
    message: user.emailVerified ? "Login successful." : "Login successful. Verify your email to unlock protected actions.",
    token: signToken(user),
    user: publicUser(user)
  });
});

router.post("/send-otp", async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { email, purpose } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(404).json({ message: "No account found with this email." });
  }

  await prisma.emailOtp.updateMany({
    data: { usedAt: new Date() },
    where: { email, purpose, usedAt: null }
  });

  const { data, otp } = await createOtpRecordData(user, purpose);
  await prisma.emailOtp.create({ data });
  const emailResult = await sendOtpEmail({ email, otp, purpose });

  return res.json({
    message: "OTP sent. Check your email inbox.",
    emailPreview: emailResult.preview
  });
});

router.post("/verify-otp", async (req, res) => {
  const parsed = otpSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { email, otp, purpose } = parsed.data;
  const record = await prisma.emailOtp.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      email,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });

  if (!record || !(await compareSecret(otp, record.otpHash))) {
    return res.status(400).json({ message: "Invalid or expired OTP." });
  }

  const user = await prisma.user.update({
    data: { emailVerified: true },
    where: { id: record.userId }
  });

  await prisma.emailOtp.update({
    data: { usedAt: new Date() },
    where: { id: record.id }
  });

  return res.json({
    message: "Email verified successfully.",
    token: signToken(user),
    user: publicUser(user)
  });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

export default router;

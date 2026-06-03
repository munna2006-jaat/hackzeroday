import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function getTransporter() {
  if (!env.emailUser || !env.emailPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailSecure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: env.emailUser,
      pass: env.emailPass
    }
  });
}

export async function sendOtpEmail({ email, otp, purpose }) {
  const transporter = getTransporter();
  const subject =
    purpose === "LOGIN" ? "Your HackZeroDay login OTP" : "Verify your HackZeroDay email";

  const text = [
    `Your HackZeroDay OTP is ${otp}.`,
    "",
    "This code expires soon. Do not share it with anyone.",
    "",
    "If you did not request this, ignore this email."
  ].join("\n");

  if (!transporter) {
    console.log(`[email disabled] ${subject} for ${email}: ${otp}`);
    return { preview: "Email env vars missing; OTP logged on server console." };
  }

  try {
    await transporter.sendMail({
      from: env.emailFrom,
      to: email,
      subject,
      text
    });

    return { preview: null };
  } catch (error) {
    console.error("[email] Failed to send OTP:", {
      code: error.code,
      command: error.command,
      message: error.message
    });

    return {
      error:
        "OTP could not be sent. Check EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, and EMAIL_PASS."
    };
  }
}

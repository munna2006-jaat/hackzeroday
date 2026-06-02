import dotenv from "dotenv";

dotenv.config();

const required = ["DATABASE_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key}. Add it in Render environment variables.`);
  }
}

export const env = {
  appOrigin: process.env.APP_ORIGIN || "http://localhost:4174",
  databaseUrl: process.env.DATABASE_URL,
  emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPass: process.env.EMAIL_PASS,
  emailPort: Number(process.env.EMAIL_PORT || 465),
  emailSecure: String(process.env.EMAIL_SECURE || "true") === "true",
  emailUser: process.env.EMAIL_USER,
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-this-secret",
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  port: Number(process.env.PORT || 5000)
};

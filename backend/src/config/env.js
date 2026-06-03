import dotenv from "dotenv";

dotenv.config();

function cleanEnv(value, fallback = "") {
  return String(value || fallback)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const required = ["DATABASE_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key}. Add it in Render environment variables.`);
  }
}

export const env = {
  appOrigin: cleanEnv(process.env.APP_ORIGIN, "http://localhost:4174"),
  databaseUrl: cleanEnv(process.env.DATABASE_URL),
  emailFrom: cleanEnv(process.env.EMAIL_FROM, process.env.EMAIL_USER),
  emailHost: cleanEnv(process.env.EMAIL_HOST, "smtp.gmail.com"),
  emailPass: cleanEnv(process.env.EMAIL_PASS),
  emailPort: Number(cleanEnv(process.env.EMAIL_PORT, 465)),
  emailSecure: String(process.env.EMAIL_SECURE || "true") === "true",
  emailUser: cleanEnv(process.env.EMAIL_USER),
  jwtSecret: cleanEnv(process.env.JWT_SECRET, "dev-only-change-this-secret"),
  otpExpiresMinutes: Number(cleanEnv(process.env.OTP_EXPIRES_MINUTES, 10)),
  port: Number(cleanEnv(process.env.PORT, 5000)),
  resendApiKey: cleanEnv(process.env.RESEND_API_KEY)
};

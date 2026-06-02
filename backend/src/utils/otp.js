import crypto from "node:crypto";
import { env } from "../config/env.js";
import { hashSecret } from "./auth.js";

export function createOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function createOtpRecordData(user, purpose = "EMAIL_VERIFY") {
  const otp = createOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);

  return {
    data: {
      email: user.email,
      expiresAt,
      otpHash: await hashSecret(otp),
      purpose,
      userId: user.id
    },
    otp
  };
}

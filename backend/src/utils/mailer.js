import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const resendUrl = "https://api.resend.com/emails";

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

function parseEmailFrom(fromStr) {
  if (!fromStr) return null;
  const match = fromStr.match(/^(?:"?([^"]*?)"?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/);
  if (match) {
    return {
      name: (match[1] || "").trim(),
      email: (match[2] || "").trim(),
      isValid: true
    };
  }
  return {
    name: fromStr.trim(),
    email: "",
    isValid: false
  };
}

function generateOtpHtml(otp, title) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HackZeroDay OTP Verification</title>
  <style>
    body {
      background-color: #0b0e14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #c5c9d6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0e14;
      padding: 40px 0;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #151b26;
      border: 1px solid #243046;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 30px 20px;
      text-align: center;
      border-bottom: 2px solid #05c46b;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 1.5px;
      margin: 0;
    }
    .logo span {
      color: #05c46b;
    }
    .content {
      padding: 40px 30px;
      text-align: center;
    }
    h1 {
      color: #ffffff;
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 15px;
      font-weight: 700;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #a0aec0;
      margin-bottom: 30px;
    }
    .otp-container {
      background-color: #0f172a;
      border: 1px dashed #05c46b;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      display: inline-block;
      min-width: 220px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #05c46b;
      margin: 0;
      padding-left: 8px;
    }
    .expires-badge {
      font-size: 13px;
      color: #fca5a5;
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 6px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 10px;
      font-weight: 600;
    }
    .footer {
      background-color: #0f172a;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #718096;
      border-top: 1px solid #1e293b;
    }
    .footer-warning {
      margin: 0 0 10px 0;
      font-size: 12px;
      color: #718096;
    }
    .footer-copyright {
      margin: 0;
      font-size: 11px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">HACK<span>ZERO</span>DAY</div>
      </div>
      <div class="content">
        <h1>${title}</h1>
        <p>Use the secure verification code below to complete your authentication request.</p>
        <div class="otp-container">
          <div class="otp-code">${otp}</div>
        </div>
        <div>
          <span class="expires-badge">Expires in 10 minutes</span>
        </div>
      </div>
      <div class="footer">
        <p class="footer-warning">If you did not request this OTP, you can safely ignore this email.</p>
        <p class="footer-copyright">&copy; 2026 HackZeroDay. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOtpEmail({ email, otp, purpose }) {
  const subject =
    purpose === "LOGIN" ? "Your HackZeroDay login OTP" : "Verify your HackZeroDay email";

  const text = [
    `Your HackZeroDay OTP is ${otp}.`,
    "",
    "This code expires soon. Do not share it with anyone.",
    "",
    "If you did not request this, ignore this email."
  ].join("\n");

  const html = generateOtpHtml(otp, subject);

  if (env.resendApiKey) {
    let fromAddress = "HackZeroDay <onboarding@resend.dev>";

    if (env.emailFrom) {
      const parsed = parseEmailFrom(env.emailFrom);
      if (parsed) {
        if (parsed.isValid && parsed.email) {
          const emailLower = parsed.email.toLowerCase();
          const isPublicDomain =
            emailLower.endsWith("@gmail.com") ||
            emailLower.endsWith("@yahoo.com") ||
            emailLower.endsWith("@hotmail.com") ||
            emailLower.endsWith("@outlook.com") ||
            emailLower.endsWith("@aol.com") ||
            emailLower.endsWith("@icloud.com") ||
            emailLower.endsWith("@protonmail.com") ||
            emailLower.endsWith("@proton.me") ||
            emailLower.endsWith("@mail.com");

          if (isPublicDomain) {
            const name = parsed.name || "HackZeroDay";
            fromAddress = `${name} <onboarding@resend.dev>`;
          } else {
            fromAddress = env.emailFrom;
          }
        } else if (parsed.name) {
          fromAddress = `${parsed.name} <onboarding@resend.dev>`;
        }
      }
    }

    try {
      const response = await fetch(resendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddress,
          to: email,
          subject,
          text,
          html
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("[email] Resend API error response:", data);
        const errMsg = data.message || (data.error && data.error.message) || JSON.stringify(data) || "Resend API request failed.";
        throw new Error(errMsg);
      }

      return { preview: null };
    } catch (error) {
      console.error("[email] Resend failed to send OTP:", {
        message: error.message
      });

      return {
        error: `OTP could not be sent through Resend. Error: ${error.message}`
      };
    }
  }

  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[email disabled] ${subject} for ${email}: ${otp}`);
    return { preview: "Email env vars missing; OTP logged on server console." };
  }

  try {
    await transporter.sendMail({
      from: env.emailFrom,
      to: email,
      subject,
      text,
      html
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

# HackZeroDay Backend

Express + Prisma backend for authentication, email OTP, and future platform APIs.

## Render Web Service Settings

Use a Web Service, not a Static Site, when authentication is enabled.

```text
Root Directory: .
Build Command: npm install --prefix backend && npm --prefix backend run build && npm --prefix backend run prisma:deploy
Start Command: npm start
```

If this is your first deploy and migrations fail because the database is not ready,
run this build command once:

```text
npm install --prefix backend && npm --prefix backend run build
```

Then open Render Shell and run:

```bash
npm --prefix backend run prisma:deploy
```

## Environment Variables

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
JWT_SECRET=use-a-long-random-secret
APP_ORIGIN=https://your-render-domain.onrender.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=HackZeroDay <your-email@gmail.com>
OTP_EXPIRES_MINUTES=10
```

## API Endpoints

```text
GET  /api/health
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/send-otp
POST /api/auth/verify-otp
GET  /api/auth/me
```

## Notes

- Passwords are stored as bcrypt hashes.
- OTPs are stored as bcrypt hashes and expire.
- If email variables are missing, OTP is logged in the server console for development.

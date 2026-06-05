# HackZeroDay Project Handoff

This file summarizes the current state of the HackZeroDay platform so another AI/model or developer can continue without re-discovering the project.

## Product Direction

HackZeroDay is a cybersecurity learning platform for Indian students and colleges. It is inspired by hands-on platforms such as TryHackMe/Hack The Box, but the immediate build priority is the platform shell, authentication, dashboard, profile/settings, and CTF operations. Labs, rooms, modules, and actual challenge infrastructure are intentionally deferred for later.

## Repository Structure

```text
backend/
  prisma/
    schema.prisma
    migrations/
  src/
    config/
    middleware/
    routes/
    utils/
frontend/
  assets/
  scripts/
  styles/
  dashboard.html
  index.html
  login.html
  paths.html
package.json
PROJECT_HANDOFF.md
```

## Frontend Completed

- Marketing/home page with HackZeroDay branding and responsive layout.
- Login/signup page wired to backend auth APIs.
- Paths page with cybersecurity learning path catalog.
- Dashboard page with SPA-style section navigation.
- My Profile section:
  - Profile stats card.
  - Profile edit form.
  - College/institution field.
  - Learning goal field.
- Settings section:
  - Password change form.
  - Theme selector.
  - Danger zone account delete.
- Leaderboard section:
  - Global user leaderboard.
  - College leaderboard.
  - Search/filter rendering.
- Campus CTF section:
  - In-campus CTF tab.
  - College-vs-college tab.
  - College profile alert if college is missing.
  - Event cards for CTFs.
  - CTF registration toggle.
  - Team creation per event.
  - Invite-code based team join.
  - Team status panel with invite code, role, member count.
- Dashboard CSS:
  - HTB/THM-inspired dark UI.
  - Premium hover states.
  - Smooth animations.
  - Responsive sidebar.
  - Reduced-motion support.

## Backend Completed

Backend is Express + Prisma + PostgreSQL.

### Auth APIs

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/send-otp
POST /api/auth/verify-otp
GET  /api/auth/me
GET  /api/health
```

### User/Dashboard APIs

```text
PUT    /api/users/profile
PUT    /api/users/change-password
DELETE /api/users/delete-account
GET    /api/users/leaderboard
GET    /api/users/ctfs
POST   /api/users/ctfs/:id/register
POST   /api/users/ctfs/:id/team
POST   /api/users/ctfs/:id/team/join
```

### Database Models

- `User`
- `EmailOtp`
- `CtfTeam`

Current migrations:

```text
20260603000000_init
20260605000000_add_points_and_solved
20260605010000_add_ctf_teams
```

## Email OTP

Gmail SMTP timed out on Render, so backend supports Resend HTTP API.

Recommended Render env:

```text
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=HackZeroDay <onboarding@resend.dev>
```

For production, verify a real domain and switch sender to:

```text
HackZeroDay <no-reply@hackzeroday.in>
```

## Render Deployment

Use Render Web Service, not Static Site.

```text
Root Directory: .
Build Command: npm install --prefix backend && npm --prefix backend run build && npm --prefix backend run prisma:deploy
Start Command: npm start
```

Required env vars:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-secret
APP_ORIGIN=https://hackzeroday.onrender.com
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=HackZeroDay <onboarding@resend.dev>
```

Optional SMTP fallback vars:

```text
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=...
EMAIL_PASS=...
```

## Current CTF Design

There are two CTF modes:

1. In-Campus CTF
   - For one college or local cyber club.
   - User college controls what events are shown.
   - Team size defaults to 4.

2. College vs College
   - For official inter-college matches.
   - Team size defaults to 5.
   - Events include matchups and national/open qualifiers.

Team workflow:

```text
Create Team -> generate invite code -> share with teammates -> teammates join with code -> register/participate
```

## Deferred Work

Do not build these until the user asks:

- Real labs/rooms/modules.
- Docker/browser lab infrastructure.
- Flag validation engine.
- Payment/subscription flow.
- Admin panel.
- Certificates.
- Real CTF challenge backend/scoring.

## Verification Already Done

- JavaScript syntax checked with Node for dashboard and backend routes.
- Public pages mobile overflow checked.
- Dashboard auth guard redirects to login when no token.
- Latest dashboard expansion pushed to GitHub.

## Known Notes

- Some current CTF event data is static seed/demo data inside `backend/src/routes/users.js`.
- CTF team creation is persistent in PostgreSQL through `CtfTeam`.
- Basic CTF registration state still uses in-memory Sets for demo registration counts, so real persistent registrations should be added later if needed.

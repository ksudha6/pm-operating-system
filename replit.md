# PM Operating System

AI-powered Product Manager career platform with three core modules.

## Architecture

- **Frontend**: React + Wouter + TanStack Query + Tailwind CSS + Shadcn UI
- **Backend**: Express.js API routes with session-based auth
- **Database**: PostgreSQL via Drizzle ORM (Neon serverless)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Design**: Dark mode default, Inter font, indigo primary accent
- **Auth**: Email OTP + Google OAuth with express-session (connect-pg-simple store)

## Authentication

- **Google Sign-In**: OAuth 2.0 Authorization Code flow via `/api/auth/google` redirect
  - Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
  - Callback at `/api/auth/google/callback` — auto-creates user from Google profile
  - Google avatar is displayed in sidebar if available
- **Email OTP**: 6-digit codes with 10 min expiry, shown on screen (no email service connected)
- Sessions stored in PostgreSQL via connect-pg-simple
- New users go through onboarding to set name and choose modules
- All API routes protected with `requireAuth` middleware

## Modules

### 1. PM Interview Gym (`/interview-gym`)
- AI-generated aptitude tests (10 questions, 5 categories, 4 difficulty levels)
- Categories: Quantitative Reasoning, Data Interpretation, Product Analytics, Root Cause Analysis, Product Sense
- Session tracking with accuracy %, history, weakest topic detection

### 2. Case Simulator (`/case-simulator`)
- AI interviewer for product cases (product sense, growth, monetization, retention, AI strategy)
- L6 Mode (Senior PM) and L7 Director Mode
- Director Mode adds org design, vision/strategy, stakeholder conflict questions
- Streaming chat interface with end-session feedback

### 3. Career Copilot (`/career-copilot`)
- Job application tracker with pipeline stages (applied, screen, onsite, offer, rejected)
- Stats dashboard (applications, screens, onsites, offers)
- AI-powered career insights and pattern analysis
- CRUD for applications with recruiter feedback tracking

## Key Files

- `shared/schema.ts` - All database schemas (Drizzle ORM) - users, otpCodes, aptitudeAttempts, aptitudeAnswers, caseSessions, caseMessages, jobApplications
- `server/routes.ts` - All API endpoints (auth + module routes)
- `server/storage.ts` - Database storage layer
- `server/index.ts` - Express server with session middleware
- `server/db.ts` - PostgreSQL connection
- `server/seed.ts` - Seed data for demo
- `client/src/App.tsx` - App shell with auth flow (login -> onboarding -> main app)
- `client/src/hooks/use-auth.tsx` - Auth context provider and hook
- `client/src/pages/auth-page.tsx` - Login page (email + OTP)
- `client/src/pages/onboarding.tsx` - Profile setup (name + module selection)
- `client/src/pages/` - Module page components
- `client/src/components/app-sidebar.tsx` - Sidebar with user info and logout

## API Endpoints

### Auth
- `POST /api/auth/request-otp` - Request OTP code for email
- `POST /api/auth/verify-otp` - Verify OTP and create session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Destroy session
- `PATCH /api/auth/profile` - Update name and module selections

### Modules (all require auth)
- `GET/POST /api/aptitude/attempts` - Test attempts
- `POST /api/aptitude/start` - Generate AI questions and start test
- `POST /api/aptitude/answers/:id/submit` - Submit answer
- `POST /api/aptitude/attempts/:id/complete` - Complete test
- `GET/POST /api/cases/sessions` - Case sessions
- `POST /api/cases/start` - Start new case interview
- `POST /api/cases/sessions/:id/messages` - Stream chat messages
- `POST /api/cases/sessions/:id/end` - End session and get feedback
- `GET/POST/PATCH/DELETE /api/career/applications` - Job applications CRUD
- `POST /api/career/insights` - AI career analysis

## Database Tables

- `users` - User profiles (email, name, selectedModules, onboardingComplete)
- `otp_codes` - OTP verification codes
- `session` - Express sessions (auto-created by connect-pg-simple)
- `aptitude_attempts` - Test session metadata (linked to userId)
- `aptitude_answers` - Individual question/answer records
- `case_sessions` - Case interview sessions (linked to userId)
- `case_messages` - Chat messages within case sessions
- `job_applications` - Job application tracking (linked to userId)

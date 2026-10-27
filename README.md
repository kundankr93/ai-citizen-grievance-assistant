# CivicConnect AI — Citizen Grievance Assistant

**A full-stack civic-tech application that helps citizens report local issues and helps administrators route, prioritize, and track their resolution.**

- **Live demo:** https://ai-citizen-grievance-assistant.onrender.com/
- **API health:** https://ai-citizen-grievance-assistant.onrender.com/api/health
- **Source code:** https://github.com/kundankr93/ai-citizen-grievance-assistant

> **Project status:** Portfolio/demo prototype. This project is not affiliated with or connected to any municipal corporation or official government grievance platform. AI outputs are recommendations for human review, not official decisions. Do not use the demo for emergencies or submit sensitive personal information.

## Overview

Citizens can submit local service complaints—such as water-supply problems, potholes, damaged streetlights, drainage, waste, and electrical hazards—and track their progress. Gemini can interpret a complaint, suggest a category and responsible department, estimate urgency, explain its recommendation, and analyze an optional photo. Administrators and department officers manage assignment and resolution through role-based workflows.

The application distinguishes real AI results from rule-based fallback results. When the AI provider is unavailable, the app may use a clearly labeled demo fallback rather than presenting the fallback as an AI response.

## Features

### Citizen experience

- Email/password registration and login with an HTTP-only session cookie.
- Submit complaints with a title, description, category/area details, optional image, and consent-based location sharing.
- Hindi and English text input; optional browser speech input where supported.
- Ticket IDs, complaint detail pages, status timeline, and complaint tracking.
- Profile editing and account settings.
- In-app notifications for complaint workflow events.

### AI-assisted triage

- Gemini-powered structured complaint classification.
- Suggested category, department, urgency, summary, and explanation.
- Optional photo analysis for visible issue context.
- Text embeddings for semantic similarity and duplicate suggestions, with lexical fallback when embeddings are unavailable.
- AI results remain reviewable by people; duplicate matching suggests related reports and does not automatically merge them.
- Admin review feedback for comparing predicted categories with human-corrected categories.

### Administration and resolution

- Role-based views for Citizens, Administrators, and Department Officers.
- Assign complaints to departments and authorized officers.
- Update complaint status and add resolution notes.
- Activity timeline and audit records.
- Configurable SLA thresholds and escalation checks.
- Dashboard counts and category summaries.
- Map view for complaints with coordinates, using OpenStreetMap tiles.
- CSV export and UI theme settings.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, responsive CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL |
| Authentication | Password hashing, JWT in HTTP-only cookies, role-based authorization |
| AI | Google Gemini API for classification and image-aware requests |
| Embeddings | `gemini-embedding-001`; cosine similarity in Node.js, with lexical fallback |
| Maps | Leaflet/OpenStreetMap tiles |
| Tooling | npm, Docker Compose, GitHub Actions, Render |

## Architecture

```text
Citizen / Admin / Department Officer
                |
                v
       React + TypeScript UI
                |
        same-origin /api calls
                |
                v
      Node.js + Express API
        |        |        |
        |        |        +--> Gemini API
        |        |              - classification
        |        |              - photo analysis
        |        |              - embeddings
        |        |
        |        +----------> Authentication / authorization
        |
        v
      PostgreSQL
       - users and roles
       - complaints and coordinates
       - assignment/status history
       - notifications and audit logs
       - AI review feedback
```

## Try the live demo

Open the [live application](https://ai-citizen-grievance-assistant.onrender.com/). For a practical walkthrough:

1. Register or log in as a citizen.
2. Submit a new complaint with a clear description. Add a photo or share location only if you want to.
3. Open the complaint details and inspect the AI triage result. Confirm it is an AI result rather than a labeled fallback.
4. Sign in with an authorized administrator account to assign the complaint.
5. Sign in with the assigned department officer account to update status and resolution notes.
6. Return to the citizen view to confirm the new status appears.

The availability of a public demo depends on the hosting and database plans. Do not assume demo accounts or sample data are present on the hosted service.

## Run locally on Windows

### Requirements

- Node.js 20 or later (Node.js 22 LTS is a good choice)
- npm
- Docker Desktop with Docker Compose, or an existing PostgreSQL database
- Optional Gemini API key for live AI classification and embeddings

### 1. Get the code

```powershell
git clone https://github.com/kundankr93/ai-citizen-grievance-assistant.git
cd ai-citizen-grievance-assistant
```

If you already have the project folder, open it directly in VS Code instead.

### 2. Start PostgreSQL

From the project root:

```powershell
docker compose up -d postgres
```

### 3. Configure the backend

```powershell
Copy-Item server/.env.example server/.env
```

Open `server/.env` locally and set the required database URL and a strong, unique `JWT_SECRET`. To enable live AI, set `GEMINI_API_KEY` to a valid Google Gemini API key. Keep the `.env` file private and never commit it.

Typical configuration keys include:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` locally, `production` on the host |
| `PORT` | Express port; defaults to `4000` locally |
| `CLIENT_ORIGIN` | Allowed frontend origin for local development |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | Enable TLS when required by the hosted database |
| `JWT_SECRET` | Secret used to sign authentication tokens; use a unique secret of at least 32 characters in production |
| `COOKIE_SECURE` | Must be `true` when serving over HTTPS in production |
| `GEMINI_API_KEY` | Server-side Gemini API key; leave empty only when using fallback/demo mode |
| `GEMINI_MODEL` | Classification model; current deployment is configured for `gemini-3.5-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | Embedding model; current configuration uses `gemini-embedding-001` |
| `UPLOAD_DIR` | Private local upload directory for development |
| `SLA_HIGH_HOURS`, `SLA_MEDIUM_HOURS`, `SLA_LOW_HOURS` | Configurable SLA thresholds |

Never put `GEMINI_API_KEY` in frontend environment variables, browser code, screenshots, or GitHub.

### 4. Install, migrate, and seed the database

Open a terminal for the backend:

```powershell
cd server
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Keep this terminal running. The API is normally available at `http://localhost:4000`.

The seed command creates **local-development demo data and accounts**. Do not run the seed command against a production database unless you have reviewed the seed script and intentionally want those records.

### 5. Start the frontend

Open a second terminal from the project root:

```powershell
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### 6. Check the API

- Local application: `http://localhost:5173`
- Local health endpoint: `http://localhost:4000/api/health`
- Live health endpoint: `https://ai-citizen-grievance-assistant.onrender.com/api/health`

The health endpoint reports database status and whether AI configuration is present. `configured: true` means the key is present; it does **not** guarantee every model request will succeed. A live AI request should be tested separately.

## Development and test commands

Run these from the relevant folder.

Backend (`server/`):

```powershell
npm run typecheck
npm test
npm run build
npm run ai:check
npm audit --audit-level=high
```

Frontend (`client/`):

```powershell
npm run build
npm audit --audit-level=high
```

`npm run ai:check` makes live provider requests and consumes API quota. Run it manually when needed; it should not be required for every CI build. Unit tests cover selected classification and duplicate-similarity behaviors; they are not a substitute for full end-to-end testing.

## Deployment

The current public demo is hosted on Render:

- App: https://ai-citizen-grievance-assistant.onrender.com/
- Health: https://ai-citizen-grievance-assistant.onrender.com/api/health

The repository includes `render.yaml` and deployment notes. Configure `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, and the other production environment variables in Render's dashboard, not in source control. Ensure the web service and PostgreSQL database use a compatible region and TLS configuration.

### Production considerations

- Local uploaded photos are not durable on an ephemeral filesystem. Use private persistent object storage before relying on uploaded photos in long-term production.
- Email delivery requires an email provider; in-app notifications are separate from email.
- Configure database backups and retention appropriate for your hosting plan. Check the database provider's expiration and persistence terms, especially on free tiers.
- Keep the Gemini API key rotated if it has ever appeared in a screenshot or public output.
- Keep OpenStreetMap attribution visible and follow the tile provider's usage policy. For sustained production traffic, consider a hosted tile service with an appropriate usage plan.
- This project is a prototype and has not been independently security-audited or evaluated for use by public authorities.

## API overview

Representative routes include:

- `GET /api/health` — API/database health and AI configuration status.
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — authentication.
- `GET /api/dashboard/summary` — role-scoped dashboard summary.
- `GET /api/complaints`, `POST /api/complaints`, `GET /api/complaints/:id` — complaint list, creation, and details.
- `PATCH /api/complaints/:id/assign` — admin assignment.
- `PATCH /api/complaints/:id/status` — status update and resolution note.
- `GET /api/complaints/:id/photo` — authorized photo retrieval.
- `/api/notifications` — in-app notifications and read state.
- `/api/users` — user/profile-related operations.
- `/api/ai` — AI review/quality-related operations.

Check the route files in `server/src/routes/` for the current request schemas and response shapes.

## Security and privacy

- The backend validates requests and enforces role-based access.
- Passwords are stored as hashes; authentication uses HTTP-only cookies.
- Uploaded complaint photos are private and should be retrieved through the authorized endpoint.
- Sharing GPS coordinates requires explicit user action and browser permission.
- Do not put real secrets, personal citizen data, private uploads, `.env` files, or local backups in Git.
- AI classification and urgency are suggestions. Human staff retain responsibility for assignments and resolution decisions.

See [`SECURITY.md`](SECURITY.md), [`docs/DEPLOYMENT_RENDER.md`](docs/DEPLOYMENT_RENDER.md), and [`docs/RELEASE_TEST_PLAN.md`](docs/RELEASE_TEST_PLAN.md) for more detail.

## Roadmap

- Move uploads to durable private object storage.
- Add an email provider for verification, password reset, and optional email alerts.
- Add a scheduled worker/queue for SLA escalation rather than relying on user traffic.
- Expand the labelled Hindi/English evaluation dataset and measure precision, recall, and failure cases.
- Add integration/end-to-end tests for user roles, map/location permissions, uploads, and AI provider failures.

## Portfolio summary

**CivicConnect AI — AI-Assisted Citizen Grievance Management System.** Built a full-stack civic-tech application using React, TypeScript, Node.js, Express, and PostgreSQL, with Gemini-based complaint triage, optional image analysis, embedding-assisted duplicate suggestions, consent-based location reporting, role-based complaint assignment, resolution tracking, audit history, and notifications. Added automated type checks, unit tests, a production frontend build, and deployment configuration.

---

**Maintainer:** [kundankr93](https://github.com/kundankr93)  
**Repository:** https://github.com/kundankr93/ai-citizen-grievance-assistant  
**Live demo:** https://ai-citizen-grievance-assistant.onrender.com/

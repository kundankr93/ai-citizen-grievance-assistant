# CivicConnect AI — Citizen Grievance Assistant

A full-stack civic-tech MVP for reporting and tracking local service issues. It includes an AI-assisted triage path, a clearly labelled rule-based fallback, a possible-duplicate suggestion, role-based views, an administrator assignment workflow, officer status updates, an activity timeline, notifications, SLA escalation, and category analytics.

> **Prototype disclaimer:** This is an independent demonstration app. It is not connected to any municipal corporation or government grievance platform. Demo users and seeded complaints are fictional sample data. AI urgency/category outputs are suggestions and must be reviewed by a person. Do not use this prototype to submit emergencies or sensitive personal information.

## Stack

- Frontend: React, TypeScript, Vite, Lucide icons, responsive custom CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- Auth: bcrypt password hashes + JWT in an HttpOnly cookie
- AI: optional Google Gemini REST API for structured complaint classification and embeddings
- Duplicate suggestions: cosine similarity over stored Gemini embeddings when configured; lexical similarity fallback otherwise
- Uploads: local server storage outside the public web root, with an authenticated photo endpoint

## What works in the MVP

- Public citizen registration and email/password login
- Seeded demo accounts for citizen, administrator, and two department officers
- Citizen complaint creation with optional JPG/PNG/WEBP photo (max 5 MB)
- Hindi/English text input; browser-based Hindi speech input where supported
- Gemini classification when `GEMINI_API_KEY` works; otherwise `DEMO MODE` uses transparent keyword rules
- Optional Gemini embeddings; if unavailable, duplicate suggestions fall back to lexical similarity
- Complaint ticket IDs, timeline, assignment, status changes, resolution notes, audit logs, and in-app notifications
- Configurable SLA windows; overdue complaints are escalated when dashboard/list endpoints run
- Role checks: citizens see their own reports; officers see reports assigned to their department or user; admins manage all reports
- Health check at `/api/health`

## Requirements

Install these locally:

1. Node.js 20 or later (Node 22 recommended)
2. npm
3. Docker Desktop (recommended for local PostgreSQL) OR an existing PostgreSQL 15+ database
4. Optional: a Google Gemini API key for real LLM classification and embedding calls

## Run on Windows (PowerShell) with VS Code

### 1. Extract the ZIP

Extract `civicconnect-ai.zip`, then open the extracted `civicconnect-ai` folder in VS Code.

### 2. Start PostgreSQL

If Docker Desktop is installed, open a terminal at the project root and run:

```powershell
docker compose up -d postgres
```

Wait until PostgreSQL reports healthy. If you already have PostgreSQL, create a database named `civicconnect` and use its credentials in the environment file instead.

### 3. Configure backend environment

Copy the example file:

```powershell
Copy-Item server/.env.example server/.env
```

Open `server/.env` and set `DATABASE_URL` and a long random `JWT_SECRET`. For a local Docker database the example `DATABASE_URL` works as-is. To enable real Gemini AI, set `GEMINI_API_KEY` to your own key. Keep this file private and never commit it.

Without a Gemini key, the project works in **DEMO MODE** using rule-based classification and lexical duplicate matching. This is clearly indicated in the UI and API response. A key does not guarantee every AI call will succeed; provider errors fall back to demo classification and are logged server-side.

### 4. Install and initialize the backend

```powershell
cd server
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Keep this terminal open. API runs at `http://localhost:4000`.

### 5. Start the frontend in a second terminal

From the project root:

```powershell
cd client
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. The Vite proxy sends `/api` requests to the Express server.

### 6. Build-check both apps

In the server terminal (or a new server-directory terminal):

```powershell
npm run typecheck
npm test
npm run build
```

In the client directory:

```powershell
npm run build
```

## Demo logins

All seeded demo accounts use the password `Demo@12345`:

| Role | Email | Permissions |
|---|---|---|
| Citizen | `citizen@civicconnect.demo` | Submit and track only their own complaints |
| Administrator | `admin@civicconnect.demo` | View all complaints, assign departments/officers, change status |
| Water officer | `officer.water@civicconnect.demo` | View water-department and directly assigned complaints; update status |
| Roads officer | `officer.roads@civicconnect.demo` | View roads-department and directly assigned complaints; update status |

**Demo credentials are for local development only. Change or remove them before any internet-facing deployment.** The seed script updates these demo accounts when rerun. New registrations always receive the `citizen` role; public registration cannot create an admin or officer.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Express port | `4000` |
| `CLIENT_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | local Docker database |
| `JWT_SECRET` | Session signing secret | development fallback; override before use |
| `COOKIE_SECURE` | Secure cookie flag for HTTPS | `false` |
| `GEMINI_API_KEY` | Server-side Gemini API key | empty / demo mode |
| `GEMINI_MODEL` | Text classification model | `gemini-3.8-flash` |
| `GEMINI_EMBEDDING_MODEL` | Embedding model | `gemini-embedding-001` |
| `UPLOAD_DIR` | Private upload folder | `uploads` relative to server working directory |
| `SLA_HIGH_HOURS` | High-urgency SLA | `24` |
| `SLA_MEDIUM_HOURS` | Medium-urgency SLA | `72` |
| `SLA_LOW_HOURS` | Low-urgency SLA | `120` |

For production, set `COOKIE_SECURE=true`, serve over HTTPS, use a strong unique `JWT_SECRET`, configure suitable CORS and database network rules, add persistent private object storage, and review the application security posture. Do not expose the local upload folder as a static public directory.

## API routes

- `GET /api/health` — liveness and AI configuration status
- `POST /api/auth/register` — create a citizen account
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/dashboard/summary` — counts and category distribution for the signed-in role
- `GET /api/complaints` — role-scoped complaint list; accepts optional `status`, `category`, and `search` filters
- `POST /api/complaints` — create complaint (multipart form, optional `photo` field)
- `GET /api/complaints/:id` — complaint details and timeline, with authorization
- `GET /api/complaints/:id/photo` — authenticated photo retrieval
- `PATCH /api/complaints/:id/assign` — administrator assignment
- `PATCH /api/complaints/:id/status` — administrator/officer status update; resolution note required for `RESOLVED`
- `POST /api/complaints/:id/comments` — append a timeline note
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- `GET /api/users/officers` — administrator-only officer list

## Design notes and limitations

- This app does not create official municipal tickets or contact municipal systems.
- The rule-based fallback is not an AI model. It is explicitly labelled `DEMO MODE`.
- Duplicate detection only suggests related open reports; it does not automatically merge or reject them.
- Embeddings are stored as JSONB and cosine similarity is calculated in Node. pgvector is not required for this starter. You may add pgvector later if your hosting provider supports the extension.
- SLA escalation runs when the dashboard or complaint-list endpoints are requested; for production use, move it into a scheduled worker/queue.
- Browser speech recognition varies across browsers and may require HTTPS. Text input always remains available.
- Local file uploads are suitable only for development/demo. Use private persistent storage for production.
- AI model availability, API quota, and cost depend on the provider account. The app should not be described as running real AI if the health endpoint says demo mode or if a request fell back to rules.

## Testing

Backend unit test:

```powershell
cd server
npm test
```

The included tests cover lexical similarity, cosine similarity, and possible-duplicate suggestions. Run the full build checks shown above and test the workflow manually with each demo role before using the project in a portfolio.

## Suggested portfolio description

**CivicConnect AI — AI-Assisted Citizen Grievance Management System**
Built a role-based civic reporting MVP using React, TypeScript, Node.js, Express, and PostgreSQL. Added optional Gemini-based multilingual complaint triage, embedding-assisted duplicate suggestions with a lexical fallback, ticket tracking, department assignment, audit history, notifications, and configurable SLA escalation. Evaluated and labelled demo-mode behavior separately from real AI API responses.

## Build verification note

This source package was reviewed for file/configuration consistency and its JSON configuration files were parsed. In the generation environment, npm dependency installation timed out, so a full dependency-backed TypeScript/Vite build could not be completed here. On your machine, use the commands above; if a compiler or runtime error appears, share the complete terminal output so the specific issue can be fixed. Do not treat an unrun build as a passing test.


## Gemini API diagnostics

From the `server` folder, run `npm run ai:check` to make a real classification request and a real embedding request. The script prints the provider's HTTP status and error message if a request fails. It can consume API quota. A configured key only means the environment variable is present; it does not prove the provider call works.

The application uses `gemini-3.8-flash` by default and does not override temperature for Gemini 3.8. Provider API keys are sent in the `x-goog-api-key` header, never as a query-string parameter. Rotate any key that has been exposed in a screenshot or public artifact.

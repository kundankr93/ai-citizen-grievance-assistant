# Release Readiness Summary

CivicConnect AI is a React + TypeScript frontend with a Node.js/Express backend, PostgreSQL storage, and Gemini-based complaint analysis.

## Run locally

- Start Docker Desktop and run the root `start-windows.ps1` helper, or start PostgreSQL separately.
- Backend: from `server/`, run `npm run dev`.
- Frontend: from `client/`, run `npm run dev`.
- Health: `http://localhost:4000/api/health`.
- UI: `http://localhost:5173`.

See [`docs/RELEASE_TEST_PLAN.md`](docs/RELEASE_TEST_PLAN.md) for the actual checks to run.

## AI capabilities

Gemini analyzes complaint text and may also analyze an optional citizen-selected photo. Embeddings help compare complaint meaning; a lexical fallback can be used when the embedding provider is unavailable. AI predictions are recommendations; staff make assignment and resolution decisions. Provider failure must remain visible as a fallback, never misreported as a successful AI call.

## Operational docs

- Security: [`SECURITY.md`](SECURITY.md)
- Deployment: [`docs/DEPLOYMENT_RENDER.md`](docs/DEPLOYMENT_RENDER.md)
- Release test plan: [`docs/RELEASE_TEST_PLAN.md`](docs/RELEASE_TEST_PLAN.md)

## Demo status and limitations

This is an independent civic-tech prototype. It is not connected to official government systems. Current local photo storage may not be durable on ephemeral hosting. Email notifications require a configured provider. The included GitHub Actions workflow runs type-checks, unit tests, builds, and dependency audits; live Gemini calls are manual because they consume API quota.

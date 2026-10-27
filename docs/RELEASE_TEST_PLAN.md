# CivicConnect AI — Release Test Plan

Record the date, commit, environment (local/staging/production), test result, and any issue for each release. Do not claim a test passed unless you performed it.

## Automated checks (run locally and in CI)

From the repository root:

```powershell
cd server
npm ci
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
cd ..\client
npm ci
npm run build
npm audit --audit-level=high
```

On Windows PowerShell, the `cd ..\client` command above should be run after the backend commands finish. Ensure both `package-lock.json` files are committed so `npm ci` is reproducible.

## Local runtime checks

1. Start PostgreSQL, then run `npm run db:migrate` from `server/`. Run `npm run db:seed` only in local/demo environments.
2. Start the backend with `npm run dev` from `server/` and frontend with `npm run dev` from `client/`.
3. Open `http://localhost:5173` and check `http://localhost:4000/api/health`. Health should report `ok: true`; after the release patch it also checks DB connectivity.
4. Register a citizen; log out and back in; confirm the session persists and logout clears the cookie.
5. Submit a text-only complaint. Confirm ticket ID, row in `My complaints`, and persistence after browser refresh.
6. Submit a new complaint with a photo. Confirm safe file validation, preview/analysis, and that the record is stored.
7. Share current location only after clicking the explicit consent control and granting browser permission; verify no coordinates are attached if permission is denied.
8. Run `npm run ai:check` from `server/` manually using the configured key. Confirm classification mode is `AI` and the embedding test succeeds. This uses Gemini quota; no API key should be printed.
9. Submit an intentionally similar complaint using different wording and verify duplicate detection suggests related records without automatically merging them.
10. As an Admin, assign a complaint to an officer and change status. As the assigned Officer, add a resolution note and mark it resolved. As the Citizen, confirm the latest status appears.
11. Verify an unassigned officer cannot access another department's complaint, and one citizen cannot view or change another citizen's complaint.
12. Verify notifications appear after relevant events; mark them read and refresh to verify read state persists.
13. Test profile update, password change, theme preference, and CSV export. Confirm role and department cannot be changed from ordinary profile editing.
14. Check map pins and category/status filters for reports that have coordinates. Confirm the OpenStreetMap attribution is visible.
15. Check the AI quality-review UI and confirm feedback is stored separately from the original prediction.
16. Test empty, loading, invalid-input, network-failure, and AI-provider-failure states.
17. Test the app in a narrow/mobile viewport and a desktop viewport.

## Deployed smoke checks

- [ ] HTTPS URL loads; no browser console errors affecting core flows.
- [ ] `/api/health` returns HTTP 200 and `database: "connected"`.
- [ ] Login/register and HttpOnly secure-cookie session work over HTTPS.
- [ ] One new complaint is persisted in the hosted PostgreSQL database.
- [ ] Real Gemini classification works on a fresh test complaint; if it falls back, record the provider error instead of calling it an AI success.
- [ ] Upload persistence behavior is understood and documented.
- [ ] No secret, token, password, connection string, or private citizen data appears in Git history, browser code, console logs, or screenshots.
- [ ] Render deploy logs show successful build and a healthy service.

## Evidence for a portfolio README

Collect screenshots with fictional/demo data, the CI run link, the test results you actually observed, and one short video/GIF of the end-to-end flow. Report measured classification quality only after running a labelled dataset; AI self-reported confidence is not a substitute for measured accuracy.

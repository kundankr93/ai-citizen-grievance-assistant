# CivicConnect AI — Security Checklist

This checklist supports a portfolio/demo release; it is not a third-party security audit or a claim that the app is ready for real government use.

## Secrets and source control

- [ ] Rotate any Gemini key that was previously visible in a screenshot, message, or public file.
- [ ] Keep `server/.env`, any local `.env`, database credentials, JWT secrets, and provider keys out of Git.
- [ ] Keep only placeholders in `.env.example`; never paste real secrets into README files or screenshots.
- [ ] Check `git status --short` before every push. Uploaded photos and timestamped `.bak-*` files should be ignored.
- [ ] Configure `GEMINI_API_KEY`, `DATABASE_URL`, and production `JWT_SECRET` in the hosting provider's secret/environment settings.
- [ ] Use a unique production JWT secret (at least 32 characters). Never reuse the development fallback.

## Production configuration

- [ ] Set `NODE_ENV=production` and `COOKIE_SECURE=true`.
- [ ] Set a production database connection string and enable TLS when required by the database provider (`DATABASE_SSL=true`).
- [ ] Make sure the host serves HTTPS. Use only the hosted HTTPS URL for user testing.
- [ ] Do not run the demo seeder against production. It creates fictional accounts and records.
- [ ] Do not put the Gemini key in React/Vite variables, frontend code, or any `VITE_*` variable.
- [ ] Keep API errors sanitized; never log passwords, cookies, tokens, API keys, full connection strings, or uploaded file contents.

## Account and authorization checks

- [ ] Citizens can access only their own complaints and notifications.
- [ ] Department officers can access only complaints assigned to their department or explicitly authorized to them.
- [ ] Admin-only endpoints enforce authorization server-side (not only by hiding buttons in React).
- [ ] Passwords are hashed; JWT cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- [ ] Verify rate limits on login/register and input/file validation on complaint endpoints.

## Location and uploaded photos

- [ ] Ask for browser location permission only after the user explicitly clicks the location-sharing action.
- [ ] Let the user submit without location and clearly explain why coordinates are used.
- [ ] Limit photo file types and sizes and protect file access with authorization checks.
- [ ] Local upload storage is ephemeral on many hosting platforms. Use object storage or a suitable persistent disk for durable photo retention; do not promise durable uploads on a free ephemeral instance.
- [ ] Avoid real personal data in demo screenshots. Use fictional complaints and addresses.

## Incident response

If a secret leaks: create a replacement, deploy/test with the replacement, then revoke the old key and review provider usage/billing. If user data is exposed, disable access and investigate before restoring service.

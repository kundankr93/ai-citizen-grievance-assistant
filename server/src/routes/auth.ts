import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, clearSession, issueSession } from '../middleware/auth';
import type { AuthRequest, UserPayload, UserRole } from '../types';

const router = Router();
const credentialsSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });
const registerSchema = credentialsSchema.extend({ fullName: z.string().trim().min(2).max(100), ward: z.string().trim().max(80).optional() });

function publicUser(row: { id: string; full_name: string; email: string; role: UserRole; department: string | null; ward: string | null }): UserPayload {
  return { id: row.id, fullName: row.full_name, email: row.email, role: row.role, department: row.department, ward: row.ward };
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Enter a valid name, email, and password of at least 8 characters.', details: parsed.error.flatten() }); return; }
    const { fullName, email, password, ward } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO users (id, full_name, email, password_hash, role, ward) VALUES ($1, $2, lower($3), $4, $5, $6) RETURNING id, full_name, email, role, department, ward', [randomUUID(), fullName, email, passwordHash, 'citizen', ward ?? null]);
    const user = publicUser(result.rows[0]);
    issueSession(res, user);
    res.status(201).json({ user });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505') { res.status(409).json({ error: 'An account with this email already exists.' }); return; }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Enter a valid email and password.' }); return; }
    const result = await pool.query('SELECT id, full_name, email, password_hash, role, department, ward FROM users WHERE email = lower($1)', [parsed.data.email]);
    const row = result.rows[0] as (Record<string, unknown> & { password_hash: string }) | undefined;
    if (!row || !(await bcrypt.compare(parsed.data.password, row.password_hash))) { res.status(401).json({ error: 'Invalid email or password.' }); return; }
    const user = publicUser(row as never);
    issueSession(res, user);
    res.json({ user });
  } catch (error) { next(error); }
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  ward: z.string().trim().max(80).optional().default('')
});

router.patch('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter a valid name, email, and ward/area.' });
      return;
    }
    const userId = req.user!.id;
    const { fullName, email, ward } = parsed.data;
    const result = await pool.query(
      `UPDATE users SET full_name = $2, email = lower($3), ward = $4
       WHERE id = $1
       RETURNING id, full_name, email, role, department, ward`,
      [userId, fullName, email, ward || null]
    );
    if (!result.rows[0]) {
      clearSession(res);
      res.status(401).json({ error: 'Your account could not be found. Please sign in again.' });
      return;
    }
    const user = publicUser(result.rows[0]);
    // Re-issue the cookie so /auth/me and the UI receive the updated profile.
    issueSession(res, user);
    res.json({ user });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'That email address is already associated with another account.' });
      return;
    }
    next(error);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(10).max(128)
});

router.post('/change-password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter your current password and a new password of at least 10 characters.' });
      return;
    }
    const userId = req.user!.id;
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const row = result.rows[0] as { password_hash: string } | undefined;
    if (!row) {
      clearSession(res);
      res.status(401).json({ error: 'Your account could not be found. Please sign in again.' });
      return;
    }
    if (!(await bcrypt.compare(parsed.data.currentPassword, row.password_hash))) {
      res.status(400).json({ error: 'Your current password is incorrect.' });
      return;
    }
    if (await bcrypt.compare(parsed.data.newPassword, row.password_hash)) {
      res.status(400).json({ error: 'Choose a password different from your current password.' });
      return;
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
    // Rotate the current session token after a successful password change.
    issueSession(res, req.user!);
    res.json({ ok: true, message: 'Password changed successfully.' });
  } catch (error) { next(error); }
});

router.post('/logout', (_req, res) => { clearSession(res); res.json({ ok: true }); });
router.get('/me', authenticate, (req: AuthRequest, res) => { res.json({ user: req.user }); });

export default router;

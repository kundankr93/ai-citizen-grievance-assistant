import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);
router.get('/', async (req, res, next) => {
  try {
    const user = (req as AuthRequest).user!;
    const result = await pool.query('SELECT id, complaint_id, title, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [user.id]);
    res.json({ notifications: result.rows });
  } catch (error) { next(error); }
});
router.patch('/read-all', async (req, res, next) => {
  try {
    const user = (req as AuthRequest).user!;
    const result = await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [user.id]);
    res.json({ ok: true, updated: result.rowCount ?? 0 });
  } catch (error) { next(error); }
});
router.patch('/:id/read', async (req, res, next) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid notification ID.' }); return; }
    const result = await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.id]);
    if (!result.rowCount) { res.status(404).json({ error: 'Notification not found.' }); return; }
    res.json({ ok: true });
  } catch (error) { next(error); }
});
export default router;

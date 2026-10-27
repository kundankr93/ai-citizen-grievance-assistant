import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';
import { runEscalations } from '../services/escalation';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    await runEscalations();
    const user = (req as AuthRequest).user!;
    const where = user.role === 'citizen' ? 'WHERE citizen_id = $1' : user.role === 'officer' ? 'WHERE assigned_department = $1 OR assigned_officer_id = $2' : '';
    const args = user.role === 'citizen' ? [user.id] : user.role === 'officer' ? [user.department, user.id] : [];
    const result = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW'))::int AS pending, COUNT(*) FILTER (WHERE status IN ('ASSIGNED','IN_PROGRESS'))::int AS in_progress, COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved, COUNT(*) FILTER (WHERE escalated_at IS NOT NULL AND status NOT IN ('RESOLVED','REJECTED'))::int AS overdue FROM complaints ${where}`, args);
    const categories = await pool.query(`SELECT category, COUNT(*)::int AS count FROM complaints ${where} GROUP BY category ORDER BY count DESC`, args);
    res.json({ ...result.rows[0], byCategory: categories.rows, ai: { mode: process.env.GEMINI_API_KEY ? 'AI configured' : 'DEMO MODE' } });
  } catch (error) { next(error); }
});
export default router;

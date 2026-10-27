import { Router } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../middleware/auth';
import { pool } from '../db/pool';
import type { AuthRequest } from '../types';
import { CATEGORIES } from '../types';

const router = Router();
router.use(authenticate);
router.use(allowRoles('admin'));

const feedbackSchema = z.object({
  complaintId: z.string().uuid(),
  correctedCategory: z.enum(CATEGORIES),
  notes: z.string().trim().max(800).optional().default('')
});

router.get('/quality', async (_req, res, next) => {
  try {
    const aggregate = await pool.query(`
      SELECT COUNT(*)::int AS reviewed,
        COUNT(*) FILTER (WHERE predicted_category = corrected_category)::int AS matches,
        COUNT(*) FILTER (WHERE predicted_category <> corrected_category)::int AS corrections
      FROM ai_feedback`);
    const byCategory = await pool.query(`
      SELECT corrected_category AS category, COUNT(*)::int AS count
      FROM ai_feedback GROUP BY corrected_category ORDER BY count DESC`);
    const recent = await pool.query(`
      SELECT f.id, f.complaint_id, f.predicted_category, f.corrected_category, f.notes,
             f.created_at, c.ticket_id, c.title
      FROM ai_feedback f JOIN complaints c ON c.id = f.complaint_id
      ORDER BY f.updated_at DESC LIMIT 20`);
    const row = aggregate.rows[0] as { reviewed: number; matches: number; corrections: number };
    res.json({
      reviewed: row.reviewed,
      matches: row.matches,
      corrections: row.corrections,
      agreementRate: row.reviewed ? Math.round((row.matches / row.reviewed) * 100) : null,
      byCategory: byCategory.rows,
      recent: recent.rows
    });
  } catch (error) { next(error); }
});

router.post('/quality/feedback', async (req, res, next) => {
  try {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Choose a complaint and a valid corrected category.' }); return; }
    const user = (req as AuthRequest).user!;
    const complaintResult = await pool.query('SELECT id, ticket_id, category, ai_mode FROM complaints WHERE id = $1', [parsed.data.complaintId]);
    const complaint = complaintResult.rows[0] as { id: string; ticket_id: string; category: string; ai_mode: string } | undefined;
    if (!complaint) { res.status(404).json({ error: 'Complaint not found.' }); return; }
    await pool.query(`
      INSERT INTO ai_feedback (complaint_id, reviewer_user_id, predicted_category, corrected_category, notes)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (complaint_id) DO UPDATE SET
        reviewer_user_id = EXCLUDED.reviewer_user_id,
        predicted_category = EXCLUDED.predicted_category,
        corrected_category = EXCLUDED.corrected_category,
        notes = EXCLUDED.notes,
        updated_at = NOW()`,
      [complaint.id, user.id, complaint.category, parsed.data.correctedCategory, parsed.data.notes]);
    await pool.query('INSERT INTO audit_logs (actor_user_id, complaint_id, action, details) VALUES ($1,$2,$3,$4)', [user.id, complaint.id, 'AI_CLASSIFICATION_REVIEWED', JSON.stringify({ predictedCategory: complaint.category, correctedCategory: parsed.data.correctedCategory, aiMode: complaint.ai_mode })]);
    res.status(201).json({ ok: true, ticketId: complaint.ticket_id, predictedCategory: complaint.category, correctedCategory: parsed.data.correctedCategory });
  } catch (error) { next(error); }
});

export default router;

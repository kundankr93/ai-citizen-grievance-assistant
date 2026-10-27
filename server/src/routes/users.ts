import { Router } from 'express';
import { pool } from '../db/pool';
import { allowRoles, authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate, allowRoles('admin'));
router.get('/officers', async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT id, full_name AS \"fullName\", email, department, ward FROM users WHERE role = 'officer' ORDER BY full_name");
    res.json({ officers: result.rows });
  } catch (error) { next(error); }
});
export default router;

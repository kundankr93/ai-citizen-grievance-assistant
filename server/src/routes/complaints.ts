import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env';
import { pool } from '../db/pool';
import { allowRoles, authenticate } from '../middleware/auth';
import type { AuthRequest, ComplaintStatus } from '../types';
import { STATUSES } from '../types';
import { classifyComplaint, createEmbedding } from '../services/ai';
import { findPossibleDuplicate, type DuplicateCandidate } from '../services/duplicates';

const router = Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(file.mimetype)) { callback(new Error('Only JPG, PNG, and WEBP photos are allowed.')); return; }
  callback(null, true);
} });
const createSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(5000),
  area: z.string().trim().min(2).max(120),
  ward: z.string().trim().max(80).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional()
});
const statusSchema = z.object({ status: z.enum(STATUSES), note: z.string().trim().max(1000).optional().default('') });
const assignSchema = z.object({ department: z.string().trim().min(2).max(100), officerId: z.string().uuid().nullable().optional() });
const commentSchema = z.object({ message: z.string().trim().min(2).max(1200) });

async function getComplaint(id: string) {
  const result = await pool.query(
    `SELECT c.*, u.full_name AS citizen_name, o.full_name AS officer_name
     FROM complaints c JOIN users u ON u.id = c.citizen_id
     LEFT JOIN users o ON o.id = c.assigned_officer_id WHERE c.id = $1`, [id]
  );
  return result.rows[0] as (Record<string, any> & { id: string; citizen_id: string; assigned_officer_id: string | null; assigned_department: string | null; photo_filename: string | null }) | undefined;
}
function canAccess(user: NonNullable<AuthRequest['user']>, complaint: NonNullable<Awaited<ReturnType<typeof getComplaint>>>): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'citizen') return complaint.citizen_id === user.id;
  return complaint.assigned_officer_id === user.id || (Boolean(user.department) && complaint.assigned_department === user.department);
}
function safeComplaint(row: Record<string, any>) {
  const { embedding_json, photo_filename, password_hash, ...safe } = row;
  return { ...safe, hasPhoto: Boolean(photo_filename) };
}

router.get('/', async (req, res, next) => {
  try {
    const user = (req as AuthRequest).user!;
    const params: unknown[] = [];
    let where = '';
    if (user.role === 'citizen') { params.push(user.id); where = 'WHERE c.citizen_id = $1'; }
    else if (user.role === 'officer') { params.push(user.department, user.id); where = 'WHERE (c.assigned_department = $1 OR c.assigned_officer_id = $2)'; }
    const addFilter = (column: string, value: unknown) => {
      if (typeof value !== 'string' || !value.trim()) return;
      params.push(value.trim());
      where += `${where ? ' AND ' : 'WHERE '}${column} = $${params.length}`;
    };
    addFilter('c.status', req.query.status);
    addFilter('c.category', req.query.category);
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      params.push(`%${req.query.search.trim().slice(0, 100)}%`);
      where += `${where ? ' AND ' : 'WHERE '}(c.ticket_id ILIKE $${params.length} OR c.title ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.area ILIKE $${params.length})`;
    }
    params.push(100);
    const result = await pool.query(
      `SELECT c.*, u.full_name AS citizen_name, o.full_name AS officer_name
       FROM complaints c JOIN users u ON u.id = c.citizen_id LEFT JOIN users o ON o.id = c.assigned_officer_id
       ${where} ORDER BY c.created_at DESC LIMIT $${params.length}`, params
    );
    res.json({ complaints: result.rows.map(safeComplaint) });
  } catch (error) { next(error); }
});

router.post('/', allowRoles('citizen'), (req, res, next) => {
  upload.single('photo')(req, res, (uploadError) => {
    if (uploadError) { res.status(400).json({ error: uploadError.message }); return; }
    void createComplaint(req as AuthRequest, res).catch(next);
  });
});

async function createComplaint(req: AuthRequest, res: import('express').Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Add a title, a clear description, and the affected area.', details: parsed.error.flatten() }); return; }
  const user = req.user!;
  const { title, description, area, ward, address, latitude, longitude } = parsed.data;
  if ((latitude === undefined) !== (longitude === undefined)) { res.status(400).json({ error: 'Share both latitude and longitude, or leave location sharing off.' }); return; }
  const classification = await classifyComplaint(`${title}\n${description}`, area, req.file ? { mimeType: req.file.mimetype, base64: req.file.buffer.toString('base64') } : undefined);
  const embedding = await createEmbedding(`${title}. ${description}. Area: ${area}. Ward: ${ward}`);
  const existing = await pool.query(
    `SELECT id, ticket_id, title, category, area, status, description, embedding_json
     FROM complaints WHERE status NOT IN ('RESOLVED','REJECTED') ORDER BY created_at DESC LIMIT 150`
  );
  const candidates: DuplicateCandidate[] = existing.rows.map((row) => ({ ...row, embedding_json: Array.isArray(row.embedding_json) ? row.embedding_json as number[] : null }));
  const duplicate = findPossibleDuplicate(`${title}. ${description}`, classification.category, area, embedding, candidates);
  const id = randomUUID();
  const ticketId = `CIV-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  let photoFilename: string | null = null;
  if (req.file) {
    const extension = req.file.mimetype === 'image/png' ? '.png' : req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    photoFilename = `${randomUUID()}${extension}`;
    const uploadDir = resolve(process.cwd(), env.uploadDir);
    await mkdir(uploadDir, { recursive: true });
    // The file is stored outside the public web root and can only be fetched through an authorized route.
    await writeFile(join(uploadDir, photoFilename), req.file.buffer, { flag: 'wx' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO complaints (id, ticket_id, title, description, summary, category, suggested_department, urgency, ai_confidence, ai_mode, ai_reasoning, photo_analysis, mentioned_location, area, ward, address, latitude, longitude, citizen_id, possible_duplicate_of, duplicate_score, embedding_json, photo_filename)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [id, ticketId, title, description, classification.summary, classification.category, classification.suggestedDepartment, classification.urgency, classification.confidence, classification.mode, classification.reasoning, classification.photoFindings, classification.mentionedLocation, area, ward || null, address || null, latitude ?? null, longitude ?? null, user.id, duplicate?.id ?? null, duplicate?.similarity ?? null, embedding ? JSON.stringify(embedding) : null, photoFilename]
    );
    await client.query("INSERT INTO complaint_updates (complaint_id, actor_user_id, event_type, new_status, message) VALUES ($1,$2,'SUBMITTED','SUBMITTED',$3)", [id, user.id, 'Complaint submitted by citizen. AI suggestion: ' + classification.category + ' / ' + classification.suggestedDepartment + '.']);
    await client.query('INSERT INTO audit_logs (actor_user_id, complaint_id, action, details) VALUES ($1,$2,$3,$4)', [user.id, id, 'COMPLAINT_CREATED', JSON.stringify({ ticketId, aiMode: classification.mode, possibleDuplicate: duplicate?.ticket_id ?? null })]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (photoFilename) await import('node:fs/promises').then((fs) => fs.unlink(join(resolve(process.cwd(), env.uploadDir), photoFilename!)).catch(() => undefined));
    throw error;
  } finally { client.release(); }
  const complaint = await getComplaint(id);
  res.status(201).json({ complaint: safeComplaint(complaint!), ai: { mode: classification.mode, category: classification.category, suggestedDepartment: classification.suggestedDepartment, urgency: classification.urgency, confidence: classification.confidence, reasoning: classification.reasoning, missingInformation: classification.missingInformation, photoFindings: classification.photoFindings }, possibleDuplicate: duplicate ? { ticketId: duplicate.ticket_id, category: duplicate.category, area: duplicate.area, status: duplicate.status, similarity: Number(duplicate.similarity.toFixed(3)), method: duplicate.matchMethod } : null });
}

router.get('/:id', async (req, res, next) => {
  try {
    const complaint = await getComplaint(req.params.id);
    if (!complaint) { res.status(404).json({ error: 'Complaint not found.' }); return; }
    if (!canAccess((req as AuthRequest).user!, complaint)) { res.status(403).json({ error: 'You cannot access this complaint.' }); return; }
    const updates = await pool.query('SELECT cu.id, cu.event_type, cu.old_status, cu.new_status, cu.message, cu.created_at, u.full_name AS actor_name FROM complaint_updates cu LEFT JOIN users u ON u.id = cu.actor_user_id WHERE cu.complaint_id = $1 ORDER BY cu.created_at ASC', [complaint.id]);
    res.json({ complaint: safeComplaint(complaint), updates: updates.rows });
  } catch (error) { next(error); }
});

router.get('/:id/photo', async (req, res, next) => {
  try {
    const complaint = await getComplaint(req.params.id);
    if (!complaint || !complaint.photo_filename) { res.status(404).json({ error: 'Photo not found.' }); return; }
    if (!canAccess((req as AuthRequest).user!, complaint)) { res.status(403).json({ error: 'You cannot access this photo.' }); return; }
    const uploadRoot = resolve(process.cwd(), env.uploadDir);
    const filePath = resolve(uploadRoot, complaint.photo_filename);
    const relativePath = relative(uploadRoot, filePath);
    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) { res.status(400).json({ error: 'Invalid file path.' }); return; }
    res.sendFile(filePath);
  } catch (error) { next(error); }
});

router.patch('/:id/assign', allowRoles('admin'), async (req, res, next) => {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Choose a valid department and officer.' }); return; }
    const complaint = await getComplaint(req.params.id);
    if (!complaint) { res.status(404).json({ error: 'Complaint not found.' }); return; }
    const { department, officerId } = parsed.data;
    if (officerId) {
      const officer = await pool.query("SELECT id, department FROM users WHERE id = $1 AND role = 'officer'", [officerId]);
      if (!officer.rowCount) { res.status(400).json({ error: 'Selected user is not a department officer.' }); return; }
      if (officer.rows[0].department && officer.rows[0].department !== department) { res.status(400).json({ error: 'Officer department does not match assignment department.' }); return; }
    }
    const newStatus = complaint.status === 'SUBMITTED' || complaint.status === 'UNDER_REVIEW' ? 'ASSIGNED' : complaint.status;
    await pool.query('UPDATE complaints SET assigned_department = $1, assigned_officer_id = $2, status = $3, updated_at = NOW() WHERE id = $4', [department, officerId ?? null, newStatus, complaint.id]);
    await pool.query("INSERT INTO complaint_updates (complaint_id, actor_user_id, event_type, old_status, new_status, message) VALUES ($1,$2,'ASSIGNED',$3,$4,$5)", [complaint.id, (req as AuthRequest).user!.id, complaint.status, newStatus, `Assigned to ${department}${officerId ? ' and an officer' : ''}.`]);
    await pool.query('INSERT INTO audit_logs (actor_user_id, complaint_id, action, details) VALUES ($1,$2,$3,$4)', [(req as AuthRequest).user!.id, complaint.id, 'COMPLAINT_ASSIGNED', JSON.stringify({ department, officerId: officerId ?? null })]);
    await pool.query('INSERT INTO notifications (user_id, complaint_id, title, message) VALUES ($1,$2,$3,$4)', [complaint.citizen_id, complaint.id, 'Complaint assigned', `${complaint.ticket_id} has been assigned to ${department}.`]);
    if (officerId) await pool.query('INSERT INTO notifications (user_id, complaint_id, title, message) VALUES ($1,$2,$3,$4)', [officerId, complaint.id, 'New complaint assigned', `${complaint.ticket_id} has been assigned to you.`]);
    res.json({ complaint: safeComplaint((await getComplaint(complaint.id))!) });
  } catch (error) { next(error); }
});

router.patch('/:id/status', allowRoles('admin', 'officer'), async (req, res, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Choose a valid status.' }); return; }
    const user = (req as AuthRequest).user!;
    const complaint = await getComplaint(req.params.id);
    if (!complaint) { res.status(404).json({ error: 'Complaint not found.' }); return; }
    if (!canAccess(user, complaint)) { res.status(403).json({ error: 'This complaint is not assigned to your department.' }); return; }
    const { status, note } = parsed.data;
    if (status === 'RESOLVED' && note.length < 5) { res.status(400).json({ error: 'Add a resolution note of at least 5 characters before resolving.' }); return; }
    const resolvedAt = status === 'RESOLVED' ? new Date() : null;
    await pool.query('UPDATE complaints SET status = $1, resolution_note = CASE WHEN $1 = \'RESOLVED\' THEN $2 ELSE resolution_note END, resolved_at = $3, updated_at = NOW() WHERE id = $4', [status, note || null, resolvedAt, complaint.id]);
    await pool.query('INSERT INTO complaint_updates (complaint_id, actor_user_id, event_type, old_status, new_status, message) VALUES ($1,$2,\'STATUS_CHANGED\',$3,$4,$5)', [complaint.id, user.id, complaint.status, status, note || `Status changed to ${status.replaceAll('_', ' ').toLowerCase()}.`]);
    await pool.query('INSERT INTO audit_logs (actor_user_id, complaint_id, action, details) VALUES ($1,$2,$3,$4)', [user.id, complaint.id, 'STATUS_CHANGED', JSON.stringify({ oldStatus: complaint.status, newStatus: status })]);
    await pool.query('INSERT INTO notifications (user_id, complaint_id, title, message) VALUES ($1,$2,$3,$4)', [complaint.citizen_id, complaint.id, 'Complaint status updated', `${complaint.ticket_id}: ${status.replaceAll('_', ' ')}.`]);
    res.json({ complaint: safeComplaint((await getComplaint(complaint.id))!) });
  } catch (error) { next(error); }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Enter a message of at least 2 characters.' }); return; }
    const user = (req as AuthRequest).user!;
    const complaint = await getComplaint(req.params.id);
    if (!complaint) { res.status(404).json({ error: 'Complaint not found.' }); return; }
    if (!canAccess(user, complaint)) { res.status(403).json({ error: 'You cannot comment on this complaint.' }); return; }
    await pool.query("INSERT INTO complaint_updates (complaint_id, actor_user_id, event_type, message) VALUES ($1,$2,'COMMENT',$3)", [complaint.id, user.id, parsed.data.message]);
    await pool.query('INSERT INTO audit_logs (actor_user_id, complaint_id, action, details) VALUES ($1,$2,$3,$4)', [user.id, complaint.id, 'COMMENT_ADDED', JSON.stringify({ messageLength: parsed.data.message.length })]);
    if (user.role === 'citizen') {
      if (complaint.assigned_officer_id) await pool.query('INSERT INTO notifications (user_id, complaint_id, title, message) VALUES ($1,$2,$3,$4)', [complaint.assigned_officer_id, complaint.id, 'Citizen added an update', `${complaint.ticket_id}: a citizen added a new update.`]);
    } else {
      await pool.query('INSERT INTO notifications (user_id, complaint_id, title, message) VALUES ($1,$2,$3,$4)', [complaint.citizen_id, complaint.id, 'Complaint update added', `${complaint.ticket_id}: a staff member added an update.`]);
    }
    res.status(201).json({ ok: true });
  } catch (error) { next(error); }
});

export default router;

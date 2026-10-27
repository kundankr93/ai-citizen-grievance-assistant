import { env } from '../config/env';
import { pool } from '../db/pool';

export async function runEscalations(): Promise<void> {
  const result = await pool.query(
    `SELECT id, ticket_id, citizen_id, assigned_officer_id, assigned_department, urgency
     FROM complaints
     WHERE status NOT IN ('RESOLVED', 'REJECTED') AND escalated_at IS NULL
       AND created_at < NOW() - (CASE urgency WHEN 'Critical' THEN 6 WHEN 'High' THEN $1 WHEN 'Medium' THEN $2 ELSE $3 END * INTERVAL '1 hour')
     LIMIT 100`,
    [Math.max(1, env.slaHighHours), Math.max(1, env.slaMediumHours), Math.max(1, env.slaLowHours)]
  );
  for (const complaint of result.rows) {
    const updated = await pool.query('UPDATE complaints SET escalated_at = NOW(), updated_at = NOW() WHERE id = $1 AND escalated_at IS NULL RETURNING id', [complaint.id]);
    if (!updated.rowCount) continue;
    await pool.query("INSERT INTO complaint_updates (complaint_id, event_type, message) VALUES ($1, 'SLA_ESCALATED', $2)", [complaint.id, `SLA escalation triggered for ${complaint.ticket_id}; the complaint is still unresolved.`]);
    const recipients = new Set<string>([complaint.citizen_id, ...(complaint.assigned_officer_id ? [complaint.assigned_officer_id] : [])]);
    for (const userId of recipients) {
      await pool.query('INSERT INTO notifications (user_id, complaint_id, title, message) VALUES ($1, $2, $3, $4)', [userId, complaint.id, 'Complaint needs attention', `${complaint.ticket_id} has exceeded its configured response window.`]);
    }
  }
}

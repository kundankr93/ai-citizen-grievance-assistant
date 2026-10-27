import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function seed() {
  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  const people = [
    { id: '10000000-0000-4000-8000-000000000001', fullName: 'Demo Administrator', email: 'admin@civicconnect.demo', role: 'admin', department: null, ward: null },
    { id: '10000000-0000-4000-8000-000000000002', fullName: 'Water Department Officer', email: 'officer.water@civicconnect.demo', role: 'officer', department: 'Water Department', ward: null },
    { id: '10000000-0000-4000-8000-000000000003', fullName: 'Demo Citizen', email: 'citizen@civicconnect.demo', role: 'citizen', department: null, ward: 'Ward 12' },
    { id: '10000000-0000-4000-8000-000000000004', fullName: 'Roads Department Officer', email: 'officer.roads@civicconnect.demo', role: 'officer', department: 'Roads Department', ward: null }
  ];
  for (const person of people) {
    await pool.query(
      `INSERT INTO users (id, full_name, email, password_hash, role, department, ward)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, department = EXCLUDED.department, ward = EXCLUDED.ward`,
      [person.id, person.fullName, person.email, passwordHash, person.role, person.department, person.ward]
    );
  }
  const citizen = people[2];
  const examples = [
    { ticket: 'CIV-DEMO-1001', title: 'Water supply interrupted', description: 'Water supply has been unavailable since yesterday morning in our area.', category: 'Water Supply', department: 'Water Department', urgency: 'High', area: 'Shankar Nagar', ward: 'Ward 12', status: 'IN_PROGRESS' },
    { ticket: 'CIV-DEMO-1002', title: 'Pothole near the main crossing', description: 'A large pothole near the main crossing is causing traffic problems.', category: 'Roads and Potholes', department: 'Roads Department', urgency: 'Medium', area: 'Telibandha', ward: 'Ward 8', status: 'SUBMITTED' },
    { ticket: 'CIV-DEMO-1003', title: 'Streetlight not working', description: 'The streetlight close to the community park has not worked for four nights.', category: 'Streetlights', department: 'Electrical / Streetlight Department', urgency: 'Medium', area: 'Shankar Nagar', ward: 'Ward 12', status: 'RESOLVED' }
  ];
  for (const item of examples) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO complaints (id, ticket_id, title, description, summary, category, suggested_department, urgency, ai_confidence, ai_mode, ai_reasoning, mentioned_location, area, ward, status, citizen_id, assigned_department, created_at, updated_at, resolved_at, resolution_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0.72,'DEMO','Seeded example data; not an actual civic report.',$9,$10,$11,$12,$13,$7,NOW() - INTERVAL '2 days',NOW(),CASE WHEN $12='RESOLVED' THEN NOW() ELSE NULL END,CASE WHEN $12='RESOLVED' THEN 'Demo resolution note: streetlight repair recorded.' ELSE NULL END)
       ON CONFLICT (ticket_id) DO NOTHING`,
      [id, item.ticket, item.title, item.description, item.description, item.category, item.department, item.urgency, item.area, item.area, item.ward, item.status, citizen.id]
    );
  }
  console.log('✅ Demo users and complaints seeded. All records are sample data, not official government records.');
  console.log('Demo password for all seeded accounts: Demo@12345');
  console.log('Admin: admin@civicconnect.demo');
  console.log('Water Officer: officer.water@civicconnect.demo');
  console.log('Roads Officer: officer.roads@civicconnect.demo');
  console.log('Citizen: citizen@civicconnect.demo');
  await pool.end();
}

seed().catch(async (error: unknown) => {
  console.error('Seeding failed:', error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});

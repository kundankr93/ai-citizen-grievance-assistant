CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'officer', 'admin')) DEFAULT 'citizen',
  department TEXT,
  ward TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  suggested_department TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
  ai_confidence NUMERIC(4,3),
  ai_mode TEXT NOT NULL DEFAULT 'DEMO',
  ai_reasoning TEXT,
  mentioned_location TEXT,
  area TEXT NOT NULL,
  ward TEXT,
  address TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'SUBMITTED',
  citizen_id UUID NOT NULL REFERENCES users(id),
  assigned_department TEXT,
  assigned_officer_id UUID REFERENCES users(id),
  possible_duplicate_of UUID REFERENCES complaints(id),
  duplicate_score NUMERIC(5,4),
  embedding_json JSONB,
  photo_filename TEXT,
  resolution_note TEXT,
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS complaints_citizen_idx ON complaints(citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status, created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_department_idx ON complaints(assigned_department, status);
CREATE INDEX IF NOT EXISTS complaints_area_idx ON complaints(area);

CREATE TABLE IF NOT EXISTS complaint_updates (
  id BIGSERIAL PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS complaint_updates_complaint_idx ON complaint_updates(complaint_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id),
  complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CivicConnect AI feature upgrade: additive, non-destructive columns for vision and opt-in GPS.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS photo_analysis TEXT;
CREATE INDEX IF NOT EXISTS complaints_location_idx ON complaints(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Human-reviewed labels are stored separately so model output remains auditable.
CREATE TABLE IF NOT EXISTS ai_feedback (
  id BIGSERIAL PRIMARY KEY,
  complaint_id UUID NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES users(id),
  predicted_category TEXT NOT NULL,
  corrected_category TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_feedback_reviewer_idx ON ai_feedback(reviewer_user_id, created_at DESC);

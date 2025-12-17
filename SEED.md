
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Copy ALL text in this file.
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Paste the text and click "RUN".
-- ==============================================================================

-- 1. TABLES SETUP
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    notes JSONB DEFAULT '[]'::jsonb,
    photo_url TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    assigned_to TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    device JSONB NOT NULL,
    store TEXT NOT NULL,
    amount_estimate NUMERIC NOT NULL,
    warranty TEXT NOT NULL,
    bill_number TEXT,
    scheduled_date TEXT,
    charger_status TEXT,
    hold_reason TEXT,
    internal_progress_reason TEXT,
    internal_progress_note TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL,
    assigned_to TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    action TEXT NOT NULL,
    "user" TEXT NOT NULL,
    details TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    team_members JSONB,
    stores JSONB,
    hold_reasons JSONB,
    priorities JSONB,
    statuses JSONB,
    past_due_days JSONB,
    device_types JSONB,
    internal_progress_reasons JSONB,
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- 2. SECURITY POLICIES (ROW LEVEL SECURITY)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all access for this demo app (adjust for production)
DROP POLICY IF EXISTS "Enable all access for customers" ON customers;
CREATE POLICY "Enable all access for customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tickets" ON tickets;
CREATE POLICY "Enable all access for tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tasks" ON tasks;
CREATE POLICY "Enable all access for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for audit_log" ON audit_log;
CREATE POLICY "Enable all access for audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for settings" ON settings;
CREATE POLICY "Enable all access for settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- 3. ENABLE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  END IF;
END
$$;

-- 4. INITIAL SEED
INSERT INTO settings (id, team_members, stores, hold_reasons, priorities, statuses, past_due_days, device_types, internal_progress_reasons) VALUES
(1, 
  '[
    {"id": "TM-1", "name": "System Admin", "details": "Administrator", "experience": 10, "photoUrl": "", "role": "ADMIN", "email": "admin@infofix.com", "password": "password123"},
    {"id": "TM-2", "name": "Sarah Manager", "details": "Service Manager", "experience": 8, "photoUrl": "", "role": "MANAGEMENT", "email": "manager@infofix.com", "password": "password123"},
    {"id": "TM-3", "name": "Mike Tech", "details": "Senior Technician", "experience": 5, "photoUrl": "", "role": "TECHNICIAN", "email": "tech@infofix.com", "password": "password123"}
  ]',
  '["Main Branch", "Downtown"]',
  '["Waiting for Parts", "Customer Approval Pending", "Technician Unavailable"]',
  '["HIGH", "MEDIUM", "LOW"]',
  '["NEW", "Open", "In Progress", "Internal Progress", "HOLD", "Pending Approval", "Rejected", "SERVICE DONE", "Resolved"]',
  '{"HIGH": 3, "MEDIUM": 7, "LOW": 14}',
  '["LAPTOP", "DESKTOP", "ACCESSORY", "CCTV", "BRAND SERVICE", "OTHER"]',
  '["Chip Level Work", "Software Installation", "Testing Phase", "Waiting for Approval"]'
)
ON CONFLICT (id) DO NOTHING;

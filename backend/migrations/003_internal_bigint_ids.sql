-- Coordinated deployment: stop all older backend processes before this migration.
-- Database.initialize runs this entire file and its migration marker in one transaction.
SET LOCAL lock_timeout = '5s';
LOCK TABLE users, clients, warehouses, projects, memberships, sessions,
  project_settings, project_warehouses, project_audit IN ACCESS EXCLUSIVE MODE;

ALTER TABLE memberships DROP CONSTRAINT memberships_user_id_fkey,
  DROP CONSTRAINT memberships_project_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT sessions_user_id_fkey;
ALTER TABLE projects DROP CONSTRAINT projects_client_id_fkey,
  DROP CONSTRAINT projects_updated_by_fkey;
ALTER TABLE project_settings DROP CONSTRAINT project_settings_project_id_fkey;
ALTER TABLE project_warehouses DROP CONSTRAINT project_warehouses_project_id_fkey,
  DROP CONSTRAINT project_warehouses_warehouse_id_fkey;
ALTER TABLE project_audit DROP CONSTRAINT project_audit_project_id_fkey,
  DROP CONSTRAINT project_audit_actor_id_fkey;

-- Keep every externally visible identity intact. New public IDs are time-ordered UUIDv7.
ALTER TABLE users RENAME COLUMN id TO public_id;
ALTER TABLE clients RENAME COLUMN id TO public_id;
ALTER TABLE warehouses RENAME COLUMN id TO public_id;
ALTER TABLE projects RENAME COLUMN id TO public_id;
ALTER TABLE users ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY,
  DROP CONSTRAINT users_pkey, ADD PRIMARY KEY(id), ADD UNIQUE(public_id),
  ALTER COLUMN public_id SET DEFAULT uuidv7()::text;
ALTER TABLE clients ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY,
  DROP CONSTRAINT clients_pkey, ADD PRIMARY KEY(id), ADD UNIQUE(public_id),
  ALTER COLUMN public_id SET DEFAULT uuidv7()::text;
ALTER TABLE warehouses ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY,
  DROP CONSTRAINT warehouses_pkey, ADD PRIMARY KEY(id), ADD UNIQUE(public_id),
  ALTER COLUMN public_id SET DEFAULT uuidv7()::text;
ALTER TABLE projects ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY,
  DROP CONSTRAINT projects_pkey, ADD PRIMARY KEY(id), ADD UNIQUE(public_id),
  ALTER COLUMN public_id SET DEFAULT uuidv7()::text;

ALTER TABLE projects ADD COLUMN client_key bigint, ADD COLUMN updater_key bigint;
UPDATE projects p SET client_key=c.id FROM clients c WHERE c.public_id=p.client_id;
UPDATE projects p SET updater_key=u.id FROM users u WHERE u.public_id=p.updated_by;
-- A missing nullable updater must not silently become NULL.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE updated_by IS NOT NULL AND updater_key IS NULL) THEN
    RAISE EXCEPTION 'Cannot resolve a project updater during ID migration';
  END IF;
END $$;
ALTER TABLE projects ALTER COLUMN client_key SET NOT NULL,
  DROP COLUMN client_id, DROP COLUMN updated_by;
ALTER TABLE projects RENAME COLUMN client_key TO client_id;
ALTER TABLE projects RENAME COLUMN updater_key TO updated_by;
ALTER TABLE projects ADD FOREIGN KEY(client_id) REFERENCES clients(id),
  ADD FOREIGN KEY(updated_by) REFERENCES users(id);

ALTER TABLE memberships ADD COLUMN user_key bigint, ADD COLUMN project_key bigint;
UPDATE memberships m SET user_key=u.id FROM users u WHERE u.public_id=m.user_id;
UPDATE memberships m SET project_key=p.id FROM projects p WHERE p.public_id=m.project_id;
ALTER TABLE memberships ALTER COLUMN user_key SET NOT NULL, ALTER COLUMN project_key SET NOT NULL,
  DROP COLUMN user_id, DROP COLUMN project_id;
ALTER TABLE memberships RENAME COLUMN user_key TO user_id;
ALTER TABLE memberships RENAME COLUMN project_key TO project_id;
ALTER TABLE memberships ADD PRIMARY KEY(user_id,project_id),
  ADD FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE sessions ADD COLUMN user_key bigint;
UPDATE sessions s SET user_key=u.id FROM users u WHERE u.public_id=s.user_id;
ALTER TABLE sessions ALTER COLUMN user_key SET NOT NULL, DROP COLUMN user_id;
ALTER TABLE sessions RENAME COLUMN user_key TO user_id;
ALTER TABLE sessions ADD FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE project_settings ADD COLUMN project_key bigint;
UPDATE project_settings s SET project_key=p.id FROM projects p WHERE p.public_id=s.project_id;
ALTER TABLE project_settings ALTER COLUMN project_key SET NOT NULL, DROP COLUMN project_id;
ALTER TABLE project_settings RENAME COLUMN project_key TO project_id;
ALTER TABLE project_settings ADD PRIMARY KEY(project_id),
  ADD FOREIGN KEY(project_id) REFERENCES projects(id);

ALTER TABLE project_warehouses ADD COLUMN project_key bigint, ADD COLUMN warehouse_key bigint;
UPDATE project_warehouses pw SET project_key=p.id FROM projects p WHERE p.public_id=pw.project_id;
UPDATE project_warehouses pw SET warehouse_key=w.id FROM warehouses w WHERE w.public_id=pw.warehouse_id;
ALTER TABLE project_warehouses ALTER COLUMN project_key SET NOT NULL, ALTER COLUMN warehouse_key SET NOT NULL,
  DROP COLUMN project_id, DROP COLUMN warehouse_id;
ALTER TABLE project_warehouses RENAME COLUMN project_key TO project_id;
ALTER TABLE project_warehouses RENAME COLUMN warehouse_key TO warehouse_id;
ALTER TABLE project_warehouses ADD PRIMARY KEY(project_id,warehouse_id),
  ADD FOREIGN KEY(project_id) REFERENCES projects(id),
  ADD FOREIGN KEY(warehouse_id) REFERENCES warehouses(id);
CREATE UNIQUE INDEX project_single_default_idx ON project_warehouses(project_id) WHERE is_default;

ALTER TABLE project_audit ADD COLUMN project_key bigint, ADD COLUMN actor_key bigint;
UPDATE project_audit a SET project_key=p.id FROM projects p WHERE p.public_id=a.project_id;
UPDATE project_audit a SET actor_key=u.id FROM users u WHERE u.public_id=a.actor_id;
ALTER TABLE project_audit ALTER COLUMN project_key SET NOT NULL, ALTER COLUMN actor_key SET NOT NULL,
  DROP COLUMN project_id, DROP COLUMN actor_id;
ALTER TABLE project_audit RENAME COLUMN project_key TO project_id;
ALTER TABLE project_audit RENAME COLUMN actor_key TO actor_id;
ALTER TABLE project_audit ADD FOREIGN KEY(project_id) REFERENCES projects(id),
  ADD FOREIGN KEY(actor_id) REFERENCES users(id);
CREATE INDEX project_audit_history_idx ON project_audit(project_id,id DESC);

-- Reverse FK access paths not already covered by a leading primary-key column.
CREATE INDEX memberships_project_user_idx ON memberships(project_id,user_id);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX project_warehouses_warehouse_idx ON project_warehouses(warehouse_id);
CREATE INDEX projects_client_idx ON projects(client_id);
CREATE INDEX projects_updated_by_idx ON projects(updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX project_audit_actor_idx ON project_audit(actor_id);
ANALYZE users, clients, warehouses, projects, memberships, sessions,
  project_settings, project_warehouses, project_audit;

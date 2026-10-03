CREATE TABLE clients (id text PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL);
CREATE TABLE warehouses (id text PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL);
INSERT INTO clients(id,code,name)
SELECT 'legacy-' || md5(client), 'CLIENT-' || row_number() OVER (ORDER BY client), client FROM (SELECT DISTINCT client FROM projects) labels;
ALTER TABLE projects ADD COLUMN client_id text REFERENCES clients(id);
UPDATE projects SET client_id='legacy-' || md5(client);
ALTER TABLE projects ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE projects ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive'));
ALTER TABLE projects ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE projects ADD COLUMN updated_by text REFERENCES users(id);
ALTER TABLE projects ADD COLUMN first_transaction_at timestamptz;
CREATE UNIQUE INDEX projects_code_upper_idx ON projects(upper(code));
CREATE TABLE project_settings (
 project_id text PRIMARY KEY REFERENCES projects(id),
 lot text NOT NULL DEFAULT 'item' CHECK (lot IN ('off','item','required')),
 expiry text NOT NULL DEFAULT 'item' CHECK (expiry IN ('off','item','required')),
 inspection boolean NOT NULL DEFAULT true
);
INSERT INTO project_settings(project_id) SELECT id FROM projects;
CREATE TABLE project_warehouses (
 project_id text NOT NULL REFERENCES projects(id), warehouse_id text NOT NULL REFERENCES warehouses(id),
 is_default boolean NOT NULL DEFAULT false,
 has_stock boolean NOT NULL DEFAULT false, has_open_work boolean NOT NULL DEFAULT false,
 PRIMARY KEY(project_id,warehouse_id)
);
CREATE UNIQUE INDEX project_single_default_idx ON project_warehouses(project_id) WHERE is_default;
CREATE TABLE project_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id),
 actor_id text NOT NULL REFERENCES users(id), actor_name text NOT NULL,
 section text NOT NULL, before_value jsonb, after_value jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_audit_history_idx ON project_audit(project_id,id DESC);

CREATE TABLE users (
  id text PRIMARY KEY, username text NOT NULL, name text NOT NULL, password_hash text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));
CREATE TABLE projects (
  id text PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL, client text NOT NULL,
  description text NOT NULL, accent text NOT NULL CHECK (accent IN ('blue','violet','teal'))
);
CREATE TABLE roles (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE permissions (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE role_permissions (
  role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE memberships (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES roles(id), PRIMARY KEY (user_id, project_id)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO permissions(id,name) VALUES ('workspace.view','View project workspace');
INSERT INTO roles(id,name) VALUES ('manager','Manager'),('supervisor','Supervisor'),('operator','Operator'),('customer','Customer');
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'workspace.view' FROM roles;
INSERT INTO projects(id,code,name,client,description,accent) VALUES
  ('apo','APO','Apo','บริษัทตัวอย่าง','พื้นที่ทำงานสำหรับโปรเจกต์ Apo','blue'),
  ('squ','SQU','Squ','บริษัทตัวอย่าง','พื้นที่ทำงานสำหรับโปรเจกต์ Squ','violet'),
  ('mdr','MDR','Mdr','บริษัทตัวอย่าง','พื้นที่ทำงานสำหรับโปรเจกต์ Mdr','teal');

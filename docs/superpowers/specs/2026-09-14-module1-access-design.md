# Module 1 — Accounts and project access

User authorized implementation after approving Login, admin-created accounts, project selection and one role per user per project. This document makes the implementation defaults explicit. It supersedes the tentative access model in the prototype spec.

## Scope and choices

- Angular 22 / Tailwind retains the accepted electric-violet Thai interface. Node 24.21.0, NestJS REST, PostgreSQL in Docker. No warehouse operations in this module.
- One company installation. Bootstrap company Administrator from local environment. Administrator is a company-wide account flag, can administer accounts/roles and access all projects. Other users have exactly one role per assigned project: Manager, Supervisor, Operator or Customer. Company admin privileges cannot be delegated through project permissions.
- Admin creates accounts with a temporary password. First login requires changing that password before accessing projects or administration. No public signup or email integration. Admin can reset a password, edit a name, disable/reactivate a user, change administrator status and replace project memberships. Self-demotion/disable and removing the last active administrator are rejected.
- Fixed role catalog, editable permission mapping shared across projects. Current permission catalog: `workspace.view` only; administration always company Administrator only. Future modules add their own page/action permissions. Initially all four project roles receive `workspace.view`. Membership controls visibility of a project; this permission controls opening its workspace. No pretend inventory permissions.
- Projects Apo (`apo`), Squ (`squ`), Mdr (`mdr`) seeded under fictional client บริษัทตัวอย่าง. Project CRUD deferred.
- Sessions stored server-side in PostgreSQL; random opaque token in HttpOnly SameSite=Lax cookie, hashed token in DB, 8-hour lifetime. Password scrypt hash, no plaintext persistence. Unsafe requests require `X-WMS-Request: 1` plus validate Origin if supplied; no CORS. Secure cookies in production. Credentials never committed. Login throttling. Disabled accounts, password reset and role/membership changes take effect on subsequent backend requests.

## Shared API contract

Base `/api`; JSON requests. Errors Nest shape `{statusCode,message}` with message string or string[]. Mutating requests send `X-WMS-Request: 1`. Cookie managed by browser.

```ts
type RoleId = 'manager'|'supervisor'|'operator'|'customer';
interface Membership { projectId: string; roleId: RoleId; }
interface User { id: string; username: string; name: string; isAdmin: boolean; active: boolean; mustChangePassword: boolean; }
interface Project { id: string; code: string; name: string; client: string; description: string; accent: 'blue'|'violet'|'teal'; roleId: RoleId|'administrator'; roleName: string; permissions: string[]; }
interface Session { user: User; projects: Project[]; }
interface ManagedUser extends User { memberships: Membership[]; }
interface Role { id: RoleId; name: string; permissions: string[]; }
```

- `GET /health` → `{status:'ok'}` including DB readiness.
- `POST /auth/login {username,password}` → Session; sets cookie. Generic 401 on invalid credentials.
- `GET /auth/me` → Session or 401. Allowed while password change required.
- `POST /auth/logout {}` → `{ok:true}`; revokes session and clears cookie.
- `POST /auth/password {currentPassword,newPassword}` → Session; rotates current session and revokes other sessions; clears mustChangePassword. New password length 12–128, different from current.
- `GET /projects/:id/workspace` → `{project:Project}`; verifies assigned project and workspace.view.
- `GET /admin/users` → ManagedUser[].
- `POST /admin/users {username,name,password,isAdmin,memberships}` → ManagedUser. Temporary password length 12–128. Username trimmed/lowercase, 3–50 ASCII letters/digits/dot/underscore/hyphen. Name 1–100 trimmed chars. Unique username case-insensitive. Duplicate project memberships rejected.
- `PATCH /admin/users/:id {name,active,isAdmin,memberships}` → ManagedUser; full editable record, username immutable. Changes transactional.
- `POST /admin/users/:id/reset-password {password}` → `{ok:true}`; force change, revoke all target sessions. Self reset disallowed; use own password page.
- `GET /admin/projects` → `{id,code,name,client,description,accent}[]`.
- `GET /admin/roles` → `{roles:Role[],permissions:{id:string,name:string}[]}`.
- `PUT /admin/roles/:id {permissions:string[]}` → Role; unknown permission/role rejected.

## Screens and data flow

Login → mandatory password change if needed → project selection → workspace. Restore session through /auth/me on reload. Selected project id can be sessionStorage preference, never authorization. Opening workspace always calls backend. Show role on cards and workspace. User without assignments sees useful contact-admin state. Company Administrator sees administration link even without project selection.

Administration has Users and Roles tabs. Users list, create/edit form, active flag, company Administrator option, project-role rows (one per project), reset password action with confirmation. Roles show workspace-view checkbox and explain company-admin scope. Async saving/error/success states, usable at 360px and keyboard accessible. Own change-password available after login.

## Acceptance

Real DB survives restart. Login fails generically for wrong credentials; password change gate enforced by API. Session restores on reload and logout revokes it. Apo Manager/Squ Operator membership resolves distinct roles; unassigned project and removed permission return 403. Non-admin cannot reach user/role admin API even by forged requests. Duplicate membership/username rejected. Disabling and reset revoke sessions. Last-admin/self protection tested. UI handles validation and server failures; desktop/mobile flows pass. Deliver local startup and manual test instructions before starting Module 2.

## Implementation references

Nest supports separate authentication and authorization guards: [Nest authorization](https://docs.nestjs.com/security/authorization).
The PostgreSQL 18 official image stores versioned data below `/var/lib/postgresql`, which is the Compose volume mount: [Postgres image](https://hub.docker.com/_/postgres).
Use a current scrypt work factor from [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), with a unique random salt per password.

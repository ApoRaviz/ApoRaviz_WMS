export type RoleId = "manager" | "supervisor" | "operator" | "customer";
export const roleIds: ReadonlySet<string> = new Set([
  "manager",
  "supervisor",
  "operator",
  "customer",
]);
export interface Membership {
  projectId: string;
  roleId: RoleId;
}
export interface PublicUser {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
  active: boolean;
  mustChangePassword: boolean;
}
export interface ManagedUser extends PublicUser {
  memberships: Membership[];
}
export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  accent: "blue" | "violet" | "teal";
}
export interface AccessibleProject extends Project {
  roleId: RoleId | "administrator";
  roleName: string;
  permissions: string[];
}
export interface Session {
  user: PublicUser;
  projects: AccessibleProject[];
}
export interface Role {
  id: RoleId;
  name: string;
  permissions: string[];
}
export interface Permission {
  id: string;
  name: string;
}

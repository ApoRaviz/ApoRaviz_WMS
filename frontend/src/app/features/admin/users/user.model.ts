import type { RoleId } from '../roles/role.model';
export interface Membership {
  projectId: string;
  roleId: RoleId;
}
export interface User {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
  active: boolean;
  mustChangePassword: boolean;
}
export interface ManagedUser extends User {
  memberships: Membership[];
}
export interface UserInput {
  username: string;
  name: string;
  password: string;
  isAdmin: boolean;
  memberships: Membership[];
}
export interface UserUpdate {
  name: string;
  active: boolean;
  isAdmin: boolean;
  memberships: Membership[];
  expectedMemberships: Membership[];
}
export interface PasswordReset {
  password: string;
}

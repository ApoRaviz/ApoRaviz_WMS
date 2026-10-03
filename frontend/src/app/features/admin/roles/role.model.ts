export type RoleId = 'manager' | 'supervisor' | 'operator' | 'customer';
export interface Role {
  id: RoleId;
  name: string;
  permissions: string[];
}
export interface Permission {
  id: string;
  name: string;
}
export interface RoleCatalog {
  roles: Role[];
  permissions: Permission[];
}
export interface RoleUpdate {
  permissions: string[];
}

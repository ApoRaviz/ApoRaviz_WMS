import type { RoleId } from '../admin/roles/role.model';
export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  accent: 'blue' | 'violet' | 'teal';
  status?: 'draft' | 'active' | 'inactive';
  roleId: RoleId | 'administrator';
  roleName: string;
  permissions: string[];
}
export interface AdminProject {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  accent: Project['accent'];
}
export interface WorkspaceResponse {
  project: Project;
}

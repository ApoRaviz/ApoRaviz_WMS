import type { RoleId } from '../admin/roles/role.model';
export type ProjectStatus = 'draft' | 'active' | 'inactive';
export type ControlMode = 'off' | 'item' | 'required';
export type SetupSection = 'general' | 'warehouses' | 'rules' | 'members' | 'history';
export type WritableSection = Exclude<SetupSection, 'history'>;
export interface ReferenceItem {
  id: string;
  code: string;
  name: string;
}
export interface SetupRules {
  lot: ControlMode;
  expiry: ControlMode;
  inspection: boolean;
}
export interface SetupMember {
  userId: string;
  username: string;
  name: string;
  active: boolean;
  roleId: RoleId;
}
export interface SetupProject {
  id: string;
  code: string;
  name: string;
  clientId: string;
  client: string;
  description: string;
  accent: 'blue' | 'violet' | 'teal';
  status: ProjectStatus;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  firstTransactionAt: string | null;
  warehouseIds: string[];
  defaultWarehouseId: string | null;
  rules: SetupRules;
}
export interface SetupAudit {
  id: string;
  section: string;
  actorName: string;
  createdAt: string;
  before: unknown;
  after: unknown;
}
export interface ReferenceCatalog {
  clients: ReferenceItem[];
  warehouses: ReferenceItem[];
}
export interface SetupDetail {
  project: SetupProject;
  members: SetupMember[];
  history: SetupAudit[];
  canAdmin: boolean;
  catalog: ReferenceCatalog & {
    users: { id: string; username: string; name: string; active: boolean }[];
  };
}
export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  clientId: string;
  client: string;
  description: string;
  accent: string;
  status: ProjectStatus;
  version: number;
  warehouseCount: number;
}
export interface CreateProjectInput {
  code: string;
  name: string;
  clientId: string;
  description: string;
  accent: 'blue' | 'violet' | 'teal';
}
export interface SetupDraft {
  name: string;
  description: string;
  accent: 'blue' | 'violet' | 'teal';
  clientId: string;
  warehouseIds: string[];
  defaultWarehouseId: string | null;
  rules: SetupRules;
  members: { userId: string; roleId: RoleId }[];
}
export type SectionInput =
  | {
      version: number;
      name: string;
      description: string;
      accent: SetupDraft['accent'];
      clientId?: string;
    }
  | { version: number; warehouseIds?: string[]; defaultWarehouseId: string | null }
  | (SetupRules & { version: number })
  | { version: number; members: SetupDraft['members'] };
export const statusLabels: Record<ProjectStatus, string> = {
  draft: 'ฉบับร่าง',
  active: 'เปิดใช้งาน',
  inactive: 'ปิดใช้งาน',
};
export const roleLabels: Record<RoleId, string> = {
  manager: 'Manager',
  supervisor: 'Supervisor',
  operator: 'Operator',
  customer: 'Customer',
};
export const modeLabels: Record<ControlMode, string> = {
  off: 'ปิด',
  item: 'กำหนดรายสินค้า',
  required: 'บังคับทุกสินค้า',
};

import { RoleId } from "../../common/models";
export type ControlMode = "off" | "item" | "required";
export type ProjectStatus = "draft" | "active" | "inactive";
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
  accent: "blue" | "violet" | "teal";
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
export type SetupSummary = Pick<
  SetupProject,
  | "id"
  | "code"
  | "name"
  | "description"
  | "accent"
  | "status"
  | "clientId"
  | "client"
  | "version"
  | "updatedAt"
> & { warehouseCount: number };
export interface SetupDetail {
  project: SetupProject;
  members: SetupMember[];
  history: SetupAudit[];
  canAdmin: boolean;
  catalog: {
    clients: ReferenceItem[];
    warehouses: ReferenceItem[];
    users: { id: string; username: string; name: string; active: boolean }[];
  };
}
export interface SetupActor {
  id: string;
  name: string;
  is_admin: boolean;
  active: boolean;
  must_change_password: boolean;
}

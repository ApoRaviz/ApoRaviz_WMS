import { PublicUser } from "../common/models";
export interface UserRow {
  id: string;
  username: string;
  name: string;
  password_hash: string;
  is_admin: boolean;
  active: boolean;
  must_change_password: boolean;
}
export function publicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    isAdmin: row.is_admin,
    active: row.active,
    mustChangePassword: row.must_change_password,
  };
}

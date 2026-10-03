import { fail } from "./errors";
import { Membership, RoleId, roleIds } from "./models";
export function bodyObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
export function validatedMemberships(value: unknown): Membership[] {
  if (!Array.isArray(value)) fail(400, "memberships must be an array");
  const seen = new Set<string>();
  return value.map((entry: unknown) => {
    const item = bodyObject(entry);
    if (
      typeof item.projectId !== "string" ||
      typeof item.roleId !== "string" ||
      !roleIds.has(item.roleId)
    )
      fail(400, "Invalid membership");
    if (seen.has(item.projectId)) fail(400, "Duplicate project membership");
    seen.add(item.projectId);
    return { projectId: item.projectId, roleId: item.roleId as RoleId };
  });
}

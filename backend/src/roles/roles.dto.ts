import { Injectable, PipeTransform } from "@nestjs/common";
import { bodyObject } from "../common/validation";
import { fail } from "../common/errors";
export interface UpdateRoleDto {
  permissions: string[];
}
@Injectable()
export class UpdateRolePipe implements PipeTransform<unknown, UpdateRoleDto> {
  transform(value: unknown): UpdateRoleDto {
    const body = bodyObject(value);
    if (
      !Array.isArray(body.permissions) ||
      body.permissions.some((p: unknown) => p !== "workspace.view") ||
      new Set(body.permissions).size !== body.permissions.length
    )
      fail(400, "Unknown permission");
    return { permissions: body.permissions as string[] };
  }
}

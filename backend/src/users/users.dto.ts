import { Injectable, PipeTransform } from "@nestjs/common";
import { Membership } from "../common/models";
import { fail } from "../common/errors";
import {
  bodyObject,
  validPassword,
  validatedMemberships,
} from "../common/validation";
export interface CreateUserDto {
  username: string;
  name: string;
  password: string;
  isAdmin: boolean;
  memberships: Membership[];
}
export interface UpdateUserDto {
  name: string;
  active: boolean;
  isAdmin: boolean;
  memberships: Membership[];
  expectedMemberships: Membership[];
}
export interface ResetPasswordDto {
  password: string;
}
@Injectable()
export class CreateUserPipe implements PipeTransform<unknown, CreateUserDto> {
  transform(value: unknown): CreateUserDto {
    const body = bodyObject(value);
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) fail(400, "Invalid username");
    if (!name || name.length > 100) fail(400, "Invalid name");
    if (!validPassword(body.password))
      fail(400, "Password must be 12 to 128 characters");
    return {
      username,
      name,
      password: body.password,
      isAdmin: body.isAdmin === true,
      memberships: validatedMemberships(body.memberships),
    };
  }
}
@Injectable()
export class UpdateUserPipe implements PipeTransform<unknown, UpdateUserDto> {
  transform(value: unknown): UpdateUserDto {
    const body = bodyObject(value);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (
      !name ||
      name.length > 100 ||
      typeof body.active !== "boolean" ||
      typeof body.isAdmin !== "boolean"
    )
      fail(400, "Invalid user");
    return {
      name,
      active: body.active,
      isAdmin: body.isAdmin,
      memberships: validatedMemberships(body.memberships),
      expectedMemberships: validatedMemberships(body.expectedMemberships),
    };
  }
}
@Injectable()
export class ResetPasswordPipe implements PipeTransform<
  unknown,
  ResetPasswordDto
> {
  transform(value: unknown): ResetPasswordDto {
    const body = bodyObject(value);
    if (!validPassword(body.password))
      fail(400, "Password must be 12 to 128 characters");
    return { password: body.password };
  }
}

import { Injectable, PipeTransform } from "@nestjs/common";
import { fail } from "../common/errors";
import { bodyObject, validPassword } from "../common/validation";
export interface LoginDto {
  username: string;
  password: string | undefined;
}
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
@Injectable()
export class LoginPipe implements PipeTransform<unknown, LoginDto> {
  transform(value: unknown): LoginDto {
    const body = bodyObject(value);
    return {
      username:
        typeof body.username === "string"
          ? body.username.trim().toLowerCase()
          : "",
      password: typeof body.password === "string" ? body.password : undefined,
    };
  }
}
@Injectable()
export class ChangePasswordPipe implements PipeTransform<
  unknown,
  ChangePasswordDto
> {
  transform(value: unknown): ChangePasswordDto {
    const body = bodyObject(value);
    if (!validPassword(body.newPassword))
      fail(400, "New password must be 12 to 128 characters");
    if (typeof body.currentPassword !== "string")
      fail(400, "Current password is incorrect");
    if (body.currentPassword === body.newPassword)
      fail(400, "New password must be different");
    return {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    };
  }
}

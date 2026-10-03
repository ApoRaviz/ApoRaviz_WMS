import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { UserRow } from "../users/user.entity";
export const cookieName = "wms_session";
export const passwordGateKey = "wms.allowPasswordGate";
export const AllowPasswordGate = () => SetMetadata(passwordGateKey, true);
export interface AuthenticatedRequest extends Request {
  principal: UserRow;
}
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserRow =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().principal,
);
export function parseCookie(req: Request): string | undefined {
  for (const part of (req.headers.cookie || "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === cookieName) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return undefined;
      }
    }
  }
}
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
}

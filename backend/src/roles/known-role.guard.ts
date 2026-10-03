import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { RolesService } from "./roles.service";
@Injectable()
export class KnownRoleGuard implements CanActivate {
  constructor(@Inject(RolesService) private readonly roles: RolesService) {}
  canActivate(context: ExecutionContext): boolean {
    this.roles.assertKnownRole(
      context.switchToHttp().getRequest<Request>().params.id as string,
    );
    return true;
  }
}

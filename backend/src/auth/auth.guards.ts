import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fail } from "../common/errors";
import { AuthService } from "./auth.service";
import {
  AuthenticatedRequest,
  parseCookie,
  passwordGateKey,
} from "./auth.http";
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const allow = this.reflector.getAllAndOverride<boolean>(passwordGateKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    request.principal = await this.auth.current(parseCookie(request), allow);
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (
      !context.switchToHttp().getRequest<AuthenticatedRequest>().principal
        .is_admin
    )
      fail(403, "Administrator access required");
    return true;
  }
}

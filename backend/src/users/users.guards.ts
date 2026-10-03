import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.http";
import { UsersService } from "./users.service";
// Preserve target/self checks before body validation, as in the original API.
@Injectable()
export class ExistingUserGuard implements CanActivate {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    await this.users.managed(req.params.id as string);
    return true;
  }
}
@Injectable()
export class PasswordResetTargetGuard implements CanActivate {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.users.assertResetTarget(req.principal.id, req.params.id as string);
    return true;
  }
}

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.http";
import { SessionGuard, AdminGuard } from "../auth/auth.guards";
import { UserRow } from "./user.entity";
import { UsersService } from "./users.service";
import {
  CreateUserDto,
  CreateUserPipe,
  UpdateUserDto,
  UpdateUserPipe,
  ResetPasswordDto,
  ResetPasswordPipe,
} from "./users.dto";
import { ExistingUserGuard, PasswordResetTargetGuard } from "./users.guards";
@Controller("admin/users")
@UseGuards(SessionGuard, AdminGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get() list() {
    return this.users.list();
  }
  @Post() create(@Body(CreateUserPipe) input: CreateUserDto) {
    return this.users.create(input);
  }
  @Patch(":id")
  @UseGuards(ExistingUserGuard)
  update(
    @CurrentUser() actor: UserRow,
    @Param("id") id: string,
    @Body(UpdateUserPipe) input: UpdateUserDto,
  ) {
    return this.users.update(actor.id, id, input);
  }
  @Post(":id/reset-password")
  @UseGuards(PasswordResetTargetGuard)
  reset(
    @CurrentUser() actor: UserRow,
    @Param("id") id: string,
    @Body(ResetPasswordPipe) input: ResetPasswordDto,
  ) {
    return this.users.reset(actor.id, id, input);
  }
}

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard, AdminGuard } from "../auth/auth.guards";
import { RolesService } from "./roles.service";
import { UpdateRoleDto, UpdateRolePipe } from "./roles.dto";
import { KnownRoleGuard } from "./known-role.guard";
@Controller("admin/roles")
@UseGuards(SessionGuard, AdminGuard)
export class RolesController {
  constructor(@Inject(RolesService) private readonly roles: RolesService) {}
  @Get() list() {
    return this.roles.list();
  }
  @Put(":id")
  @UseGuards(KnownRoleGuard)
  update(@Param("id") id: string, @Body(UpdateRolePipe) input: UpdateRoleDto) {
    return this.roles.update(id, input);
  }
}

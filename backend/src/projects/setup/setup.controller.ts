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
import { CurrentUser } from "../../auth/auth.http";
import { SessionGuard, AdminGuard } from "../../auth/auth.guards";
import { UserRow } from "../../users/user.entity";
import { SetupService } from "./setup.service";
import { ReferenceService } from "./reference.service";
import {
  CreateProjectInput,
  CreateProjectPipe,
  GeneralInput,
  GeneralPipe,
  WarehousesInput,
  WarehousesPipe,
  RulesInput,
  RulesPipe,
  MembersInput,
  MembersPipe,
  StatusInput,
  StatusPipe,
  ReferenceInput,
  ReferencePipe,
} from "./setup.dto";
@Controller()
@UseGuards(SessionGuard)
export class SetupController {
  constructor(
    @Inject(SetupService) private readonly setup: SetupService,
    @Inject(ReferenceService) private readonly references: ReferenceService,
  ) {}
  @Get("admin/project-setup") @UseGuards(AdminGuard) list(
    @CurrentUser() user: UserRow,
  ) {
    return this.setup.list(user.id);
  }
  @Post("admin/project-setup") @UseGuards(AdminGuard) create(
    @CurrentUser() user: UserRow,
    @Body(CreateProjectPipe) input: CreateProjectInput,
  ) {
    return this.setup.create(user.id, input);
  }
  @Get("projects/:id/setup") detail(
    @CurrentUser() user: UserRow,
    @Param("id") id: string,
  ) {
    return this.setup.detail(user.id, id);
  }
  @Patch("projects/:id/setup/general") general(
    @CurrentUser() user: UserRow,
    @Param("id") id: string,
    @Body(GeneralPipe) input: GeneralInput,
  ) {
    return this.setup.general(user.id, id, input);
  }
  @Patch("projects/:id/setup/warehouses") warehouses(
    @CurrentUser() user: UserRow,
    @Param("id") id: string,
    @Body(WarehousesPipe) input: WarehousesInput,
  ) {
    return this.setup.warehouses(user.id, id, input);
  }
  @Patch("projects/:id/setup/rules") rules(
    @CurrentUser() user: UserRow,
    @Param("id") id: string,
    @Body(RulesPipe) input: RulesInput,
  ) {
    return this.setup.rules(user.id, id, input);
  }
  @Patch("projects/:id/setup/members") members(
    @CurrentUser() user: UserRow,
    @Param("id") id: string,
    @Body(MembersPipe) input: MembersInput,
  ) {
    return this.setup.members(user.id, id, input);
  }
  @Patch("projects/:id/setup/status") status(
    @CurrentUser() user: UserRow,
    @Param("id") id: string,
    @Body(StatusPipe) input: StatusInput,
  ) {
    return this.setup.status(user.id, id, input);
  }
  @Get("admin/project-reference-data") @UseGuards(AdminGuard) catalog(
    @CurrentUser() user: UserRow,
  ) {
    return this.references.catalog(user.id);
  }
  @Post("admin/project-reference-data/clients") @UseGuards(AdminGuard) client(
    @CurrentUser() user: UserRow,
    @Body(ReferencePipe) input: ReferenceInput,
  ) {
    return this.references.create(user.id, "clients", input);
  }
  @Post("admin/project-reference-data/warehouses")
  @UseGuards(AdminGuard)
  warehouse(
    @CurrentUser() user: UserRow,
    @Body(ReferencePipe) input: ReferenceInput,
  ) {
    return this.references.create(user.id, "warehouses", input);
  }
}

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import type { AccessService } from "../main";

@Controller("admin")
export class AdminController {
  constructor(
    @Inject("ACCESS_SERVICE") private readonly access: AccessService,
  ) {}

  @Get("users") users(@Req() req: Request) {
    return this.access.users(req);
  }
  @Post("users") createUser(@Req() req: Request, @Body() body: unknown) {
    return this.access.createUser(req, body);
  }
  @Patch("users/:id") patchUser(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.access.patchUser(req, id, body);
  }
  @Post("users/:id/reset-password") reset(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.access.reset(req, id, body);
  }
  @Get("projects") projects(@Req() req: Request) {
    return this.access.adminProjects(req);
  }
  @Get("roles") roles(@Req() req: Request) {
    return this.access.adminRoles(req);
  }
  @Put("roles/:id") role(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.access.role(req, id, body);
  }
}

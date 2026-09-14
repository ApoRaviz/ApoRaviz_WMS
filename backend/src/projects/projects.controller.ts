import { Controller, Get, Inject, Param, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AccessService } from "../main";

@Controller()
export class ProjectsController {
  constructor(
    @Inject("ACCESS_SERVICE") private readonly access: AccessService,
  ) {}

  @Get("projects/:id/workspace")
  workspace(@Req() req: Request, @Param("id") id: string) {
    return this.access.workspace(req, id);
  }
}

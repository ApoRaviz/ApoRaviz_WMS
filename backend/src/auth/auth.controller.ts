import { Body, Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AccessService } from "../main";

@Controller()
export class AuthController {
  constructor(
    @Inject("ACCESS_SERVICE") private readonly access: AccessService,
  ) {}

  @Get("health")
  health() {
    return this.access.health();
  }

  @Post("auth/login")
  login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    return this.access.login(req, res, body);
  }

  @Get("auth/me")
  me(@Req() req: Request) {
    return this.access.me(req);
  }

  @Post("auth/logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.access.logout(req, res);
  }

  @Post("auth/password")
  password(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    return this.access.password(req, res, body);
  }
}

import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { UserRow } from "../users/user.entity";
import {
  LoginDto,
  LoginPipe,
  ChangePasswordDto,
  ChangePasswordPipe,
} from "./auth.dto";
import {
  AllowPasswordGate,
  CurrentUser,
  cookieName,
  parseCookie,
  setSessionCookie,
} from "./auth.http";
import { SessionGuard } from "./auth.guards";
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post("login")
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(LoginPipe) input: LoginDto,
  ) {
    const result = await this.auth.login(input, req.ip);
    setSessionCookie(res, result.token);
    return this.auth.session(result.user);
  }
  @Get("me")
  @UseGuards(SessionGuard)
  @AllowPasswordGate()
  me(@CurrentUser() user: UserRow) {
    return this.auth.session(user);
  }
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.logout(parseCookie(req));
    res.clearCookie(cookieName, { path: "/" });
    return result;
  }
  @Post("password")
  @UseGuards(SessionGuard)
  @AllowPasswordGate()
  async password(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(ChangePasswordPipe) input: ChangePasswordDto,
  ) {
    const result = await this.auth.changePassword(parseCookie(req)!, input);
    setSessionCookie(res, result.token);
    return this.auth.session(result.user);
  }
}

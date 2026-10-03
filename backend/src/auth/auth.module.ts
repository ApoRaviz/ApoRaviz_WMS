import { Module } from "@nestjs/common";
import { UsersDataModule } from "../users/users-data.module";
import { ProjectsDataModule } from "../projects/projects-data.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionsRepository } from "./sessions.repository";
import { SessionGuard, AdminGuard } from "./auth.guards";
import { LoginThrottle } from "./login-throttle";
@Module({
  imports: [UsersDataModule, ProjectsDataModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsRepository,
    LoginThrottle,
    SessionGuard,
    AdminGuard,
  ],
  exports: [AuthService, SessionsRepository, SessionGuard, AdminGuard],
})
export class AuthModule {}

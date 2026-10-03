import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersDataModule } from "./users-data.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { ExistingUserGuard, PasswordResetTargetGuard } from "./users.guards";
import { ProjectsDataModule } from "../projects/projects-data.module";
@Module({
  imports: [AuthModule, UsersDataModule, ProjectsDataModule],
  controllers: [UsersController],
  providers: [UsersService, ExistingUserGuard, PasswordResetTargetGuard],
})
export class UsersModule {}

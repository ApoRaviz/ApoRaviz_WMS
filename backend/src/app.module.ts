import { DynamicModule, Module } from "@nestjs/common";
import { Database } from "./db";
import { DatabaseModule } from "./database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProjectsModule } from "./projects/projects.module";
import { RolesModule } from "./roles/roles.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { HealthRepository } from "./health/health.repository";
@Module({})
export class AppModule {
  static forDatabase(database: Database): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DatabaseModule.forDatabase(database),
        AuthModule,
        UsersModule,
        ProjectsModule,
        RolesModule,
      ],
      controllers: [HealthController],
      providers: [HealthService, HealthRepository],
    };
  }
}

import { DynamicModule, Global, Module } from "@nestjs/common";
import { Database } from "./db";
@Global()
@Module({})
export class DatabaseModule {
  static forDatabase(database: Database): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: Database, useValue: database }],
      exports: [Database],
    };
  }
}

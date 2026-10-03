import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../db";
@Injectable()
export class HealthRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  async ping(): Promise<void> {
    await this.db.query("SELECT 1");
  }
}

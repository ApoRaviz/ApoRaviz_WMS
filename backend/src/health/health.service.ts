import { Inject, Injectable } from "@nestjs/common";
import { HealthRepository } from "./health.repository";
@Injectable()
export class HealthService {
  constructor(
    @Inject(HealthRepository) private readonly health: HealthRepository,
  ) {}
  async check(): Promise<{ status: "ok" }> {
    await this.health.ping();
    return { status: "ok" };
  }
}

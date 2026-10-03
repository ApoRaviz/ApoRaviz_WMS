import { HttpException } from "@nestjs/common";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { createApp } from "../src/main";
import { ProjectsRepository } from "../src/projects/projects.repository";

describe("committed authentication response", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    app = await createApp({ testing: true });
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await app.close();
  });

  test("delivers the committed login cookie even when project catalog loading fails", async () => {
    vi.spyOn(ProjectsRepository.prototype, "list").mockRejectedValueOnce(
      new HttpException("Project catalog unavailable", 503),
    );
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(503);
    expect(response.headers["set-cookie"]?.[0]).toContain("wms_session=");
    const cookie = response.headers["set-cookie"][0].split(";")[0];
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);
  });

  test("delivers the rotated cookie after password commit even when project catalog loading fails", async () => {
    const signedIn = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);
    const previousCookie = signedIn.headers["set-cookie"][0].split(";")[0];
    vi.spyOn(ProjectsRepository.prototype, "list").mockRejectedValueOnce(
      new HttpException("Project catalog unavailable", 503),
    );
    const response = await request(app.getHttpServer())
      .post("/api/auth/password")
      .set("X-WMS-Request", "1")
      .set("Cookie", previousCookie)
      .send({
        currentPassword: process.env.ADMIN_PASSWORD,
        newPassword: "Changed-response-test-123!",
      })
      .expect(503);
    expect(response.headers["set-cookie"]?.[0]).toContain("wms_session=");
    const cookie = response.headers["set-cookie"][0].split(";")[0];
    const restored = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(restored.body.user.mustChangePassword).toBe(false);
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", previousCookie)
      .expect(401);
  });
});

import "reflect-metadata";
import { HttpException, HttpStatus } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { Request, Response } from "express";
import { Database } from "./db";
import { AppModule } from "./app.module";
export async function createApp(options: { testing?: boolean } = {}) {
  const database = new Database(options);
  await database.initialize();
  const app = await NestFactory.create(AppModule.forDatabase(database), {
    logger: ["error"],
  });
  app.setGlobalPrefix("api");
  app.use((req: Request, _res: Response, next: (error?: unknown) => void) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-WMS-Request") !== "1")
        return next(
          new HttpException(
            "X-WMS-Request header required",
            HttpStatus.FORBIDDEN,
          ),
        );
      const origin = req.get("Origin");
      if (origin && origin !== process.env.APP_ORIGIN)
        return next(
          new HttpException("Origin not allowed", HttpStatus.FORBIDDEN),
        );
    }
    next();
  });
  const originalClose = app.close.bind(app);
  app.close = async () => {
    await originalClose();
    await database.close();
  };
  await app.init();
  return app;
}

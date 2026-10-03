import { HttpException } from "@nestjs/common";
export function fail(status: number, message: string | string[]): never {
  throw new HttpException(message, status);
}
export function databaseErrorCode(error: unknown): string | undefined {
  return error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

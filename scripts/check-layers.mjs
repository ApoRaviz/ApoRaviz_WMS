import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(resolve(path, entry.name))
      : [resolve(path, entry.name)],
  );
}
const violations = [];
function check(condition, file, message) {
  if (!condition) violations.push(`${relative(root, file)}: ${message}`);
}
for (const file of files(resolve(root, "backend/src")).filter((f) =>
  f.endsWith(".ts"),
)) {
  const source = readFileSync(file, "utf8");
  check(
    !/\bAccessService\b|ACCESS_SERVICE/.test(source),
    file,
    "catch-all access service",
  );
  check(!/\bany\b/.test(source), file, "untyped any");
  if (/\.(service|controller)\.ts$/.test(file)) {
    check(
      !/\b(SELECT|INSERT INTO|UPDATE \w+ SET|DELETE FROM)\b/.test(source),
      file,
      "SQL outside repository",
    );
    check(
      !/\.query\s*[(<]/.test(source),
      file,
      "direct query outside repository",
    );
  }
  if (file.endsWith(".service.ts")) {
    check(
      !/from ["']express["']|@(Get|Post|Put|Patch|Req|Res|Body)\b/.test(source),
      file,
      "HTTP dependency in service",
    );
  }
  if (file.endsWith(".controller.ts")) {
    check(
      !/from ["'][^"']*(?:main|\.repository|\/db)["']/.test(source),
      file,
      "controller bypasses service",
    );
  }
  if (file.endsWith("/main.ts") || file.endsWith("\\main.ts")) {
    check(
      source.split("\n").length <= 20,
      file,
      "bootstrap contains application implementation",
    );
  }
}
if (process.argv.includes("--frontend")) {
  for (const file of files(resolve(root, "frontend/src/app")).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"),
  )) {
    const source = readFileSync(file, "utf8");
    if (/@Component\(/.test(source))
      check(
        !/HttpClient|firstValueFrom/.test(source),
        file,
        "HTTP in component",
      );
    if (file.includes(`${process.platform === "win32" ? "\\" : "/"}shared`))
      check(
        !/SessionService|features\//.test(source),
        file,
        "feature-aware shared UI",
      );
    if (file.endsWith("session.service.ts"))
      check(
        !/HttpClient|listUsers|createUser|listRoles|updateRole/.test(source),
        file,
        "mixed session/API responsibilities",
      );
    check(
      !/from ['"][^'"]*core\/session['"]/.test(source),
      file,
      "legacy catch-all import",
    );
  }
}
assert.equal(violations.length, 0, violations.join("\n"));
console.log("Layer boundaries passed.");

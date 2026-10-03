import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prototype = resolve(root, "docs/prototypes/inbound");
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ...["app.js", "fixtures.js", "inbound-state.js"].map((file) => [
    "/" + file,
    [file, "text/javascript; charset=utf-8"],
  ]),
]);
const fonts = new Set([
  "noto-sans-thai-thai-400-normal.woff2",
  "noto-sans-thai-thai-600-normal.woff2",
  "manrope-latin-400-normal.woff2",
  "manrope-latin-700-normal.woff2",
]);
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }
  let file;
  let type;
  if (files.has(pathname)) {
    const entry = files.get(pathname);
    file = resolve(prototype, entry[0]);
    type = entry[1];
  } else if (
    pathname.startsWith("/fonts/") &&
    fonts.has(basename(pathname)) &&
    pathname === "/fonts/" + basename(pathname)
  ) {
    const name = basename(pathname);
    const family = name.startsWith("manrope") ? "manrope" : "noto-sans-thai";
    file = resolve(
      root,
      "frontend/node_modules/@fontsource",
      family,
      "files",
      name,
    );
    type = "font/woff2";
  }
  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
const port = Number(process.env.INBOUND_PREVIEW_PORT || 4300);
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Inbound design preview: http://127.0.0.1:${port} (mock data only)`,
  ),
);

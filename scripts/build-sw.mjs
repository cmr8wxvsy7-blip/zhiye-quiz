import { createHash } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(projectRoot, "dist");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listFiles(absolutePath);
      return [absolutePath];
    }),
  );
  return files.flat();
}

const files = await listFiles(distDirectory);
const assets = files
  .map((file) => path.relative(distDirectory, file).split(path.sep).join("/"))
  .filter((file) => file !== "sw.js")
  .sort();
const version = createHash("sha256")
  .update(assets.join("\n"))
  .digest("hex")
  .slice(0, 12);

const worker = `const CACHE_NAME = "zhiye-shell-${version}";
const APP_SHELL = ${JSON.stringify(assets.map((asset) => `./${asset}`), null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
          return response;
        }),
    ),
  );
});
`;

await writeFile(path.join(distDirectory, "sw.js"), worker, "utf8");
console.log(`Generated offline cache ${version} with ${assets.length} assets.`);

#!/usr/bin/env node
const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const MENU_PATH = path.join(ROOT_DIR, "src/data/menus.json");
const CACHE_ROOT = path.join(ROOT_DIR, "assets/menu-cache");
const MANIFEST_PATH = path.join(CACHE_ROOT, "manifest.json");
const DEFAULT_OPTIONS = {
  delayMs: 1400,
  dryRun: false,
  limit: 10,
  maxAgeDays: 45,
  maxCacheEntries: 500,
  perMenu: 3,
};

function parseArgs(argv) {
  return argv.reduce(
    (options, arg) => {
      if (arg === "--dry-run") return { ...options, dryRun: true };
      const [key, value] = arg.replace(/^--/, "").split("=");
      if (!value) return options;
      if (key === "delay") return { ...options, delayMs: Number(value) };
      if (key === "limit") return { ...options, limit: Number(value) };
      if (key === "max-age-days") return { ...options, maxAgeDays: Number(value) };
      if (key === "max-cache-entries") return { ...options, maxCacheEntries: Number(value) };
      if (key === "per-menu") return { ...options, perMenu: Number(value) };
      return options;
    },
    { ...DEFAULT_OPTIONS },
  );
}

function isRemoteUrl(url = "") {
  return /^https?:\/\//.test(url);
}

function isLocalCacheUrl(url = "") {
  return url.startsWith("./assets/menu-cache/");
}

function normalizeImageEntry(entry, menu = {}) {
  if (!entry) return null;
  if (typeof entry === "string") {
    return {
      url: entry,
      sourceName: menu.imageSourceName || "",
      sourceUrl: menu.imageSourceUrl || "",
      title: menu.imageTitle || "",
    };
  }

  const url = entry.url || entry.imageUrl || entry.localUrl;
  if (!url) return null;
  return {
    url,
    sourceName: entry.sourceName || entry.imageSourceName || menu.imageSourceName || "",
    sourceUrl: entry.sourceUrl || entry.imageSourceUrl || menu.imageSourceUrl || "",
    title: entry.title || entry.imageTitle || menu.imageTitle || "",
    license: entry.license || entry.imageLicense || menu.imageLicense || "",
    cachedAt: entry.cachedAt || "",
    cachedFrom: entry.cachedFrom || "",
  };
}

function getImageEntries(menu = {}) {
  const entries = [];
  if (Array.isArray(menu.imageUrls)) entries.push(...menu.imageUrls);
  if (menu.imageUrl) entries.push(menu.imageUrl);

  const seen = new Set();
  return entries
    .map((entry) => normalizeImageEntry(entry, menu))
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    });
}

function slugify(value = "") {
  const slug = String(value)
    .trim()
    .replace(/[^\w가-힣-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "menu";
}

function hashText(value = "") {
  return [...String(value)].reduce((hash, char) => {
    const nextHash = (hash << 5) - hash + char.charCodeAt(0);
    return nextHash | 0;
  }, 0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getExtension(url, contentType = "") {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch (error) {
      return "";
    }
  })();
  const extension = path.extname(pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) return extension;
  return ".jpg";
}

function toAssetUrl(filePath) {
  return `./${path.relative(ROOT_DIR, filePath).split(path.sep).join("/")}`;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function getCacheFilePath(menu, sourceUrl, extension) {
  const menuSlug = slugify(`${menu.id || menu.name}-${menu.name}`);
  const sourceHash = Math.abs(hashText(sourceUrl)).toString(36);
  return path.join(CACHE_ROOT, menuSlug, `${sourceHash}${extension}`);
}

async function downloadImage(menu, source, options) {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "BabpickImageCache/1.0 (local development; polite batch cache)",
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Not an image: ${contentType || "unknown content type"}`);
  }

  const extension = getExtension(source.url, contentType);
  const filePath = getCacheFilePath(menu, source.url, extension);
  const assetUrl = toAssetUrl(filePath);

  if (!options.dryRun) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
  }

  return {
    url: assetUrl,
    sourceName: source.sourceName || menu.imageSourceName || "External image",
    sourceUrl: source.sourceUrl || menu.imageSourceUrl || source.url,
    title: source.title || menu.imageTitle || menu.name,
    license: source.license || menu.imageLicense || "",
    cachedFrom: source.url,
    cachedAt: new Date().toISOString(),
  };
}

function mergeImageEntries(existingEntries, newEntries, perMenu) {
  const seen = new Set();
  const localEntries = [...newEntries, ...existingEntries.filter((entry) => !isRemoteUrl(entry.url))];
  const remoteEntries = existingEntries.filter((entry) => isRemoteUrl(entry.url));
  return [...localEntries, ...remoteEntries]
    .filter((entry) => {
      if (seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    })
    .filter((entry, index, entries) => {
      if (!isLocalCacheUrl(entry.url)) return true;
      const localIndex = entries.slice(0, index + 1).filter((candidate) => isLocalCacheUrl(candidate.url)).length;
      return localIndex <= perMenu;
    });
}

function isSourceAlreadyCached(sourceUrl, entries, manifest) {
  return (
    entries.some((entry) => entry.cachedFrom === sourceUrl) ||
    Object.values(manifest || {}).some((entry) => entry?.sourceUrl === sourceUrl)
  );
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

function fromAssetUrl(assetUrl = "") {
  return path.join(ROOT_DIR, assetUrl.replace(/^\.\//, ""));
}

async function pruneCache(menus, manifest, options) {
  const now = Date.now();
  const maxAgeMs = options.maxAgeDays * 24 * 60 * 60 * 1000;
  const referencedUrls = new Set();

  menus.forEach((menu) => {
    getImageEntries(menu).forEach((entry) => {
      if (isLocalCacheUrl(entry.url)) referencedUrls.add(entry.url);
    });
  });

  const nextManifest = {};
  const manifestEntries = Object.entries(manifest || {}).sort(([, a], [, b]) => new Date(b.cachedAt || 0) - new Date(a.cachedAt || 0));
  const keepByCount = new Set(manifestEntries.slice(0, options.maxCacheEntries).map(([url]) => url));
  const deleteUrls = [];

  for (const [url, entry] of manifestEntries) {
    const age = now - new Date(entry.cachedAt || 0).getTime();
    const shouldDelete = (!referencedUrls.has(url) && age > maxAgeMs) || (!referencedUrls.has(url) && !keepByCount.has(url));
    if (shouldDelete) {
      deleteUrls.push(url);
      continue;
    }
    nextManifest[url] = entry;
  }

  for (const url of deleteUrls) {
    if (!options.dryRun) {
      await fs.rm(fromAssetUrl(url), { force: true });
    }
  }

  return { manifest: nextManifest, deleted: deleteUrls };
}

async function pruneMenuImageEntries(menus, manifest, options) {
  const now = Date.now();
  const maxAgeMs = options.maxAgeDays * 24 * 60 * 60 * 1000;
  const droppedUrls = [];

  menus.forEach((menu) => {
    if (!Array.isArray(menu.imageUrls)) return;
    const normalizedEntries = menu.imageUrls.map((entry) => normalizeImageEntry(entry, menu)).filter(Boolean);
    const cachedEntries = normalizedEntries
      .filter((entry) => isLocalCacheUrl(entry.url))
      .sort((a, b) => new Date(b.cachedAt || manifest[b.url]?.cachedAt || 0) - new Date(a.cachedAt || manifest[a.url]?.cachedAt || 0));

    if (!cachedEntries.length) return;

    const newestUrl = cachedEntries[0]?.url;
    const menuDroppedUrls = [];
    cachedEntries.forEach((entry, index) => {
      const cachedAt = entry.cachedAt || manifest[entry.url]?.cachedAt || "";
      const isOld = cachedAt ? now - new Date(cachedAt).getTime() > maxAgeMs : false;
      const shouldDropForCount = index >= options.perMenu;
      const shouldDropForAge = isOld && cachedEntries.length > 1 && entry.url !== newestUrl;
      if (shouldDropForCount || shouldDropForAge) {
        menuDroppedUrls.push(entry.url);
      }
    });

    if (!menuDroppedUrls.length) return;
    droppedUrls.push(...menuDroppedUrls);
    const droppedSet = new Set(menuDroppedUrls);
    menu.imageUrls = menu.imageUrls.filter((entry) => {
      const normalizedEntry = normalizeImageEntry(entry, menu);
      return !normalizedEntry || !droppedSet.has(normalizedEntry.url);
    });
  });

  for (const url of droppedUrls) {
    delete manifest[url];
    if (!options.dryRun) await fs.rm(fromAssetUrl(url), { force: true });
  }

  return droppedUrls;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(options.limit) || options.limit < 0) options.limit = DEFAULT_OPTIONS.limit;
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) options.delayMs = DEFAULT_OPTIONS.delayMs;
  if (!Number.isFinite(options.perMenu) || options.perMenu < 1) options.perMenu = DEFAULT_OPTIONS.perMenu;

  await fs.mkdir(CACHE_ROOT, { recursive: true });
  const menus = await readJson(MENU_PATH, []);
  const manifest = await readJson(MANIFEST_PATH, {});
  const droppedFromMenus = await pruneMenuImageEntries(menus, manifest, options);
  const pruneBefore = await pruneCache(menus, manifest, options);
  let nextManifest = pruneBefore.manifest;
  let downloadedCount = 0;
  const results = [];

  for (const menu of menus) {
    if (downloadedCount >= options.limit) break;
    const entries = getImageEntries(menu);
    const localCount = entries.filter((entry) => !isRemoteUrl(entry.url)).length;
    const remoteSources = entries.filter((entry) => isRemoteUrl(entry.url) && !isSourceAlreadyCached(entry.url, entries, nextManifest));
    const neededCount = Math.max(0, options.perMenu - localCount);
    if (!neededCount || !remoteSources.length) continue;

    const downloadedEntries = [];
    for (const source of remoteSources.slice(0, neededCount)) {
      if (downloadedCount >= options.limit) break;
      const plannedPath = getCacheFilePath(menu, source.url, getExtension(source.url));
      const plannedUrl = toAssetUrl(plannedPath);
      if (await fileExists(plannedPath)) {
        downloadedEntries.push({
          url: plannedUrl,
          sourceName: source.sourceName || menu.imageSourceName || "External image",
          sourceUrl: source.sourceUrl || menu.imageSourceUrl || source.url,
          title: source.title || menu.imageTitle || menu.name,
          license: source.license || menu.imageLicense || "",
          cachedFrom: source.url,
          cachedAt: new Date().toISOString(),
        });
        continue;
      }

      try {
        const cachedEntry = await downloadImage(menu, source, options);
        downloadedEntries.push(cachedEntry);
        nextManifest[cachedEntry.url] = {
          menuId: menu.id,
          menuName: menu.name,
          sourceUrl: source.url,
          cachedAt: cachedEntry.cachedAt,
        };
        downloadedCount += 1;
        results.push(`cached ${menu.name} -> ${cachedEntry.url}`);
      } catch (error) {
        results.push(`skip ${menu.name}: ${error.message}`);
      }

      if (downloadedCount < options.limit) await sleep(options.delayMs);
    }

    if (downloadedEntries.length) {
      menu.imageUrls = mergeImageEntries(entries, downloadedEntries, options.perMenu);
    }
  }

  const pruneAfter = await pruneCache(menus, nextManifest, options);
  nextManifest = pruneAfter.manifest;

  if (!options.dryRun) {
    await writeJson(MENU_PATH, menus);
    await writeJson(MANIFEST_PATH, nextManifest);
  }

  console.log(
    [
      `downloaded=${downloadedCount}`,
      `droppedFromMenus=${droppedFromMenus.length}`,
      `deletedBefore=${pruneBefore.deleted.length}`,
      `deletedAfter=${pruneAfter.deleted.length}`,
      `dryRun=${options.dryRun}`,
      ...results,
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

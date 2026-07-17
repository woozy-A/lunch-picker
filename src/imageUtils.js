(function attachImageUtils(global) {
  const app = (global.LunchApp = global.LunchApp || {});
  const FALLBACK_IMAGE = "./assets/lunch-spread.png";
  const IMAGE_USE_CACHE_KEY = "babpick-image-use-cache-v1";
  const IMAGE_USE_MAX_ITEMS = 180;
  const IMAGE_USE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

  function isLocalImage(url = "") {
    return url.startsWith("./assets/menu/") || url.startsWith("./assets/menu-cache/") || url.startsWith("assets/menu/") || url.startsWith("assets/menu-cache/");
  }

  function stableHash(value = "") {
    return [...String(value)].reduce((hash, char) => {
      const nextHash = (hash << 5) - hash + char.charCodeAt(0);
      return nextHash | 0;
    }, 0);
  }

  function getDateSeed(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeImageEntry(entry, menu = {}) {
    if (!entry) return null;
    if (typeof entry === "string") {
      return {
        url: entry,
        sourceName: menu.imageSourceName || "",
        sourceUrl: menu.imageSourceUrl || "",
        title: menu.imageTitle || "",
        isLocal: isLocalImage(entry),
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
      isLocal: isLocalImage(url),
    };
  }

  function getImageCandidates(menu = {}) {
    const imageUrls = Array.isArray(menu.imageUrls) ? menu.imageUrls : [];
    const candidates = [...imageUrls, menu.imageUrl]
      .map((entry) => normalizeImageEntry(entry, menu))
      .filter(Boolean);
    const seenUrls = new Set();
    return candidates.filter((entry) => {
      if (seenUrls.has(entry.url)) return false;
      seenUrls.add(entry.url);
      return true;
    });
  }

  function getDisplayPool(menu = {}) {
    const candidates = getImageCandidates(menu);
    const localCandidates = candidates.filter((entry) => entry.isLocal);
    return localCandidates.length ? localCandidates : candidates;
  }

  function getMenuImageInfo(menu = {}, seed = "") {
    const pool = getDisplayPool(menu);
    if (!pool.length) {
      return {
        url: FALLBACK_IMAGE,
        sourceName: "",
        sourceUrl: "",
        title: "",
        isLocal: true,
        isFallback: true,
        variantCount: 0,
      };
    }

    const hash = Math.abs(stableHash(`${menu.id || menu.name || "menu"}:${seed || getDateSeed()}`));
    const entry = pool[hash % pool.length];
    return {
      ...entry,
      variantCount: pool.length,
      isFallback: false,
    };
  }

  function getMenuImageCount(menu = {}) {
    return getDisplayPool(menu).length;
  }

  function getImageCreditLabel(imageInfo = {}) {
    if (!imageInfo) return "";
    if (!imageInfo.sourceName) return "";
    if (imageInfo.sourceName === "Wikimedia Commons") return "Wikimedia Commons";
    return imageInfo.sourceName;
  }

  function readImageUseCache() {
    try {
      return JSON.parse(global.localStorage.getItem(IMAGE_USE_CACHE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function writeImageUseCache(cache) {
    try {
      global.localStorage.setItem(IMAGE_USE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      // localStorage can be unavailable in private browsing; image rendering should continue.
    }
  }

  function pruneImageUseCache(cache = {}) {
    const now = Date.now();
    const entries = Object.entries(cache)
      .filter(([, value]) => value?.lastUsedAt && now - new Date(value.lastUsedAt).getTime() <= IMAGE_USE_MAX_AGE_MS)
      .sort(([, a], [, b]) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
      .slice(0, IMAGE_USE_MAX_ITEMS);
    return Object.fromEntries(entries);
  }

  function recordImageUse(menu = {}, imageInfo = {}) {
    if (!imageInfo.url || imageInfo.isFallback) return;
    const cache = pruneImageUseCache(readImageUseCache());
    cache[imageInfo.url] = {
      menuId: menu.id || "",
      menuName: menu.name || "",
      url: imageInfo.url,
      isLocal: Boolean(imageInfo.isLocal),
      sourceName: imageInfo.sourceName || "",
      sourceUrl: imageInfo.sourceUrl || "",
      usedCount: (cache[imageInfo.url]?.usedCount || 0) + 1,
      lastUsedAt: new Date().toISOString(),
    };
    writeImageUseCache(cache);
  }

  app.images = {
    FALLBACK_IMAGE,
    getImageCandidates,
    getImageCreditLabel,
    getMenuImageCount,
    getMenuImageInfo,
    isLocalImage,
    recordImageUse,
  };
})(window);

(function attachMockApi(global) {
  const app = (global.LunchApp = global.LunchApp || {});
  const POPULAR_REFRESH_MS = 60 * 60 * 1000;
  const FEEDBACK_KEY = "lunch-solver-feedback-v1";
  const HISTORY_KEY = "lunch-solver-history-v1";
  const PROFILE_KEY = "lunch-solver-profile-v1";
  const LOCAL_STATS_KEY = "lunch-solver-local-stats-v1";
  const RESTAURANT_STATS_KEY = "lunch-solver-restaurant-stats-v1";
  const MENU_DATA_URL = new URL("./data/menus.json", import.meta.url);

  let menuCache = null;
  let popularCache = null;
  let popularCacheBucket = null;

  function getHourBucket() {
    return Math.floor(Date.now() / POPULAR_REFRESH_MS);
  }

  function getFeedbackStore() {
    try {
      return JSON.parse(global.localStorage.getItem(FEEDBACK_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function setFeedbackStore(store) {
    global.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(store));
  }

  function hashText(text) {
    return text.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  function popularityScore(menu, index, bucket) {
    const feedback = getFeedbackStore()[menu.id] || {};
    const acceptedBoost = feedback.verdict === "accepted" ? 56 : 0;
    const rejectedPenalty = feedback.verdict === "rejected" ? -42 : 0;
    const timeWave = (hashText(menu.id) + bucket * 17 + index * 7) % 96;
    const lunchBoost = new Date().getHours() >= 11 && new Date().getHours() <= 13 ? 35 : 0;

    return Math.round(menu.baseLikes + timeWave + acceptedBoost + rejectedPenalty + lunchBoost);
  }

  async function getMenus() {
    if (menuCache) {
      return menuCache;
    }

    const response = await fetch(MENU_DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("메뉴 데이터를 불러오지 못했습니다.");
    }

    menuCache = await response.json();
    return menuCache;
  }

  async function getPopularMenus(limit = 8) {
    const bucket = getHourBucket();
    if (popularCache && popularCacheBucket === bucket) {
      return popularCache;
    }

    const menus = await getMenus();
    const updatedAt = new Date(bucket * POPULAR_REFRESH_MS);
    const nextUpdateAt = new Date((bucket + 1) * POPULAR_REFRESH_MS);

    const items = menus
      .map((menu, index) => ({
        ...menu,
        popularityScore: popularityScore(menu, index, bucket),
      }))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);

    popularCache = { updatedAt, nextUpdateAt, items };
    popularCacheBucket = bucket;
    return popularCache;
  }

  function saveFeedback(menuId, feedback) {
    const store = getFeedbackStore();
    store[menuId] = {
      ...(store[menuId] || {}),
      ...feedback,
      updatedAt: new Date().toISOString(),
    };
    setFeedbackStore(store);
    popularCache = null;
    return store[menuId];
  }

  function getFeedback(menuId) {
    return getFeedbackStore()[menuId] || { verdict: "" };
  }

  function createAnonymousId() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeProfile(profile = {}) {
    const location = profile.location || {};
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

    return {
      anonymousId: profile.anonymousId || profile.anonymous_id || createAnonymousId(),
      nickname: String(profile.nickname || "").trim(),
      regionName: String(profile.regionName || profile.region_name || "").trim(),
      locationLabel: hasLocation ? String(profile.locationLabel || profile.location_label || "").trim() : "",
      location: hasLocation
        ? {
            latitude,
            longitude,
            accuracy: Number(location.accuracy) || null,
            capturedAt: location.capturedAt || new Date().toISOString(),
          }
        : null,
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function getProfile() {
    try {
      const savedProfile = JSON.parse(global.localStorage.getItem(PROFILE_KEY));
      return savedProfile ? normalizeProfile(savedProfile) : null;
    } catch (error) {
      return null;
    }
  }

  function saveProfile(profile) {
    const previousProfile = getProfile();
    const nextProfile = normalizeProfile({ ...(previousProfile || {}), ...profile });
    global.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    return nextProfile;
  }

  function getLunchHistory() {
    try {
      const rawHistory = JSON.parse(global.localStorage.getItem(HISTORY_KEY)) || [];
      const latestByDate = new Map();
      rawHistory
        .filter((record) => record?.date)
        .sort((a, b) => new Date(b.decidedAt || 0) - new Date(a.decidedAt || 0))
        .forEach((record) => {
          if (!latestByDate.has(record.date)) latestByDate.set(record.date, record);
        });
      const normalizedHistory = [...latestByDate.values()];
      if (normalizedHistory.length !== rawHistory.length) {
        global.localStorage.setItem(HISTORY_KEY, JSON.stringify(normalizedHistory));
      }
      return normalizedHistory;
    } catch (error) {
      return [];
    }
  }

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getLocalStats() {
    try {
      return JSON.parse(global.localStorage.getItem(LOCAL_STATS_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveLocalStat(record) {
    const regionName = record.location ? record.locationLabel || "현재 위치" : "위치 미설정";
    const moodKey = record.moodLabels?.length ? record.moodLabels.join("+") : "상태 없음";
    const categoryKey = record.selectedCategories?.length ? record.selectedCategories.join("+") : "전체";
    const key = [record.date, regionName, categoryKey, moodKey, record.budgetMode, record.name].join("|");
    const stats = getLocalStats();
    stats[key] = {
      date: record.date,
      regionName,
      categoryKey,
      moodKey,
      budgetMode: record.budgetMode,
      menuName: record.name,
      category: record.category,
      count: (stats[key]?.count || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    global.localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
    return stats[key];
  }

  function normalizeRestaurantName(name) {
    return String(name || "").replace(/\s+/g, " ").trim();
  }

  function getRestaurantStats() {
    try {
      return JSON.parse(global.localStorage.getItem(RESTAURANT_STATS_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveRestaurantStat(record) {
    const restaurantName = normalizeRestaurantName(record.restaurantName);
    if (!restaurantName) return null;

    const regionName = record.location ? record.locationLabel || "현재 위치" : record.regionName || "지역 미설정";
    const menuName = record.name || "메뉴 미정";
    const key = [regionName, menuName, restaurantName].join("|");
    const stats = getRestaurantStats();
    const previous = stats[key] || {};
    const decidedDates = new Set(previous.decidedDates || []);
    if (record.date) decidedDates.add(record.date);

    stats[key] = {
      regionName,
      menuName,
      restaurantName,
      category: record.category || "",
      count: decidedDates.size || (previous.count || 0) + 1,
      decidedDates: [...decidedDates].sort(),
      firstSelectedAt: previous.firstSelectedAt || record.restaurantSelectedAt || record.decidedAt || new Date().toISOString(),
      lastSelectedAt: record.restaurantSelectedAt || record.decidedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    global.localStorage.setItem(RESTAURANT_STATS_KEY, JSON.stringify(stats));
    return stats[key];
  }

  function saveLunchDecision(menu, context = {}) {
    const history = getLunchHistory();
    const profile = context.profile || getProfile();
    const dateKey = context.date || getLocalDateKey();
    const location = context.location || profile?.location || null;
    const previousRecord = history.find((record) => record.date === dateKey);
    const isSameMenuAsPrevious = previousRecord && (previousRecord.menuId === menu.id || previousRecord.name === menu.name);
    const restaurantName = normalizeRestaurantName(context.restaurantName || (isSameMenuAsPrevious ? previousRecord?.restaurantName : ""));
    const nextRecord = {
      id: previousRecord?.id || `${dateKey}-${menu.id}-${Date.now()}`,
      anonymousId: profile?.anonymousId || "",
      nickname: profile?.nickname || "",
      regionName: context.regionName || previousRecord?.regionName || "",
      locationLabel: location ? context.locationLabel || profile?.locationLabel || previousRecord?.locationLabel || "현재 위치" : "",
      location: location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || null,
          }
        : null,
      menuId: menu.id,
      name: menu.name,
      category: menu.category,
      selectedCategories: context.selectedCategories || [],
      selectedMoods: context.selectedMoods || [],
      moodLabels: context.moodLabels || [],
      budgetMode: context.budgetMode || "상관없음",
      restaurantName,
      restaurantSelectedAt: restaurantName ? context.restaurantSelectedAt || (isSameMenuAsPrevious ? previousRecord?.restaurantSelectedAt : "") || new Date().toISOString() : "",
      decidedAt: new Date().toISOString(),
      date: dateKey,
      source: context.source || "decision",
    };
    const nextHistory = [nextRecord, ...history.filter((record) => record.date !== dateKey)].slice(0, 120);
    global.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    saveLocalStat(nextRecord);
    return nextRecord;
  }

  function saveRestaurantSelection(menu, context = {}) {
    const restaurantName = normalizeRestaurantName(context.restaurantName);
    if (!restaurantName) return null;

    const record = saveLunchDecision(menu, {
      ...context,
      restaurantName,
      restaurantSelectedAt: new Date().toISOString(),
      source: context.source || "restaurant",
    });
    saveRestaurantStat(record);
    return record;
  }

  app.api = {
    getMenus,
    getPopularMenus,
    saveFeedback,
    getFeedback,
    getProfile,
    saveProfile,
    saveLunchDecision,
    saveRestaurantSelection,
    getLunchHistory,
    getLocalStats,
    getRestaurantStats,
  };
})(window);

export const STRONG_MOOD_KEYS = ["spicy", "soup", "hangover", "noTime", "diet"];

const FAST_TAGS = ["fast", "quick", "portable", "sandwich", "burger", "wrap", "kimbap"];
const COLD_TAGS = ["cold", "cold-soup"];
const PRICE_BUDGET_TAGS = ["가볍게", "평범하게", "오늘은 써도 됨"];

export function hasTag(menu, tags) {
  const menuTags = Array.isArray(menu?.tags) ? menu.tags : [];
  return tags.some((tag) => menuTags.includes(tag));
}

export function isColdMenu(menu) {
  return hasTag(menu, COLD_TAGS);
}

export function hasFastSignals(menu) {
  return menu.speed >= 3 || menu.prepMinutes <= 8 || hasTag(menu, FAST_TAGS);
}

export function isFastMenu(menu) {
  return menu.quick === true || hasFastSignals(menu);
}

function isSoupish(menu) {
  return menu.soupLevel > 0 || hasTag(menu, ["soup", "broth", "stew", "ramen", "hotpot"]);
}

export function getMenuBudgetTag(menu) {
  if (PRICE_BUDGET_TAGS.includes(menu?.budget_tag)) return menu.budget_tag;
  if (typeof menu?.price === "number") {
    if (menu.price < 10000) return "가볍게";
    if (menu.price >= 15000) return "오늘은 써도 됨";
    return "평범하게";
  }
  if (menu?.priceLevel === "저렴" || menu?.priceTier === 1) return "가볍게";
  if (menu?.priceLevel === "프리미엄" || menu?.priceTier === 3) return "오늘은 써도 됨";
  return "평범하게";
}

export function getWalletTags(menu) {
  if (Array.isArray(menu?.walletTags) && menu.walletTags.length) return menu.walletTags;

  const budgetTag = getMenuBudgetTag(menu);
  const walletTags = budgetTag === "가볍게" ? ["월급 전"] : ["월급날"];
  if (menu?.budget_tag === "법카" || menu?.keywords?.includes("법카")) walletTags.push("법카");
  return walletTags;
}

export function matchesBudgetFilter(menu, budget) {
  if (budget === "상관없음") return true;
  return getWalletTags(menu).includes(budget);
}

function getBudgetScore(budget, menu) {
  const budgetTag = getMenuBudgetTag(menu);
  const walletTags = getWalletTags(menu);

  if (budget === "월급 전") return walletTags.includes("월급 전") ? 110 : -220;
  if (budget === "월급날") {
    if (!walletTags.includes("월급날")) return -80;
    return budgetTag === "오늘은 써도 됨" ? 86 : 58;
  }
  if (budget === "법카") return walletTags.includes("법카") ? 150 : -170;
  return 0;
}

export function matchesStrongMood(menu, mood) {
  if (menu.blockedMoods?.includes(mood) || menu.avoidMoods?.includes(mood)) return false;
  if (mood === "spicy") return menu.spiceLevel >= 2 || hasTag(menu, ["spicy"]);
  if (mood === "soup") return menu.soupLevel >= 1 || isSoupish(menu);
  if (mood === "hangover") return menu.hangoverFit >= 3 || menu.soupLevel >= 2;
  if (mood === "noTime") return isFastMenu(menu);
  if (mood === "diet") {
    return menu.healthy || menu.category === "건강식" || (menu.heaviness <= 1 && (menu.calories || 999) <= 650);
  }
  return true;
}

function applyMoodFilters(menus, filters) {
  const activeMoods = filters.moods || [];
  const unblockedMenus = menus.filter((menu) => {
    return !activeMoods.some((mood) => menu.blockedMoods?.includes(mood));
  });

  return activeMoods.reduce((currentMenus, mood) => {
    if (!STRONG_MOOD_KEYS.includes(mood)) return currentMenus;
    return currentMenus.filter((menu) => matchesStrongMood(menu, mood));
  }, unblockedMenus);
}

export function scoreMenu(menu, filters, options = {}) {
  const feedbackAdjustment = Number(options.feedbackAdjustment) || 0;
  let score = menu.baseLikes / 25 + feedbackAdjustment;

  if (menu.name === "튀김세트") score -= 90;
  if (filters.categories.includes(menu.category)) score += 90;
  score += getBudgetScore(filters.budget, menu);

  filters.moods.forEach((mood) => {
    const confidence = Number.isFinite(menu.confidence) ? menu.confidence : 0.75;
    if (menu.recommendedMoods?.includes(mood)) score += 48 * confidence;
    if (menu.blockedMoods?.includes(mood)) score -= 120 * confidence;
    else if (menu.avoidMoods?.includes(mood)) score -= 42;
    if (mood === "spicy") score += menu.spiceLevel >= 2 ? 110 + menu.spiceLevel * 10 : -240;
    if (mood === "soup") score += menu.soupLevel >= 1 ? 80 + menu.soupLevel * 18 : -160;
    if (mood === "hangover") score += menu.hangoverFit * 34 + menu.soupLevel * 12 + (hasTag(menu, ["noodle", "rice"]) ? 12 : 0);
    if (mood === "noTime") score += menu.speed * 34 + (isFastMenu(menu) ? 36 : -80);
    if (mood === "solo") score += menu.soloFit * 18 + (menu.quick ? 8 : 0);
    if (mood === "team") score += menu.teamFit * 18 + (hasTag(menu, ["set", "pizza", "team"]) ? 18 : 0);
    if (mood === "comfort") score += menu.meetingSafe * 14 + (menu.heaviness <= 1 ? 36 : 0) + (menu.healthy ? 18 : 0) - menu.spiceLevel * 36 - (hasTag(menu, ["fried"]) ? 34 : 0);
    if (mood === "safe") score += menu.baseLikes / 9 + (menu.keywords?.includes("실패 낮음") ? 36 : 0) + menu.meetingSafe * 7;
    if (mood === "meeting") score += menu.meetingSafe * 28 - menu.spiceLevel * 24 - menu.heaviness * 12 - (hasTag(menu, ["fish", "fried"]) ? 24 : 0);
    if (mood === "diet") score += (menu.healthy ? 74 : 0) + (menu.category === "건강식" ? 60 : 0) + (menu.heaviness <= 1 ? 48 : -62) + ((menu.calories || 999) <= 650 ? 38 : -42) - (hasTag(menu, ["fried"]) ? 64 : 0) - (menu.heaviness >= 3 ? 80 : 0);
    if (mood === "sleepy") score += menu.spiceLevel * 16 + (hasTag(menu, ["curry", "fresh"]) ? 26 : 0) + (menu.keywords?.includes("가벼움") ? 14 : 0);
    if (mood === "rainy") score += menu.soupLevel * 28 + (hasTag(menu, ["noodle"]) ? 18 : 0) + (menu.spiceLevel >= 2 ? 8 : 0) - (isColdMenu(menu) ? 64 : 0);
  });

  return score;
}

export function hasActiveFilters(filters) {
  return filters.categories.length > 0 || filters.moods.length > 0 || filters.budget !== "상관없음";
}

export function getCandidateMenus(menus, filters, options = {}) {
  const categoryFiltered = filters.categories.length
    ? menus.filter((menu) => filters.categories.includes(menu.category))
    : menus;
  const budgetFiltered = categoryFiltered.filter((menu) => matchesBudgetFilter(menu, filters.budget));
  const budgetBase = budgetFiltered.length ? budgetFiltered : categoryFiltered;
  const pool = applyMoodFilters(budgetBase, filters);
  const score = options.scoreMenu || ((menu) => scoreMenu(menu, filters));

  return pool
    .map((menu) => ({ ...menu, decisionScore: score(menu) }))
    .sort((a, b) => b.decisionScore - a.decisionScore);
}

export function pickRecommendation(candidates, activeFilters, options = {}) {
  if (!candidates.length) return null;
  const random = options.random || Math.random;

  if (!hasActiveFilters(activeFilters)) {
    return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  }

  const recommendationPool = candidates.slice(0, Math.min(8, candidates.length));
  const minScore = Math.min(...recommendationPool.map((menu) => menu.decisionScore || 0));
  const weightedMenus = recommendationPool.map((menu) => ({
    menu,
    weight: Math.max(4, (menu.decisionScore || 0) - minScore + 12),
  }));
  const totalWeight = weightedMenus.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * totalWeight;

  for (const item of weightedMenus) {
    cursor -= item.weight;
    if (cursor <= 0) return item.menu;
  }
  return recommendationPool[0];
}

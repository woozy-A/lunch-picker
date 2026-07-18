const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const menuPath = path.join(projectRoot, "src/data/menus.json");
const filterDatasetPath = path.join(projectRoot, "src/data/menu-filter-dataset.json");
const recommendationRulesPath = path.join(projectRoot, "src/data/recommendationRules.json");
const menus = JSON.parse(fs.readFileSync(menuPath, "utf8"));
const filterDataset = JSON.parse(fs.readFileSync(filterDatasetPath, "utf8"));
const recommendationRules = JSON.parse(fs.readFileSync(recommendationRulesPath, "utf8"));

const PRICE_BUDGET_TAGS = new Set(["가볍게", "평범하게", "오늘은 써도 됨"]);
const FAST_TAGS = new Set(["fast", "quick", "portable", "sandwich", "burger", "wrap", "kimbap"]);

// 법카는 가격대가 아니라 식사 맥락입니다. 저녁 메뉴가 추가돼도 규칙 파일이나 "법카" 키워드로 확장합니다.
const COMPANY_CARD_MENUS = new Set(recommendationRules.companyCardMenus || []);

const MENU_OVERRIDES = {
  라면: {
    removeAvoid: ["hangover"],
  },
  굴짬뽕: {
    spiceLevel: 1,
    spicy: false,
    removeRecommended: ["spicy"],
    addAvoid: ["spicy"],
    removeSituationTags: ["매운 걸로"],
  },
  중화냉면: {
    removeAvoid: ["hangover", "soup"],
    addTags: ["noodle", "cold"],
    removeTags: ["rice"],
  },
  회덮밥: {
    spiceLevel: 1,
    spicy: false,
    removeRecommended: ["spicy"],
    removeAvoid: ["spicy"],
    removeSituationTags: ["매운 걸로"],
  },
  묵밥: {
    removeAvoid: ["hangover", "soup"],
    addTags: ["soup", "cold"],
  },
};

function deriveBudgetTag(menu) {
  if (PRICE_BUDGET_TAGS.has(menu.budget_tag)) return menu.budget_tag;
  if (typeof menu.price === "number") {
    if (menu.price < 10000) return "가볍게";
    if (menu.price >= 15000) return "오늘은 써도 됨";
  }
  return "평범하게";
}

function deriveWalletTags(menu, budgetTag) {
  const walletTags = [budgetTag === "가볍게" ? "월급 전" : "월급날"];
  if (COMPANY_CARD_MENUS.has(menu.name) || menu.keywords?.includes("법카")) walletTags.push("법카");
  return walletTags;
}

function deriveQuick(menu) {
  return menu.speed >= 3 || menu.prepMinutes <= 8 || (menu.tags || []).some((tag) => FAST_TAGS.has(tag));
}

function updateSet(values, additions = [], removals = []) {
  const result = new Set(values || []);
  removals.forEach((value) => result.delete(value));
  additions.forEach((value) => result.add(value));
  return result;
}

function normalizeMenu(menu) {
  const override = MENU_OVERRIDES[menu.name] || {};
  const recommended = updateSet(menu.recommendedMoods, [], override.removeRecommended);
  const blocked = updateSet(menu.blockedMoods);
  const avoid = updateSet(menu.avoidMoods, override.addAvoid, override.removeAvoid);
  const tags = updateSet(menu.tags, override.addTags, override.removeTags);
  const situationTags = updateSet(menu.situation_tags, [], override.removeSituationTags);

  for (const mood of recommended) {
    if (blocked.has(mood)) throw new Error(`${menu.name}: ${mood}가 추천과 차단에 동시에 있습니다.`);
    avoid.delete(mood);
  }
  for (const mood of blocked) avoid.delete(mood);

  const budgetTag = deriveBudgetTag(menu);
  const walletTags = deriveWalletTags(menu, budgetTag);
  const keywords = updateSet(menu.keywords);
  if (walletTags.includes("법카")) keywords.add("법카");

  return {
    ...menu,
    ...(override.spiceLevel === undefined ? {} : { spiceLevel: override.spiceLevel }),
    ...(override.spicy === undefined ? {} : { spicy: override.spicy }),
    quick: deriveQuick({ ...menu, tags: [...tags] }),
    tags: [...tags],
    recommendedMoods: [...recommended],
    blockedMoods: [...blocked],
    keywords: [...keywords],
    avoidMoods: [...avoid],
    situation_tags: [...situationTags],
    budget_tag: budgetTag,
    walletTags,
  };
}

for (const name of COMPANY_CARD_MENUS) {
  if (!menus.some((menu) => menu.name === name)) throw new Error(`법카 메뉴를 찾지 못했습니다: ${name}`);
}

const normalizedMenus = menus.map(normalizeMenu);
const menuByName = new Map(normalizedMenus.map((menu) => [menu.name, menu]));
const normalizedFilterDataset = filterDataset.map((item) => {
  const menu = menuByName.get(item.name);
  if (!menu) throw new Error(`필터 데이터 메뉴를 찾지 못했습니다: ${item.name}`);
  return {
    ...item,
    situation_tags: menu.situation_tags,
    budget_tag: menu.budget_tag,
    walletTags: menu.walletTags,
  };
});

fs.writeFileSync(menuPath, `${JSON.stringify(normalizedMenus, null, 2)}\n`);
fs.writeFileSync(filterDatasetPath, `${JSON.stringify(normalizedFilterDataset, null, 2)}\n`);

console.log(`추천 데이터 정리 완료: ${normalizedMenus.length}개 메뉴`);
console.log(`법카 후보: ${normalizedMenus.filter((menu) => menu.walletTags.includes("법카")).length}개`);

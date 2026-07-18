const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const menuPath = path.join(projectRoot, "src/data/menus.json");
const filterDatasetPath = path.join(projectRoot, "src/data/menu-filter-dataset.json");
const recommendationRulesPath = path.join(projectRoot, "src/data/recommendationRules.json");
const menus = JSON.parse(fs.readFileSync(menuPath, "utf8"));
const filterDataset = JSON.parse(fs.readFileSync(filterDatasetPath, "utf8"));
const recommendationRules = JSON.parse(fs.readFileSync(recommendationRulesPath, "utf8"));
const errors = [];
const seenIds = new Set();
const seenNames = new Set();
const numericRanges = {
  spiceLevel: [0, 3],
  soupLevel: [0, 2],
  heaviness: [0, 3],
  speed: [0, 4],
  soloFit: [0, 5],
  teamFit: [0, 5],
  meetingSafe: [0, 4],
  hangoverFit: [0, 4],
  confidence: [0, 1],
};
const moodKeys = new Set([
  "noTime",
  "hangover",
  "solo",
  "team",
  "comfort",
  "spicy",
  "soup",
  "safe",
  "meeting",
  "diet",
  "sleepy",
  "rainy",
]);
const strongMoodKeys = new Set(["spicy", "soup", "hangover", "noTime", "diet"]);
const budgetTags = new Set(["가볍게", "평범하게", "오늘은 써도 됨"]);
const walletTags = new Set(["월급 전", "월급날", "법카"]);

function getImageUrl(entry) {
  if (typeof entry === "string") return entry;
  return entry?.url || entry?.imageUrl || entry?.localUrl || "";
}

function isLocalImage(url) {
  return url.startsWith("./assets/") || url.startsWith("assets/");
}

function report(menu, message) {
  errors.push(`${menu.id || "unknown"} ${menu.name || "이름 없음"}: ${message}`);
}

function hasAnyTag(menu, tags) {
  return (menu.tags || []).some((tag) => tags.includes(tag));
}

function isFastMenu(menu) {
  return menu.speed >= 3
    || menu.prepMinutes <= 8
    || hasAnyTag(menu, ["fast", "quick", "portable", "sandwich", "burger", "wrap", "kimbap"]);
}

function matchesStrongMood(menu, mood) {
  if (mood === "spicy") return menu.spiceLevel >= 2 || hasAnyTag(menu, ["spicy"]);
  if (mood === "soup") return menu.soupLevel >= 1 || hasAnyTag(menu, ["soup"]);
  if (mood === "hangover") return menu.hangoverFit >= 3 || menu.soupLevel >= 2;
  if (mood === "noTime") return isFastMenu(menu);
  if (mood === "diet") {
    return menu.healthy
      || menu.category === "건강식"
      || (menu.heaviness <= 1 && (menu.calories || 999) <= 650);
  }
  return true;
}

menus.forEach((menu) => {
  ["id", "name", "category", "description", "imageUrl"].forEach((field) => {
    if (!menu[field]) report(menu, `${field} 값이 없습니다.`);
  });

  if (seenIds.has(menu.id)) report(menu, "id가 중복됩니다.");
  if (seenNames.has(menu.name)) report(menu, "메뉴 이름이 중복됩니다.");
  seenIds.add(menu.id);
  seenNames.add(menu.name);

  Object.entries(numericRanges).forEach(([field, [min, max]]) => {
    const value = menu[field];
    if (!Number.isFinite(value) || value < min || value > max) {
      report(menu, `${field}=${value} 값이 ${min}~${max} 범위를 벗어났습니다.`);
    }
  });

  const recommended = new Set(menu.recommendedMoods || []);
  const blocked = new Set(menu.blockedMoods || []);
  const avoid = new Set(menu.avoidMoods || []);
  const recommendedBlockedConflicts = [...blocked].filter((mood) => recommended.has(mood));
  const recommendedAvoidConflicts = [...avoid].filter((mood) => recommended.has(mood));
  const blockedAvoidConflicts = [...avoid].filter((mood) => blocked.has(mood));
  if (recommendedBlockedConflicts.length) report(menu, `추천/차단 무드가 겹칩니다: ${recommendedBlockedConflicts.join(", ")}`);
  if (recommendedAvoidConflicts.length) report(menu, `추천/피하기 무드가 겹칩니다: ${recommendedAvoidConflicts.join(", ")}`);
  if (blockedAvoidConflicts.length) report(menu, `차단/피하기 무드가 겹칩니다: ${blockedAvoidConflicts.join(", ")}`);

  ["recommendedMoods", "blockedMoods", "avoidMoods"].forEach((field) => {
    (menu[field] || []).forEach((mood) => {
      if (!moodKeys.has(mood)) report(menu, `${field}에 알 수 없는 무드가 있습니다: ${mood}`);
    });
  });

  (menu.recommendedMoods || []).forEach((mood) => {
    if (strongMoodKeys.has(mood) && !matchesStrongMood(menu, mood)) {
      report(menu, `${mood} 추천 무드와 음식 수치가 맞지 않습니다.`);
    }
  });

  if (!budgetTags.has(menu.budget_tag)) report(menu, `알 수 없는 가격대입니다: ${menu.budget_tag}`);
  if (!Array.isArray(menu.walletTags) || !menu.walletTags.length) {
    report(menu, "walletTags가 없거나 비어 있습니다.");
  } else {
    const duplicatedWalletTags = menu.walletTags.filter((tag, index) => menu.walletTags.indexOf(tag) !== index);
    if (duplicatedWalletTags.length) report(menu, `지갑 태그가 중복됩니다: ${duplicatedWalletTags.join(", ")}`);
    menu.walletTags.forEach((tag) => {
      if (!walletTags.has(tag)) report(menu, `알 수 없는 지갑 태그입니다: ${tag}`);
    });
  }

  if (menu.quick !== isFastMenu(menu)) {
    report(menu, `quick=${menu.quick} 값이 speed/prepMinutes/tags와 맞지 않습니다.`);
  }

  const imageEntries = [...(Array.isArray(menu.imageUrls) ? menu.imageUrls : []), menu.imageUrl];
  imageEntries.map(getImageUrl).filter(isLocalImage).forEach((url) => {
    const assetPath = path.join(projectRoot, url.replace(/^\.\//, ""));
    if (!fs.existsSync(assetPath)) report(menu, `로컬 이미지가 없습니다: ${url}`);
  });
});

if (filterDataset.length !== menus.length) {
  errors.push(`필터 데이터 ${filterDataset.length}개와 메뉴 데이터 ${menus.length}개의 개수가 다릅니다.`);
}

filterDataset.forEach((item, index) => {
  if (item.name !== menus[index]?.name) {
    errors.push(`필터 데이터 ${index + 1}번 메뉴 순서가 menus.json과 다릅니다.`);
  }
  if (JSON.stringify(item.walletTags || []) !== JSON.stringify(menus[index]?.walletTags || [])) {
    errors.push(`필터 데이터 ${index + 1}번 메뉴의 walletTags가 menus.json과 다릅니다.`);
  }
  if (item.budget_tag !== menus[index]?.budget_tag) {
    errors.push(`필터 데이터 ${index + 1}번 메뉴의 budget_tag가 menus.json과 다릅니다.`);
  }
  if (JSON.stringify(item.situation_tags || []) !== JSON.stringify(menus[index]?.situation_tags || [])) {
    errors.push(`필터 데이터 ${index + 1}번 메뉴의 situation_tags가 menus.json과 다릅니다.`);
  }
});

(recommendationRules.companyCardMenus || []).forEach((name) => {
  const menu = menus.find((item) => item.name === name);
  if (!menu) {
    errors.push(`법카 규칙 메뉴가 menus.json에 없습니다: ${name}`);
  } else if (!menu.walletTags?.includes("법카")) {
    errors.push(`${name}: 법카 규칙 메뉴인데 walletTags에 법카가 없습니다.`);
  }
});

if (errors.length) {
  console.error(`메뉴 데이터 검사 실패 (${errors.length}건)`);
  errors.slice(0, 50).forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const localImageMenus = menus.filter((menu) => {
    const entries = [...(Array.isArray(menu.imageUrls) ? menu.imageUrls : []), menu.imageUrl];
    return entries.map(getImageUrl).some(isLocalImage);
  }).length;
  console.log(`메뉴 데이터 검사 완료: ${menus.length}개, 로컬 사진 보유 ${localImageMenus}개`);
}

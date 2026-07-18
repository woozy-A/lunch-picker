import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCandidateMenus,
  hasFastSignals,
  isColdMenu,
  matchesBudgetFilter,
  pickRecommendation,
} from "../src/recommendationEngine.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const menus = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/menus.json"), "utf8"));
const rules = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/recommendationRules.json"), "utf8"));
const DEFAULT_FILTERS = { categories: [], moods: [], budget: "상관없음" };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function filters(overrides = {}) {
  return { ...DEFAULT_FILTERS, ...overrides };
}

const defaultCandidates = getCandidateMenus(menus, DEFAULT_FILTERS);
assert(defaultCandidates.length === menus.length, `아무거나 후보가 ${menus.length}개가 아닙니다: ${defaultCandidates.length}`);

const reachableIds = new Set();
defaultCandidates.forEach((_, index) => {
  const random = () => (index + 0.5) / defaultCandidates.length;
  reachableIds.add(pickRecommendation(defaultCandidates, DEFAULT_FILTERS, { random }).id);
});
assert(reachableIds.size === menus.length, `아무거나에서 도달 가능한 메뉴가 ${reachableIds.size}개뿐입니다.`);

const scoreSkewedCandidates = [
  { id: "low-score", decisionScore: -9999 },
  { id: "high-score", decisionScore: 9999 },
];
assert(pickRecommendation(scoreSkewedCandidates, DEFAULT_FILTERS, { random: () => 0.1 }).id === "low-score", "아무거나가 점수가 높은 메뉴를 우대합니다.");
assert(pickRecommendation(scoreSkewedCandidates, DEFAULT_FILTERS, { random: () => 0.9 }).id === "high-score", "아무거나가 후보 순서를 균등하게 사용하지 않습니다.");

const spicyFilters = filters({ moods: ["spicy"] });
const spicyCandidates = getCandidateMenus(menus, spicyFilters);
const spicyTopIds = new Set(spicyCandidates.slice(0, 8).map((menu) => menu.id));
for (let index = 0; index < 100; index += 1) {
  const random = () => (index + 0.5) / 100;
  const picked = pickRecommendation(spicyCandidates, spicyFilters, { random });
  assert(spicyTopIds.has(picked.id), `조건 추천이 상위 8개 밖에서 선택됐습니다: ${picked.name}`);
}

const chineseFilters = filters({ categories: ["중식"], moods: ["hangover", "spicy", "soup"] });
const chineseCandidates = getCandidateMenus(menus, chineseFilters);
const chineseNames = chineseCandidates.map((menu) => menu.name);
assert(chineseCandidates.length > 0, "중식+해장+매운+국물 후보가 없습니다.");
assert(!chineseNames.some((name) => ["유산슬덮밥", "잡채밥", "볶음밥", "고추잡채밥"].includes(name)), `중식 강한 조건에 맞지 않는 메뉴가 섞였습니다: ${chineseNames.join(", ")}`);
assert(chineseCandidates.every((menu) => menu.spiceLevel >= 2 && menu.soupLevel >= 1 && menu.hangoverFit >= 3), "중식 강한 조건 후보의 수치가 맞지 않습니다.");

const companyCardCandidates = getCandidateMenus(menus, filters({ budget: "법카" }));
const companyCardNames = new Set(companyCardCandidates.map((menu) => menu.name));
assert(companyCardCandidates.length === rules.companyCardMenus.length, `법카 후보 수가 규칙 파일과 다릅니다: ${companyCardCandidates.length}`);
for (const name of rules.companyCardMenus) assert(companyCardNames.has(name), `법카 후보에서 빠진 메뉴입니다: ${name}`);
assert(companyCardNames.has("한우구이정식") && companyCardNames.has("고추잡채밥"), "사용자가 지정한 법카 메뉴가 빠졌습니다.");
assert(menus.every((menu) => menu.budget_tag !== "법카"), "가격대 필드에 법카 값이 남아 있습니다.");
assert(menus.every((menu) => matchesBudgetFilter(menu, "법카") === menu.walletTags.includes("법카")), "법카 필터와 walletTags가 일치하지 않습니다.");

for (const menu of menus) {
  const recommended = new Set(menu.recommendedMoods || []);
  const blocked = new Set(menu.blockedMoods || []);
  const avoid = new Set(menu.avoidMoods || []);
  assert(![...recommended].some((mood) => blocked.has(mood) || avoid.has(mood)), `${menu.name}: 추천 무드가 차단/피하기와 겹칩니다.`);
  assert(![...blocked].some((mood) => avoid.has(mood)), `${menu.name}: 차단 무드가 피하기와 겹칩니다.`);
  assert(menu.quick === hasFastSignals(menu), `${menu.name}: quick 값과 실제 속도 신호가 다릅니다.`);
}

for (const mood of ["spicy", "soup", "hangover", "noTime", "diet"]) {
  const candidates = getCandidateMenus(menus, filters({ moods: [mood] }));
  assert(candidates.every((menu) => !menu.blockedMoods.includes(mood) && !menu.avoidMoods.includes(mood)), `${mood} 강한 필터에 차단/피하기 메뉴가 들어왔습니다.`);
}

const dietNames = new Set(getCandidateMenus(menus, filters({ moods: ["diet"] })).map((menu) => menu.name));
assert(!dietNames.has("된장찌개") && !dietNames.has("순두부찌개"), "된장찌개 또는 순두부찌개가 다이어트 후보에 들어왔습니다.");
assert(isColdMenu(menus.find((menu) => menu.name === "냉면")), "냉면이 차가운 메뉴로 분류되지 않았습니다.");
assert(isColdMenu(menus.find((menu) => menu.name === "중화냉면")), "중화냉면이 차가운 메뉴로 분류되지 않았습니다.");
assert(isColdMenu(menus.find((menu) => menu.name === "묵밥")), "묵밥이 차가운 메뉴로 분류되지 않았습니다.");

console.log(`추천 알고리즘 검사 완료: 아무거나 ${reachableIds.size}개 균등 도달, 법카 ${companyCardCandidates.length}개, 중식 강한 조건 ${chineseCandidates.length}개`);

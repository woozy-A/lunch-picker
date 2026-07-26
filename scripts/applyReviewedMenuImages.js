const fs = require("fs");
const path = require("path");
const generatedImageBatch = [
  ...require("./generatedImageBatch20260719"),
  ...require("./generatedImageQualityBatch20260721"),
  ...require("./generatedImagePolishBatch20260726"),
];

const projectRoot = path.resolve(__dirname, "..");
const menuPath = path.join(projectRoot, "src/data/menus.json");
const filterDatasetPath = path.join(projectRoot, "src/data/menu-filter-dataset.json");
const imageReviewQueuePath = path.join(projectRoot, "reports/menu-image-review-queue.json");

const generatedBatchReviews = Object.fromEntries(generatedImageBatch.map((item) => [
  item.id,
  {
    imageUrl: `./assets/menu-reviewed/${item.filename}.jpg`,
    reason: item.reason || "메뉴명, 구성, 음식 중심 구도와 식욕도를 대조해 승인한 밥픽 제작 이미지",
    reviewedAt: item.reviewedAt || "2026-07-19",
  },
]));

const reviews = {
  "kr-004": {
    imageUrl: "./assets/menu-reviewed/budae-jjigae.jpg",
    reason: "햄과 소시지, 두부, 라면 사리가 밝게 보이는 부대찌개 대표 사진",
  },
  "kr-042": {
    imageUrl: "./assets/menu-reviewed/daegu-tang.jpg",
    reason: "흰 대구 살과 생선 껍질이 명확한 맑은 대구탕 사진",
  },
  "kr-046": {
    imageUrl: "./assets/menu-reviewed/ox-head-gukbap.jpg",
    reason: "뚝배기에 소고기와 파가 푸짐하게 보이는 소머리국밥 사진",
  },
  "ff-015": {
    imageUrl: "./assets/menu-reviewed/chicken-tender-set.jpg",
    reason: "치킨텐더, 감자튀김, 소스와 콜슬로가 분리된 세트 사진",
  },
  "top-023": {
    name: "햄버거세트",
    imageUrl: "./assets/menu-reviewed/burger-set.jpg",
    reason: "버거, 감자튀김, 음료가 모두 보이는 햄버거 세트 사진",
  },
  ...generatedBatchReviews,
};

function reviewedImageEntry(review, menuName) {
  return {
    url: review.imageUrl,
    sourceName: "밥픽 제작 이미지",
    sourceUrl: "",
    title: `${menuName} 대표 이미지`,
    license: "프로젝트 제작 이미지",
  };
}

const menus = JSON.parse(fs.readFileSync(menuPath, "utf8"));
const filterDataset = JSON.parse(fs.readFileSync(filterDatasetPath, "utf8"));
const renamedMenus = new Map();

const nextMenus = menus.map((menu) => {
  const review = reviews[menu.id];
  if (!review) return menu;

  const previousName = menu.name;
  const nextName = review.name || previousName;
  if (previousName !== nextName) renamedMenus.set(previousName, nextName);

  return {
    ...menu,
    name: nextName,
    ingredients: (menu.ingredients || []).map((ingredient) => (ingredient === previousName ? nextName : ingredient)),
    imageUrl: review.imageUrl,
    imageUrls: [reviewedImageEntry(review, nextName)],
    imageSourceName: "밥픽 제작 이미지",
    imageSourceUrl: "",
    imageTitle: `${nextName} 대표 이미지`,
    imageAuthor: "밥픽",
    imageLicense: "프로젝트 제작 이미지",
    imageSearchKeywords: [nextName, `${nextName} 음식 사진`, `${nextName} 점심 메뉴`],
    imageReview: {
      status: "approved",
      reviewedAt: review.reviewedAt || "2026-07-18",
      reason: review.reason,
    },
  };
});

const nextFilterDataset = filterDataset.map((item) => ({
  ...item,
  name: renamedMenus.get(item.name) || item.name,
}));

fs.writeFileSync(menuPath, `${JSON.stringify(nextMenus, null, 2)}\n`);
fs.writeFileSync(filterDatasetPath, `${JSON.stringify(nextFilterDataset, null, 2)}\n`);

let resolvedQueueCount = 0;
if (fs.existsSync(imageReviewQueuePath)) {
  const queue = JSON.parse(fs.readFileSync(imageReviewQueuePath, "utf8"));
  const generatedIds = new Set(generatedImageBatch.map((item) => item.id));
  const nextQueue = queue.filter((item) => !generatedIds.has(item.id));
  resolvedQueueCount = queue.length - nextQueue.length;
  fs.writeFileSync(imageReviewQueuePath, `${JSON.stringify(nextQueue, null, 2)}\n`);
}

console.log(`검수 완료 이미지 반영: ${Object.keys(reviews).length}개`);
console.log(`메뉴명 변경: ${renamedMenus.size}개`);
console.log(`이미지 검수 대기열 해결: ${resolvedQueueCount}개`);

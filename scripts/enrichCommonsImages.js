const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const menusPath = path.join(rootDir, "src/data/menus.json");
const outputPath = path.join(rootDir, "src/data/menus.json");

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WAIT_MS = 110;
const RESULT_LIMIT = 8;

const BAD_TITLE_WORDS = [
  "logo",
  "map",
  "diagram",
  "icon",
  "symbol",
  "sign",
  "menu",
  "packaging",
  "wrapper",
  "advert",
  "poster",
  "ingredient",
  "raw",
  "uncooked",
  "market",
  "street",
  "restaurant",
  "food by",
];

const GOOD_LICENSES = ["cc0", "public domain", "cc by", "cc-by", "cc by-sa", "cc-by-sa"];
const FORCED_FALLBACK_NAMES = new Set([
  "차돌된장밥",
  "볶음밥",
  "유산슬덮밥",
  "깐풍기정식",
  "감바스정식",
  "라면",
  "푸팟퐁커리",
  "똠얌쌀국수",
  "그릭요거트볼",
  "순대국밥",
  "닭곰탕",
  "장터국밥",
  "고추장불고기",
  "로제파스타",
  "고기만두",
  "비빔만두",
  "그린커리",
  "참치마요덮밥",
  "컵밥",
  "짜장밥",
  "김치말이국수",
  "두부면파스타",
]);
const GENERIC_TERMS = new Set([
  "food",
  "lunch",
  "rice",
  "bowl",
  "set",
  "korean food",
  "japanese food",
  "chinese food",
  "thai food",
  "vietnamese food",
  "fast food",
]);
const DISSONANT_BY_NAME = [
  { pattern: /덮밥|동|밥$/, bad: ["pasta", "spaghetti", "noodle", "ramen", "burger", "pizza", "sandwich", "soup shop"] },
  { pattern: /라멘|면|국수|우동|소바|냉면|짬뽕|짜장면|칼국수|수제비/, bad: ["burger", "pizza", "sandwich", "steak set"] },
  { pattern: /피자/, bad: ["pasta", "noodle", "soup", "burger"] },
  { pattern: /버거/, bad: ["pasta", "noodle", "soup", "pizza"] },
  { pattern: /샐러드|포케/, bad: ["burger", "pizza", "ramen", "noodle soup"] },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanHtml(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/^file:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[()&/,_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value = "") {
  return normalize(value).replace(/\s+/g, "");
}

function stripMenuName(name) {
  return String(name)
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/&/g, " ")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExistingSearchTerms(menu) {
  if (!menu.imageUrl) return [];
  try {
    const url = new URL(menu.imageUrl);
    const rawQuery = decodeURIComponent(url.search.replace(/^\?/, ""));
    return rawQuery
      .split(",")
      .map((term) => term.replace(/[-_]+/g, " ").trim())
      .filter(Boolean)
      .filter((term) => !["food", "lunch"].includes(term.toLowerCase()));
  } catch {
    return [];
  }
}

function getSpecificSearchTerms(menu) {
  return getExistingSearchTerms(menu).filter((term) => !GENERIC_TERMS.has(term.toLowerCase()));
}

function buildQueries(menu) {
  const name = menu.name;
  const stripped = stripMenuName(name);
  const existingTerms = getSpecificSearchTerms(menu);
  const queries = [
    name,
    stripped,
    `${stripped} food`,
    ...existingTerms,
    ...existingTerms.map((term) => `${term} food`),
  ];

  return [...new Set(queries.map((query) => query.trim()).filter((query) => query.length > 1))].slice(0, 5);
}

function isGoodLicense(license = "") {
  const normalized = license.toLowerCase();
  return GOOD_LICENSES.some((allowed) => normalized.includes(allowed));
}

function scoreCandidate(menu, query, candidate) {
  const title = normalize(candidate.title);
  const titleCompact = compact(candidate.title);
  const name = normalize(menu.name);
  const nameCompact = compact(menu.name);
  const stripped = normalize(stripMenuName(menu.name));
  const strippedCompact = compact(stripMenuName(menu.name));
  const queryTerms = normalize(query).split(" ").filter((term) => term.length >= 3 && !GENERIC_TERMS.has(term));
  const specificTerms = getSpecificSearchTerms(menu);
  const oldTerms = specificTerms.flatMap((term) => normalize(term).split(" ")).filter((term) => term.length >= 3 && !GENERIC_TERMS.has(term));
  const license = candidate.license || "";
  const hasExactName = titleCompact.includes(nameCompact) || (strippedCompact && titleCompact.includes(strippedCompact));
  const hasExactSpecificTerm = specificTerms.some((term) => {
    const termCompact = compact(term);
    return termCompact.length >= 5 && titleCompact.includes(termCompact);
  });
  const matchedOldTermCount = oldTerms.filter((term) => title.includes(term)).length;
  const hasStrongTokenMatch = oldTerms.length >= 2 && matchedOldTermCount >= Math.min(2, oldTerms.length);
  const hasStrongMatch = hasExactName || hasExactSpecificTerm || hasStrongTokenMatch;
  const dissonant = DISSONANT_BY_NAME.some(({ pattern, bad }) => pattern.test(menu.name) && bad.some((word) => title.includes(word)));

  if (!hasStrongMatch || dissonant) return -999;

  let score = 0;
  if (candidate.mime?.startsWith("image/")) score += 12;
  if (candidate.url && /\.(jpe?g|png|webp)$/i.test(candidate.url)) score += 8;
  if (titleCompact.includes(nameCompact)) score += 80;
  if (strippedCompact && titleCompact.includes(strippedCompact)) score += 62;
  if (title.includes(name)) score += 50;
  if (title.includes(stripped)) score += 42;
  queryTerms.forEach((term) => {
    if (title.includes(term)) score += 18;
  });
  oldTerms.forEach((term) => {
    if (title.includes(term)) score += 10;
  });
  if (title.includes("korean") && menu.category === "한식") score += 9;
  if (title.includes("japanese") && menu.category === "일식") score += 9;
  if (title.includes("chinese") && menu.category === "중식") score += 9;
  if (title.includes("thai") && menu.category === "아시안") score += 7;
  if (isGoodLicense(license)) score += 8;
  BAD_TITLE_WORDS.forEach((badWord) => {
    if (title.includes(badWord)) score -= 18;
  });
  if (!candidate.thumbUrl) score -= 4;

  return score;
}

async function searchCommons(menu, query) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: String(RESULT_LIMIT),
    gsrsearch: `${query} filetype:bitmap`,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "960",
    format: "json",
    origin: "*",
  });

  const response = await fetch(`${COMMONS_API}?${params.toString()}`, {
    headers: {
      "User-Agent": "BabpickLunchPicker/1.0 (https://github.com/woozy-A/lunch-picker)",
    },
  });

  if (!response.ok) {
    throw new Error(`Commons API failed: ${response.status}`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .flatMap((page) => {
      const image = page.imageinfo?.[0];
      if (!image) return [];
      const meta = image.extmetadata || {};
      return [
        {
          title: page.title,
          url: image.url,
          thumbUrl: image.thumburl || image.url,
          descriptionUrl: image.descriptionurl,
          mime: image.mime,
          license: cleanHtml(meta.LicenseShortName?.value || meta.License?.value || ""),
          author: cleanHtml(meta.Artist?.value || meta.Credit?.value || ""),
        },
      ];
    })
    .filter((candidate) => candidate.mime?.startsWith("image/"));
}

async function findImage(menu) {
  if (FORCED_FALLBACK_NAMES.has(menu.name)) {
    return null;
  }

  const queries = buildQueries(menu);
  const candidates = [];

  for (const query of queries) {
    try {
      const results = await searchCommons(menu, query);
      results.forEach((candidate) => {
        candidates.push({
          ...candidate,
          query,
          score: scoreCandidate(menu, query, candidate),
        });
      });
    } catch (error) {
      console.warn(`! ${menu.name}: ${query} failed - ${error.message}`);
    }
    await sleep(WAIT_MS);
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 18) {
    return null;
  }

  return best;
}

async function main() {
  const menus = JSON.parse(fs.readFileSync(menusPath, "utf8"));
  const enriched = [];
  let found = 0;

  for (const [index, menu] of menus.entries()) {
    process.stdout.write(`[${index + 1}/${menus.length}] ${menu.name} `);
    if (typeof menu.imageUrl === "string" && menu.imageUrl.startsWith("./assets/menu/")) {
      process.stdout.write("-> keep curated local image\n");
      enriched.push(menu);
      continue;
    }

    const image = await findImage(menu);
    if (image) {
      found += 1;
      process.stdout.write(`-> ${image.title} (${image.score})\n`);
      enriched.push({
        ...menu,
        imageUrl: image.thumbUrl,
        imageSourceUrl: image.descriptionUrl,
        imageSourceName: "Wikimedia Commons",
        imageTitle: image.title.replace(/^File:/, ""),
        imageAuthor: image.author,
        imageLicense: image.license,
      });
    } else {
      process.stdout.write("-> keep existing\n");
      enriched.push({
        ...menu,
        imageSourceName: menu.imageSourceName || "Unsplash keyword search",
      });
    }
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(enriched, null, 2)}\n`);
  console.log(`Done. Commons images found: ${found}/${menus.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

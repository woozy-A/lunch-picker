const fs = require("fs");

const menusPath = "src/data/menus.json";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WAIT_MS = 120;

const EXACT_FILE_OVERRIDES = {
  떡볶이: "File:Tteokbokki 떡볶이 cheese1.jpg",
  유부초밥: "File:Edo Inari sushi 02.JPG",
  규카츠정식: "File:Gyukatsu (46075415774).jpg",
  경양식돈까스: "File:Dongaseu 5.jpg",
  화덕피자: "File:Eq it-na pizza-margherita sep2005 sml.jpg",
  대게정식: "File:Boiled Echizen crab (snow crab) male and female.jpg",
  카레도시락: "File:Curry katsu.jpg",
  알탕: "File:Korean soup-Maeuntang-01.jpg",
  스테이크덮밥:
    "File:HK 中環 Central The L-Place shop 大戶屋日本餐廳 Ootoya Japanese Restaurant food dinner beef steak May 2019 SSG 04.jpg",
  제육볶음: "File:Pork bulgogi.jpg",
  생선구이: "File:Korean.cuisine-Saengseon gui-01.jpg",
  연어포케: "File:Poke Bowl Losos Zlaty Klas 2025.jpg",
  렌틸수프: "File:Bowl of lentil soup with green and red lentils.jpg",
  한솥도시락: "File:Convenience Store LunchBox 03 (33427954622).jpg",
  울면: "File:Ulmyeon.jpg",
  잡채밥: "File:Japchae-bap 2.jpg",
  떡튀순세트: "File:Bunsik stall.jpg",
  튀김세트: "File:Bunsik stall.jpg",
  삼계탕: "File:Korean chicken soup-Samgyetang-01.jpg",
  갈치조림: "File:Galchi-jorim 1.jpg",
  탕수육: "File:Korean Chinese cuisine-sweet and sour pork-Tangsuyuk.jpg",
  볶음밥: "File:Korean Chinese fried rice.jpg",
  쫄면: "File:Jjolmyeon.jpg",
  미소라멘: "File:Miso corn ramen 01.jpg",
  우동: "File:Onigiri udon (41001742365).jpg",
  "일본식 카레라이스": "File:Tonkatsu Curry.jpg",
  텐동: "File:Prawn Tendon.jpg",
  알리오올리오: "File:Aglio e olio.jpg",
  토마토파스타: "File:Pasta, Tomato Sauce, Parmesan (4365946820).jpg",
  리조또: "File:Bowl of mushroom and scallion risotto.jpg",
  함박스테이크: "File:Japanese style hamburg steak (4735910468).jpg",
  치킨스테이크: "File:Chicken steak with pepper sauce.jpg",
  불고기버거: "File:Bulgogi burger 2.jpg",
  라면: "File:2014 농심 신라면.jpg",
  칼국수: "File:Kalguksu 20230430 002.jpg",
  떡만둣국: "File:Tteok-mandu-guk.jpg",
  닭가슴살샐러드: "File:Salad with chicken and avocado.jpg",
  바질페스토파스타: "File:Spaghetti con pesto alla genovese.jpg",
  그릴드치킨샐러드: "File:Caesar Salad & Grilled Chicken (30548011308).jpg",
  고기만두: "File:Korean mandu dumplings.jpg",
  꿔바로우: "File:Liaoning-style Guobaorou at Handsome Cooking Guys, Hopson One (20230306162321).jpg",
};

const IMAGE_COPY_ALIASES = {
  차돌된장밥: "된장찌개",
  중화비빔밥: "짬뽕밥",
  소불고기도시락: "불고기덮밥",
  간짜장: "짜장면",
  한솥도시락: "편의점도시락",
  컵밥: "치킨마요덮밥",
  김치말이국수: "냉면",
};

const FORCED_FALLBACK_NAMES = new Set([]);

const ALIAS_QUERIES = {
  된장찌개: ["doenjang jjigae", "doenjang-jjigae"],
  차돌된장밥: ["doenjang jjigae beef", "korean soybean paste stew beef"],
  탕수육: ["tangsuyuk", "korean chinese sweet and sour pork"],
  볶음밥: ["korean chinese fried rice", "chinese restaurant fried rice", "fried rice"],
  유산슬덮밥: ["yusanseul", "chinese seafood rice"],
  깐풍기정식: ["kkanpunggi", "chinese fried chicken"],
  중화비빔밥: ["spicy chinese rice bowl", "bibimbap chinese"],
  우동: ["udon", "udon noodle soup"],
  냉소바: ["zaru soba", "cold soba"],
  나베정식: ["nabe japanese hot pot", "japanese nabe"],
  감바스정식: ["gambas al ajillo", "garlic shrimp"],
  타코: ["taco", "tacos"],
  참치김밥: ["tuna kimbap", "tuna gimbap"],
  라면: ["cooked korean ramyeon bowl", "korean ramyeon bowl"],
  쌀국수: ["pho", "phở", "vietnamese pho"],
  푸팟퐁커리: ["pu pad pong curry", "thai crab curry"],
  똠얌쌀국수: ["tom yum noodle soup", "tom yum noodles"],
  그릭요거트볼: ["greek yogurt bowl", "yogurt granola bowl"],
  백반정식: ["korean set meal", "baekban"],
  순대국밥: ["sundaeguk", "sundae gukbap", "korean blood sausage soup"],
  닭곰탕: ["dak gomtang", "chicken gomtang", "korean chicken soup"],
  장터국밥: ["gukbap", "korean rice soup"],
  스팸김치덮밥: ["spam kimchi rice", "kimchi spam rice bowl"],
  낙지볶음밥: ["spicy octopus rice", "nakji bokkeum rice"],
  고추장불고기: ["gochujang bulgogi", "spicy pork bulgogi"],
  삼선짬뽕: ["seafood jjamppong", "samsun jjamppong"],
  난자완스밥: ["lion head meatballs rice", "chinese meatball rice"],
  로제파스타: ["rose pasta", "gochujang cream pasta"],
  유부초밥: ["inari sushi", "yubuchobap"],
  어묵우동: ["fish cake udon", "oden udon"],
  고기만두: ["korean mandu", "meat dumplings"],
  비빔만두: ["bibim mandu", "spicy dumpling salad"],
  국물떡볶이: ["tteokbokki soup", "soup tteokbokki"],
  그린커리: ["thai green curry"],
  닭가슴살포케: ["chicken poke bowl"],
  치킨마요덮밥: ["chicken mayo rice bowl", "chicken mayo don"],
  참치마요덮밥: ["tuna mayo rice bowl", "tuna mayo don"],
  소불고기도시락: ["bulgogi lunchbox", "beef bulgogi lunchbox"],
  돈까스도시락: ["tonkatsu bento", "pork cutlet lunchbox"],
  카레도시락: ["curry bento", "curry lunchbox"],
  햄버그도시락: ["hamburg steak bento", "hamburg steak lunchbox"],
  컵밥: ["rice cup", "korean cup rice"],
  알탕: ["altang", "fish roe soup"],
  짜장밥: ["jajang rice", "black bean sauce rice"],
  규카츠정식: ["gyukatsu", "beef katsu"],
  김치말이국수: ["kimchi noodles", "kimchi cold noodles"],
  두부면파스타: ["tofu noodles", "tofu pasta"],
  명란마요덮밥: ["mentaiko rice bowl", "mentaiko don"],
  뚝배기불고기: ["ttukbaegi bulgogi", "bulgogi stew"],
  추어탕: ["chueotang", "loach soup"],
  동태찌개: ["dongtae jjigae", "pollack stew"],
  낙지비빔밥: ["nakji bibimbap", "octopus bibimbap"],
  한식뷔페: ["korean buffet", "korean lunch buffet"],
  소불고기전골: ["bulgogi jeongol", "bulgogi hot pot"],
  보리밥정식: ["boribap", "barley rice bibimbap"],
  간짜장: ["ganjajang", "gan jjajang"],
  꿔바로우: ["guobaorou", "liaoning guobaorou"],
  짬뽕밥: ["jjamppong bap", "jjamppong rice"],
  중화냉면: ["chinese cold noodles"],
  소유라멘: ["shoyu ramen"],
  회덮밥: ["hoedeopbap", "hwe dup bap", "sashimi rice bowl"],
  알밥: ["albap", "flying fish roe rice"],
  리조또: ["cream risotto", "mushroom risotto"],
  수제버거: ["gourmet burger", "handmade burger"],
  경양식돈까스: ["korean pork cutlet", "tonkatsu sauce"],
  화덕피자: ["wood fired pizza", "wood-fired pizza"],
  "샌드위치&스프": ["sandwich and soup", "sandwich soup"],
  햄버거세트: ["burger fries soda", "burger set"],
  수제비: ["sujebi", "korean hand torn noodle soup"],
  한솥도시락: ["dosirak", "korean lunchbox"],
  닭가슴살볶음밥: ["chicken fried rice"],
  샤브샤브: ["shabu-shabu", "shabu shabu"],
  샤브샤브죽: ["rice porridge hot pot", "juk rice porridge"],
  장어덮밥: ["unadon", "unagi don"],
  한우구이정식: ["korean beef barbecue", "grilled beef set"],
  대게정식: ["snow crab meal", "steamed snow crab"],
  스페셜초밥: ["sushi platter", "assorted sushi"],
  참치회덮밥: ["tekka don", "tuna sashimi rice bowl"],
};

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
  "fisherman",
  "feet",
  "green smoothie",
  "paste",
  "soft rolls",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
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

function queryTokens(query) {
  return normalize(query)
    .split(" ")
    .filter((token) => token.length >= 3 && !["food", "rice", "bowl", "set", "soup", "korean", "japanese", "chinese", "thai"].includes(token));
}

function isDissonant(menuName, title) {
  const normalizedTitle = normalize(title);
  if (/덮밥|밥$/.test(menuName) && /(pasta|spaghetti|noodle|burger|pizza|sandwich)/.test(normalizedTitle)) return true;
  if (/국수|라멘|우동|소바|냉면|짬뽕|울면|수제비/.test(menuName) && /(burger|pizza|sandwich)/.test(normalizedTitle)) return true;
  if (/커리/.test(menuName) && normalizedTitle.includes("paste")) return true;
  if (/라면/.test(menuName) && /(package|packaging|구성품|raw)/.test(normalizedTitle)) return true;
  if (/요거트/.test(menuName) && normalizedTitle.includes("smoothie")) return true;
  return false;
}

function scoreCandidate(menuName, query, candidate) {
  const title = normalize(candidate.title);
  const titleCompact = compact(candidate.title);
  const queryCompact = compact(query);
  const tokens = queryTokens(query);

  if (BAD_TITLE_WORDS.some((word) => title.includes(word))) return -999;
  if (isDissonant(menuName, title)) return -999;

  let score = 0;
  if (titleCompact.includes(queryCompact) && queryCompact.length >= 5) score += 80;
  tokens.forEach((token) => {
    if (title.includes(token)) score += 24;
  });
  if (candidate.mime?.startsWith("image/")) score += 12;
  if (candidate.thumbUrl) score += 8;
  if (/cc|public domain/i.test(candidate.license || "")) score += 4;
  return score;
}

async function searchCommons(menuName, query) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "10",
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
  if (!response.ok) throw new Error(`Commons API failed: ${response.status}`);
  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .flatMap((page) => {
      const image = page.imageinfo?.[0];
      if (!image?.mime?.startsWith("image/")) return [];
      const meta = image.extmetadata || {};
      return {
        title: page.title,
        url: image.url,
        thumbUrl: image.thumburl || image.url,
        descriptionUrl: image.descriptionurl,
        mime: image.mime,
        license: cleanHtml(meta.LicenseShortName?.value || meta.License?.value || ""),
        author: cleanHtml(meta.Artist?.value || meta.Credit?.value || ""),
      };
    });
}

async function fetchCommonsFile(title) {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
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
  if (!response.ok) throw new Error(`Commons API failed: ${response.status}`);
  const data = await response.json();
  const page = Object.values(data.query?.pages || {})[0];
  const image = page?.imageinfo?.[0];
  if (!image?.mime?.startsWith("image/")) return null;
  const meta = image.extmetadata || {};
  return {
    title: page.title,
    url: image.url,
    thumbUrl: image.thumburl || image.url,
    descriptionUrl: image.descriptionurl,
    mime: image.mime,
    license: cleanHtml(meta.LicenseShortName?.value || meta.License?.value || ""),
    author: cleanHtml(meta.Artist?.value || meta.Credit?.value || ""),
  };
}

async function findAliasImage(menuName, aliases) {
  const candidates = [];
  for (const query of aliases) {
    try {
      const results = await searchCommons(menuName, query);
      results.forEach((candidate) => {
        candidates.push({ ...candidate, query, score: scoreCandidate(menuName, query, candidate) });
      });
    } catch (error) {
      console.warn(`! ${menuName}: ${query} failed - ${error.message}`);
    }
    await sleep(WAIT_MS);
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best && best.score >= 48 ? best : null;
}

function withImage(menu, image, extra = {}) {
  return {
    ...menu,
    ...extra,
    imageUrl: image.thumbUrl,
    imageSourceUrl: image.descriptionUrl,
    imageSourceName: "Wikimedia Commons",
    imageTitle: image.title.replace(/^File:/, ""),
    imageAuthor: image.author,
    imageLicense: image.license,
  };
}

function copyImage(menu, donor) {
  return {
    ...menu,
    imageUrl: donor.imageUrl,
    imageSourceUrl: donor.imageSourceUrl,
    imageSourceName: donor.imageSourceName,
    imageTitle: donor.imageTitle,
    imageAuthor: donor.imageAuthor,
    imageLicense: donor.imageLicense,
    imageBorrowedFrom: donor.name,
  };
}

function clearImage(menu) {
  const {
    imageUrl,
    imageSourceUrl,
    imageTitle,
    imageAuthor,
    imageLicense,
    imageBorrowedFrom,
    ...rest
  } = menu;
  return {
    ...rest,
    imageSourceName: "Safe fallback image",
  };
}

function isCuratedLocalImage(menu) {
  return typeof menu.imageUrl === "string" && menu.imageUrl.startsWith("./assets/menu/");
}

async function main() {
  const menus = JSON.parse(fs.readFileSync(menusPath, "utf8"));
  let added = 0;
  let copied = 0;
  let exact = 0;
  const nextMenus = [];
  const byName = new Map(menus.map((menu) => [menu.name, menu]));

  for (const menu of menus) {
    if (isCuratedLocalImage(menu)) {
      nextMenus.push(menu);
      continue;
    }

    if (FORCED_FALLBACK_NAMES.has(menu.name)) {
      nextMenus.push(clearImage(menu));
      continue;
    }

    const exactTitle = EXACT_FILE_OVERRIDES[menu.name];
    if (exactTitle && menu.imageTitle !== exactTitle.replace(/^File:/, "")) {
      process.stdout.write(`${menu.name} `);
      const image = await fetchCommonsFile(exactTitle);
      if (image) {
        exact += 1;
        process.stdout.write(`-> ${image.title} (exact)\n`);
        nextMenus.push(withImage(menu, image));
        continue;
      }
      process.stdout.write("-> exact not found\n");
    }
    if (exactTitle && menu.imageTitle === exactTitle.replace(/^File:/, "")) {
      nextMenus.push(menu);
      continue;
    }

    const donorName = IMAGE_COPY_ALIASES[menu.name];
    const donor = donorName ? byName.get(donorName) : null;
    if (
      donor?.imageSourceName === "Wikimedia Commons" &&
      (menu.imageSourceName !== "Wikimedia Commons" ||
        menu.imageBorrowedFrom !== donor.name ||
        menu.imageUrl !== donor.imageUrl ||
        menu.imageTitle !== donor.imageTitle)
    ) {
      copied += 1;
      process.stdout.write(`${menu.name} -> copy ${donor.name}\n`);
      nextMenus.push(copyImage(menu, donor));
      continue;
    }

    if (menu.imageSourceName === "Wikimedia Commons" || !ALIAS_QUERIES[menu.name]) {
      nextMenus.push(menu);
      continue;
    }
    process.stdout.write(`${menu.name} `);
    const image = await findAliasImage(menu.name, ALIAS_QUERIES[menu.name]);
    if (!image) {
      process.stdout.write("-> keep fallback\n");
      nextMenus.push(menu);
      continue;
    }
    added += 1;
    process.stdout.write(`-> ${image.title} (${image.score})\n`);
    nextMenus.push(withImage(menu, image));
  }

  fs.writeFileSync(menusPath, `${JSON.stringify(nextMenus, null, 2)}\n`);
  console.log(`Done. Exact images: ${exact}, copied images: ${copied}, alias images added: ${added}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

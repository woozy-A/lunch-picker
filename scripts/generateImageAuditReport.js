const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const menuPath = path.join(projectRoot, "src/data/menus.json");
const reportDir = path.join(projectRoot, "reports");
const htmlPath = path.join(reportDir, "menu-image-audit.html");
const jsonPath = path.join(reportDir, "menu-image-audit.json");
const reviewQueuePath = path.join(reportDir, "menu-image-review-queue.json");

function getUrl(entry) {
  if (typeof entry === "string") return entry;
  return entry?.url || entry?.imageUrl || entry?.localUrl || "";
}

function isLocal(url = "") {
  return url.startsWith("./assets/") || url.startsWith("assets/");
}

function getDisplayImage(menu) {
  const candidates = [...(menu.imageUrls || []), menu.imageUrl].filter(Boolean);
  const localCandidates = candidates.filter((entry) => isLocal(getUrl(entry)));
  const selected = (localCandidates.length ? localCandidates : candidates)[0];
  return {
    url: getUrl(selected),
    sourceName: selected?.sourceName || menu.imageSourceName || "",
    sourceUrl: selected?.sourceUrl || menu.imageSourceUrl || "",
    title: selected?.title || menu.imageTitle || "",
  };
}

function getAutomaticFlags(menu, image) {
  const searchable = `${image.url} ${image.title} ${image.sourceUrl}`.toLowerCase();
  const flags = [];
  if (!image.url) flags.push("missing");
  if (searchable.includes("lunch-spread")) flags.push("fallback");
  if (/restaurant|storefront|facade|building|exterior|shop-front|bunsik[_ -]?stall|shop[_ -]?display/.test(searchable)) flags.push("possible-exterior");
  if (searchable.includes("source.unsplash.com")) flags.push("unstable-query-image");
  if (!image.sourceName && !isLocal(image.url)) flags.push("source-missing");
  if (menu.imageReview?.status === "approved") flags.push("approved");
  return flags;
}

const menus = JSON.parse(fs.readFileSync(menuPath, "utf8"));
const reviewQueue = fs.existsSync(reviewQueuePath)
  ? JSON.parse(fs.readFileSync(reviewQueuePath, "utf8"))
  : [];
const reviewById = new Map(reviewQueue.map((item) => [item.id, item]));
const auditRows = menus.map((menu, index) => {
  const image = getDisplayImage(menu);
  const manualReview = reviewById.get(menu.id) || null;
  return {
    index: index + 1,
    id: menu.id,
    name: menu.name,
    category: menu.category,
    image,
    flags: [...getAutomaticFlags(menu, image), ...(manualReview ? [manualReview.status, manualReview.priority] : [])],
    review: menu.imageReview || null,
    manualReview,
  };
});

const embeddedRows = JSON.stringify(auditRows).replace(/</g, "\\u003c");
const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>밥픽 메뉴 이미지 검수</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #ece9e3; color: #171512; font-family: Arial, "Apple SD Gothic Neo", sans-serif; }
      header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: rgba(255,255,255,.96); border-bottom: 1px solid #d8d3ca; }
      h1 { margin: 0; font-size: 22px; }
      .meta { color: #6f6961; font-size: 14px; }
      main { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; padding: 18px; }
      article { overflow: hidden; min-width: 0; background: #fff; border: 1px solid #d8d3ca; border-radius: 8px; }
      .photo { position: relative; aspect-ratio: 16 / 9; background: #d7d2ca; }
      img { width: 100%; height: 100%; display: block; object-fit: cover; }
      img.failed { opacity: .16; }
      .number { position: absolute; top: 8px; left: 8px; padding: 4px 7px; border-radius: 4px; color: white; background: rgba(0,0,0,.72); font-size: 12px; }
      .body { padding: 10px 12px 12px; }
      h2 { overflow: hidden; margin: 0 0 5px; font-size: 17px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
      .source { overflow: hidden; color: #777067; font-size: 12px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
      .flags { display: flex; flex-wrap: wrap; gap: 4px; min-height: 22px; margin-top: 8px; }
      .flag { padding: 3px 6px; border-radius: 4px; background: #fff0e9; color: #c74d22; font-size: 11px; }
      .flag.approved { background: #e3f3ec; color: #196854; }
      .flag.reviewed-pass { background: #edf4f1; color: #3e665b; }
      .flag.needs-replacement, .flag.high { background: #fee4e2; color: #a92922; }
      .flag.quality-improvement, .flag.medium { background: #fff1cb; color: #865b00; }
      .reason { margin-top: 7px; color: #5e574f; font-size: 12px; line-height: 1.45; }
      .pager { display: flex; gap: 8px; }
      button { padding: 8px 12px; border: 1px solid #cbc5ba; border-radius: 6px; background: white; font-weight: 700; cursor: pointer; }
      button:disabled { opacity: .35; cursor: default; }
      @media (max-width: 900px) { main { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>밥픽 메뉴 이미지 검수</h1>
        <div class="meta" id="page-meta"></div>
      </div>
      <div class="pager">
        <button id="prev" type="button">이전 24개</button>
        <button id="next" type="button">다음 24개</button>
      </div>
    </header>
    <main id="grid"></main>
    <script>
      const rows = ${embeddedRows};
      const pageSize = 24;
      const params = new URLSearchParams(location.search);
      const pageCount = Math.ceil(rows.length / pageSize);
      const page = Math.min(pageCount, Math.max(1, Number(params.get("page")) || 1));
      const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
      const grid = document.querySelector("#grid");
      document.querySelector("#page-meta").textContent = page + " / " + pageCount + " · " + visibleRows[0].index + "-" + visibleRows[visibleRows.length - 1].index + " / " + rows.length;
      visibleRows.forEach((row) => {
        const card = document.createElement("article");
        const flags = row.flags.length ? row.flags : ["reviewed-pass"];
        const isRemoteImage = row.image.url.startsWith("http://") || row.image.url.startsWith("https://");
        const localImagePath = row.image.url.startsWith("./") ? row.image.url.slice(2) : row.image.url;
        const imageSrc = isRemoteImage ? row.image.url : "../" + localImagePath;
        card.innerHTML =
          '<div class="photo"><img src="' + imageSrc + '" alt="' + row.name + '" loading="eager"><span class="number">' + row.index + '</span></div>' +
          '<div class="body"><h2>' + row.name + '</h2><div class="source">' + (row.image.title || row.image.sourceName || row.id) + '</div><div class="flags">' +
          flags.map((flag) => '<span class="flag ' + flag + '">' + flag + '</span>').join("") + '</div>' +
          (row.manualReview ? '<div class="reason">' + row.manualReview.reason + '</div>' : '') + '</div>';
        card.querySelector("img").addEventListener("error", (event) => { event.currentTarget.classList.add("failed"); event.currentTarget.alt = "이미지 로드 실패"; });
        grid.appendChild(card);
      });
      const go = (nextPage) => { location.search = "?page=" + nextPage; };
      const prev = document.querySelector("#prev");
      const next = document.querySelector("#next");
      prev.disabled = page <= 1;
      next.disabled = page >= pageCount;
      prev.addEventListener("click", () => go(page - 1));
      next.addEventListener("click", () => go(page + 1));
    </script>
  </body>
</html>`;

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(htmlPath, html);
fs.writeFileSync(jsonPath, `${JSON.stringify(auditRows, null, 2)}\n`);

console.log(`이미지 검수 보드: ${path.relative(projectRoot, htmlPath)}`);
console.log(`이미지 검수 데이터: ${path.relative(projectRoot, jsonPath)}`);

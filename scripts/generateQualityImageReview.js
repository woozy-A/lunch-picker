const fs = require("fs");
const path = require("path");
const batch = require("./generatedImageQualityBatch20260721");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "reports/generated-image-quality-review-2026-07-21.html");

const cards = batch.map((item, index) => `
  <article>
    <div class="photo">
      <img src="../assets/menu-reviewed/${item.filename}.jpg" alt="${item.name}">
      <span>${index + 1}</span>
    </div>
    <h2>${item.name}</h2>
    <p>${item.id} · ${item.reason}</p>
  </article>`).join("");

const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>밥픽 품질 개선 이미지 9장 검수</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #ece9e3; color: #171512; font-family: Arial, "Apple SD Gothic Neo", sans-serif; }
      header { position: sticky; top: 0; z-index: 2; padding: 14px 20px; background: rgba(255,255,255,.96); border-bottom: 1px solid #d7d1c8; }
      h1 { margin: 0 0 4px; font-size: 22px; }
      header p { margin: 0; color: #6d675f; font-size: 14px; }
      main { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; padding: 18px; }
      article { overflow: hidden; background: white; border: 1px solid #d8d3ca; border-radius: 8px; }
      .photo { position: relative; aspect-ratio: 4 / 3; background: #ddd7cf; }
      img { width: 100%; height: 100%; display: block; object-fit: cover; }
      span { position: absolute; top: 8px; left: 8px; padding: 4px 7px; border-radius: 4px; background: rgba(0,0,0,.72); color: white; font-size: 12px; }
      h2 { margin: 10px 12px 3px; font-size: 18px; }
      article p { min-height: 34px; margin: 0 12px 12px; color: #777067; font-size: 12px; line-height: 1.4; }
      @media (max-width: 900px) { main { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    </style>
  </head>
  <body>
    <header>
      <h1>밥픽 품질 개선 이미지 9장 검수</h1>
      <p>메뉴명, 핵심 구성, 음식 중심 구도, 식욕도를 최종 확인합니다.</p>
    </header>
    <main>${cards}</main>
  </body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(`품질 개선 이미지 검수 보드: ${path.relative(projectRoot, outputPath)}`);

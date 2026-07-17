# 밥픽

오늘 상태에 맞춰 점심 메뉴 하나를 빠르게 골라주고, 먹은 기록을 점심로그로 남기는 React SPA입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

터미널에 표시되는 Vite 로컬 주소를 브라우저에서 엽니다.

운영 빌드와 메뉴 데이터 검사는 아래처럼 실행합니다.

```bash
npm run check:data
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다. 브라우저 Babel 변환 없이 Vite가 JSX와 자산을 미리 빌드합니다.

## GitHub Pages

`main` 브랜치에 푸시하면 `.github/workflows/deploy-pages.yml`이 `dist/`를 빌드해 GitHub Pages에 배포합니다. 저장소의 **Settings → Pages → Source**는 **GitHub Actions**로 설정해야 합니다.

공개 주소: `https://woozy-a.github.io/lunch-picker/`

## 메뉴 사진 캐시

외부 이미지 요청을 한 번에 많이 보내면 이미지 제공처에서 제한될 수 있습니다. 새 이미지는 소량씩 받아서 `assets/menu-cache/`에 로컬 캐시로 저장합니다.

```bash
node scripts/cacheMenuImages.js --limit=8 --per-menu=3 --delay=1600
```

- `--limit`: 이번 실행에서 새로 받을 최대 이미지 수
- `--per-menu`: 메뉴 하나당 유지할 로컬 캐시 사진 수
- `--delay`: 이미지 요청 사이 대기 시간(ms)
- `--dry-run`: 다운로드 없이 정리/계획만 확인

앱은 `imageUrls`에 로컬 사진이 있으면 외부 URL보다 로컬 사진을 먼저 사용합니다.

## 구현 범위

- 241개 메뉴 데이터베이스: 카테고리, 가격감, 추천·차단 상황, 지도 검색용 메뉴명 포함
- 직장인 상황 기반 필터링: 월급 전, 해장, 혼밥, 팀점심 등
- 강한 조건 필터와 점수 기반 가중 랜덤 추천
- 최근 먹은 메뉴 회피와 "오늘은 아님" 피드백 반영
- 메뉴 사진, 근처 식당 검색, 식당 선택 기록 흐름
- 월별 점심 캘린더와 기록 내려받기

## 파일 구조

- `index.html`: SPA 진입점
- `src/main.jsx`: Vite 앱 부팅 진입점
- `src/App.js`: 추천 로직과 전체 화면 흐름
- `src/FilterModal.js`: 필터 오버레이
- `src/ResultList.js`: 결과 목록
- `src/MenuCard.js`: 메뉴 카드
- `src/DetailModal.js`: 상세/피드백 모달
- `src/mockApi.js`: 메뉴 로딩, 피드백 저장, 인기 순위 Mock API
- `src/data/menus.json`: 메뉴 데이터
- `scripts/validateMenuData.js`: 메뉴 필드와 로컬 사진 경로 검사
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 배포

# 점심 식사 해결!

한국 직장인의 점심 메뉴 선택을 돕는 React 기반 Single Page Application입니다.

## 실행

```bash
python3 -m http.server 5173
```

브라우저에서 `http://localhost:5173`을 엽니다.

## 구현 범위

- 187개 메뉴 데이터베이스: 카테고리, 가격감, 재료, 지도 검색용 메뉴명 포함
- 직장인 상황 기반 필터링: 월급 전, 해장, 혼밥, 팀점심 등
- 오늘의 메뉴를 크게 보여주는 판결형 추천 화면
- 직전 추천 메뉴가 바로 다시 나오지 않도록 최근 추천 기록 제외
- 메뉴 상세 모달과 간단한 "먹었다/오늘은 아님" 피드백
- 1시간 단위 Mock 인기 메뉴 순위 갱신

## 파일 구조

- `index.html`: SPA 진입점
- `src/FilterModal.js`: 필터 오버레이
- `src/ResultList.js`: 결과 목록
- `src/MenuCard.js`: 메뉴 카드
- `src/DetailModal.js`: 상세/피드백 모달
- `src/mockApi.js`: 메뉴 로딩, 피드백 저장, 인기 순위 Mock API
- `src/data/menus.json`: 메뉴 데이터

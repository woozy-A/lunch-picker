import {
  getCandidateMenus as buildCandidateMenus,
  getMenuBudgetTag,
  hasActiveFilters,
  hasTag,
  isColdMenu,
  isFastMenu,
  matchesBudgetFilter,
  pickRecommendation,
  scoreMenu as calculateMenuScore,
} from "./recommendationEngine.mjs";

(function attachApp(global) {
  const app = (global.LunchApp = global.LunchApp || {});
  const { FilterModal, ResultList, DetailModal } = app;

  const DEFAULT_FILTERS = {
    categories: [],
    moods: [],
    budget: "상관없음",
  };

  const MOOD_OPTIONS = [
    { key: "noTime", label: "시간 없음" },
    { key: "hangover", label: "해장 필요" },
    { key: "solo", label: "혼밥" },
    { key: "team", label: "팀점심" },
    { key: "comfort", label: "속 편하게" },
    { key: "spicy", label: "매운 걸로" },
    { key: "soup", label: "국물 필요" },
    { key: "safe", label: "실패 금지" },
    { key: "meeting", label: "미팅 전" },
    { key: "diet", label: "다이어트" },
    { key: "sleepy", label: "입맛 깨우기" },
    { key: "rainy", label: "비 오는 날" },
  ];

  const PRESET_OPTIONS = [
    { id: "preset-spicy", question: "매운 게 땡기세요?", filters: { ...DEFAULT_FILTERS, moods: ["spicy"] } },
    { id: "preset-hangover", question: "어제 과음하셨나요?", filters: { ...DEFAULT_FILTERS, moods: ["hangover", "soup"] } },
    { id: "preset-diet", question: "다이어트 중이세요?", filters: { ...DEFAULT_FILTERS, moods: ["diet"] } },
    { id: "preset-rain", question: "비 오면 국물이죠?", filters: { ...DEFAULT_FILTERS, moods: ["rainy", "soup"] } },
    { id: "preset-meeting", question: "회의 전이라 깔끔하게?", filters: { ...DEFAULT_FILTERS, moods: ["meeting", "comfort"] } },
    { id: "preset-team", question: "팀원 반대 없는 걸로?", filters: { ...DEFAULT_FILTERS, moods: ["team", "safe"] } },
    { id: "preset-solo", question: "혼자 빨리 먹을까요?", filters: { ...DEFAULT_FILTERS, moods: ["solo", "noTime"] } },
    { id: "preset-payday", question: "월급날 느낌 낼까요?", filters: { ...DEFAULT_FILTERS, budget: "월급날" } },
    { id: "preset-broke", question: "월급 전 방어전인가요?", filters: { ...DEFAULT_FILTERS, budget: "월급 전" } },
    { id: "preset-company-card", question: "법카 찬스인가요?", filters: { ...DEFAULT_FILTERS, budget: "법카" } },
    { id: "preset-chinese", question: "중식 한 방 갈까요?", filters: { ...DEFAULT_FILTERS, categories: ["중식"] } },
    { id: "preset-korean", question: "든든한 한식으로?", filters: { ...DEFAULT_FILTERS, categories: ["한식"], moods: ["safe"] } },
    { id: "preset-asian", question: "동남아 기분 낼까요?", filters: { ...DEFAULT_FILTERS, categories: ["아시안"] } },
    { id: "preset-comfort", question: "속 편한 걸로 갈까요?", filters: { ...DEFAULT_FILTERS, moods: ["comfort"] } },
    { id: "preset-sleepy", question: "입맛 좀 깨워볼까요?", filters: { ...DEFAULT_FILTERS, moods: ["sleepy"] } },
    { id: "preset-bunsik", question: "분식으로 스트레스 풀까요?", filters: { ...DEFAULT_FILTERS, categories: ["분식"], moods: ["spicy"] } },
  ];
  const LOCATION_ANCHORS = [
    { name: "여의도", latitude: 37.5219, longitude: 126.9246 },
    { name: "강남역", latitude: 37.4979, longitude: 127.0276 },
    { name: "판교", latitude: 37.3948, longitude: 127.1112 },
    { name: "종로", latitude: 37.5704, longitude: 126.9827 },
    { name: "광화문", latitude: 37.5725, longitude: 126.9769 },
    { name: "홍대입구", latitude: 37.5572, longitude: 126.9245 },
    { name: "성수", latitude: 37.5446, longitude: 127.0557 },
    { name: "잠실", latitude: 37.5133, longitude: 127.1002 },
    { name: "가산디지털단지", latitude: 37.4816, longitude: 126.8826 },
    { name: "구로디지털단지", latitude: 37.4853, longitude: 126.9015 },
  ];

  const MENU_CATCHPHRASES = {
    김치찌개: "보글보글 김치가 끓으면 밥 한 공기는 이미 결재 완료.",
    된장찌개: "구수한 냄새 한 숟갈이면 점심이 집밥 쪽으로 기웁니다.",
    순두부찌개: "몽글몽글 순두부에 달걀 톡, 속까지 얼큰하게 정리됩니다.",
    부대찌개: "햄, 라면, 김치 총출동. 점심 회의보다 빠른 합의안.",
    대구탕: "흰 대구 살과 시원한 국물, 속을 맑게 정리합니다.",
    소머리국밥: "진한 국물과 푸짐한 고기, 오후 체력을 뚝배기로 채웁니다.",
    제육볶음: "빨간 양념에 밥 비비는 순간, 오후 에너지가 재충전됩니다.",
    불고기덮밥: "달큰한 불고기가 밥 위에 착지하면 실패 확률이 낮아집니다.",
    비빔밥: "나물과 고추장 한 바퀴. 비비는 순간 고민도 같이 섞입니다.",
    돌솥비빔밥: "치익 소리와 누룽지까지, 점심에 작은 보너스가 붙습니다.",
    갈비탕: "맑은 국물에 갈비 한 점. 오늘은 기력 회복 쪽으로 갑니다.",
    설렁탕: "소금 톡, 파 듬뿍. 담백하게 오래 가는 점심입니다.",
    삼계탕: "닭 한 마리로 오후 체력을 선결제하는 보양식 카드.",
    냉면: "시원한 육수 한 모금이면 더위와 졸음이 동시에 물러납니다.",
    콩나물국밥: "아삭한 콩나물과 뜨끈한 국물, 해장은 조용히 강합니다.",
    보쌈정식: "수육 한 점에 김치 얹으면 팀 점심 표정이 부드러워집니다.",
    닭갈비: "철판 위 매콤한 닭갈비, 볶음밥까지 이미 마음속 예약.",
    오징어볶음: "탱글한 오징어와 빨간 양념. 밥 위에 올리면 끝납니다.",
    쌈밥정식: "상추 한 장에 밥과 쌈장, 점심을 야무지게 접어 먹습니다.",
    돼지불백: "얇게 구운 고기에 달큰한 불향, 밥도둑이 근무 시작합니다.",
    육개장: "대파 향 나는 얼큰한 국물로 오후의 잠을 밀어냅니다.",
    감자탕: "등뼈와 감자가 푸짐하게 버티는 든든한 국물 판결.",
    떡갈비정식: "부드러운 떡갈비 한 입이면 정식의 품격이 올라갑니다.",
    생선구이: "생구는 결국 생선구이. 노릇한 생선과 흰밥이면 점심이 단정해집니다.",
    갈치조림: "양념 밴 무와 갈치살, 밥 위에서 조림의 힘이 납니다.",
    차돌된장밥: "차돌의 고소함과 된장의 구수함이 한 그릇에서 만납니다.",
    짜장면: "춘장 코팅된 면발을 비비면 점심 고민도 까맣게 정리됩니다.",
    짬뽕: "빨간 국물 한 숟갈이면 속이 확 풀리는 중식 구조대.",
    탕수육: "바삭한 고기에 새콤달콤 소스, 중식집 합의안은 이쪽입니다.",
    마파두부밥: "부드러운 두부에 얼얼한 소스, 밥이 알아서 따라옵니다.",
    볶음밥: "계란과 밥을 빠르게 볶아낸 기본기. 고민 길 때 숟가락이 먼저 갑니다.",
    고추잡채밥: "아삭한 피망과 고기볶음, 꽃빵 없이도 밥 위에서 충분합니다.",
    유산슬덮밥: "부드러운 해산물 소스가 오늘 점심을 살짝 고급지게 만듭니다.",
    잡채밥: "당면의 탱글함과 밥의 든든함, 탄수화물이 사이좋은 날.",
    깐풍기정식: "매콤달콤 닭튀김 한 점에 밥숟가락이 빨라집니다.",
    마라탕: "얼얼한 국물에 재료를 고르는 순간, 취향 회의는 끝.",
    마라샹궈: "국물 없이 강하게 볶아내는 마라의 직진형 점심.",
    우육면: "진한 소고기 국물과 면발, 한 그릇 안에 여행 기분.",
    중화비빔밥: "불맛 재료와 매콤 양념을 비비면 숟가락 속도가 붙습니다.",
    초밥세트: "한 점씩 고르는 재미로 점심이 조용히 특별해집니다.",
    사케동: "연어가 밥 위에 누우면 깔끔한 행복이 됩니다.",
    규동: "달큰한 소고기와 양파, 빠르게 먹어도 든든한 일본식 한 그릇.",
    가츠동: "돈카츠와 달걀이 밥을 덮으면 위로가 바삭하게 옵니다.",
    돈코츠라멘: "진한 돼지뼈 국물에 면발을 말아 오후를 버팁니다.",
    미소라멘: "구수한 미소 국물 한 모금, 라멘도 부드러운 날이 있습니다.",
    우동: "통통한 면발과 따뜻한 국물, 속 편한 점심의 안정권.",
    냉소바: "차가운 소바를 후루룩, 더운 날 머리가 맑아집니다.",
    돈카츠정식: "바삭한 돈카츠에 밥과 장국, 정식은 괜히 정식이 아닙니다.",
    오코노미야키: "가쓰오부시 춤추는 철판 위, 점심이 축제처럼 굽힙니다.",
    야키소바: "소스 향 면발을 볶아내면 가벼운 여행 기분이 납니다.",
    "일본식 카레라이스": "걸쭉한 카레와 밥, 숟가락 하나로 끝나는 안정감.",
    텐동: "튀김이 밥 위에 줄 서면 바삭한 결론이 납니다.",
    나베정식: "작은 냄비 하나에 따뜻함을 담아 속을 천천히 풀어줍니다.",
    알리오올리오: "마늘과 올리브오일만으로도 점심 분위기가 바뀝니다.",
    토마토파스타: "상큼한 토마토 소스에 면발을 감아 산뜻하게 갑니다.",
    크림파스타: "부드러운 크림이 면을 감싸면 오늘은 포근한 쪽입니다.",
    라자냐: "겹겹이 쌓인 치즈와 소스, 포크가 들어갈 때 이미 승리.",
    리조또: "크리미한 쌀알 한 숟갈이면 점심이 부드럽게 정리됩니다.",
    스테이크덮밥: "고기 한 점과 밥 한 숟갈, 점심에 힘이 붙습니다.",
    함박스테이크: "소스 머금은 함박 한 조각이면 어린 시절 기분까지 옵니다.",
    치킨스테이크: "닭고기를 담백하게 구워 오후를 무겁지 않게 넘깁니다.",
    마르게리타피자: "토마토, 바질, 치즈. 단순해서 더 강한 피자 공식.",
    감바스정식: "마늘 오일 속 새우를 건지면 점심이 살짝 휴양지입니다.",
    오므라이스: "폭신한 달걀 이불 아래 볶음밥이 얌전히 기다립니다.",
    미트볼스파게티: "미트볼 하나, 면 한 포크. 익숙한 즐거움이 강합니다.",
    클럽샌드위치: "겹겹이 쌓은 샌드위치처럼 점심 만족도도 층층이.",
    치즈버거: "패티와 치즈가 손 안에 들어오면 점심은 빠르게 해결.",
    불고기버거: "달큰한 불고기 소스가 버거를 한국식으로 설득합니다.",
    치킨버거: "바삭한 치킨 한 입에 점심 시간이 경쾌해집니다.",
    새우버거: "탱글한 새우 패티로 가볍게 바다 쪽 기분을 냅니다.",
    베이컨버거: "짭짤한 베이컨 한 장이 버거의 존재감을 키웁니다.",
    타코: "또띠아 안에 고기와 살사, 손으로 먹는 점심의 리듬.",
    브리또: "한 손에 말아 든 든든함, 바쁜 점심에 강한 선택.",
    핫도그: "소시지와 빵의 직선 승부, 빨리 먹기엔 이만한 게 없습니다.",
    치킨랩: "닭고기와 채소를 또띠아에 감아 깔끔하게 들고 갑니다.",
    피쉬버거: "담백한 생선 패티가 버거판에 조용히 다른 맛을 냅니다.",
    햄치즈샌드위치: "햄과 치즈의 오래된 콤비, 급한 점심도 안정적으로.",
    떡볶이: "빨간 떡 하나 집는 순간, 분식의 심장이 뜁니다.",
    라볶이: "라면과 떡볶이가 만나면 탄수화물 회의가 만장일치.",
    순대: "소금이냐 쌈장이냐보다 중요한 건 지금 순대가 당긴다는 사실.",
    튀김세트: "바삭함을 모아놓은 접시, 떡볶이 국물 대기 중입니다.",
    김밥: "한 줄에 밥과 반찬을 말아 넣은 점심의 압축 파일.",
    참치김밥: "참치마요가 들어가면 김밥 한 줄도 제법 든든해집니다.",
    라면: "후루룩 한 젓가락에 익숙한 위로가 바로 올라옵니다.",
    쫄면: "탱글한 면과 매콤새콤 양념, 입맛 깨우기엔 확실합니다.",
    비빔국수: "새콤달콤 빨간 양념에 면을 비비면 여름이 가까워집니다.",
    칼국수: "손칼국수 같은 두툼한 면발이 국물 속에서 든든합니다.",
    만두국: "동동 뜬 만두를 건져 먹으면 속이 편안해집니다.",
    떡만둣국: "떡과 만두가 같이 들어오면 든든함이 두 배입니다.",
    쌀국수: "맑은 국물에 숙주와 고수, 한 그릇으로 가볍게 리셋.",
    분짜: "숯불 고기와 면을 소스에 적시면 점심이 산뜻해집니다.",
    팟타이: "새콤달콤 볶음면에 땅콩 톡, 기분 전환용 한 접시.",
    푸팟퐁커리: "부드러운 커리와 게살 풍미가 밥을 부르는 태국식 유혹.",
    나시고랭: "달걀 얹은 볶음밥으로 동남아 향이 살짝 올라옵니다.",
    미고랭: "달큰짭짤 볶음면 한 접시면 평범한 점심이 바뀝니다.",
    카오팟: "가볍게 볶은 태국식 밥, 라임 한 조각이면 완성.",
    똠얌쌀국수: "새콤하고 얼큰한 국물로 잠든 입맛을 깨웁니다.",
    반미: "바삭한 바게트 속 고기와 채소, 한 입에 베트남 점심.",
    인도커리세트: "커리와 난을 번갈아 찍으면 점심이 천천히 풍성해집니다.",
    탄두리치킨: "향신료 입은 닭고기가 오늘 점심에 색을 더합니다.",
    케밥라이스: "고기와 소스, 밥을 한 접시에 담아 든든하게 갑니다.",
    닭가슴살샐러드: "담백한 단백질과 채소로 가볍지만 허전하지 않게.",
    연어샐러드: "연어 한 조각 올라가면 샐러드도 충분히 점심답습니다.",
    두부샐러드: "부드러운 두부와 채소로 속 편한 균형을 맞춥니다.",
    그릭요거트볼: "요거트와 과일, 그래놀라로 산뜻한 점심 휴식.",
    연어포케: "연어와 밥, 채소를 한 볼에 담아 깔끔하게 섞습니다.",
    참치포케: "참치의 담백함이 포케볼을 점심답게 채워줍니다.",
    샐러드파스타: "차갑고 산뜻한 면과 채소, 무겁지 않은 파스타 모드.",
    채소비빔밥: "채소 듬뿍 비벼서 가볍지만 밥심은 챙깁니다.",
    곤약면샐러드: "가벼운 면발로 점심은 먹되 졸음은 덜 데려옵니다.",
    렌틸수프: "렌틸콩이 잔잔하게 포만감을 채워주는 따뜻한 선택.",
    아보카도샌드위치: "부드러운 아보카도가 빵 사이에서 여유를 만듭니다.",
    백반정식: "국, 밥, 반찬이 차려지면 점심의 기본기가 살아납니다.",
    가정식백반: "오늘은 엄마 손맛 쪽으로 마음이 기우는 백반입니다.",
    청국장: "진한 구수함이 호불호를 뚫고 밥을 부릅니다.",
    뼈해장국: "뼈다귀와 얼큰한 국물, 해장은 이름값을 합니다.",
    순대국밥: "순대와 국밥이 만나면 뜨끈한 든든함이 바로 옵니다.",
    돼지국밥: "뽀얀 국물에 밥 말아 넣으면 오후까지 배가 든든합니다.",
    닭곰탕: "맑은 닭국물 한 그릇으로 속을 차분히 데웁니다.",
    장터국밥: "펄펄 끓는 국밥 한 그릇, 시장의 힘이 들어옵니다.",
    김치볶음밥: "김치와 밥을 볶으면 냉장고도 점심도 살아납니다.",
    스팸김치덮밥: "스팸의 짭짤함과 김치의 새콤함이 밥 위에서 합의.",
    참치비빔밥: "참치 한 캔 감성으로 비빔밥이 더 든든해집니다.",
    낙지볶음밥: "낙지의 매콤한 힘으로 숟가락에 탄력이 붙습니다.",
    간장찜닭: "달큰짭짤한 찜닭 소스가 당면과 밥을 동시에 부릅니다.",
    고추장불고기: "고추장 양념 입은 고기가 밥 한 공기를 빠르게 비웁니다.",
    우렁쌈밥: "우렁쌈장 한 숟갈이면 쌈밥의 설득력이 올라갑니다.",
    삼선짬뽕: "해산물 듬뿍 들어간 짬뽕, 국물의 깊이가 한 단계 위.",
    차돌짬뽕: "차돌 기름이 빨간 국물에 녹아 묵직한 해장을 만듭니다.",
    잡탕밥: "해산물과 채소가 걸쭉하게 모여 밥 위를 덮습니다.",
    난자완스밥: "부드러운 고기완자와 소스가 밥을 고급스럽게 감쌉니다.",
    사천탕면: "얼큰하고 향긋한 국물 면으로 점심에 불을 켭니다.",
    치킨가라아게동: "바삭한 가라아게가 밥 위에 앉으면 젓가락이 빨라집니다.",
    에비동: "통통한 새우튀김이 덮밥 위에서 바삭하게 주장합니다.",
    연어구이정식: "노릇하게 구운 연어와 밥, 깔끔한 정식의 안정감.",
    모밀정식: "차가운 모밀과 곁들임으로 점심을 산뜻하게 정리합니다.",
    카레돈카츠: "카레와 돈카츠가 만나면 바삭함도 소스도 포기하지 않습니다.",
    니쿠우동: "고기 얹은 우동 한 그릇, 따뜻함에 든든함을 더합니다.",
    오야코동: "닭고기와 달걀이 밥 위에서 이름처럼 가족 회의 중.",
    바질페스토파스타: "바질 향이 올라오면 파스타가 산뜻한 쪽으로 갑니다.",
    로제파스타: "토마토와 크림 사이, 모두가 고개 끄덕이는 핑크빛 타협.",
    토마토리조또: "토마토의 산뜻함과 쌀의 든든함이 한 숟갈에 옵니다.",
    페퍼로니피자: "짭짤한 페퍼로니와 치즈, 나눠 먹는 점심의 빠른 합의.",
    그릴드치킨샐러드: "구운 닭고기가 올라가면 샐러드도 확실한 식사가 됩니다.",
    머쉬룸샌드위치: "버섯 향과 빵의 조합으로 조용히 든든한 한 끼.",
    치킨퀘사디아: "치즈 늘어나는 또띠아 속 치킨, 손이 먼저 갑니다.",
    더블치즈버거: "치즈도 패티도 두껍게, 오늘은 단순하게 강합니다.",
    치킨텐더세트: "바삭한 텐더와 감자, 찍어 먹는 재미까지 포함.",
    햄버거세트: "버거 한 입, 감튀 한 입, 콜라로 마무리하는 빠른 점심.",
    베이글샌드위치: "쫀득한 베이글 사이에 점심을 단단히 끼워 넣습니다.",
    유부초밥: "달큰한 유부 속 밥 한입, 가볍게 먹어도 기분 좋습니다.",
    돈까스김밥: "김밥 속 돈까스 한 줄로 바삭함까지 말아 넣었습니다.",
    치즈라면: "뜨끈한 라면에 치즈 한 장, 익숙한 행복이 녹아듭니다.",
    잔치국수: "맑은 육수와 소면, 이름처럼 점심에 작은 잔치가 납니다.",
    어묵우동: "어묵과 우동 국물이 만나면 속이 금방 풀립니다.",
    고기만두: "한입 베어 물면 육즙이 조용히 점심을 설득합니다.",
    비빔만두: "바삭한 만두와 매콤한 채소무침, 입맛 깨우는 조합.",
    국물떡볶이: "국물까지 떠먹는 떡볶이, 매운맛이 오래 남습니다.",
    그린커리: "초록 커리의 향긋함이 평범한 밥을 다른 나라로 보냅니다.",
    레드커리: "붉은 커리 한 숟갈로 점심에 매콤한 방향 전환.",
    하이난치킨라이스: "부드러운 닭고기와 향긋한 밥, 조용히 우아한 점심.",
    카오만가이: "닭고기와 생강 소스가 담백함을 아주 설득력 있게 만듭니다.",
    락사: "코코넛 커리 국물과 면발, 낯선 듯 중독적인 한 그릇.",
    월남쌈: "라이스페이퍼에 채소와 고기를 말아 산뜻하게 갑니다.",
    치킨티카마살라: "진한 커리 속 닭고기, 밥이든 난이든 다 받습니다.",
    닭가슴살포케: "단백질과 채소를 한 볼에 담아 운동한 척하기 좋습니다.",
    소고기샐러드: "샐러드에 소고기가 올라가면 가벼움도 든든해집니다.",
    병아리콩샐러드: "고소한 병아리콩이 조용히 배를 채워주는 건강한 한 그릇.",
    샐러드랩: "채소를 또띠아에 감아 바쁜 점심도 깔끔하게.",
    통밀참치샌드위치: "통밀빵과 참치로 빠르게 먹어도 속은 든든하게.",
    치킨마요덮밥: "치킨과 마요의 짭짤고소한 합작, 숟가락이 멈추기 어렵습니다.",
    참치마요덮밥: "참치마요는 편안합니다. 빠르고 익숙하고 배신이 적습니다.",
    소불고기도시락: "달큰한 소불고기로 도시락도 꽤 근사해집니다.",
    돈까스도시락: "바삭한 메인 하나면 도시락 뚜껑 열 때 기분이 납니다.",
    카레도시락: "카레가 밥을 덮으면 도시락도 숟가락 하나로 정리됩니다.",
    햄버그도시락: "함박 소스가 밥에 스며들면 빠른 점심도 만족스럽습니다.",
    컵밥: "컵 하나에 밥과 토핑, 시간이 없을수록 강해지는 메뉴.",
    편의점도시락: "가성비와 속도의 현실적인 타협, 오늘도 꽤 쓸 만합니다.",
    장어덮밥: "윤기 도는 장어와 밥, 오늘 지갑이 고개를 끄덕이면 갑니다.",
    한우구이정식: "한우 한 점에 점심의 격이 갑자기 올라갑니다.",
    대게정식: "대게살을 발라 먹는 순간, 점심이 작은 회식이 됩니다.",
    스페셜초밥: "초밥 한 점씩 올리면 오후의 기분도 정갈해집니다.",
    참치회덮밥: "참치와 채소를 비비면 산뜻하지만 꽤 든든한 한 그릇.",
  };

  function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shiftDateKey(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return getDateKey(date);
  }

  function getHistoryDateLabel(record) {
    const dateKey = getRecordDateKey(record);
    if (dateKey === getDateKey()) return "오늘";
    if (dateKey === shiftDateKey(-1)) return "어제";
    if (dateKey === shiftDateKey(-2)) return "그제";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey.slice(5).replace("-", ".");
    return "기록";
  }

  function getRecordDateKey(record) {
    return record.date || (record.decidedAt ? getDateKey(new Date(record.decidedAt)) : "");
  }

  function parseDateKey(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function getDayOffsetFromToday(dateKey) {
    const targetDate = parseDateKey(dateKey);
    if (!targetDate) return null;
    const today = parseDateKey(getDateKey());
    return Math.round((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getHistoryOffsetLabel(record) {
    const offset = getDayOffsetFromToday(getRecordDateKey(record));
    if (offset === 1) return "1일 전";
    if (offset === 2) return "2일 전";
    return getHistoryDateLabel(record);
  }

  function formatHistoryTime(record) {
    if (!record.decidedAt) return record.category || "";
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(record.decidedAt));
  }

  function getRecentAvoidRecords(history = []) {
    const seenOffsets = new Set();
    return history.filter((record) => {
      const offset = getDayOffsetFromToday(getRecordDateKey(record));
      if (offset !== 1 && offset !== 2) return false;
      if (seenOffsets.has(offset)) return false;
      seenOffsets.add(offset);
      return true;
    });
  }

  function getRecentMealIds(history = []) {
    const recentKeys = new Set([getDateKey(), shiftDateKey(-1), shiftDateKey(-2)]);
    return history
      .filter((record) => recentKeys.has(getRecordDateKey(record)))
      .map((record) => record.menuId)
      .filter(Boolean);
  }

  function buildHistoryCalendar(history = [], cursorDate = new Date()) {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const recordsByDate = new Map();

    history.forEach((record) => {
      const dateKey = getRecordDateKey(record);
      const date = parseDateKey(dateKey);
      if (!date || date.getFullYear() !== year || date.getMonth() !== month) return;
      recordsByDate.set(dateKey, [...(recordsByDate.get(dateKey) || []), record]);
    });

    const cells = Array.from({ length: firstDay.getDay() }, () => null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const dateKey = getDateKey(new Date(year, month, day));
      const records = recordsByDate.get(dateKey) || [];
      cells.push({
        dateKey,
        day,
        records,
        isToday: dateKey === getDateKey(),
      });
    }

    return {
      title: `${year}년 ${month + 1}월`,
      year,
      month,
      cells,
    };
  }

  function shiftMonth(date, offset) {
    return new Date(date.getFullYear(), date.getMonth() + offset, 1);
  }

  function formatDateKey(dateKey) {
    const date = parseDateKey(dateKey);
    if (!date) return "날짜 선택";
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  function getPresetOptions(limit = 6) {
    return [...PRESET_OPTIONS].sort(() => Math.random() - 0.5).slice(0, limit);
  }

  function cloneFilters(filters = DEFAULT_FILTERS) {
    return {
      categories: [...(filters.categories || [])],
      moods: [...(filters.moods || [])],
      budget: filters.budget || "상관없음",
    };
  }

  function escapeCsv(value) {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getMoodLabel(key) {
    return MOOD_OPTIONS.find((mood) => mood.key === key)?.label || key;
  }

  function getActiveLabels(filters) {
    const labels = [];
    labels.push(...filters.categories);
    labels.push(...filters.moods.map(getMoodLabel));
    if (filters.budget !== "상관없음") labels.push(filters.budget);
    return labels;
  }

  function getDistanceKm(left, right) {
    const earthRadiusKm = 6371;
    const toRadians = (value) => (value * Math.PI) / 180;
    const latDistance = toRadians(right.latitude - left.latitude);
    const lngDistance = toRadians(right.longitude - left.longitude);
    const a =
      Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
      Math.cos(toRadians(left.latitude)) *
        Math.cos(toRadians(right.latitude)) *
        Math.sin(lngDistance / 2) *
        Math.sin(lngDistance / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getApproxLocationLabel(location) {
    if (!location?.latitude || !location?.longitude) return "";
    const current = { latitude: location.latitude, longitude: location.longitude };
    const nearest = LOCATION_ANCHORS.map((anchor) => ({
      ...anchor,
      distanceKm: getDistanceKm(current, anchor),
    })).sort((a, b) => a.distanceKm - b.distanceKm)[0];

    if (nearest?.distanceKm <= 2.8) return `${nearest.name} 근처`;
    if (location.latitude >= 37.41 && location.latitude <= 37.71 && location.longitude >= 126.76 && location.longitude <= 127.19) {
      return "서울 현재 위치";
    }
    return "현재 위치";
  }

  function getProfileLocationLabel(profile) {
    if (!profile?.location) return "";
    return profile.locationLabel || "현재 위치";
  }

  function getMenuSearchUrl(menu, profile) {
    const query = encodeURIComponent(menu.searchName || menu.name);
    const location = profile?.location;
    if (location?.latitude && location?.longitude) {
      return `https://map.naver.com/p/search/${query}?c=${location.longitude},${location.latitude},15,0,0,0,dh`;
    }
    return `https://map.naver.com/p/search/${query}`;
  }

  function getBudgetRelaxationNotice(menus, filters) {
    if (filters.budget === "상관없음") return "";

    const categoryFiltered = filters.categories.length
      ? menus.filter((menu) => filters.categories.includes(menu.category))
      : menus;
    const hasBudgetMatch = categoryFiltered.some((menu) => matchesBudgetFilter(menu, filters.budget));
    if (hasBudgetMatch) return "";

    const categoryLabel = filters.categories.length ? filters.categories.join(" · ") : "현재 조건";
    return `${categoryLabel}에는 ${filters.budget} 지갑 조건에 맞는 메뉴가 없어, 지갑 조건만 풀고 골랐어요.`;
  }

  function getFeedbackAdjustment(menu) {
    const feedback = app.api?.getFeedback(menu.id);
    if (!feedback?.verdict) return 0;

    const updatedAt = feedback.updatedAt ? new Date(feedback.updatedAt) : null;
    const ageDays = updatedAt ? (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24) : 99;
    if (feedback.verdict === "rejected") {
      if (ageDays <= 1) return -160;
      if (ageDays <= 7) return -90 * (1 - ageDays / 7);
      return -12;
    }
    if (feedback.verdict === "accepted") {
      if (ageDays <= 1) return 24;
      if (ageDays <= 7) return 10;
      return 3;
    }
    return 0;
  }

  function scoreMenu(menu, filters) {
    return calculateMenuScore(menu, filters, {
      feedbackAdjustment: getFeedbackAdjustment(menu),
    });
  }

  function getCandidateMenus(menus, filters) {
    return buildCandidateMenus(menus, filters, {
      scoreMenu: (menu) => scoreMenu(menu, filters),
    });
  }

  function countSharedValues(left = [], right = []) {
    const rightValues = new Set(right);
    return left.filter((value) => rightValues.has(value)).length;
  }

  function scoreSimilarMenu(menu, featuredMenu) {
    const sharedTags = countSharedValues(menu.tags, featuredMenu.tags);
    const sharedIngredients = countSharedValues(menu.ingredients, featuredMenu.ingredients);
    let score = sharedTags * 18 + sharedIngredients * 10;

    if (menu.category === featuredMenu.category) score += 46;
    if (menu.priceLevel === featuredMenu.priceLevel) score += 16;
    if (menu.spicy === featuredMenu.spicy) score += 10;
    if (menu.healthy === featuredMenu.healthy) score += 8;
    if (menu.quick === featuredMenu.quick) score += 6;
    if (menu.meat === featuredMenu.meat) score += 5;

    return score + menu.baseLikes / 100;
  }

  function getSimilarMenus(menus, featuredMenu, limit = 2) {
    if (!featuredMenu) return [];

    return menus
      .filter((menu) => menu.id !== featuredMenu.id)
      .map((menu) => ({ ...menu, similarScore: scoreSimilarMenu(menu, featuredMenu) }))
      .sort((a, b) => b.similarScore - a.similarScore)
      .slice(0, limit);
  }

  function buildRollNames(candidates, finalMenu) {
    const names = candidates
      .map((menu) => menu.name)
      .filter((name) => name !== finalMenu.name);
    const shuffledNames = [...names].sort(() => Math.random() - 0.5);
    return [...shuffledNames.slice(0, 5), finalMenu.name];
  }

  function getMenuNameSizeClass(name) {
    const length = [...(name || "")].length;
    if (length >= 8) return "is-tight";
    if (length >= 6) return "is-compact";
    return "";
  }

  function getMenuCatchphrase(menu) {
    if (!menu) return "";
    return MENU_CATCHPHRASES[menu.name] || menu.description || `${menu.name}, 오늘 점심 후보로 충분합니다.`;
  }

  function getDisplayKeywords(menu, limit = 4) {
    if (!menu) return [];
    const fallbackKeywords = [
      menu.spiceLevel >= 2 ? "매콤" : "",
      menu.soupLevel >= 2 ? "국물" : "",
      menu.speed >= 3 ? "빠름" : "",
      menu.heaviness >= 2 ? "든든함" : "가벼움",
      menu.soloFit >= 4 ? "혼밥 좋음" : "",
      menu.meetingSafe >= 3 ? "실패 낮음" : "",
    ];

    return [...new Set([...(menu.keywords || []), ...fallbackKeywords].filter(Boolean))].slice(0, limit);
  }

  function getMenuImage(menu) {
    return app.images?.getMenuImageInfo(menu)?.url || "./assets/lunch-spread.png";
  }

  function getImageCredit(imageInfo) {
    if (!imageInfo) return "";
    return app.images?.getImageCreditLabel(imageInfo) || "";
  }

  function getFlowGuideCopy(flowStep, hasFilters) {
    if (flowStep === "done") {
      return {
        eyebrow: "기록 완료",
        heading: "오늘 점심은 저장됐어요",
        reason: "다른 메뉴로 바꾸면 오늘 기록도 새 메뉴로 덮어쓸 수 있습니다.",
      };
    }

    if (flowStep === "restaurant") {
      return {
        eyebrow: "식당 기록",
        heading: "마지막으로 어디로 정했는지만 남겨주세요",
        reason: "식당 이름을 남기면 내 점심로그와 지역별 맛집 후보 데이터가 같이 쌓입니다.",
      };
    }

    if (flowStep === "nearby") {
      return {
        eyebrow: "메뉴 결정됨",
        heading: "이제 근처 식당을 찾으면 돼요",
        reason: "오늘 먹을 메뉴는 기록됐어요. 필요하면 현재 위치 기준으로 식당을 찾아보세요.",
      };
    }

    if (flowStep === "decision") {
      return {
        eyebrow: hasFilters ? "조건 적용 중" : "아무거나 준비됨",
        heading: hasFilters ? "지금 조건으로 골랐어요. 마음에 들면 결정하세요" : "아무거나로 골랐어요. 마음에 들면 결정하세요",
        reason: "다른 게 좋으면 오늘은 아님이나 다른 메뉴로 바로 다시 돌릴 수 있습니다.",
      };
    }

    return {
      eyebrow: hasFilters ? "조건 적용 중" : "아무거나 모드",
      heading: hasFilters ? "지금 조건으로 오늘의 픽을 좁혔어요" : "먼저 입맛을 맞추면 추천이 더 선명해져요",
      reason: hasFilters
        ? "마음에 안 들면 오늘은 아님으로 빼고, 다른 메뉴로 바로 다시 고르면 됩니다."
        : "입맛, 상황, 지갑을 누르면 후보가 좁아지고 결정한 메뉴는 점심로그에 남아요.",
    };
  }

  function buildReason(menu, filters) {
    if (!menu) return "";

    if (!hasActiveFilters(filters)) {
      return "지금은 조건이 없어 넓게 섞은 랜덤 추천입니다. 오늘 상태를 넣으면 그 조건에 맞춰 더 분명하게 고릅니다.";
    }

    if (filters.budget === "월급 전" && matchesBudgetFilter(menu, "월급 전")) {
      return "월급 전 방어전에는 가성비가 먼저입니다.";
    }
    if (filters.budget === "월급날" && matchesBudgetFilter(menu, "월급날")) {
      return "월급날에는 너무 아끼지 말고 점심 만족도도 같이 봤습니다.";
    }
    if (filters.budget === "법카" && matchesBudgetFilter(menu, "법카")) {
      return "법카로 먹기 좋은 메뉴 중에서 평소보다 확실한 선택을 우선했습니다.";
    }
    if (filters.moods.includes("diet") && (menu.healthy || menu.category === "건강식" || menu.heaviness <= 1)) {
      return "다이어트 상태라 가볍고 부담 적은 메뉴를 우선했습니다.";
    }
    if (filters.moods.includes("noTime") && isFastMenu(menu)) {
      return "시간이 없을 때도 빨리 먹고 돌아오기 좋은 메뉴입니다.";
    }
    if (filters.moods.includes("hangover") && menu.hangoverFit >= 3) {
      return "해장에 맞는 국물감과 속을 풀어주는 든든함을 우선했습니다.";
    }
    if (filters.moods.includes("soup") && menu.soupLevel >= 1) {
      return isColdMenu(menu)
        ? "국물이 필요한 상태라 시원한 육수까지 포함해 골랐습니다."
        : "국물이 필요한 상태라 따뜻하게 떠먹을 수 있는 쪽으로 골랐습니다.";
    }
    if (filters.moods.includes("spicy") && menu.spiceLevel >= 2) {
      return "매운 걸로 고른 만큼 확실히 자극 있는 메뉴만 후보에 남겼습니다.";
    }
    if (filters.moods.includes("team") && menu.teamFit >= 3) {
      return "여럿이 가도 반대가 적은 안전한 합의안입니다.";
    }
    if (filters.moods.includes("meeting") && menu.meetingSafe >= 3) {
      return "미팅 전에는 냄새와 부담을 줄이는 쪽이 이깁니다.";
    }
    if (filters.moods.includes("rainy") && (menu.soupLevel >= 1 || hasTag(menu, ["noodle"]))) {
      return isColdMenu(menu)
        ? "비 오는 날 조건에서도 지금 선택한 계열 안에서 국물 있는 메뉴를 골랐습니다."
        : "비 오는 날에는 따뜻한 쪽으로 마음이 기웁니다.";
    }
    if (filters.moods.includes("sleepy") && (menu.spiceLevel >= 2 || hasTag(menu, ["curry", "fresh"]))) {
      return "입맛이 죽었을 때도 한 숟갈 뜨기 좋은 자극과 향을 우선했습니다.";
    }
    if (filters.moods.includes("solo") && menu.soloFit >= 3) {
      return "혼자 조용히 먹고 돌아오기 좋은 선택입니다.";
    }
    if (filters.moods.includes("comfort") && menu.spiceLevel <= 1 && menu.heaviness <= 2) {
      return "속을 괴롭히지 않고 오후 업무로 복귀하기 좋습니다.";
    }
    if (getMenuBudgetTag(menu) === "가볍게") return "고민은 짧게, 지출은 가볍게 가는 메뉴입니다.";
    if (menu.spicy) return "입맛을 깨우는 쪽으로 결론 냈습니다.";
    return getMenuCatchphrase(menu);
  }

  function getOfficeLine(menu, filters) {
    if (!menu) return "";
    if (filters.moods.includes("diet")) return `오늘은 가볍게 ${menu.name}으로 갑시다.`;
    if (filters.moods.includes("safe")) return `${menu.name}이면 적어도 회의실에서 불만은 덜 나옵니다.`;
    if (filters.moods.includes("noTime")) return `멀리 가지 말고 ${menu.name}으로 점심 시간을 지켜봅시다.`;
    if (filters.moods.includes("team")) return `오늘 팀 점심은 ${menu.name}으로 깔끔하게 합의합시다.`;
    return `오늘은 ${menu.name}. 더 고민하면 점심시간만 사라집니다.`;
  }

  function runVerdictAnimation() {
    const prefersReducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !global.gsap) {
      return;
    }

    global.gsap.fromTo(
      ".verdict-stamp",
      { opacity: 0, rotate: -7, scale: 1.08 },
      { opacity: 1, rotate: -5, scale: 1, duration: 0.18, ease: "power2.out" },
    );
  }

  function ProfileModal({ profile, promptContext = "", onSave, onClose }) {
    const [nickname, setNickname] = React.useState(profile?.nickname || "");
    const isAfterDecision = promptContext === "afterDecision";
    const modalRef = app.modal.useModalFocus({ onClose });

    function submitProfile(nextNickname = nickname) {
      onSave({
        nickname: nextNickname.trim(),
        location: profile?.location || null,
        locationLabel: getProfileLocationLabel(profile),
      });
    }

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section
          ref={modalRef}
          className="modal profile-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-title"
          tabIndex="-1"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="modal-head">
            <div>
              <h2 id="profile-title">{isAfterDecision ? "점심로그 이름 정하기" : "내 점심 기록 설정"}</h2>
              <p className="muted small">
                {isAfterDecision
                  ? "방금 고른 메뉴는 저장됐어요. 이름을 정해두면 내 점심로그가 더 알아보기 쉬워집니다."
                  : "닉네임은 내 기록에만 씁니다. 위치는 근처 식당을 찾을 때만 확인합니다."}
              </p>
            </div>
            <button className="close-btn" type="button" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </header>

          <div className="modal-body">
            <label className="field-group">
              <span>닉네임</span>
              <input
                type="text"
                value={nickname}
                maxLength="16"
                placeholder="예: 창우, 점심러, 익명 미식가"
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>

            <div className="location-box">
              <div>
                <span className="field-title">위치 정보</span>
                <strong>{getProfileLocationLabel(profile) || "필요할 때만 확인"}</strong>
                <p className="muted small">처음 들어올 때는 묻지 않고, 근처에서 찾기를 누를 때 브라우저 위치 권한을 요청합니다.</p>
              </div>
            </div>

            <div className="privacy-note">
              <strong>저장 방식</strong>
              <p className="muted small">개인 기록은 내 브라우저에 저장합니다. 나중에 DB를 붙이면 지역 통계는 위치를 허용한 검색/결정만 익명 숫자로 집계합니다.</p>
            </div>

            <div className="modal-actions">
              <button className="btn" type="button" onClick={onClose}>
                {isAfterDecision ? "나중에" : "닫기"}
              </button>
              <button className="btn btn-primary" type="button" onClick={() => submitProfile()}>
                {profile ? "저장" : "닉네임 저장"}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function App() {
    const [menus, setMenus] = React.useState([]);
    const [history, setHistory] = React.useState([]);
    const [profile, setProfile] = React.useState(null);
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [profilePromptContext, setProfilePromptContext] = React.useState("");
    const [showProfileNudge, setShowProfileNudge] = React.useState(false);
    const [filters, setFilters] = React.useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = React.useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [featured, setFeatured] = React.useState(null);
    const [recentIds, setRecentIds] = React.useState([]);
    const [skippedIds, setSkippedIds] = React.useState([]);
    const [isDeciding, setIsDeciding] = React.useState(false);
    const [rollingName, setRollingName] = React.useState("");
    const [stampKey, setStampKey] = React.useState(0);
    const [selectedMenu, setSelectedMenu] = React.useState(null);
    const [toast, setToast] = React.useState("");
    const [feedbackVersion, setFeedbackVersion] = React.useState(0);
    const [flowStep, setFlowStep] = React.useState("taste");
    const [isFindingNearby, setIsFindingNearby] = React.useState(false);
    const [nearbyStatus, setNearbyStatus] = React.useState("");
    const [restaurantPrompt, setRestaurantPrompt] = React.useState(null);
    const [restaurantName, setRestaurantName] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [calendarCursor, setCalendarCursor] = React.useState(() => new Date());
    const [selectedCalendarDate, setSelectedCalendarDate] = React.useState(() => getDateKey());
    const [manualMenuName, setManualMenuName] = React.useState("");
    const rollTimerRef = React.useRef(null);
    const rollEndTimerRef = React.useRef(null);

    const categories = React.useMemo(() => [...new Set(menus.map((menu) => menu.category))], [menus]);
    const candidates = React.useMemo(() => getCandidateMenus(menus, filters), [menus, filters, feedbackVersion]);
    const visibleMenus = React.useMemo(() => menus.filter((menu) => !skippedIds.includes(menu.id)), [menus, skippedIds]);
    const similarMenus = React.useMemo(() => getSimilarMenus(visibleMenus, featured), [visibleMenus, featured]);
    const activeLabels = React.useMemo(() => getActiveLabels(filters), [filters]);
    const hasFilters = React.useMemo(() => hasActiveFilters(filters), [filters]);
    const budgetRelaxationNotice = React.useMemo(() => getBudgetRelaxationNotice(menus, filters), [menus, filters]);
    const recentAvoidRecords = React.useMemo(() => getRecentAvoidRecords(history), [history]);
    const historyCalendar = React.useMemo(() => buildHistoryCalendar(history, calendarCursor), [history, calendarCursor]);
    const presetOptions = React.useMemo(() => getPresetOptions(6), []);
    const selectedCalendarRecords = React.useMemo(
      () =>
        history
          .filter((record) => getRecordDateKey(record) === selectedCalendarDate)
          .sort((a, b) => new Date(b.decidedAt || 0) - new Date(a.decidedAt || 0)),
      [history, selectedCalendarDate],
    );
    const menuNameOptions = React.useMemo(() => [...new Set(menus.map((menu) => menu.name))].sort((a, b) => a.localeCompare(b, "ko-KR")), [menus]);
    const selectedFeedback = selectedMenu ? app.api.getFeedback(selectedMenu.id) : { verdict: "" };
    const profileName = profile?.nickname || "익명 미식가";
    const profileLocationLabel = getProfileLocationLabel(profile);
    const featuredImage = featured ? app.images?.getMenuImageInfo(featured, stampKey) : null;
    const featuredImageCredit = getImageCredit(featuredImage);
    const flowCopy = React.useMemo(() => getFlowGuideCopy(flowStep, hasFilters), [flowStep, hasFilters]);
    const isTasteStep = flowStep === "taste";
    const isDecisionStep = flowStep === "decision";
    const isNearbyStep = flowStep === "nearby";
    const isRestaurantStep = flowStep === "restaurant" && restaurantPrompt;

    function refreshHistory() {
      setHistory(app.api.getLunchHistory?.() || []);
    }

    function saveProfile(nextProfile) {
      const savedProfile = app.api.saveProfile(nextProfile);
      setProfile(savedProfile);
      setIsProfileOpen(false);
      setProfilePromptContext("");
      setShowProfileNudge(false);
      setToast(`${savedProfile.nickname || "익명"}님, 점심 기록 준비됐습니다.`);
    }

    function openProfileSettings(promptContext = "") {
      setShowProfileNudge(false);
      setProfilePromptContext(promptContext);
      setIsProfileOpen(true);
    }

    function closeProfileSettings() {
      setIsProfileOpen(false);
      setProfilePromptContext("");
    }

    function openSearchWindow(url, mapWindow) {
      if (mapWindow && !mapWindow.closed) {
        try {
          mapWindow.opener = null;
        } catch (error) {
          // Some browsers block opener changes. Navigation is still the important part.
        }
        mapWindow.location.href = url;
        return;
      }
      global.open(url, "_blank", "noreferrer");
    }

    function writeNearbyWaitingPage(mapWindow, menu) {
      if (!mapWindow?.document || mapWindow.closed) return;
      const menuName = escapeHtml(menu.name);
      try {
        mapWindow.document.open();
        mapWindow.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${menuName} 근처 식당 찾는 중</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fffaf2; color: #171512; }
      main { width: min(420px, calc(100% - 40px)); padding: 28px; border: 1px solid #e9ddce; border-radius: 28px; background: #fffdf8; box-shadow: 0 20px 60px rgba(45, 37, 27, 0.12); }
      span { display: inline-block; margin-bottom: 12px; padding: 7px 12px; border-radius: 999px; background: #e5f3ee; color: #196253; font-weight: 900; }
      h1 { margin: 0 0 12px; font-size: 26px; line-height: 1.2; }
      p { margin: 0; color: #6d665f; line-height: 1.55; font-size: 15px; }
    </style>
  </head>
  <body>
    <main>
      <span>위치 확인 중</span>
      <h1>${menuName} 근처 식당을 찾고 있어요</h1>
      <p>브라우저에서 위치 권한을 허용하면 현재 위치 기준으로 검색 결과가 열립니다. 권한을 거절하면 메뉴명으로만 검색합니다.</p>
    </main>
  </body>
</html>`);
        mapWindow.document.close();
      } catch (error) {
        // Cross-window write can fail in some browser privacy modes. The search fallback still works.
      }
    }

    function setTemporaryNearbyStatus(message, duration = 3200) {
      setNearbyStatus(message);
      window.setTimeout(() => {
        setNearbyStatus((currentMessage) => (currentMessage === message ? "" : currentMessage));
      }, duration);
    }

    function openRestaurantPrompt(menu, context = {}) {
      if (!menu) return;
      const promptProfile = context.profile || profile;
      const location = context.location || promptProfile?.location || null;
      const locationLabel = context.locationLabel || getProfileLocationLabel(promptProfile) || "";
      setRestaurantPrompt({
        menuId: menu.id,
        menuName: menu.name,
        category: menu.category,
        regionName: context.regionName || locationLabel,
        locationLabel,
        location,
        openedAt: new Date().toISOString(),
      });
      setRestaurantName("");
      setFlowStep("restaurant");
    }

    function closeRestaurantPrompt(nextStep = "") {
      setRestaurantPrompt(null);
      setRestaurantName("");
      if (nextStep) {
        setFlowStep(nextStep);
      } else if (flowStep === "restaurant") {
        setFlowStep("done");
      }
    }

    function findNearby(menu = featured) {
      if (!menu || isFindingNearby) return;
      const fallbackUrl = getMenuSearchUrl(menu);

      if (!global.navigator?.geolocation) {
        global.open(fallbackUrl, "_blank", "noreferrer");
        setToast("이 브라우저는 위치 확인을 지원하지 않아 메뉴명으로 검색합니다.");
        setTemporaryNearbyStatus("위치 확인을 지원하지 않아 메뉴명으로만 검색을 엽니다.");
        openRestaurantPrompt(menu, {
          regionName: profileLocationLabel,
          locationLabel: profileLocationLabel,
          location: profile?.location || null,
        });
        return;
      }

      const mapWindow = global.open("", "_blank");
      writeNearbyWaitingPage(mapWindow, menu);
      setIsFindingNearby(true);
      setNearbyStatus(`${menu.name} 근처 식당을 찾기 위해 위치 권한을 확인하고 있습니다.`);
      setToast("위치 권한을 확인해주세요. 허용하면 현재 위치 기준으로 찾습니다.");

      global.navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy || 0),
            capturedAt: new Date().toISOString(),
          };
          const locationLabel = getApproxLocationLabel(location);
          const savedProfile = app.api.saveProfile({
            ...(profile || {}),
            regionName: "",
            locationLabel,
            location,
          });
          setProfile(savedProfile);
          openSearchWindow(getMenuSearchUrl(menu, { location }), mapWindow);
          openRestaurantPrompt(menu, {
            profile: savedProfile,
            regionName: locationLabel,
            locationLabel,
            location,
          });
          setToast(`${locationLabel} 기준으로 ${menu.name}을 찾습니다.`);
          setTemporaryNearbyStatus(`${locationLabel} 기준으로 ${menu.name} 검색을 열었습니다.`);
          setIsFindingNearby(false);
        },
        (locationError) => {
          const denied = locationError.code === locationError.PERMISSION_DENIED;
          const fallbackMessage = denied ? "위치 권한 없이 메뉴명으로 검색을 엽니다." : "위치를 가져오지 못해 메뉴명으로 검색을 엽니다.";
          openSearchWindow(fallbackUrl, mapWindow);
          openRestaurantPrompt(menu, {
            regionName: profileLocationLabel,
            locationLabel: profileLocationLabel,
            location: profile?.location || null,
          });
          setToast(denied ? "위치 권한 없이 메뉴명으로 검색합니다." : "위치를 가져오지 못해 메뉴명으로 검색합니다.");
          setTemporaryNearbyStatus(fallbackMessage);
          setIsFindingNearby(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000 * 60 * 5,
        },
      );
    }

    function recommend(nextCandidates = candidates, options = {}) {
      if (isDeciding) return;
      if (!nextCandidates.length) {
        window.clearInterval(rollTimerRef.current);
        window.clearTimeout(rollEndTimerRef.current);
        setFeatured(null);
        setRollingName("");
        setIsDeciding(false);
        setToast("조건에 딱 맞는 메뉴가 없어요. 상태를 조금 풀어주세요.");
        return;
      }

      const historyBlockedIds = getRecentMealIds(history);
      const blockedIds = new Set(options.ignoreHistory ? [] : [...recentIds, ...historyBlockedIds]);
      if (!options.ignoreSkipped) skippedIds.forEach((id) => blockedIds.add(id));
      (options.extraBlockedIds || []).forEach((id) => blockedIds.add(id));
      if (featured && !options.ignoreCurrent) blockedIds.add(featured.id);
      let availableCandidates = nextCandidates.filter((menu) => !blockedIds.has(menu.id));

      if (!availableCandidates.length) {
        availableCandidates = nextCandidates.filter((menu) => menu.id !== featured?.id);
      }
      if (!availableCandidates.length) {
        availableCandidates = nextCandidates;
      }

      const nextFeatured = pickRecommendation(availableCandidates, options.filters || filters);
      if (!nextFeatured) {
        setFeatured(null);
        setRollingName("");
        setToast("조건에 딱 맞는 메뉴가 없어요. 상태를 조금 풀어주세요.");
        return;
      }

      window.clearInterval(rollTimerRef.current);
      window.clearTimeout(rollEndTimerRef.current);

      const rollNames = buildRollNames(availableCandidates, nextFeatured);
      let rollIndex = 0;
      setToast(options.startToast || "");
      closeRestaurantPrompt("decision");
      setIsDeciding(true);
      setRollingName(rollNames[rollIndex] || nextFeatured.name);

      rollTimerRef.current = window.setInterval(() => {
        rollIndex = (rollIndex + 1) % rollNames.length;
        setRollingName(rollNames[rollIndex]);
      }, 160);

      rollEndTimerRef.current = window.setTimeout(() => {
        window.clearInterval(rollTimerRef.current);
        setFeatured(nextFeatured);
        setRollingName(nextFeatured.name);
        setIsDeciding(false);
        setStampKey((key) => key + 1);
        setRecentIds((previousIds) => [nextFeatured.id, ...previousIds.filter((id) => id !== nextFeatured.id)].slice(0, 18));
        const doneToast = typeof options.doneToast === "function" ? options.doneToast(nextFeatured) : options.doneToast;
        setToast(doneToast || `오늘 점심 판결: ${nextFeatured.name}`);
      }, 780);
    }

    function applyFilters() {
      applyFiltersAndRecommend(draftFilters);
    }

    function applyFiltersAndRecommend(nextFilters) {
      setFlowStep("decision");
      setDraftFilters(nextFilters);
      setFilters(nextFilters);
      setRecentIds([]);
      setSkippedIds([]);
      setIsFilterOpen(false);
      window.setTimeout(() => {
        const nextCandidates = getCandidateMenus(menus, nextFilters);
        recommend(nextCandidates, { ignoreCurrent: true, ignoreSkipped: true, filters: nextFilters });
      }, 0);
    }

    function resetFilters() {
      setFlowStep("decision");
      setDraftFilters(DEFAULT_FILTERS);
      setFilters(DEFAULT_FILTERS);
      setRecentIds([]);
      setSkippedIds([]);
      setIsFilterOpen(false);
      window.setTimeout(() => recommend(getCandidateMenus(menus, DEFAULT_FILTERS), { ignoreCurrent: true, ignoreSkipped: true, filters: DEFAULT_FILTERS }), 0);
    }

    function applyPreset(preset) {
      applyFiltersAndRecommend(cloneFilters(preset.filters));
    }

    function selectCalendarDate(dateKey) {
      const records = history.filter((record) => getRecordDateKey(record) === dateKey);
      const date = parseDateKey(dateKey);
      if (date) setCalendarCursor(new Date(date.getFullYear(), date.getMonth(), 1));
      setSelectedCalendarDate(dateKey);
      setManualMenuName(records[0]?.name || "");
    }

    function findMenuByName(name) {
      const trimmedName = name.trim();
      if (!trimmedName) return null;
      return (
        menus.find((menu) => menu.name === trimmedName) ||
        menus.find((menu) => menu.searchName === trimmedName) ||
        menus.find((menu) => menu.name.includes(trimmedName) || trimmedName.includes(menu.name)) ||
        null
      );
    }

    function saveManualHistory() {
      const trimmedName = manualMenuName.trim();
      if (!trimmedName) {
        setToast("기록할 메뉴 이름을 입력해주세요.");
        return;
      }

      const matchedMenu = findMenuByName(trimmedName);
      const manualMenu = matchedMenu || {
        id: `manual-${trimmedName.replace(/\s+/g, "-")}`,
        name: trimmedName,
        category: "직접 입력",
      };

      app.api.saveLunchDecision?.(manualMenu, {
        profile,
        selectedCategories: matchedMenu ? [matchedMenu.category] : [],
        selectedMoods: [],
        moodLabels: ["수동 기록"],
        budgetMode: "직접 추가",
        regionName: profileLocationLabel,
        locationLabel: profileLocationLabel,
        location: profile?.location || null,
        date: selectedCalendarDate,
        source: "manual",
      });

      refreshHistory();
      setManualMenuName("");
      setFeedbackVersion((version) => version + 1);
      setToast(`${formatDateKey(selectedCalendarDate)} 점심 기록을 저장했습니다.`);
    }

    function exportHistoryCsv() {
      if (!history.length) {
        setToast("내보낼 점심 기록이 아직 없습니다.");
        return;
      }

      const rows = [
        ["date", "menu", "restaurant", "category", "budget", "moods", "location", "decidedAt", "source"],
        ...[...history]
          .sort((a, b) => getRecordDateKey(a).localeCompare(getRecordDateKey(b)) || (a.decidedAt || "").localeCompare(b.decidedAt || ""))
          .map((record) => [
            getRecordDateKey(record),
            record.name,
            record.restaurantName || "",
            record.category,
            record.budgetMode,
            (record.moodLabels || []).join(" / "),
            record.locationLabel || record.regionName || "",
            record.decidedAt || "",
            record.source || "decision",
          ]),
      ];
      const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `babpick-lunch-history-${getDateKey()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setToast("점심 기록 파일을 내려받았습니다.");
    }

    function pickSpecificMenu(menu) {
      window.clearInterval(rollTimerRef.current);
      window.clearTimeout(rollEndTimerRef.current);
      setFeatured(menu);
      setRollingName(menu.name);
      setIsDeciding(false);
      setStampKey((key) => key + 1);
      setRecentIds((previousIds) => [menu.id, ...previousIds.filter((id) => id !== menu.id)].slice(0, 18));
      closeRestaurantPrompt("decision");
      setToast(`오늘의 픽을 ${menu.name}으로 바꿨어요.`);
    }

    function decideMenu(menu = featured) {
      if (!menu) return;
      app.api.saveFeedback(menu.id, { verdict: "accepted" });
      app.api.saveLunchDecision?.(menu, {
        profile,
        selectedCategories: filters.categories,
        selectedMoods: filters.moods,
        moodLabels: filters.moods.map(getMoodLabel),
        budgetMode: filters.budget,
        regionName: profileLocationLabel,
        locationLabel: profileLocationLabel,
        location: profile?.location || null,
      });
      refreshHistory();
      setFeedbackVersion((version) => version + 1);
      if (selectedMenu?.id === menu.id) setSelectedMenu(null);
      setFlowStep("nearby");
      setToast(`${menu.name}, 오늘 점심으로 기록했습니다.`);
      if (!profile) {
        setShowProfileNudge(true);
      }
    }

    function saveRestaurantChoice() {
      const trimmedRestaurantName = restaurantName.trim();
      if (!trimmedRestaurantName) {
        setToast("식당 이름을 적어주면 맛집 후보로 저장할 수 있어요.");
        return;
      }
      if (!restaurantPrompt) return;

      const promptMenu =
        menus.find((menu) => menu.id === restaurantPrompt.menuId) ||
        (featured?.id === restaurantPrompt.menuId ? featured : null) || {
          id: restaurantPrompt.menuId,
          name: restaurantPrompt.menuName,
          category: restaurantPrompt.category || "직접 입력",
        };

      const record = app.api.saveRestaurantSelection?.(promptMenu, {
        profile,
        restaurantName: trimmedRestaurantName,
        selectedCategories: filters.categories,
        selectedMoods: filters.moods,
        moodLabels: filters.moods.map(getMoodLabel),
        budgetMode: filters.budget,
        regionName: restaurantPrompt.regionName || restaurantPrompt.locationLabel || profileLocationLabel,
        locationLabel: restaurantPrompt.locationLabel || profileLocationLabel,
        location: restaurantPrompt.location || profile?.location || null,
      });

      refreshHistory();
      if (record?.date) setSelectedCalendarDate(record.date);
      setFeedbackVersion((version) => version + 1);
      closeRestaurantPrompt("done");
      setToast(`${trimmedRestaurantName}, ${promptMenu.name} 맛집 후보로 기록했습니다.`);
    }

    function rejectMenu(menu = featured) {
      if (!menu || isDeciding) return;
      app.api.saveFeedback(menu.id, { verdict: "rejected" });
      const nextSkippedIds = [menu.id, ...skippedIds.filter((id) => id !== menu.id)].slice(0, 24);
      setSkippedIds(nextSkippedIds);
      if (selectedMenu?.id === menu.id) setSelectedMenu(null);
      setFeedbackVersion((version) => version + 1);

      const nextCandidates = getCandidateMenus(menus, filters).filter((candidate) => !nextSkippedIds.includes(candidate.id));
      recommend(nextCandidates, {
        ignoreCurrent: true,
        filters,
        extraBlockedIds: nextSkippedIds,
        startToast: `${menu.name}은 오늘 후보에서 빼고 다시 고르는 중입니다.`,
        doneToast: (nextMenu) => `${menu.name}은 빼고 ${nextMenu.name}으로 다시 골랐습니다.`,
      });
    }

    function handleFeedback(verdict) {
      if (!selectedMenu) return;
      if (verdict === "accepted") {
        decideMenu(selectedMenu);
        return;
      }
      rejectMenu(selectedMenu);
    }

    React.useEffect(() => {
      let isMounted = true;

      async function boot() {
        try {
          const menuData = await app.api.getMenus();
          if (!isMounted) return;
          const savedHistory = app.api.getLunchHistory?.() || [];
          const initialCandidates = getCandidateMenus(menuData, DEFAULT_FILTERS);
          const recentHistoryIds = new Set(getRecentMealIds(savedHistory));
          const initialPool = initialCandidates.filter((menu) => !recentHistoryIds.has(menu.id));
          const savedProfile = app.api.getProfile?.();
          setMenus(menuData);
          setHistory(savedHistory);
          setProfile(savedProfile);
          setIsProfileOpen(false);
          setFeatured(pickRecommendation(initialPool.length ? initialPool : initialCandidates, DEFAULT_FILTERS));
        } catch (loadError) {
          setError(loadError.message);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }

      boot();
      return () => {
        isMounted = false;
      };
    }, []);

    React.useEffect(() => {
      if (!toast) return undefined;
      const timer = window.setTimeout(() => setToast(""), 2400);
      return () => window.clearTimeout(timer);
    }, [toast]);

    React.useEffect(() => {
      if (featured) {
        setRollingName(featured.name);
        window.setTimeout(runVerdictAnimation, 100);
      }
    }, [featured, stampKey]);

    React.useEffect(() => {
      return () => {
        window.clearInterval(rollTimerRef.current);
        window.clearTimeout(rollEndTimerRef.current);
      };
    }, []);

    if (isLoading) {
      return (
        <main className="app-shell">
          <section className="empty-state">
            <h1>점심 결재 올리는 중</h1>
            <p className="muted">메뉴 후보를 불러오고 있습니다.</p>
          </section>
        </main>
      );
    }

    if (error) {
      return (
        <main className="app-shell">
          <section className="empty-state">
            <h1>메뉴 데이터를 불러오지 못했습니다</h1>
            <p className="muted">{error}</p>
          </section>
        </main>
      );
    }

    return (
      <main className="app-shell">
        <header className="top-bar">
          <div className="brand">
            <span className="brand-mark">밥</span>
            <div className="brand-text">
              <span className="brand-title">밥픽</span>
              <span className="brand-subtitle">상태 보고 10초 컷. 먹은 건 기억.</span>
            </div>
          </div>
          <div className="profile-chip">
            <div>
              <strong>{profileName}</strong>
              <span>{profileLocationLabel ? `${profileLocationLabel} 기준` : "위치 미설정"}</span>
            </div>
            <button className="btn btn-quiet" type="button" onClick={() => openProfileSettings()}>
              설정
            </button>
          </div>
        </header>

        <div className="decision-layout">
          <section className={`state-guide ${hasFilters ? "is-active" : ""} ${isTasteStep ? "is-current-step" : "is-past-step"}`} aria-label="추천 조건">
            <div className="state-copy">
              <div className="state-heading">
                <span className="state-eyebrow">{flowCopy.eyebrow}</span>
                <span className="state-count">{menus.length}개 메뉴</span>
              </div>
              <h2>{flowCopy.heading}</h2>
              <p className="state-reason">{flowCopy.reason}</p>
              {budgetRelaxationNotice && (
                <p className="filter-relaxation-note" role="status">
                  {budgetRelaxationNotice}
                </p>
              )}
              {!hasFilters && (
                <div className="value-strip" aria-label="밥픽을 쓰는 이유">
                  <span className="value-item">
                    <strong>상태 반영</strong>
                    <small>오늘 컨디션 기준</small>
                  </span>
                  <span className="value-item">
                    <strong>반복 회피</strong>
                    <small>최근 메뉴는 살짝 피함</small>
                  </span>
                  <span className="value-item">
                    <strong>점심로그</strong>
                    <small>먹은 기록 저장</small>
                  </span>
                </div>
              )}
              {activeLabels.length ? (
                <div className="chip-row selected-chip-row">
                  {activeLabels.map((label) => (
                    <span className="chip is-active" key={label}>
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="preset-scroll-box">
                  <div className="chip-row preset-row" aria-label="추천 프리셋. 옆으로 밀어 더 볼 수 있습니다.">
                    {presetOptions.map((preset) => (
                      <button className="preset-chip" type="button" key={preset.id} onClick={() => applyPreset(preset)}>
                        {preset.question}
                      </button>
                    ))}
                  </div>
                  <span className="scroll-cue cue-desktop" aria-hidden="true">더 보기 →</span>
                  <span className="scroll-cue cue-mobile" aria-hidden="true">옆으로 밀어 더 보기 →</span>
                </div>
              )}
            </div>
            <div className="state-panel">
              <div className="state-actions">
                <button
                  className={`btn ${isTasteStep ? "btn-primary btn-next-action" : "btn-step-muted"}`}
                  type="button"
                  onClick={() => {
                    setDraftFilters(filters);
                    setIsFilterOpen(true);
                  }}
                >
                  {isTasteStep ? "입맛 맞추기" : "입맛 바꾸기"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={resetFilters} disabled={isDeciding} aria-label="아무거나: 조건 초기화">
                  아무거나
                </button>
              </div>
            </div>
          </section>

          {featured ? (
            <section className={`verdict-card ${isDecisionStep ? "is-current-step" : ""} ${isTasteStep ? "is-waiting-step" : ""}`} aria-label="오늘의 추천 메뉴">
              <figure className="verdict-photo">
                <img
                  src={featuredImage?.url || getMenuImage(featured)}
                  alt={`${featured.name} 사진`}
                  loading="eager"
                  onLoad={() => app.images?.recordImageUse(featured, featuredImage)}
                  onError={(event) => {
                    event.currentTarget.src = app.images?.FALLBACK_IMAGE || "./assets/lunch-spread.png";
                  }}
                />
                <figcaption>
                  <span>{featured.category}</span>
                  {featuredImageCredit && featuredImage?.sourceUrl ? (
                    <a href={featuredImage.sourceUrl} target="_blank" rel="noreferrer">
                      사진: {featuredImageCredit}
                    </a>
                  ) : (
                    <span>메뉴 사진</span>
                  )}
                  {featuredImage?.variantCount > 1 && <span className="image-count">{featuredImage.variantCount}장 중 선택</span>}
                </figcaption>
              </figure>
              <div className="verdict-copy">
                <div className="verdict-card-head">
                  <span className="recommend-pop">오늘의 픽</span>
                  <span className="verdict-mode">{hasFilters ? `${activeLabels.length}개 조건 반영` : "아무거나 모드"}</span>
                </div>
                <div className={`verdict-machine ${isDeciding ? "is-deciding" : ""}`}>
                  <h1 className={`verdict-name ${getMenuNameSizeClass(isDeciding ? rollingName : featured.name)}`}>
                    {isDeciding ? rollingName : featured.name}
                  </h1>
                  {!isDeciding && (
                    <div className="pick-stack" key={stampKey}>
                      <span className="verdict-stamp">PICK</span>
                      <button className="reroll-button" type="button" onClick={() => recommend()} aria-label="다른 메뉴 돌리기">
                        <span className="reroll-icon" aria-hidden="true">
                          ↻
                        </span>
                        다른 메뉴
                      </button>
                    </div>
                  )}
                </div>
                {isDeciding ? (
                  <p className="verdict-reason">메뉴 서류를 섞는 중입니다. 잠깐만요.</p>
                ) : (
                  <React.Fragment>
                    <p className="verdict-reason">{getMenuCatchphrase(featured)}</p>
                    <p className="office-line">{getOfficeLine(featured, filters)}</p>
                    <div className="spotlight-meta">
                      {getDisplayKeywords(featured).map((keyword) => (
                        <span className="meta-pill" key={keyword}>
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </React.Fragment>
                )}
                <div className="button-row action-row">
                  <button
                    className={`btn ${isDecisionStep ? "btn-accent btn-next-action" : "btn-waiting-action"}`}
                    type="button"
                    onClick={() => decideMenu(featured)}
                    disabled={isDeciding || isNearbyStep || flowStep === "done"}
                  >
                    {isNearbyStep || flowStep === "done" ? "기록 완료" : "이걸로 결정!"}
                  </button>
                  <button className="btn" type="button" onClick={() => rejectMenu(featured)} disabled={isDeciding}>
                    오늘은 아님
                  </button>
                  <button
                    className={`btn ${isNearbyStep ? "btn-primary btn-route-action" : ""}`}
                    type="button"
                    onClick={() => findNearby(featured)}
                    disabled={isDeciding || isFindingNearby}
                  >
                    {isFindingNearby ? "위치 확인 중" : isNearbyStep ? "근처 식당 찾기" : "근처에서 찾기"}
                  </button>
                </div>
                {showProfileNudge && !profile && (
                  <aside className="profile-nudge" aria-label="점심로그 이름 설정 안내">
                    <div>
                      <strong>내 점심로그로 남겨둘까요?</strong>
                      <span>닉네임을 정하면 이 브라우저에서 내 기록을 구분해 볼 수 있어요.</span>
                    </div>
                    <div className="profile-nudge-actions">
                      <button className="btn btn-primary" type="button" onClick={() => openProfileSettings("afterDecision")}>
                        이름 정하기
                      </button>
                      <button className="btn" type="button" onClick={() => setShowProfileNudge(false)}>
                        나중에
                      </button>
                    </div>
                  </aside>
                )}
                {nearbyStatus && (
                  <p className="nearby-status" role="status">
                    {nearbyStatus}
                  </p>
                )}
                {restaurantPrompt && (
                  <section className={`restaurant-prompt ${isRestaurantStep ? "is-current-step" : ""}`} aria-label="식당 기록">
                    <div className="restaurant-prompt-copy">
                      <span>맛집 데이터 쌓기</span>
                      <h3>어디로 정했나요?</h3>
                      <p>
                        {restaurantPrompt.locationLabel
                          ? `${restaurantPrompt.locationLabel}에서 ${restaurantPrompt.menuName} 먹을 식당 이름을 남겨두면 나중에 지역별 맛집 후보가 됩니다.`
                          : `${restaurantPrompt.menuName} 먹을 식당 이름을 남겨두면 나중에 맛집 후보가 됩니다.`}
                      </p>
                    </div>
                    <div className="restaurant-record-row">
                      <input
                        type="text"
                        value={restaurantName}
                        placeholder="예: 회사 앞 김치찜집"
                        aria-label="오늘 먹을 식당 이름"
                        onChange={(event) => setRestaurantName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveRestaurantChoice();
                        }}
                      />
                      <button className="btn btn-accent btn-next-action" type="button" onClick={saveRestaurantChoice}>
                        기록
                      </button>
                      <button className="btn" type="button" onClick={closeRestaurantPrompt}>
                        건너뛰기
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </section>
          ) : (
            <div className="empty-state">조건에 맞는 메뉴가 없습니다. 상태를 조금 풀어주세요.</div>
          )}

          <ResultList
            featured={featured}
            menus={similarMenus}
            onOpen={setSelectedMenu}
            onPick={pickSpecificMenu}
            getReason={getMenuCatchphrase}
            imageSeed={stampKey}
          />

          <aside className="popular-band history-band" aria-label="내 점심 기록">
            <div className="band-title-row">
              <div>
                <h2>내 점심로그</h2>
                <p className="muted small">최근 2일은 추천에서 살짝 피해요.</p>
              </div>
              <button className="btn btn-ghost btn-small download-action" type="button" onClick={exportHistoryCsv} aria-label="점심 기록 파일 내려받기">
                기록 내려받기
              </button>
            </div>

            <section className="recent-avoid">
              <h3>최근 먹은 것</h3>
              {recentAvoidRecords.length ? (
                <ol className="popular-list history-list">
                  {recentAvoidRecords.map((record) => (
                    <li className="popular-item" key={record.id}>
                      <span className="rank history-date">{getHistoryOffsetLabel(record)}</span>
                      <button className="popular-name" type="button" onClick={() => selectCalendarDate(getRecordDateKey(record))}>
                        {record.name}
                      </button>
                      <span className="popular-vibe">{record.category || formatHistoryTime(record)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted small">어제와 그제 기록이 아직 없어요.</p>
              )}
            </section>

            <section className="history-calendar" aria-label={`${historyCalendar.title} 점심 캘린더`}>
              <div className="calendar-head">
                <button className="calendar-nav" type="button" onClick={() => setCalendarCursor((date) => shiftMonth(date, -1))} aria-label="이전 달">
                  ‹
                </button>
                <h3>{historyCalendar.title}</h3>
                <button className="calendar-nav" type="button" onClick={() => setCalendarCursor((date) => shiftMonth(date, 1))} aria-label="다음 달">
                  ›
                </button>
              </div>
              <div className="calendar-weekdays" aria-hidden="true">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {historyCalendar.cells.map((cell, index) => {
                  if (!cell) return <span className="calendar-cell is-empty" key={`empty-${index}`} />;
                  const firstRecord = cell.records[0];
                  return (
                    <button
                      className={`calendar-cell ${cell.records.length ? "has-record" : ""} ${cell.isToday ? "is-today" : ""} ${cell.dateKey === selectedCalendarDate ? "is-selected" : ""}`}
                      type="button"
                      key={cell.dateKey}
                      onClick={() => selectCalendarDate(cell.dateKey)}
                      aria-label={firstRecord ? `${cell.day}일 ${firstRecord.name}` : `${cell.day}일 기록 없음`}
                    >
                      <span className="calendar-day">{cell.day}</span>
                      {firstRecord && <span className="calendar-menu">{firstRecord.name}</span>}
                      {cell.records.length > 1 && <span className="calendar-more">+{cell.records.length - 1}</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="calendar-detail" aria-label="선택한 날짜 점심 기록">
              <div className="calendar-detail-head">
                <strong>{formatDateKey(selectedCalendarDate)}</strong>
                <span className="muted small">{selectedCalendarRecords.length ? "기록 있음" : "비어 있음"}</span>
              </div>
              {selectedCalendarRecords.length ? (
                <div className="calendar-record-list">
                  {selectedCalendarRecords.map((record) => (
                    <div className="calendar-record" key={record.id}>
                      <span>{record.name}</span>
                      <small>{record.restaurantName ? `${record.restaurantName} · ${record.category || formatHistoryTime(record)}` : record.category || formatHistoryTime(record)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted small">먹었던 음식을 적어두면 점심 캘린더를 쉽게 관리할 수 있어요.</p>
              )}
              <div className="manual-record-row">
                <input
                  type="text"
                  list="menu-name-options"
                  value={manualMenuName}
                  aria-label={selectedCalendarRecords.length ? "다른 메뉴를 드셨다면 메뉴 이름을 고쳐주세요" : "먹었던 메뉴 이름을 적어주세요"}
                  placeholder={selectedCalendarRecords.length ? "다른 걸 드셨으면 고쳐주세요" : "먹었던 메뉴 이름을 적어주세요"}
                  onChange={(event) => setManualMenuName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveManualHistory();
                  }}
                />
                <button className="btn btn-primary" type="button" onClick={saveManualHistory}>
                  {selectedCalendarRecords.length ? "수정" : "추가"}
                </button>
              </div>
              <datalist id="menu-name-options">
                {menuNameOptions.map((menuName) => (
                  <option value={menuName} key={menuName} />
                ))}
              </datalist>
            </section>
          </aside>
        </div>

        {isFilterOpen && (
          <FilterModal
            categories={categories}
            moodOptions={MOOD_OPTIONS}
            filters={draftFilters}
            onChange={setDraftFilters}
            onClose={() => setIsFilterOpen(false)}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        )}

        {isProfileOpen && (
          <ProfileModal
            profile={profile}
            promptContext={profilePromptContext}
            onSave={saveProfile}
            onClose={closeProfileSettings}
          />
        )}

        {selectedMenu && (
          <DetailModal
            menu={selectedMenu}
            feedback={selectedFeedback}
            reason={buildReason(selectedMenu, filters)}
            officeLine={getOfficeLine(selectedMenu, filters)}
            hasActiveFilters={hasActiveFilters(filters)}
            onClose={() => setSelectedMenu(null)}
            onFeedback={handleFeedback}
            onNearbySearch={() => findNearby(selectedMenu)}
            isFindingNearby={isFindingNearby}
            nearbyStatus={nearbyStatus}
            imageSeed={stampKey}
          />
        )}

        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </main>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
})(window);

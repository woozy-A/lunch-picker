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

  const QUICK_STATE_MOOD_KEYS = ["spicy", "comfort", "noTime", "hangover", "diet"];
  const STRONG_MOOD_KEYS = ["spicy", "soup", "hangover", "noTime", "diet"];

  const MENU_CATCHPHRASES = {
    김치찌개: "보글보글 김치가 끓으면 밥 한 공기는 이미 결재 완료.",
    된장찌개: "구수한 냄새 한 숟갈이면 점심이 집밥 쪽으로 기웁니다.",
    순두부찌개: "몽글몽글 순두부에 달걀 톡, 속까지 얼큰하게 정리됩니다.",
    부대찌개: "햄, 라면, 김치 총출동. 점심 회의보다 빠른 합의안.",
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
    고등어구이: "노릇한 고등어와 흰밥, 담백한 점심의 정석입니다.",
    갈치조림: "양념 밴 무와 갈치살, 밥 위에서 조림의 힘이 납니다.",
    차돌된장밥: "차돌의 고소함과 된장의 구수함이 한 그릇에서 만납니다.",
    짜장면: "춘장 코팅된 면발을 비비면 점심 고민도 까맣게 정리됩니다.",
    짬뽕: "빨간 국물 한 숟갈이면 속이 확 풀리는 중식 구조대.",
    탕수육덮밥: "바삭함과 새콤달콤 소스가 밥 위에서 사이좋게 합석.",
    마파두부밥: "부드러운 두부에 얼얼한 소스, 밥이 알아서 따라옵니다.",
    중화볶음밥: "웍 향 달걀 볶음밥, 빠르게 먹어도 기분은 제대로.",
    고추잡채밥: "아삭한 피망과 고기볶음, 꽃빵 없이도 밥 위에서 충분합니다.",
    유산슬덮밥: "부드러운 해산물 소스가 오늘 점심을 살짝 고급지게 만듭니다.",
    잡채밥: "당면의 탱글함과 밥의 든든함, 탄수화물이 사이좋은 날.",
    깐풍기정식: "매콤달콤 닭튀김 한 점에 밥숟가락이 빨라집니다.",
    마라탕: "얼얼한 국물에 재료를 고르는 순간, 취향 회의는 끝.",
    마라샹궈: "국물 없이 강하게 볶아내는 마라의 직진형 점심.",
    우육면: "진한 소고기 국물과 면발, 한 그릇 안에 여행 기분.",
    크림새우덮밥: "바삭한 새우에 부드러운 크림, 점심에 살짝 기분 전환.",
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
    버섯리조또: "버섯 향 머금은 쌀알이 차분한 점심을 만들어줍니다.",
    스테이크덮밥: "고기 한 점과 밥 한 숟갈, 점심에 힘이 붙습니다.",
    함박스테이크: "소스 머금은 함박 한 조각이면 어린 시절 기분까지 옵니다.",
    치킨스테이크: "닭고기를 담백하게 구워 오후를 무겁지 않게 넘깁니다.",
    마르게리타피자: "토마토, 바질, 치즈. 단순해서 더 강한 피자 공식.",
    감바스정식: "마늘 오일 속 새우를 건지면 점심이 살짝 휴양지입니다.",
    그라탕: "치즈가 노릇하게 덮이면 숟가락이 먼저 움직입니다.",
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
    감자튀김세트: "바삭한 감자와 사이드의 유혹, 오늘은 가볍게 삐끗.",
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
    오트밀리조또: "오트밀도 리조또가 되면 꽤 그럴듯한 점심입니다.",
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
    군만두정식: "노릇한 군만두와 밥, 바삭한 소리가 점심을 살립니다.",
    칠리새우덮밥: "새우와 칠리소스가 밥 위에서 달콤매콤하게 튑니다.",
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
    샐러드버거: "버거는 먹고 싶고 양상추도 챙기고 싶은 절충안.",
    치킨텐더세트: "바삭한 텐더와 감자, 찍어 먹는 재미까지 포함.",
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
    현미도시락: "현미밥과 반찬으로 오후 졸림을 조금 멀리 둡니다.",
    구운야채볼: "구운 채소의 단맛이 볼 하나를 차분하게 채웁니다.",
    치킨마요덮밥: "치킨과 마요의 짭짤고소한 합작, 숟가락이 멈추기 어렵습니다.",
    참치마요덮밥: "참치마요는 편안합니다. 빠르고 익숙하고 배신이 적습니다.",
    제육도시락: "빨간 제육과 반찬 칸칸이, 회사 점심의 든든한 정석.",
    소불고기도시락: "달큰한 소불고기로 도시락도 꽤 근사해집니다.",
    돈까스도시락: "바삭한 메인 하나면 도시락 뚜껑 열 때 기분이 납니다.",
    생선구이도시락: "생선구이와 밥, 도시락이어도 단정한 한 끼.",
    카레도시락: "카레가 밥을 덮으면 도시락도 숟가락 하나로 정리됩니다.",
    햄버그도시락: "함박 소스가 밥에 스며들면 빠른 점심도 만족스럽습니다.",
    컵밥: "컵 하나에 밥과 토핑, 시간이 없을수록 강해지는 메뉴.",
    편의점도시락: "가성비와 속도의 현실적인 타협, 오늘도 꽤 쓸 만합니다.",
    장어덮밥: "윤기 도는 장어와 밥, 오늘 지갑이 고개를 끄덕이면 갑니다.",
    한우구이정식: "한우 한 점에 점심의 격이 갑자기 올라갑니다.",
    대게정식: "대게살을 발라 먹는 순간, 점심이 작은 회식이 됩니다.",
    스페셜초밥: "초밥 한 점씩 올리면 오후의 기분도 정갈해집니다.",
    참치회덮밥: "참치와 채소를 비비면 산뜻하지만 꽤 든든한 한 그릇.",
    생구: "침착맨 추천메뉴 생구. 검색은 생선구이로, 점심은 단정하게 갑니다.",
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
    const dateKey = record.date || (record.decidedAt ? getDateKey(new Date(record.decidedAt)) : "");
    if (dateKey === getDateKey()) return "오늘";
    if (dateKey === shiftDateKey(-1)) return "어제";
    if (dateKey === shiftDateKey(-2)) return "그제";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey.slice(5).replace("-", ".");
    return "기록";
  }

  function formatHistoryTime(record) {
    if (!record.decidedAt) return record.category || "";
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(record.decidedAt));
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

  function getMenuSearchUrl(menu) {
    return `https://map.naver.com/p/search/${encodeURIComponent(menu.searchName || menu.name)}`;
  }

  function hasTag(menu, tags) {
    return tags.some((tag) => menu.tags.includes(tag));
  }

  function isSoupish(menu) {
    return menu.soupLevel > 0 || hasTag(menu, ["soup"]) || ["짬뽕", "삼선짬뽕", "차돌짬뽕", "우육면", "마라탕", "칼국수", "만두국", "떡만둣국", "사천탕면", "락사"].includes(menu.name);
  }

  function isFastMenu(menu) {
    return menu.speed >= 3 || menu.prepMinutes <= 8 || hasTag(menu, ["fast", "quick", "portable", "sandwich", "burger", "wrap", "kimbap"]);
  }

  function getMenuBudgetTag(menu) {
    if (menu.budget_tag) return menu.budget_tag;
    if (typeof menu.price === "number") {
      if (menu.price < 10000) return "가볍게";
      if (menu.price >= 15000) return "오늘은 써도 됨";
      return "평범하게";
    }
    if (menu.priceLevel === "저렴" || menu.priceTier === 1) return "가볍게";
    if (menu.priceLevel === "프리미엄" || menu.priceTier === 3) return "오늘은 써도 됨";
    return "평범하게";
  }

  function matchesBudgetFilter(menu, budget) {
    const budgetTag = getMenuBudgetTag(menu);
    if (budget === "월급 전") return budgetTag === "가볍게";
    if (budget === "월급날") return budgetTag === "평범하게" || budgetTag === "오늘은 써도 됨";
    if (budget === "법카") return budgetTag === "오늘은 써도 됨";
    return true;
  }

  function getBudgetScore(budget, budgetTag) {
    if (budget === "월급 전") {
      if (budgetTag === "가볍게") return 110;
      if (budgetTag === "평범하게") return -45;
      return -220;
    }
    if (budget === "월급날") {
      if (budgetTag === "오늘은 써도 됨") return 86;
      if (budgetTag === "평범하게") return 58;
      return -24;
    }
    if (budget === "법카") {
      if (budgetTag === "오늘은 써도 됨") return 150;
      if (budgetTag === "평범하게") return -80;
      return -170;
    }
    return 0;
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

  function matchesStrongMood(menu, mood) {
    if (mood === "spicy") return menu.spiceLevel >= 2 || menu.tags.includes("spicy");
    if (mood === "soup") return menu.soupLevel >= 1 || isSoupish(menu);
    if (mood === "hangover") return menu.hangoverFit >= 3 || menu.soupLevel >= 2;
    if (mood === "noTime") return isFastMenu(menu);
    if (mood === "diet") return menu.healthy || menu.category === "건강식" || (menu.heaviness <= 1 && (menu.calories || 999) <= 650);
    return true;
  }

  function applyHardMoodFilters(menus, filters) {
    return filters.moods.reduce((currentMenus, mood) => {
      if (!STRONG_MOOD_KEYS.includes(mood)) return currentMenus;
      return currentMenus.filter((menu) => matchesStrongMood(menu, mood));
    }, menus);
  }

  function scoreMenu(menu, filters) {
    let score = menu.baseLikes / 25 + getFeedbackAdjustment(menu);
    const budgetTag = getMenuBudgetTag(menu);

    if (["감자튀김세트", "튀김세트"].includes(menu.name)) score -= 90;

    if (filters.categories.includes(menu.category)) score += 90;
    score += getBudgetScore(filters.budget, budgetTag);

    filters.moods.forEach((mood) => {
      if (menu.avoidMoods?.includes(mood)) score -= 35;
      if (mood === "spicy") score += menu.spiceLevel >= 2 ? 110 + menu.spiceLevel * 10 : -240;
      if (mood === "soup") score += menu.soupLevel >= 1 ? 80 + menu.soupLevel * 18 : -160;
      if (mood === "hangover") score += menu.hangoverFit * 34 + menu.soupLevel * 12 + (hasTag(menu, ["noodle", "rice"]) ? 12 : 0);
      if (mood === "noTime") score += menu.speed * 34 + (isFastMenu(menu) ? 36 : -80);
      if (mood === "solo") score += menu.soloFit * 18 + (menu.quick ? 8 : 0);
      if (mood === "team") score += menu.teamFit * 18 + (hasTag(menu, ["set", "pizza", "team"]) ? 18 : 0);
      if (mood === "comfort") score += menu.meetingSafe * 14 + (menu.heaviness <= 1 ? 36 : 0) + (menu.healthy ? 18 : 0) - menu.spiceLevel * 36 - (hasTag(menu, ["fried"]) ? 34 : 0);
      if (mood === "safe") score += menu.baseLikes / 9 + (menu.keywords?.includes("실패 낮음") ? 36 : 0) + menu.meetingSafe * 7;
      if (mood === "meeting") score += menu.meetingSafe * 28 - menu.spiceLevel * 24 - menu.heaviness * 12 - (hasTag(menu, ["fish", "fried"]) ? 24 : 0);
      if (mood === "diet") score += (menu.healthy ? 74 : 0) + (menu.category === "건강식" ? 60 : 0) + (menu.heaviness <= 1 ? 48 : -62) + ((menu.calories || 999) <= 650 ? 38 : -42) - (hasTag(menu, ["fried"]) ? 64 : 0) - (menu.heaviness >= 3 ? 80 : 0);
      if (mood === "sleepy") score += menu.spiceLevel * 16 + (hasTag(menu, ["curry", "fresh"]) ? 26 : 0) + (menu.keywords?.includes("가벼움") ? 14 : 0);
      if (mood === "rainy") score += menu.soupLevel * 28 + (hasTag(menu, ["noodle"]) ? 18 : 0) + (menu.spiceLevel >= 2 ? 8 : 0);
    });

    return score;
  }

  function hasActiveFilters(filters) {
    return filters.categories.length > 0 || filters.moods.length > 0 || filters.budget !== "상관없음";
  }

  function hasHardMoodFilter(filters) {
    return filters.moods.some((mood) => STRONG_MOOD_KEYS.includes(mood));
  }

  function getCandidateMenus(menus, filters) {
    const categoryFiltered = filters.categories.length
      ? menus.filter((menu) => filters.categories.includes(menu.category))
      : menus;
    const budgetFiltered = categoryFiltered.filter((menu) => {
      return matchesBudgetFilter(menu, filters.budget);
    });
    const filteredByMood = applyHardMoodFilters(budgetFiltered.length ? budgetFiltered : categoryFiltered, filters);
    const pool = hasHardMoodFilter(filters) ? filteredByMood : filteredByMood.length ? filteredByMood : budgetFiltered.length ? budgetFiltered : categoryFiltered;

    return pool
      .map((menu) => ({ ...menu, decisionScore: scoreMenu(menu, filters) }))
      .sort((a, b) => b.decisionScore - a.decisionScore);
  }

  function pickRecommendation(candidates, activeFilters = DEFAULT_FILTERS) {
    if (!candidates.length) return null;
    const poolSize = hasActiveFilters(activeFilters) ? 8 : 30;
    const recommendationPool = candidates.slice(0, Math.min(poolSize, candidates.length));
    const minScore = Math.min(...recommendationPool.map((menu) => menu.decisionScore || 0));
    const weightedMenus = recommendationPool.map((menu) => ({
      menu,
      weight: Math.max(4, (menu.decisionScore || 0) - minScore + 12),
    }));
    const totalWeight = weightedMenus.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * totalWeight;

    for (const item of weightedMenus) {
      cursor -= item.weight;
      if (cursor <= 0) return item.menu;
    }
    return recommendationPool[0];
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

  function buildReason(menu, filters) {
    if (!menu) return "";

    if (!hasActiveFilters(filters)) {
      return "지금은 조건이 없어 넓게 섞은 랜덤 추천입니다. 오늘 상태를 넣으면 그 조건에 맞춰 더 분명하게 고릅니다.";
    }

    if (menu.tags.includes("meme")) {
      return "침착맨의 추천메뉴, 생구. 오늘은 밈이 점심을 이깁니다.";
    }

    if (filters.budget === "월급 전" && getMenuBudgetTag(menu) === "가볍게") {
      return "월급 전 방어전에는 가성비가 먼저입니다.";
    }
    if (filters.budget === "월급날" && ["평범하게", "오늘은 써도 됨"].includes(getMenuBudgetTag(menu))) {
      return "월급날에는 너무 아끼지 말고 점심 만족도도 같이 봤습니다.";
    }
    if (filters.budget === "법카" && getMenuBudgetTag(menu) === "오늘은 써도 됨") {
      return "법카 모드라 평소보다 확실히 좋은 메뉴를 우선했습니다.";
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
      return "국물이 필요한 상태라 따뜻하게 떠먹을 수 있는 쪽으로 골랐습니다.";
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
      return "비 오는 날에는 따뜻한 쪽으로 마음이 기웁니다.";
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
    if (menu.tags.includes("meme")) return "오늘은 생구. 검색은 생선구이로 보내드릴게요.";
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

  function ProfileModal({ profile, isRequired, onSave, onClose }) {
    const [nickname, setNickname] = React.useState(profile?.nickname || "");
    const [regionName, setRegionName] = React.useState(profile?.regionName || "");

    function submitProfile(nextNickname = nickname) {
      onSave({
        nickname: nextNickname.trim(),
        regionName: regionName.trim(),
      });
    }

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={isRequired ? undefined : onClose}>
        <section className="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="modal-head">
            <div>
              <h2 id="profile-title">내 점심 기록 이름 정하기</h2>
              <p className="muted small">닉네임은 내 점심 캘린더에만 씁니다. 지역은 나중에 지역별 집계에 숫자로만 반영할 예정이에요.</p>
            </div>
            {!isRequired && (
              <button className="close-btn" type="button" onClick={onClose} aria-label="닫기">
                ×
              </button>
            )}
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

            <label className="field-group">
              <span>자주 점심 먹는 지역</span>
              <input
                type="text"
                value={regionName}
                maxLength="20"
                placeholder="예: 여의도, 강남역, 판교"
                onChange={(event) => setRegionName(event.target.value)}
              />
            </label>

            <div className="privacy-note">
              <strong>저장 방식</strong>
              <p className="muted small">개인 기록은 내 브라우저 기준으로 저장하고, 지역 통계는 나중에 “여의도 + 김치찌개 + 1”처럼 개인을 알 수 없는 숫자 집계로만 쌓을 계획입니다.</p>
            </div>

            <div className="modal-actions">
              <button className="btn" type="button" onClick={() => submitProfile("")}>
                익명으로 시작
              </button>
              <button className="btn btn-primary" type="button" onClick={() => submitProfile()}>
                저장하고 시작
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
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const rollTimerRef = React.useRef(null);
    const rollEndTimerRef = React.useRef(null);

    const categories = React.useMemo(() => [...new Set(menus.map((menu) => menu.category))], [menus]);
    const candidates = React.useMemo(() => getCandidateMenus(menus, filters), [menus, filters, feedbackVersion]);
    const visibleMenus = React.useMemo(() => menus.filter((menu) => !skippedIds.includes(menu.id)), [menus, skippedIds]);
    const similarMenus = React.useMemo(() => getSimilarMenus(visibleMenus, featured), [visibleMenus, featured]);
    const activeLabels = React.useMemo(() => getActiveLabels(filters), [filters]);
    const hasFilters = React.useMemo(() => hasActiveFilters(filters), [filters]);
    const quickMoodOptions = React.useMemo(
      () => QUICK_STATE_MOOD_KEYS.map((key) => MOOD_OPTIONS.find((mood) => mood.key === key)).filter(Boolean),
      [],
    );
    const selectedFeedback = selectedMenu ? app.api.getFeedback(selectedMenu.id) : { verdict: "" };
    const profileName = profile?.nickname || "익명 미식가";

    function refreshHistory() {
      setHistory(app.api.getLunchHistory?.() || []);
    }

    function saveProfile(nextProfile) {
      const savedProfile = app.api.saveProfile(nextProfile);
      setProfile(savedProfile);
      setIsProfileOpen(false);
      setToast(`${savedProfile.nickname || "익명"}님, 점심 기록 준비됐습니다.`);
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

      const blockedIds = new Set(options.ignoreHistory ? [] : recentIds);
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
      setToast("");
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
        setToast(`오늘 점심 판결: ${nextFeatured.name}`);
      }, 780);
    }

    function applyFilters() {
      applyFiltersAndRecommend(draftFilters);
    }

    function applyFiltersAndRecommend(nextFilters) {
      setDraftFilters(nextFilters);
      setFilters(nextFilters);
      setRecentIds([]);
      setSkippedIds([]);
      setIsFilterOpen(false);
      window.setTimeout(() => {
        const nextCandidates = getCandidateMenus(menus, nextFilters);
        recommend(nextCandidates, { ignoreHistory: true, ignoreCurrent: true, ignoreSkipped: true, filters: nextFilters });
      }, 0);
    }

    function resetFilters() {
      setDraftFilters(DEFAULT_FILTERS);
      setFilters(DEFAULT_FILTERS);
      setRecentIds([]);
      setSkippedIds([]);
      setIsFilterOpen(false);
      window.setTimeout(() => recommend(getCandidateMenus(menus, DEFAULT_FILTERS), { ignoreHistory: true, ignoreCurrent: true, ignoreSkipped: true, filters: DEFAULT_FILTERS }), 0);
    }

    function applyQuickMood(moodKey) {
      applyFiltersAndRecommend({ ...DEFAULT_FILTERS, moods: [moodKey] });
    }

    function pickSpecificMenu(menu) {
      window.clearInterval(rollTimerRef.current);
      window.clearTimeout(rollEndTimerRef.current);
      setFeatured(menu);
      setRollingName(menu.name);
      setIsDeciding(false);
      setStampKey((key) => key + 1);
      setRecentIds((previousIds) => [menu.id, ...previousIds.filter((id) => id !== menu.id)].slice(0, 18));
      setToast(`${menu.name}으로 결론 냈습니다.`);
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
        regionName: profile?.regionName || "",
      });
      refreshHistory();
      setFeedbackVersion((version) => version + 1);
      if (selectedMenu?.id === menu.id) setSelectedMenu(null);
      setToast(`${menu.name}, 오늘 점심으로 기록했습니다.`);
    }

    function rejectMenu(menu = featured) {
      if (!menu || isDeciding) return;
      const nextSkippedIds = [menu.id, ...skippedIds.filter((id) => id !== menu.id)].slice(0, 24);
      setSkippedIds(nextSkippedIds);
      if (selectedMenu?.id === menu.id) setSelectedMenu(null);
      setToast(`${menu.name}은 오늘 후보에서 뺐습니다.`);

      const nextCandidates = getCandidateMenus(menus, filters).filter((candidate) => !nextSkippedIds.includes(candidate.id));
      recommend(nextCandidates, {
        ignoreCurrent: true,
        filters,
        extraBlockedIds: nextSkippedIds,
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
          const initialCandidates = getCandidateMenus(menuData, DEFAULT_FILTERS);
          const savedProfile = app.api.getProfile?.();
          setMenus(menuData);
          setHistory(app.api.getLunchHistory?.() || []);
          setProfile(savedProfile);
          setIsProfileOpen(!savedProfile);
          setFeatured(pickRecommendation(initialCandidates, DEFAULT_FILTERS));
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
            <span className="brand-mark">점</span>
            <div className="brand-text">
              <span className="brand-title">점심판결소</span>
              <span className="brand-subtitle">메뉴만 정합니다. 식당은 각자 알아서.</span>
            </div>
          </div>
          <div className="profile-chip">
            <div>
              <strong>{profileName}</strong>
              <span>{profile?.regionName ? `${profile.regionName} 기준` : "지역 미설정"}</span>
            </div>
            <button className="btn btn-quiet" type="button" onClick={() => setIsProfileOpen(true)}>
              내 정보
            </button>
          </div>
        </header>

        <div className="decision-layout">
          <section className={`state-guide ${hasFilters ? "is-active" : ""}`} aria-label="추천 조건">
            <div className="state-copy">
              <span className="state-eyebrow">{hasFilters ? "오늘 상태 반영 중" : "추천 정확도 올리기"}</span>
              <h2>{hasFilters ? "이 상태로 점심을 고르는 중이에요" : "오늘 점심 상태를 알려주면 더 정확히 골라드려요"}</h2>
              <p className="muted small">
                {hasFilters ? "조건과 내 피드백을 함께 보고 메뉴를 고릅니다." : "원하는 상태를 누르거나, 정말 모르겠으면 아무거나로 바로 고르세요."}
              </p>
              <div className="chip-row">
                <span className="chip">{menus.length}개 메뉴</span>
                {activeLabels.length ? (
                  activeLabels.map((label) => (
                    <span className="chip is-active" key={label}>
                      {label}
                    </span>
                  ))
                ) : (
                  <React.Fragment>
                    <span className="chip">아무거나</span>
                    {quickMoodOptions.map((option) => (
                      <button className="chip state-suggestion" type="button" key={option.key} onClick={() => applyQuickMood(option.key)}>
                        {option.label}
                      </button>
                    ))}
                  </React.Fragment>
                )}
              </div>
            </div>
            <div className="state-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setDraftFilters(filters);
                  setIsFilterOpen(true);
                }}
              >
                오늘 상태 고르기
              </button>
              <button className="btn" type="button" onClick={() => recommend()} disabled={isDeciding}>
                {isDeciding ? "판결 중" : featured ? "다른 메뉴" : "점심 판결"}
              </button>
              <button className="btn" type="button" onClick={resetFilters} disabled={isDeciding} aria-label="아무거나: 조건 초기화">
                아무거나
              </button>
            </div>
          </section>

          {featured ? (
            <section className="verdict-card" aria-label="오늘의 추천 메뉴">
              <div className="verdict-copy">
                <span className="recommend-pop">오늘의 판결</span>
                <div className={`verdict-machine ${isDeciding ? "is-deciding" : ""}`}>
                  <h1 className={`verdict-name ${getMenuNameSizeClass(isDeciding ? rollingName : featured.name)}`}>
                    {isDeciding ? rollingName : featured.name}
                  </h1>
                  {!isDeciding && (
                    <span className="verdict-stamp" key={stampKey}>
                      판결 완료
                    </span>
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
                      {featured.tags.includes("meme") && <span className="meta-pill">밈</span>}
                    </div>
                  </React.Fragment>
                )}
                <div className="button-row action-row">
                  <button className="btn btn-primary" type="button" onClick={() => decideMenu(featured)} disabled={isDeciding}>
                    이걸로 결정!
                  </button>
                  <button className="btn" type="button" onClick={() => rejectMenu(featured)} disabled={isDeciding}>
                    오늘은 아님
                  </button>
                  <a
                    className={`btn ${isDeciding ? "is-disabled-link" : ""}`}
                    href={getMenuSearchUrl(featured)}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={isDeciding}
                    onClick={(event) => {
                      if (isDeciding) event.preventDefault();
                    }}
                  >
                    근처에서 찾기
                  </a>
                </div>
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
          />

          <aside className="popular-band history-band" aria-label="내 점심 기록">
            <div className="band-title-row">
              <div>
                <h2>내 점심 기록</h2>
                <p className="muted small">{profileName}님이 이걸로 결정한 메뉴가 날짜별로 쌓입니다.</p>
              </div>
            </div>

            {history.length ? (
              <ol className="popular-list history-list">
                {history.slice(0, 8).map((record) => {
                  const savedMenu = menus.find((menu) => menu.id === record.menuId || menu.name === record.name);
                  return (
                    <li className="popular-item" key={record.id}>
                      <span className="rank history-date">{getHistoryDateLabel(record)}</span>
                      <button
                        className="popular-name"
                        type="button"
                        onClick={() => {
                          if (savedMenu) pickSpecificMenu(savedMenu);
                        }}
                        disabled={!savedMenu}
                      >
                        {record.name}
                      </button>
                      <span className="popular-vibe">{record.category || formatHistoryTime(record)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="history-empty">
                <strong>아직 기록이 없습니다</strong>
                <p className="muted small">이걸로 결정!을 누르면 어제, 그제 먹은 메뉴까지 여기서 확인할 수 있어요.</p>
              </div>
            )}
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
            isRequired={!profile}
            onSave={saveProfile}
            onClose={() => setIsProfileOpen(false)}
          />
        )}

        {selectedMenu && (
          <DetailModal
            menu={selectedMenu}
            feedback={selectedFeedback}
            reason={buildReason(selectedMenu, filters)}
            officeLine={getOfficeLine(selectedMenu, filters)}
            searchUrl={getMenuSearchUrl(selectedMenu)}
            hasActiveFilters={hasActiveFilters(filters)}
            onClose={() => setSelectedMenu(null)}
            onFeedback={handleFeedback}
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

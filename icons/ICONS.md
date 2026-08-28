# 아이콘 목록 (icons/)

각 SVG가 화면 어디에서, 어떤 의미로 쓰이는지 정리. 수정 전 참고용 — 이 문서 자체는 아이콘을 바꾸지 않음.

용도별로 하위 폴더에 분류되어 있음: `ui/`(상단바·메뉴·공통 UI), `result/`(낚시 결과/상태), `shop/`(상점 전용), `fish/`(물고기 아트), `app/`(PWA 앱 아이콘).

## ui/ — 상단바·메뉴·공통 UI

| 파일 | 쓰이는 곳 | 코드 위치 | 현재 모양 |
|---|---|---|---|
| `ui/location.svg` | 상단바 왼쪽, 현재 낚시터 이름("다리 밑") 옆 핀 아이콘 | `index.html`의 `.location-pill` | 흰색 지도 핀(물방울 모양 + 안쪽 원) |
| `ui/shell.svg` | 상단바 오른쪽, 재화(조개) 개수 표시 옆 아이콘 | `index.html`의 `.shells-pill` | 조개 껍데기(주황빛, 부채꼴 줄무늬) |
| `ui/menu.svg` | 상단바 오른쪽 끝, 햄버거 메뉴 버튼 | `index.html`의 `#menu-toggle-btn` | 흰색 가로줄 3개 |
| `ui/shop.svg` | 햄버거 메뉴에서 아래로 펼쳐지는 세로 메뉴의 첫 항목 — 상점 | `index.html`의 `#menu-shop-btn` | 상점 차양(줄무늬 지붕) + 진열대 |
| `ui/bucket.svg` | 세로 메뉴 두 번째 항목 — 보관함(잡은 물고기 보관) | `index.html`의 `#menu-bucket-btn` | 백팩(좌우 어깨끈 + 본체 + 앞주머니) |
| `ui/settings.svg` | 세로 메뉴 세 번째 항목 — 설정 | `index.html`의 `#menu-settings-btn` | 톱니바퀴(원형 기어, Feather 아이콘 스타일) |
| `ui/bait-common.svg` / `ui/bait-rare.svg` / `ui/bait-epic.svg` / `ui/bait-legendary.svg` | 하단바 중앙 미끼 버튼(`#bait-btn-icon`, 장착한 미끼 등급에 따라 4개 중 하나로 교체)과 그 위 미끼 선택 팝업(`#bait-menu`)의 각 항목 아이콘, 상점 뽑기 탭의 보유 미끼 목록·뽑기 리빌 카드에서도 재사용 | `game.js`의 `updateBaitButton()`/`renderGachaTab()`/`openGachaReveal()` | 같은 웜(지렁이) 곡선 모양을 등급 색(`FishData.TIERS[key].color`)으로만 다르게 채색 — `material-rare.svg`/`material-epic.svg`와 같은 이유(등급별 색상 분리 파일)로 4개로 나뉨 |
| `ui/close.svg` | 상점/보관함/설정 팝업 우측 상단 닫기 버튼 | `index.html`의 `#shop-close-btn`, `#bucket-close-btn`, `#settings-close-btn` | 흰색 X자 |

## result/ — 낚시 결과/상태

| 파일 | 쓰이는 곳 | 코드 위치 | 현재 모양 |
|---|---|---|---|
| `result/bite.svg` | 입질이 왔을 때 상태 텍스트("입질이 왔어요!") 앞에 붙는 아이콘 | `game.js`의 `triggerBite()` → `showStatus(..., 'icons/result/bite.svg')` | 노란 번개 모양 |
| `result/miss.svg` | 낚시 실패("놓쳤어요...") 결과창 아이콘 — 릴링 타이밍을 놓쳐 아예 놓친 경우 | `game.js`의 `catchFail()` → `showResult(false, ..., 'icons/result/miss.svg')` | 선명한 붉은/코랄색 뭉게구름(원 5개 뭉친 형태) — 시간 게이지 위험(danger) 색과 같은 계열, "놓쳐서 흩어짐"을 표현 |
| `result/junk/<id>.svg` (3개, 꽝 아이템별) | 낚시는 성공했지만 물고기가 아닌 꽝 아이템일 때 결과창 아이콘 — `miss.svg`(릴링 실패)와는 다른 개념. `fish/<tier>/<id>.svg`와 같은 방식으로 아이템별 아이콘(`old_boot`/`crushed_can`/`waterlogged_wood`) | `game.js`의 `catchSuccess()`가 `currentCatch.tier === 'junk'`일 때 `FishData.junkIconPath(c.id)`로 경로 조합 | `old_boot.svg`(회색 낡은 장화), `crushed_can.svg`(찌그러진 녹슨 깡통), `waterlogged_wood.svg`(물방울 맺힌 눅눅한 나무토막) |

## shop/ — 상점 전용

| 파일 | 쓰이는 곳 | 코드 위치 | 현재 모양 |
|---|---|---|---|
| `shop/rod.svg` | 상점 "업그레이드" 탭, 낚싯대 아이콘 | `index.html`의 `#upgrade-rod-icon` | 대각선 낚싯대 + 릴 + 낚싯줄/바늘 |
| `shop/gem.svg` | 보석(낚싯대 등급업 보조 화폐) 아이콘 — 획득 팝업, 업그레이드 탭의 보유 개수, 상단바·상점 헤더의 보조 화폐 표시까지 전부 공용 | `game.js`의 `showMaterialPopup()`/`renderUpgradeTab()`이 `#material-icon`/`#rod-material-icon`의 `src`로, `index.html`의 `.gems-pill`/`.shop-balance`가 정적으로 사용 | 파란색 보석(등급 색이 아닌 화폐 전용 색) |
| `shop/gacha-chest.svg` | 상점 "뽑기" 탭 첫 화면의 장식용 일러스트(둥실 떠 있는 애니메이션) | `index.html`의 `.gacha-hero-img` | 반짝이는 별 장식이 붙은 나무 보물상자 |

## fish/ — 물고기 아트

등급별 하위 폴더(`common/`, `rare/`, `epic/`, `legendary/`) 밑에 **어종 ID 하나당 SVG 파일 하나**(`icons/fish/<등급>/<species id>.svg`, id는 `fish-data.js`의 `FISH_BY_TIER`와 동일). 등급마다 그 등급 색(`FishData.TIERS[tier].color`) 계열 색조로 통일하되, 종마다 체형(길이/두께)·꼬리 모양(삼각/포크/둥근)·무늬(점무늬/줄무늬/없음)·수염 유무 등을 달리해서 시각적으로 구분함 — 메기류(`catfish`, `bagrid_catfish`, `daenongaengi`, `giant_catfish`, `black_dragon_catfish`)는 수염, `abyssal_angler`는 발광 촉수(안강망), `glowing_ayu`/`abyssal_angler`는 은은한 발광 후광, 잉어류(`koi`, `platinum_koi`)는 점무늬 등. 경로는 `FishData.speciesIconPath(tierKey, speciesId)`로 코드에서 조합해서 구함(개별 파일을 데이터에 하드코딩하지 않음).

| 파일 | 쓰이는 곳 | 코드 위치 | 비고 |
|---|---|---|---|
| `fish/<tier>/<id>.svg` (30개, 어종별) | 낚시 성공 결과창 아이콘, 상점 판매/보관함/도감 목록의 `sell-row-icon` | `game.js`의 `catchSuccess()`/`renderSellList()`/`renderBucketInventory()`/`renderLog()` — 전부 `FishData.speciesIconPath()`로 경로 조합 | 릴링 중 "남은 히트 수" 카운터의 물고기 아이콘과는 별개(카운터는 `game.js` 내 인라인 SVG `FISH_ICON_SVG`, 종 구분 없음) |
| `fish/unknown.svg` | 도감에서 아직 못 잡은 종("???")의 자리를 채우는 공용 실루엣 — 실제 종 아이콘을 미리 보여주면 "???"로 이름을 가리는 의미가 없어지므로 미발견 상태에서만 사용 | `game.js`의 `renderLog()`가 `!record`일 때 사용 | 단색 검은 물고기 실루엣(디테일 없음, "정체불명"을 표현) |
| `fish/fish.svg` | 이제 실제 UI 어디에서도 안 쓰임 — `DUMMY_TEST_FISH`(사용 안 하는 코드 참고용 더미)만 여전히 이 파일을 가리킴 | `fish-data.js`의 `DUMMY_TEST_FISH.icon` | 파란 옆모습 물고기 + 눈 |

## app/ — PWA 앱 아이콘

| 파일 | 쓰이는 곳 | 코드 위치 | 현재 모양 |
|---|---|---|---|
| `app/icon-180.png` / `app/icon-192.png` / `app/icon-512.png` | 인게임 UI가 아니라 홈 화면 추가 시 앱 아이콘(PWA). 낚시찌 모양을 딴 별도 이미지 | `manifest.json`, `index.html`의 `<link rel="apple-touch-icon">` 등 | 남색 배경 + 낚싯대/찌/물결 |

## 참고
- 릴링 게이지 옆 "남은 히트 수" 물고기 아이콘은 파일이 아니라 `game.js`의 `FISH_ICON_SVG` 문자열로 직접 그려짐(`renderHitsCounter()`). 이 아이콘을 수정하려면 icons 폴더가 아니라 `game.js`를 봐야 함.
- "남은 기회(체력)" 표시는 아이콘이 아니라 `chance-lights`의 CSS 원(`.chance-dot`)들로, SVG 파일 없음.

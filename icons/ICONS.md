# 아이콘 목록 (icons/)

각 SVG가 화면 어디에서, 어떤 의미로 쓰이는지 정리. 수정 전 참고용 — 이 문서 자체는 아이콘을 바꾸지 않음.

| 파일 | 쓰이는 곳 | 코드 위치 | 현재 모양 |
|---|---|---|---|
| `location.svg` | 상단바 왼쪽, 현재 낚시터 이름("다리 밑") 옆 핀 아이콘 | `index.html`의 `.location-pill` | 흰색 지도 핀(물방울 모양 + 안쪽 원) |
| `shell.svg` | 상단바 오른쪽, 재화(조개) 개수 표시 옆 아이콘 | `index.html`의 `.shells-pill` | 조개 껍데기(주황빛, 부채꼴 줄무늬) |
| `menu.svg` | 상단바 오른쪽 끝, 햄버거 메뉴 버튼 | `index.html`의 `#menu-toggle-btn` | 흰색 가로줄 3개 |
| `shop.svg` | 햄버거 메뉴에서 아래로 펼쳐지는 세로 메뉴의 첫 항목 — 상점 | `index.html`의 `#menu-shop-btn` | 상점 차양(줄무늬 지붕) + 진열대 |
| `bucket.svg` | 세로 메뉴 두 번째 항목 — 보관함(잡은 물고기 보관) | `index.html`의 `#menu-bucket-btn` | 백팩(좌우 어깨끈 + 본체 + 앞주머니) |
| `settings.svg` | 세로 메뉴 세 번째 항목 — 설정 | `index.html`의 `#menu-settings-btn` | 톱니바퀴(원형 기어, Feather 아이콘 스타일) |
| `bait.svg` | 하단바 중앙, 미끼 선택 버튼(크게, 정중앙) | `index.html`의 `#bait-btn` (아이콘 크기는 `style.css`의 `.ui-icon-xl`) | 분홍색 꿈틀거리는 지렁이 곡선 |
| `bite.svg` | 입질이 왔을 때 상태 텍스트("입질이 왔어요!") 앞에 붙는 아이콘 | `game.js`의 `triggerBite()` → `showStatus(..., 'icons/bite.svg')` | 노란 번개 모양 |
| `fish.svg` | 낚시 성공 결과창 아이콘(모든 실제 물고기 등급 공통, 종별 개별 아트는 아직 없음) — 릴링 중 "남은 히트 수" 카운터의 물고기 아이콘과는 별개 파일(카운터는 `game.js` 내 인라인 SVG `FISH_ICON_SVG`) | `game.js`의 `catchSuccess()`가 `currentCatch.tier !== 'junk'`일 때 사용 | 파란 옆모습 물고기 + 눈 |
| `miss.svg` | 낚시 실패("놓쳤어요...") 결과창 아이콘 — 릴링 타이밍을 놓쳐 아예 놓친 경우 | `game.js`의 `catchFail()` → `showResult(false, ..., 'icons/miss.svg')` | 선명한 붉은/코랄색 뭉게구름(원 5개 뭉친 형태) — 시간 게이지 위험(danger) 색과 같은 계열, "놓쳐서 흩어짐"을 표현 |
| `junk.svg` | 낚시는 성공했지만 물고기가 아닌 꽝 아이템일 때 결과창 아이콘 — `miss.svg`(릴링 실패)와는 다른 개념 | `game.js`의 `catchSuccess()`가 `currentCatch.tier === 'junk'`일 때 사용 | 회색 낡은 장화 실루엣 |
| `close.svg` | 상점 팝업 우측 상단 닫기 버튼 | `index.html`의 `#shop-close-btn` | 흰색 X자 |
| `rod.svg` | 상점 "업그레이드" 탭, 낚싯대 아이콘 | `index.html`의 `#upgrade-rod-icon` | 대각선 낚싯대 + 릴 + 낚싯줄/바늘 |
| `icon-180.png` / `icon-192.png` / `icon-512.png` | 인게임 UI가 아니라 홈 화면 추가 시 앱 아이콘(PWA). 낚시찌 모양을 딴 별도 이미지 | `manifest.json`, `index.html`의 `<link rel="apple-touch-icon">` 등 | 남색 배경 + 낚싯대/찌/물결 |

## 참고
- 릴링 게이지 옆 "남은 히트 수" 물고기 아이콘은 파일이 아니라 `game.js`의 `FISH_ICON_SVG` 문자열로 직접 그려짐(`renderHitsCounter()`). 이 아이콘을 수정하려면 icons 폴더가 아니라 `game.js`를 봐야 함.
- "남은 기회(체력)" 표시는 아이콘이 아니라 `chance-lights`의 CSS 원(`.chance-dot`)들로, SVG 파일 없음.

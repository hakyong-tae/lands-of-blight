# 🎮 Lands of Blight - 구조 분석 노트

> 학습 목적 분석. Vampire Survivors 스타일 탑다운 액션 로그라이크.
> 엔진: **Defold** | 언어: **Lua** | 아키텍처: **ECS (Entity Component System)**

---

## 📁 프로젝트 파일 구조 (Vite 기반)

> 개발 서버: `npm run dev` → http://localhost:3002

```
/Users/hytae/Downloads/lands-of-blight/
│
├── 📄 index.html            ← Vite 진입점 (게임 UUID 경로로 자동 리다이렉트)
├── ⚙️  vite.config.js        ← Vite 설정
│                               - port: 3002
│                               - COEP/COOP 헤더 (WASM 필수)
│                               - publicDir: 'public'
│                               - 바이너리 확장자 처리 (.wasm, .arcd0 등)
├── 📦 package.json           ← npm 스크립트
│                               - npm run dev      → Vite 개발 서버
│                               - npm run build    → dist/ 빌드
│                               - npm run preview  → 빌드 결과 미리보기
│                               - npm run download → 게임 파일 재다운로드
├── 🚫 .gitignore             ← node_modules/, dist/, output/ 제외
├── 📄 downloader.js          ← Puppeteer 기반 게임 파일 다운로더
├── 📄 serve.js               ← (구버전) 커스텀 서버, 현재 미사용
├── 📄 NOTES.md               ← 이 파일 (구조 분석 노트)
│
├── 📁 src/                   ← Verse8에서 구현 예정 (게임 로직)
│   ├── 📄 main.js            ← JS 진입점 (추후 작성)
│   └── 📁 assets/            ← Vite가 처리할 이미지/svg 등
│
├── 📁 public/                ← Vite public 디렉토리
│   │                            (Vite가 변환 없이 그대로 서빙)
│   │                            (→ output/.../network/ 심볼릭 링크)
│   └── 📁 38611310-dbf0-4a57-9e63-67f059de973c/   ← 게임 UUID 폴더
│       │
│       ├── 📄 index.html              ← 게임 HTML 진입점
│       │                                 (PokiSDK mock 포함)
│       ├── 🔧 Landsofblight.wasm      ← Defold 게임 엔진 (1.9MB)
│       ├── 🔧 Landsofblight_wasm.js   ← 엔진 JS 래퍼/로더 (270KB)
│       ├── 📄 dmloader.js             ← Defold 웹 로더 (아카이브 파싱)
│       ├── 📄 modernizr-custom.js     ← 브라우저 기능 감지
│       ├── 🖼️  loading.webp            ← 로딩 화면 배경
│       ├── 🖼️  load_bar_bg.png         ← 로딩바 배경
│       ├── 🖼️  load_bar_fg.png         ← 로딩바 진행 이미지
│       ├── 🔤 loading_font.ttf         ← 로딩 화면 폰트
│       │
│       └── 📁 archive/                ← 게임 데이터 (Defold 아카이브)
│           ├── archive_files.json     ← 아카이브 파일 목록/오프셋 정보
│           ├── game.arcd0             ← 게임 에셋 데이터 본체 (1.6MB, 압축)
│           ├── game.arci0             ← 에셋 인덱스 (파일명↔오프셋 매핑)
│           ├── game.dmanifest0        ← 의존성 매니페스트
│           ├── game.projectc0         ← 컴파일된 프로젝트 설정
│           └── game.public.der0       ← 아카이브 서명 공개키
│
├── 📁 node_modules/          ← npm 패키지 (vite 등)
└── 📁 output/                ← 다운로더 출력 원본 (public/ 이 여기를 링크)
    └── lands_2026-04-07T01-09-20/network/
        └── (위 public/ 구조와 동일)
```

### 🚀 실행 방법

```bash
cd /Users/hytae/Downloads/lands-of-blight

npm run dev       # 개발 서버 시작 → http://localhost:3002
npm run build     # 정적 빌드 (dist/ 생성)
npm run download  # 게임 파일 재다운로드 (Puppeteer)
```

---

## 🏗️ 게임 아키텍처 개요

```
[init.collectionc]              ← 게임 시작점
    └── init_controller.scriptc ← 씬 관리자 초기화
        └── [SceneManager]
            ├── select_hero_scene  ← 영웅 선택 화면
            ├── game_scene         ← 메인 게임플레이
            ├── choose_item        ← 레벨업 아이템 선택
            ├── chest_scene        ← 보상 상자
            ├── pause              ← 일시정지 메뉴
            └── lose_scene         ← 게임오버 화면
```

---

## 🎯 씬 구조 (`/scenes/`)

| 씬 | 스크립트 | 역할 |
|---|---|---|
| `game_scene` | `game_scene.luac` | 메인 게임 루프, ECS 시스템 관리 |
| `game_world` | `game_world.guic` | 게임 월드 GUI (체력바, 타이머 등) |
| `top_panel` | `top_panel.guic` | 상단 UI (골드, 경험치) |
| `select_hero_scene` | `select_hero_scene.luac` | 영웅 선택 |
| `choose_item` | `choose_item.luac` | 레벨업 시 아이템 3개 선택 |
| `chest_scene` | `chest_scene.luac` | 보상 상자 열기 |
| `pause` | `pause_scene.luac` | 일시정지 |
| `lose_scene` | `lose_scene.luac` | 게임오버 |

---

## ⚙️ ECS 시스템 목록 (`/world/game/ecs/systems/`)

### 플레이어
| 파일 | 역할 |
|---|---|
| `input_player_system.luac` | 키보드/터치 입력 처리 |
| `input_system.luac` | 입력 통합 |
| `player_regen_system.luac` | HP 자동 재생 |
| `player_collect_drop_system.luac` | 아이템/경험치 수집 |
| `player_check_lose_system.luac` | 사망 판정 |
| `player_check_max_hp.luac` | 최대 HP 제한 |
| `player_check_exp_mul.luac` | 경험치 배율 |
| `player_check_gold_mul.luac` | 골드 배율 |
| `player_velocity_limit_system.luac` | 이동속도 제한 |
| `drop_magnet_system.luac` | 아이템 자석 효과 |
| `drop_magnet_all_exp_system.luac` | 전체 경험치 당기기 |

### 적(Enemy)
| 파일 | 역할 |
|---|---|
| `enemy_move_system.luac` | 적 이동 (플레이어 추적) |
| `enemy_attack_system.luac` | 적 공격 판정 |
| `enemy_list_system.luac` | 적 목록 관리 |
| `enemy_remove_dead_system.luac` | 사망한 적 제거 |
| `enemy_remove_distance_system.luac` | 너무 멀어진 적 제거 |

### 무기/아이템 시스템
| 파일 | 무기 |
|---|---|
| `item_knife_system.luac` | 🔪 단검 |
| `item_magic_wand_system.luac` | 🪄 마법 지팡이 |
| `item_fire_wand_system.luac` | 🔥 화염 지팡이 |
| `item_laser_system.luac` | ⚡ 레이저 |
| `item_whip_system.luac` | 🪃 채찍 |
| `item_bomb_system.luac` | 💣 폭탄 |
| `item_mines_system.luac` | 💥 지뢰 |
| `item_mines_limit_system.luac` | 지뢰 개수 제한 |
| `item_king_bible_system.luac` | 📖 킹바이블 (회전 오브) |

### 투사체
| 파일 | 역할 |
|---|---|
| `projectile_move_system.luac` | 투사체 이동 |
| `projectile_hit_system.luac` | 투사체 충돌 판정 |
| `bomb_logic_system.luac` | 폭탄 폭발 로직 |
| `mine_logic_system.luac` | 지뢰 폭발 로직 |
| `fire_zone_attack_system.luac` | 화염 지대 공격 |
| `auto_destroy_system.luac` | 수명 다한 오브젝트 제거 |

### 청크/맵
| 파일 | 역할 |
|---|---|
| `load_unload_chunk_systems.luac` | 무한 맵 청크 로드/언로드 |
| `camera_follow_player_system.luac` | 카메라 플레이어 추적 |

### 렌더링 (Draw)
| 파일 | 역할 |
|---|---|
| `draw_enemy_system.luac` | 적 렌더링 |
| `draw_player_system.luac` | 플레이어 렌더링 |
| `draw_projectile_system.luac` | 투사체 렌더링 |
| `draw_damage_number_system.luac` | 데미지 숫자 표시 |
| `draw_drop_system.luac` | 드롭 아이템 렌더링 |
| `draw_hp_bar_system.luac` | 적 HP바 |
| `draw_laser_attack_system.luac` | 레이저 렌더링 |
| `draw_whip_attack_system.luac` | 채찍 렌더링 |
| `draw_mine_system.luac` | 지뢰 렌더링 |
| `draw_bomb_system.luac` | 폭탄 렌더링 |
| `draw_arrow_system.luac` | 화살 렌더링 |
| `draw_fire_zone_system.luac` | 화염 지대 렌더링 |
| `draw_area_system.luac` | 영역 렌더링 |
| `draw_chest_system.luac` | 상자 렌더링 |
| `draw_container_system.luac` | 컨테이너 렌더링 |
| `draw_decor_system.luac` | 배경 장식 렌더링 |
| `draw_mine_explosion_system.luac` | 지뢰 폭발 이펙트 |
| `update_dynamic_z_system.luac` | z-order 정렬 (드로우 순서) |
| `vignette_update_system.luac` | 화면 비네팅 이펙트 |

### 물리
| 파일 | 역할 |
|---|---|
| `update_box2d_system.luac` | Box2D 물리 업데이트 |
| `update_position_from_body_system.luac` | 물리 → 위치 동기화 |

---

## ⚖️ 밸런스 데이터 (`/world/balance/`)

| 파일 | 내용 |
|---|---|
| `balance.luac` | 전체 밸런스 상수 |
| `items_def.luac` | 아이템/무기 정의 |
| `items.luac` | 아이템 수치 |
| `enemies.luac` | 적 스탯 (HP, 속도, 데미지) |
| `heroes.luac` | 영웅 정의 |
| `battles.luac` | 웨이브/배틀 정의 |
| `upgrades.luac` | 업그레이드 트리 |
| `levels.luac` | 레벨 경험치 테이블 |

---

## 💾 저장소 (`/world/storage/`)

| 파일 | 역할 |
|---|---|
| `storage.luac` | 메인 저장소 |
| `game_storage_part.luac` | 게임 진행 데이터 |
| `heroes_storage_part.luac` | 영웅 해금/선택 |
| `upgrades_storage_part.luac` | 업그레이드 현황 |
| `resource_storage_part.luac` | 자원(골드 등) |
| `options_storage_part.luac` | 게임 설정 |
| `debug_storage_part.luac` | 디버그용 |

---

## 🔧 주요 라이브러리 (`/libs/`)

| 파일 | 역할 |
|---|---|
| `ecs.luac` | ECS 프레임워크 핵심 |
| `sm/scene_manager.luac` | 씬 전환 관리 |
| `sm/scene_loader.luac` | 씬 로더 |
| `events.luac` | 이벤트 버스 |
| `event_bus.luac` | 이벤트 발행/구독 |
| `actions/` | 트윈/애니메이션 액션 시스템 |
| `tween.luac` | 트윈 수치 보간 |
| `json.luac` | JSON 파싱 |
| `rx.luac` | 반응형 프로그래밍 (Reactive) |
| `lume.luac` | Lua 유틸리티 |
| `middleclass.luac` | Lua OOP 클래스 |
| `box2d_world.luac` | Box2D 물리 래퍼 |
| `perlin.luac` | 펄린 노이즈 (맵 생성) |
| `sounds.luac` | 사운드 관리 |
| `log.luac` | 로깅 |
| `hashes.luac` | Defold 해시 캐시 |
| `sdk/sdk.luac` | PokiSDK 래퍼 |

---

## 🎵 사운드 (`/assets/sounds/`)

```
gameplay/
├── weapons/  → suriken, mace, bomb, arrow, sword, laser, lightning, chopper
├── misc/     → damage_player, death_player, collect_exp, collect_money, collect_stuff, break_thing
└── enemies/  → damage_enemy

ui/
└── button_click, show_levelup, item_choose, item_select, open_chest, buy_item,
    upgrade_nomoney, reroll, curtains_open/close, show_screen

music/
└── menu.ogg, music_4.ogg
```

---

## 🏃 게임 오브젝트 (`/world/game/go/`)

| 폴더/파일 | 내용 |
|---|---|
| `player/player.collectionc` | 플레이어 캐릭터 |
| `enemy/enemy.collectionc` | 적 캐릭터 |
| `projectile.collectionc` | 투사체 |
| `arrow.collectionc` | 화살 |
| `laser.collectionc` | 레이저 |
| `bomb.collectionc` | 폭탄 |
| `mine.collectionc` | 지뢰 |
| `meteor.collectionc` | 운석 |
| `fire_zone.collectionc` | 화염 지대 |
| `whip_attack.collectionc` | 채찍 공격 |
| `explosion.collectionc` | 폭발 이펙트 |
| `drop.collectionc` | 드롭 아이템 |
| `chest.collectionc` | 보상 상자 |
| `container.collectionc` | 컨테이너 |
| `tile.goc` | 배경 타일 |
| `decor_bg.goc` | 배경 장식 |
| `decor_sprite.goc` | 장식 스프라이트 |

---

## 💡 Verse8 AI에게 이 구조 설명하는 법

```
Lands of Blight 구조를 참고해서 만들고 싶어:

아키텍처: ECS (Entity Component System)
- 씬: 영웅선택 → 게임 → 레벨업선택 → 반복
- 시스템 분리: input / move / attack / draw / cleanup

무기 시스템:
- 각 무기마다 독립 system (knife_system, laser_system 등)
- 레벨업 시 3개 랜덤 제공, 1개 선택

밸런스 구조:
- 별도 파일(balance.lua)에 수치 분리
- enemies.lua, items.lua, heroes.lua 분리 관리
```

---

*마지막 업데이트: 2026-04-07*

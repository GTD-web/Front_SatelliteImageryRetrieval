# @sentinel/web

Sentinel 데이터 플랫폼 프론트엔드. Sentinel-1 SAR 씬 검색·다운로드와 InSAR 산출물 관리를 위한 관리자/사용자 웹 콘솔.

**스택:** Next.js 16 (App Router · Turbopack) · React 19 · TypeScript 5 · OpenLayers 10 · TanStack Query 5 · Recharts · Tailwind CSS 3 · socket.io-client · shpjs

## 개발

이 앱은 **Docker로 실행·검증**한다. `next dev` / `pnpm dev`는 포트 충돌·stale HMR 방지를 위해 사용하지 않는다. (프로젝트 루트 [`CLAUDE.md`](../../CLAUDE.md) 정책)

```bash
# 모노레포 루트에서
pnpm web:docker:up        # 이미지 빌드 + 컨테이너(sentinel-web) 재기동, 포트 3333
pnpm web:docker:logs      # 로그 추적
pnpm web:docker:down      # 정지
pnpm web:docker:rebuild   # 강제 fresh 재생성
```

- 접속: <http://localhost:3333> (루트 `/`는 `/plan/sar/user/search`로 리다이렉트)
- 컨테이너: `sentinel-web` · 이미지: `sentinel/web:latest` · 포트 `3333:3333`
- 헬스 확인: `docker ps --filter name=sentinel-web` → `(healthy)`

빌드 자체가 타입/lint 게이트다 (`next build`에서 TS·ESLint 오류 시 실패). 정적 검사만 돌리려면:

```bash
pnpm --filter @sentinel/web type-check   # tsc --noEmit
pnpm --filter @sentinel/web lint          # eslint
pnpm --filter @sentinel/web test:e2e      # Playwright E2E
```

## 라우트 구조

`plan`(Mock 와이어프레임)과 `current`(실 API 연결) 두 트랙을 라우트 그룹으로 분리한다. 상세는 [`docs/15-frontend-architecture.md`](../../docs/15-frontend-architecture.md)·[`docs/17-frontend-ia.md`](../../docs/17-frontend-ia.md) 참조.

```
src/app/
├── (auth)/                     # 인증 전 화면
│   ├── login/
│   ├── signup/                 # 가입 요청 (이름·이메일·이용 목적)
│   └── set-password/
│
├── (planning)/plan/(sar)/sar/  # Mock 데이터 — 기획·와이어프레임 트랙
│   ├── _components/            # plan 공용 컴포넌트 (AoiThumbnail, SceneTimelinePanel …)
│   ├── user/                   # 사용자 화면
│   │   ├── search/             #   씬 검색 (지도 + 타임라인)
│   │   ├── aois/               #   관심 영역(AOI) 관리
│   │   ├── downloads/          #   다운로드 잡
│   │   └── insar/              #   InSAR 요청·결과 (request / results)
│   └── admin/                  # 관리자 화면
│       ├── dashboard/          #   운영 대시보드
│       ├── search/             #   전역 씬 검색
│       ├── users/              #   사용자/가입 승인 관리
│       ├── crawl-targets/      #   크롤 대상 관리
│       ├── sync-monitor/       #   메타데이터 동기화 모니터
│       ├── failed-downloads/   #   실패 다운로드 재시도
│       ├── analysis-qa/        #   분석 QA / 재처리 큐
│       └── audit-logs/         #   감사 로그
│
├── (current)/current/(sar)/sar/  # 실 API 연결 트랙 (점진 이관 중)
│   └── user/search/
│
└── api/                        # Next 라우트 핸들러 (Mock 백엔드)
    ├── me/ip/                  #   클라이언트 IP 확인
    └── signup/                 #   가입 요청 접수
```

## 폴더 관례

라우트(`page.tsx`)는 도메인 폴더 안에 두고, 공용 코드는 `src/` 최상위에 모은다.

```
src/
├── app/        # Next.js App Router 라우트 (위 구조)
├── _ui/        # 공용 UI 프리미티브 (Badge, Button, ThemeToggle, SidePanel …)
│   └── hifi/   #   하이파이 디자인 시스템 (Icon, Modal, Toast, Quicklook, useConfirm …)
├── _shared/    # 도메인 상수·컨텍스트·헬퍼 (constants/user, insar-qa, aoi-assess …)
├── _hooks/     # 공용 React 훅
└── _utils/     # 순수 유틸 함수
```

- 한 화면에만 쓰는 컴포넌트/Mock은 해당 라우트 그룹 하위(`_components/`, `_mocks/`)에 둔다.
- `plan` 화면은 `_mocks/`의 정적 데이터로 동작하고, `current` 화면은 TanStack Query로 실 API를 호출한다.

## 환경 변수

| 변수 | 용도 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | API 서버 URL | `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `http://localhost:3001` |
| `NEXT_PUBLIC_OSM_TILE_URL` | 대체 타일 서버 (사내망용) | OSM 기본 |
| `HOST_LAN_IP` | Docker 기동 시 LAN 노출 IP (`web:docker:up`이 자동 감지) | 자동 |

## 참고 문서

- [docs/15-frontend-architecture.md](../../docs/15-frontend-architecture.md) — 아키텍처 (OpenLayers, plan/current 트랙, 폴더 구조)
- [docs/16-frontend-usecases.md](../../docs/16-frontend-usecases.md) — 유즈케이스 (UC 코드)
- [docs/17-frontend-ia.md](../../docs/17-frontend-ia.md) — 정보 구조 (Screen ID, Page/Layer)
- [docs/19-frontend-scenarios.md](../../docs/19-frontend-scenarios.md) — E2E 시나리오
- [docs/20-vworld-integration.md](../../docs/20-vworld-integration.md) — VWorld 주소→필지 폴리곤 통합

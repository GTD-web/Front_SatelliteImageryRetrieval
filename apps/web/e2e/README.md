# Web UI E2E (Playwright)

UI 변경 후 회귀를 잡기 위한 Playwright smoke 테스트.

## 전제

Docker 로 web 컨테이너가 떠 있어야 한다 (포트 3333):

```bash
pnpm web:docker:up
docker ps --filter name=sentinel-web --format "{{.Status}}"
# Up ... (healthy)
```

## 최초 1회 — 브라우저 바이너리 설치

```bash
pnpm install                                  # @playwright/test 설치
pnpm --filter @sentinel/web test:e2e:install  # chromium + 의존성
```

## 실행

```bash
pnpm --filter @sentinel/web test:e2e        # 헤드리스
pnpm --filter @sentinel/web test:e2e:ui     # UI runner
```

다른 호스트/포트로 붙으려면 `E2E_BASE_URL=http://...` 환경변수를 사용한다.

## 무엇을 검사하나

`ui-smoke.spec.ts` 안의 테스트들:

- 사용자/관리자 주요 페이지가 콘솔 에러 없이 렌더되는지
- 좌측 사이드바 아바타 클릭 시 사용자 메뉴가 화면 안에 보이는지 + Esc 닫힘 + Admin 전환
- 다운로드 페이지에서 실시간 뱃지·새로고침이 칩 필터와 같은 toolbar 행에 들어갔는지
- InSAR 사이드바에서 섹션 헤더 옆 info 아이콘이 없고, 파라미터 info 클릭 → 툴팁 표시 → 외부 클릭으로 닫히는지

테스트는 `data-testid` 위주로 셀렉팅한다 (`sidenav-avatar`, `sidenav-avatar-menu` 등). 새 회귀 케이스를 잡고 싶으면 같은 패턴으로 추가하면 된다.

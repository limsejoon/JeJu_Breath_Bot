# 제주숨결봇 (Jeju Breath Bot)

A PoC for reporting odors in Jeju and showing them on a live map: one sentence → GPS → Claude structures it → a map by date.

> **🗓 시연 당일 (윈도우 PC) → [docs/demo-day-windows.md](docs/demo-day-windows.md)**
> 설치부터 카톡 확인, 3분 시연 순서, 문제 해결까지 정리했습니다.

## 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 표). 윈도우: copy .env.example .env.local
npm run seed                 # 오늘 날짜로 애월읍 시드 20건 (다른 날: npm run seed -- --date=2026-11-04)
npm run dev                  # 창 1: http://localhost:3000
npm run ngrok                # 창 2: 카카오 오픈빌더용 고정 주소 터널
```

| `.env.local` 값 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 키. 없으면 강도 버튼으로 폴백 |
| `USER_HASH_SALT` | 사용자 식별자 해시 솔트 |
| `DEMO_MODE` | `true`면 애월읍 가상 좌표, 카톡 시뮬레이터(`/kakao-sim`) 사용 가능 |
| `KAKAO_SKILL_SECRET` | 오픈빌더 스킬 URL의 `?key=` 값 |
| `NGROK_DOMAIN` | ngrok 고정 도메인 (`npm run ngrok`) |
| `PUBLIC_BASE_URL` | 카톡 카드 버튼 링크 주소. 보통 `https://{NGROK_DOMAIN}` |

| 명령 | 설명 |
|---|---|
| `npm test` | Vitest: 격자·중복 병합·이상 판정·마스킹·DB 저장 규칙 |
| `npm run eval` | FR-3 평가 20문장 → 팀 라벨 일치 18건 이상이면 통과 (API 키 필요) |
| `npm run build` | 프로덕션 빌드 |
| `npm run ngrok` | ngrok 고정 주소 터널 (오픈빌더 스킬 URL 출력) |
| `npm run tunnel` | [비상용] ngrok 유료 플랜이 없을 때 위치 확인 페이지를 cloudflared로 우회 |

## 화면
- **카카오톡 챗봇** (오픈빌더 스킬 서버 `/api/kakao/skill`) → 위치 확인 페이지 `/k/{토큰}` · 설정법: [docs/kakao-openbuilder.md](docs/kakao-openbuilder.md)
- `/kakao-sim` 카톡 시뮬레이터 (DEMO_MODE, 오픈빌더 승인 전·장애 시 시연용)
- `/` 랜딩
- `/report` 채팅 제보 → 위치 허용 → AI 추출(확신도 < 0.7 또는 강도 없음 → 1~5 버튼) → 접수 카드
- `/map` 날짜별 지도/목록, 전체·고강도·위치 실패 집계 (10초마다 자동 갱신)

## 시연 모드 (`DEMO_MODE=true`)
제보 화면 위치 단계에 노란 패널이 나타납니다.
- **애월읍 가상 좌표**: 실내 GPS 장애 대비. 프리셋 3곳 (서로 300m 이상 떨어짐)
- **새 주민으로 전환**: 같은 브라우저로 주민 A/B를 시연할 때 30분 중복 병합을 피함
- **위치 거부 시뮬레이션**: 권한이 이미 허용된 브라우저에서도 주민 C 시나리오 재현 → 지도 '위치 실패' +1

## 비상 대책
| 장애 | 동작 |
|---|---|
| Claude 지연(5초)/오류/키 없음 | 강도 버튼으로 자동 폴백 (냄새 종류는 키워드로 추정) |
| GPS 실패/거부/타임아웃(10초)/제주 밖 | 저장 안 함, `location_failures` +1 |
| 정확도 > 200m | 저장 안 함, 재시도 안내 |
| 지도 타일 실패 | 목록 탭으로 자동 전환 |

## 개인정보
- `user_hash = SHA-256(USER_HASH_SALT + 클라이언트 UUID)` (UUID는 브라우저 localStorage)
- 원문의 전화번호·이메일·주민번호·성명 패턴 마스킹 후 저장
- 원시 좌표는 중복/이상 판정에만 쓰고 DB에는 `NULL`, 약 200m 격자 중심 좌표만 보존
- `GET /api/reports` 응답에 해시 미포함, `needs_review` 제보는 회색 마커 + 공개 집계 제외

# 카카오 i 오픈빌더 연동

## 구조

```
주민 카톡: "축사 냄새 때문에 창문을 못 열겠어요"
  └─ 오픈빌더 폴백 블록 ──POST──▶ /api/kakao/skill?key=비밀값
        · Claude 추출 (3초 제한, 넘기면 폴백)
        · pending_reports 에 임시 저장 (마스킹된 문장 + 해시된 카카오 사용자 ID, 1시간 유효)
        ◀── 말풍선 + 카드 [위치 확인하고 접수] (webLink: /k/{토큰})
  └─ 카톡 인앱 브라우저에서 /k/{토큰}
        · 📍 위치 허용 → navigator.geolocation
        · 실패: /api/location-failures +1, 저장 안 함
        · 성공: POST /api/kakao/confirm
              - 강도가 확실하면 바로 저장
              - 아니면 { needs_intensity: true } → 1~5 버튼 → 다시 confirm
        · 접수 카드 + 오늘 지도
```

- 카톡 응답 제한(약 5초) 때문에 스킬 서버는 Claude를 3초에서 끊습니다. 끊긴 경우 위치 확인 단계에서 한 번 더 시도합니다.
- 문장, 사용자 해시, AI 결과는 서버에만 있고, 확인 페이지는 좌표와 강도만 보냅니다. 그래서 링크를 받은 쪽이 문장을 바꿀 수 없습니다.
- 한 링크는 한 번만 접수됩니다. 두 번 누르면 409를 돌려주고, 페이지에는 "이미 접수된 제보"가 뜹니다.
- 식별자는 `SHA-256(USER_HASH_SALT + "kakao:" + 카카오 봇 사용자 ID)`입니다. 30분 중복 병합과 이상 판정은 카톡 사용자 단위로 동작합니다.
- `오늘 지도`, `지도`를 보내면 지도 링크 카드가 오고, `사용법`, `안녕하세요`를 보내면 안내가 옵니다. 그 밖의 문장은 모두 제보로 처리합니다.

## 설정 순서

### 1. 서버 + 터널
```bash
npm run dev                                     # 터미널 1
cloudflared tunnel --url http://localhost:3000  # 터미널 2 → https://xxxx.trycloudflare.com
```
`.env.local`에 아래 값을 넣고 서버를 다시 켭니다.
```
PUBLIC_BASE_URL=https://xxxx.trycloudflare.com
KAKAO_SKILL_SECRET=(이미 생성된 값)
```
> quick tunnel 주소는 cloudflared를 다시 켤 때마다 바뀝니다. 바뀌면 `PUBLIC_BASE_URL`과 오픈빌더의 스킬 URL을 둘 다 고쳐야 합니다.

### 2. 스킬 등록 (오픈빌더 → 스킬)
- 이름: `제보 접수`
- URL: `https://xxxx.trycloudflare.com/api/kakao/skill?key=KAKAO_SKILL_SECRET값`
- 저장

### 3. 폴백 블록 연결 (시나리오 → 기본 시나리오 → 폴백 블록)
- 파라미터 설정에서 스킬 `제보 접수`를 선택합니다.
- 봇 응답에서 **스킬데이터 사용**을 고르고 저장합니다.
- 선택: 웰컴 블록에도 같은 스킬을 연결하면, 채널에 처음 들어온 사람에게 사용법이 나갑니다.

### 4. 봇 테스트 (오른쪽 위)
`축사 냄새 때문에 창문을 못 열겠어요`를 보냈을 때 "위치 확인하고 접수" 카드가 나오면 성공입니다.

### 5. 채널 연결 + 배포
설정에서 카카오톡 채널을 연결하고 **배포**를 누릅니다.

## 승인 전 / 장애 시: 카톡 시뮬레이터
`DEMO_MODE=true`이면 **`/kakao-sim`**이 열립니다. 오픈빌더가 보내는 것과 같은 요청을 스킬 서버로 보내고, 응답(말풍선, 카드, 바로가기)을 카톡 모양으로 그립니다.
- 카드 버튼을 누르면 실제 확인 페이지(`/k/{토큰}`)로 넘어갑니다.
- 같은 브라우저로 주민 A와 B를 시연할 때는 "새 카톡 사용자로 전환"을 누르세요.

## curl로 스킬 서버 확인
```bash
curl -s -XPOST "http://localhost:3000/api/kakao/skill?key=$KAKAO_SKILL_SECRET" \
  -H 'content-type: application/json' \
  -d '{"userRequest":{"utterance":"축사 냄새 때문에 창문을 못 열겠어요","user":{"id":"test-user"}}}'
```

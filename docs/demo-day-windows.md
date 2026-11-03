# 시연 당일 준비 (윈도우 PC)

오늘 처음 쓰는 윈도우 PC에서 카카오톡 챗봇을 다시 켜는 순서입니다. 위에서부터 차례대로 하면 됩니다.
**오픈빌더에서는 아무것도 바꾸지 않습니다.** 스킬 URL(ngrok 고정 주소 + 비밀값)이 맥에서 쓰던 것과 같기 때문입니다.

---

## 0. 준비물

| 준비물 | 어디서 |
|---|---|
| `.env.local` 파일 | 맥의 프로젝트 폴더에 있습니다. GitHub에는 **없습니다**(비밀값이라 일부러 뺐습니다). USB나 본인만 보는 메모로 옮겨 오세요. |
| ngrok 로그인 | https://dashboard.ngrok.com (유료 플랜 계정) |
| 휴대폰 | 카카오톡 채널 `제주숨결` (http://pf.kakao.com/_rxjzxeX) |

`.env.local`에 들어 있어야 하는 값:
```
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-haiku-4-5
USER_HASH_SALT=...
DEMO_MODE=true
DB_PATH=data/jeju-breath.db
KAKAO_SKILL_SECRET=...          ← 오픈빌더 스킬 URL의 key= 값과 같아야 함
PUBLIC_BASE_URL=https://paramedic-blank-headwear.ngrok-free.dev
NGROK_DOMAIN=paramedic-blank-headwear.ngrok-free.dev
```

> ⚠️ **맥에서 ngrok을 꼭 끄세요.** 같은 고정 주소는 한 컴퓨터에서만 열 수 있습니다. 맥에서 켜져 있으면 윈도우에서 `ERR_NGROK_334` 오류가 납니다. 맥을 끄면 같이 꺼집니다.

---

## 1. 프로그램 설치 (처음 한 번)

1. **Node.js 24 LTS**: https://nodejs.org 에서 "LTS"를 받아 설치합니다. 설치 중 옵션은 기본값 그대로 두세요.
2. **Git**: https://git-scm.com/download/win 에서 받아 설치합니다. 옵션은 기본값 그대로입니다.
3. **ngrok**: 둘 중 편한 방법을 고르세요.
   - PowerShell에서 `winget install ngrok.ngrok`
   - 또는 ngrok 대시보드 → Getting Started → **Windows**에서 zip을 받고, 압축을 풀어 나온 `ngrok.exe`를 `C:\Users\<내 이름>\bin\` 폴더에 넣습니다. 폴더가 없으면 만드세요. `npm run ngrok`이 이 위치를 자동으로 찾습니다.

설치가 끝나면 **PowerShell을 새로 열고** 아래 세 줄을 실행해 확인합니다.
```powershell
node -v      # v24.x.x
git --version
ngrok version   # winget 설치 시. zip으로 받았다면 생략
```

## 2. 코드 받기

```powershell
cd ~\Documents
git clone https://github.com/limsejoon/JeJu_Breath_Bot.git
cd JeJu_Breath_Bot
npm install
```

## 3. `.env.local` 넣기

프로젝트 폴더(`JeJu_Breath_Bot`) 바로 아래에 `.env.local` 파일을 만들고, 맥에서 가져온 내용을 붙여넣습니다.

> ⚠️ **메모장으로 만들면 이름이 `.env.local.txt`가 되기 쉽습니다.** VS Code로 만들거나, 탐색기에서 "보기 → 파일 확장명"을 켜고 `.txt`가 붙지 않았는지 확인하세요.

## 4. ngrok 로그인 (처음 한 번)

ngrok 대시보드 → **Your Authtoken**에서 토큰을 복사한 뒤 실행합니다.
```powershell
ngrok config add-authtoken 복사한토큰
```
zip으로 설치했다면 `ngrok` 대신 `~\bin\ngrok.exe`를 쓰세요.

## 5. 켜기 (PowerShell 창 2개, 시연 끝까지 닫지 않기)

**창 1: 웹 서버**
```powershell
cd ~\Documents\JeJu_Breath_Bot
npm run seed
npm run dev
```
- `npm run seed`가 오늘 날짜로 애월읍 시드 20건을 넣습니다. 여러 번 실행해도 시드만 교체됩니다.
- "Windows 방화벽" 창이 뜨면 **허용**을 누르세요.
- `Ready`가 나오면 성공입니다.

**창 2: ngrok 터널**
```powershell
cd ~\Documents\JeJu_Breath_Bot
npm run ngrok
```
- 첫 줄에 `🔗 오픈빌더 스킬 URL: https://paramedic-blank-headwear.ngrok-free.dev/api/kakao/skill?key=...`가 나옵니다. 오픈빌더에 넣어 둔 값과 같은지만 확인하세요.
- `Session Status  online`이 보이면 성공입니다.

## 6. 확인 (3분)

1. PC 브라우저에서 http://localhost:3000/map 을 엽니다. 애월읍에 마커 20개가 보이면 정상입니다.
2. 휴대폰 카톡 `제주숨결` 채널에 `축사 냄새 때문에 창문을 못 열겠어요`를 보냅니다.
3. 답장 카드의 **[위치 확인하고 접수]** → **📍 위치 허용하고 접수하기**를 누릅니다.
4. "✅ 제보가 접수되었어요 · 4 극심한 취기 (자동 분석)"이 나오고, PC 지도에 마커가 하나 늘면(10초 안에 자동 갱신) 끝입니다.

---

## 3분 시연 순서

| 순서 | 할 일 | 포인트 |
|---|---|---|
| 1. 문제 제기 (30초) | 슬라이드 | |
| 2. 주민 A | 카톡: `축사 냄새 때문에 창문을 못 열겠어요` → 버튼 → 위치 허용 | **강도 4 자동 추출** |
| 3. 주민 B | 카톡: `냄새가 납니다` → 버튼 → 위치 확인 페이지에서 **시연 위치를 "애월읍 봉성리"로 바꾼 뒤** 위치 허용 → 강도 버튼 **3** | 애매한 문장이면 강도를 묻습니다 |
| 4. 주민 C | 카톡에 아무 문장 → 버튼 → **위치 거부 시뮬레이션** | 저장 안 됨, 지도 하단 "위치 실패" +1 |
| 5. 결과 지도 | PC http://localhost:3000/map | 아침·저녁 고강도 군집 |

> **주민 B 때 시연 위치를 바꾸는 이유**: 휴대폰 한 대로 하면 카톡상 같은 사람이라, A와 같은 위치(300m 이내)에서 30분 안에 다시 제보하면 A 제보에 **합쳐집니다**(중복 병합 기능). 봉성리는 어음리와 300m 이상 떨어져 있어 별도 제보가 됩니다.

---

## 문제가 생기면

| 증상 | 원인 / 해결 |
|---|---|
| `npm install`에서 `better-sqlite3` 빌드 오류 | Node 버전 문제입니다. `node -v`가 **v24 LTS**인지 확인하고 아니면 다시 설치하세요. |
| `npm run ngrok`: `ERR_NGROK_334` | 같은 주소가 다른 곳(맥)에서 켜져 있습니다. 맥의 ngrok을 끄거나 맥을 종료하세요. |
| `npm run ngrok`: "ngrok 실행 파일을 찾지 못했습니다" | 1단계 ngrok 설치를 다시 확인하세요. zip이라면 `C:\Users\<이름>\bin\ngrok.exe` 위치가 맞는지 보세요. |
| `npm run ngrok`: "NGROK_DOMAIN이 없습니다" | `.env.local` 위치와 이름을 확인하세요(`.txt`가 붙지 않았는지). |
| 카톡에 답이 안 옴 / "응답하지 않습니다" | 창 1과 창 2가 둘 다 켜져 있는지 확인하세요. ngrok 화면에 `ERR_NGROK_8012`가 나오면 창 1(서버)이 꺼진 상태입니다. |
| 카톡 링크 화면에 영어 경고 페이지, 화면 깨짐 | ngrok 유료 구독이 풀린 경우입니다. 비상용으로 창 3에서 `npm run tunnel`을 실행하세요(cloudflared 필요: `winget install Cloudflare.cloudflared`). |
| 강도가 자동으로 안 나오고 매번 버튼이 뜸 | Claude API 키 문제입니다. `.env.local`의 `ANTHROPIC_API_KEY`를 확인하세요. 버튼으로 시연은 계속할 수 있습니다. |
| 지도에 시드가 안 보임 | 창 1에서 `npm run seed`를 다시 실행하세요. 날짜는 화면 위에서 오늘로 맞춥니다. |
| **카톡이 통째로 안 될 때 (최후 수단)** | PC에서 http://localhost:3000/kakao-sim (카톡 시뮬레이터)으로 같은 흐름을 보여주세요. 터널 없이 동작합니다. |

---

## 시연이 끝나면

- [ ] Anthropic API 키 재발급: 채팅에 붙여넣은 적이 있습니다. Console → API Keys에서 삭제 후 새로 만드세요.
- [ ] ngrok authtoken 재발급: 대시보드 → Authtoken → Reset
- [ ] ngrok 유료 구독 해지(필요 없으면): 대시보드 → Billing
- [ ] 시연용 데이터 정리: `data/jeju-breath.db` 파일을 지우면 초기화됩니다.

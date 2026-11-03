/** 카톡 제보 전체 흐름: 스킬 서버 → 대기열 → 위치 확인(confirm) → reports */
import { beforeAll, describe, expect, it } from "vitest";

process.env.DB_PATH = ":memory:";
process.env.USER_HASH_SALT = "test-salt";
process.env.KAKAO_SKILL_SECRET = "s3cret";
process.env.PUBLIC_BASE_URL = "https://bot.example.com";
delete process.env.ANTHROPIC_API_KEY; // AI 폴백 경로로 결정적으로 시험
delete process.env.ANTHROPIC_AUTH_TOKEN;

const { POST: skill } = await import("../app/api/kakao/skill/route");
const { POST: confirm } = await import("../app/api/kakao/confirm/route");
const { getDb, listReports, getPending } = await import("./db");
const { kstDay } = await import("./time");

const AEWOL = { lat: 33.4362, lng: 126.3458 };

function kakaoReq(utterance: string, userId = "kakao-user-1", key = "s3cret") {
  return new Request(`http://localhost/api/kakao/skill?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userRequest: { utterance, user: { id: userId, type: "botUserKey" } } }),
  });
}
const confirmReq = (body: object) =>
  new Request("http://localhost/api/kakao/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

async function reportViaKakao(text: string, userId?: string) {
  const res = await skill(kakaoReq(text, userId));
  const body = await res.json();
  const card = body.template.outputs.find((o: object) => "basicCard" in o);
  const url: string = card.basicCard.buttons[0].webLinkUrl;
  return { body, url, token: url.split("/k/")[1] };
}

beforeAll(() => {
  getDb().exec("DELETE FROM reports; DELETE FROM pending_reports;");
});

describe("카카오 스킬 서버", () => {
  it("비밀값이 틀리면 403", async () => {
    expect((await skill(kakaoReq("냄새", "u", "wrong"))).status).toBe(403);
  });

  it("제보 문장 → 위치 확인 카드(webLink) 응답, 아직 reports에는 저장되지 않음", async () => {
    const { body, url } = await reportViaKakao("축사 냄새 때문에 창문을 못 열겠어요");
    expect(body.version).toBe("2.0");
    expect(url).toMatch(/^https:\/\/bot\.example\.com\/k\/[\w-]{20,}$/);
    expect(listReports(kstDay())).toHaveLength(0);
  });

  it("'오늘 지도' → 지도 링크 카드", async () => {
    const body = await (await skill(kakaoReq("오늘 지도"))).json();
    expect(body.template.outputs[0].basicCard.buttons[0].webLinkUrl).toBe("https://bot.example.com/map");
  });

  it("대기열에는 마스킹된 문장과 해시된 카카오 사용자만 남는다", async () => {
    const { token } = await reportViaKakao("연락처 010-1234-5678 냄새 심해요", "kakao-raw-id");
    const p = getPending(token);
    if (p.status !== "ok") throw new Error(p.status);
    expect(p.pending.text_masked).toBe("연락처 [전화번호] 냄새 심해요");
    expect(p.pending.user_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(p.pending.user_hash).not.toContain("kakao-raw-id");
  });
});

describe("위치 확인 → 접수", () => {
  it("AI 폴백이면 강도 버튼을 먼저 요구하고, 고른 강도로 저장한다", async () => {
    getDb().exec("DELETE FROM reports;");
    const { token } = await reportViaKakao("돼지 냄새가 나요", "kakao-user-2");

    const first = await (await confirm(confirmReq({ token, ...AEWOL, accuracy: 15 }))).json();
    expect(first.needs_intensity).toBe(true);
    expect(listReports(kstDay())).toHaveLength(0);

    const second = await (await confirm(confirmReq({ token, ...AEWOL, accuracy: 15, intensity: 4 }))).json();
    expect(second).toMatchObject({ needs_intensity: false, intensity: 4, intensity_src: "button", merged: false });
    const rows = listReports(kstDay());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ intensity: 4, odor_type: "양돈", text_masked: "돼지 냄새가 나요" });
  });

  it("같은 링크로 두 번 접수할 수 없다", async () => {
    const { token } = await reportViaKakao("냄새 심해요", "kakao-user-3");
    expect((await confirm(confirmReq({ token, ...AEWOL, intensity: 3 }))).status).toBe(200);
    expect((await confirm(confirmReq({ token, ...AEWOL, intensity: 3 }))).status).toBe(409);
  });

  it("좌표가 없거나 제주 밖이면 저장하지 않는다", async () => {
    const { token } = await reportViaKakao("냄새", "kakao-user-4");
    expect((await confirm(confirmReq({ token, intensity: 3 }))).status).toBe(400);
    expect((await confirm(confirmReq({ token, lat: 37.56, lng: 126.97, intensity: 3 }))).status).toBe(400);
    expect(getPending(token).status).toBe("ok");
  });

  it("같은 카톡 사용자가 30분 안에 다시 제보하면 병합", async () => {
    getDb().exec("DELETE FROM reports;");
    const a = await reportViaKakao("냄새 나요", "kakao-user-5");
    await confirm(confirmReq({ token: a.token, ...AEWOL, intensity: 2 }));
    const b = await reportViaKakao("더 심해졌어요", "kakao-user-5");
    const r = await (await confirm(confirmReq({ token: b.token, ...AEWOL, intensity: 5 }))).json();
    expect(r.merged).toBe(true);
    expect(listReports(kstDay())).toHaveLength(1);
    expect(listReports(kstDay())[0]).toMatchObject({ intensity: 5, merged_count: 2 });
  });

  it("없는 토큰은 404", async () => {
    expect((await confirm(confirmReq({ token: "nope", ...AEWOL }))).status).toBe(404);
  });
});

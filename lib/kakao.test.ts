import { describe, expect, it } from "vitest";
import { basicCard, classifyUtterance, kakaoUserId, quickReply, simpleText, skillResponse, webLink } from "./kakao";

describe("skillResponse", () => {
  it("오픈빌더 2.0 규격", () => {
    const r = skillResponse([simpleText("안녕")], [quickReply("오늘 지도")]);
    expect(r).toEqual({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "안녕" } }],
        quickReplies: [{ label: "오늘 지도", action: "message", messageText: "오늘 지도" }],
      },
    });
  });
  it("바로가기가 없으면 quickReplies 키를 생략", () => {
    expect(skillResponse([simpleText("a")]).template).not.toHaveProperty("quickReplies");
  });
  it("말풍선은 최대 3개", () => {
    expect(skillResponse([simpleText("1"), simpleText("2"), simpleText("3"), simpleText("4")]).template.outputs).toHaveLength(3);
  });
  it("카카오 글자 수 제한에 맞춰 자른다", () => {
    const card = basicCard("t", "가".repeat(300), [webLink("아주아주아주아주긴버튼라벨입니다", "https://x")]);
    if (!("basicCard" in card)) throw new Error();
    expect(card.basicCard.description!.length).toBe(230);
    expect(card.basicCard.buttons![0].label.length).toBe(14);
  });
});

describe("classifyUtterance", () => {
  it.each([
    ["오늘 지도", "map"],
    ["지도", "map"],
    ["사용법", "help"],
    ["안녕하세요", "help"],
    ["축사 냄새 때문에 창문을 못 열겠어요", "report"],
    ["냄새가 납니다", "report"],
    ["지도에 표시해 주세요 냄새 심해요", "report"],
  ])("%s → %s", (text, cmd) => {
    expect(classifyUtterance(text)).toBe(cmd);
  });
});

describe("kakaoUserId", () => {
  it("userRequest.user.id 우선, 없으면 plusfriendUserKey", () => {
    expect(kakaoUserId({ userRequest: { user: { id: "abc" } } })).toBe("abc");
    expect(kakaoUserId({ userRequest: { user: { properties: { plusfriendUserKey: "pf" } } } })).toBe("pf");
    expect(kakaoUserId({})).toBeNull();
  });
});

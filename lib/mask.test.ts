import { describe, expect, it } from "vitest";
import { hashUser, maskText } from "./mask";

describe("maskText", () => {
  it("휴대전화 번호", () => {
    expect(maskText("연락주세요 010-1234-5678")).toBe("연락주세요 [전화번호]");
    expect(maskText("01012345678로 전화")).toBe("[전화번호]로 전화");
  });
  it("지역번호 전화", () => {
    expect(maskText("064-123-4567")).toBe("[전화번호]");
  });
  it("이메일", () => {
    expect(maskText("메일 jeju.kim@example.com 으로")).toBe("메일 [이메일] 으로");
  });
  it("주민등록번호", () => {
    expect(maskText("900101-1234567")).toBe("[주민번호]");
  });
  it("성명 패턴", () => {
    expect(maskText("제 이름은 홍길동 입니다")).toBe("제 이름은 [성명] 입니다");
    expect(maskText("저는 김영희입니다. 냄새가 심해요")).toBe("저는 [성명]입니다. 냄새가 심해요");
    expect(maskText("박철수 드림")).toBe("[성명] 드림");
  });
  it("일반 문장은 건드리지 않는다", () => {
    const t = "저는 애월읍에 사는데 축사 냄새 때문에 창문을 못 열겠어요";
    expect(maskText(t)).toBe(t);
  });
});

describe("hashUser", () => {
  it("같은 입력은 같은 해시, 솔트가 다르면 다른 해시", () => {
    expect(hashUser("abc", "s1")).toBe(hashUser("abc", "s1"));
    expect(hashUser("abc", "s1")).not.toBe(hashUser("abc", "s2"));
    expect(hashUser("abc", "s1")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("솔트가 없으면 오류", () => {
    expect(() => hashUser("abc", "")).toThrow();
  });
});

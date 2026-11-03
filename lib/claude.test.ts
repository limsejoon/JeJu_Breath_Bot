import { describe, expect, it } from "vitest";
import { extractReport, guessOdorType, normalizeToolInput } from "./claude";

describe("normalizeToolInput", () => {
  it("정상 입력", () => {
    expect(normalizeToolInput({ intensity: 4, odor_type: "양돈", symptoms: ["창문 닫음"], confidence: 0.9 })).toEqual({
      intensity: 4,
      odor_type: "양돈",
      symptoms: ["창문 닫음"],
      confidence: 0.9,
      needs_question: false,
    });
  });
  it("강도 null이면 버튼 질문", () => {
    expect(normalizeToolInput({ intensity: null, odor_type: "알 수 없음", symptoms: [], confidence: 0.2 })?.needs_question).toBe(true);
  });
  it("확신도 0.7 미만이면 버튼 질문", () => {
    expect(normalizeToolInput({ intensity: 3, odor_type: "양돈", symptoms: [], confidence: 0.69 })?.needs_question).toBe(true);
  });
  it("범위를 벗어난 값과 모르는 종류는 정리된다", () => {
    const r = normalizeToolInput({ intensity: 9, odor_type: "○○농장", symptoms: "x", confidence: 3 });
    expect(r).toMatchObject({ intensity: null, odor_type: "알 수 없음", symptoms: [], confidence: 1, needs_question: true });
  });
});

describe("extractReport fallback", () => {
  it("API 키가 없으면 버튼 폴백", async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    const r = await extractReport("돼지 냄새가 나요");
    expect(r).toMatchObject({ intensity: null, needs_question: true, fallback: true, odor_type: "양돈" });
    if (key) process.env.ANTHROPIC_API_KEY = key;
  });
});

describe("guessOdorType", () => {
  it("키워드로 종류 추정", () => {
    expect(guessOdorType("닭 냄새")).toBe("계사");
    expect(guessOdorType("그냥 냄새")).toBe("알 수 없음");
  });
});

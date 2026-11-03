import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publicBaseUrl } from "./public-url";

const req = (headers: Record<string, string> = {}) => new Request("http://localhost/api/kakao/skill", { headers });
const tmp = (content: string) => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "jbb-")), "public-url.txt");
  fs.writeFileSync(f, content);
  return f;
};
const NONE = "/nonexistent/public-url.txt";

afterEach(() => {
  delete process.env.PUBLIC_BASE_URL;
});

describe("publicBaseUrl", () => {
  it("터널 스크립트가 쓴 파일이 가장 우선 (끝 슬래시·줄바꿈 제거)", () => {
    process.env.PUBLIC_BASE_URL = "https://env.example.com";
    expect(publicBaseUrl(req(), tmp("https://abc.trycloudflare.com/\n"))).toBe("https://abc.trycloudflare.com");
  });
  it("파일이 없거나 이상하면 환경변수", () => {
    process.env.PUBLIC_BASE_URL = "https://env.example.com/";
    expect(publicBaseUrl(req(), NONE)).toBe("https://env.example.com");
    expect(publicBaseUrl(req(), tmp("not a url"))).toBe("https://env.example.com");
  });
  it("둘 다 없으면 요청 Host 헤더", () => {
    expect(publicBaseUrl(req({ host: "bot.example.org", "x-forwarded-proto": "https" }), NONE)).toBe("https://bot.example.org");
    expect(publicBaseUrl(req({ host: "localhost:3000" }), NONE)).toBe("http://localhost:3000");
  });
});

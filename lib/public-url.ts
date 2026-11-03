import fs from "node:fs";
import path from "node:path";

/**
 * 카톡 카드 버튼(webLink)에 넣을 공개 주소.
 *
 * 스킬 서버는 ngrok 고정 주소로 받지만(오픈빌더 URL을 바꾸지 않으려고),
 * ngrok 무료 버전은 브라우저 요청에 경고 페이지를 끼워 넣어 카톡 인앱 브라우저에서 CSS/JS가 깨진다.
 * 그래서 사람이 여는 페이지는 경고가 없는 cloudflared 주소로 보낸다.
 * `npm run tunnel`이 cloudflared 주소를 data/public-url.txt에 써 두므로, 주소가 바뀌어도 서버 재시작이 필요 없다.
 *
 * 우선순위: data/public-url.txt → PUBLIC_BASE_URL → 요청 Host 헤더
 */
export const PUBLIC_URL_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.PUBLIC_URL_FILE ?? "data/public-url.txt");

export function publicBaseUrl(req: Request, file = PUBLIC_URL_FILE): string {
  const fromFile = readTrimmed(file);
  if (fromFile) return stripSlash(fromFile);
  if (process.env.PUBLIC_BASE_URL) return stripSlash(process.env.PUBLIC_BASE_URL);
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function readTrimmed(file: string): string | null {
  try {
    const v = fs.readFileSync(file, "utf8").trim();
    return /^https?:\/\/\S+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

const stripSlash = (s: string) => s.replace(/\/$/, "");

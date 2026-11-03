/**
 * [비상용] ngrok 유료 플랜이 없을 때만 사용. 위치 확인 페이지를 경고 페이지 없는 cloudflared 주소로 보낸다.
 * 새 주소를 data/public-url.txt에 기록하고(PUBLIC_BASE_URL보다 우선), 종료하면 파일을 지운다.
 * 사용: npm run tunnel   (맥·윈도우 공통)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { findBin, isWindows } from "./bin";

const OUT = "data/public-url.txt";
fs.mkdirSync("data", { recursive: true });

const bin = findBin("cloudflared", "CLOUDFLARED_BIN");
const child = spawn(bin, ["tunnel", "--no-autoupdate", "--url", "http://localhost:3000"], { shell: isWindows });

let announced = false;
const onData = (buf: Buffer) => {
  const text = buf.toString();
  const url = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
  if (url && !announced) {
    announced = true;
    fs.writeFileSync(OUT, url + "\n");
    console.log(`✅ 위치 확인 페이지 주소: ${url}  (→ ${OUT})`);
  }
  if (/\bERR\b/.test(text)) process.stderr.write(text);
};
child.stdout.on("data", onData);
child.stderr.on("data", onData);

const cleanup = () => {
  if (fs.existsSync(OUT)) fs.rmSync(OUT);
};
child.on("error", () => {
  console.error("❌ cloudflared 실행 파일을 찾지 못했습니다.");
  process.exit(1);
});
child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    cleanup();
    child.kill();
    process.exit(0);
  });
}

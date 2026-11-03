/**
 * 스킬 서버 + 위치 확인 페이지용 ngrok 고정 주소 터널 (맥·윈도우 공통)
 * 사용: npm run ngrok   (.env.local의 NGROK_DOMAIN 필요, 창을 닫으면 터널도 꺼짐)
 */
import "./load-env";
import { spawn } from "node:child_process";
import { findBin, isWindows } from "./bin";

const domain = process.env.NGROK_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
if (!domain) {
  console.error("❌ .env.local에 NGROK_DOMAIN이 없습니다. 예) NGROK_DOMAIN=abc-def.ngrok-free.dev");
  process.exit(1);
}
const key = process.env.KAKAO_SKILL_SECRET ?? "";
const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

console.log(`🔗 오픈빌더 스킬 URL: https://${domain}/api/kakao/skill?key=${key}`);
if (base !== `https://${domain}`) {
  console.warn(`⚠️  PUBLIC_BASE_URL(${base || "비어 있음"})이 ngrok 주소와 다릅니다. 카드 버튼 링크가 엉뚱한 곳으로 갈 수 있어요.`);
  console.warn(`   .env.local에 PUBLIC_BASE_URL=https://${domain} 로 맞춰 주세요.`);
}

const bin = findBin("ngrok", "NGROK_BIN");
const child = spawn(bin, ["http", "3000", "--url", `https://${domain}`], { stdio: "inherit", shell: isWindows });
child.on("error", () => {
  console.error("❌ ngrok 실행 파일을 찾지 못했습니다. 설치 후 다시 실행하세요. (docs/demo-day-windows.md 참고)");
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 0));

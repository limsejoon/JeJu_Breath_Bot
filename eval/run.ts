/**
 * FR-3 정확도 검증: 평가 20문장 중 팀 라벨과 18건 이상 일치해야 통과
 * - 강도: 라벨이 null이면 needs_question(강도 버튼 노출)이어야 일치
 *         라벨이 숫자면 needs_question 없이 같은 강도를 내야 일치
 * - 냄새 종류: 라벨과 같아야 일치
 * 사용: npm run eval
 */
import "../scripts/load-env";
import fs from "node:fs";
import { extractReport } from "../lib/claude";

interface Case {
  text: string;
  intensity: number | null;
  odor_type: string;
}

const cases: Case[] = JSON.parse(fs.readFileSync("eval/cases.json", "utf8"));
const PASS_COUNT = 18;

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error("ANTHROPIC_API_KEY가 설정되지 않았습니다 (.env.local).");
  process.exit(1);
}

let pass = 0;
let fallbacks = 0;
for (const c of cases) {
  const r = await extractReport(c.text);
  if (r.fallback) fallbacks++;
  const intensityOk = c.intensity === null ? r.needs_question : !r.needs_question && r.intensity === c.intensity;
  const typeOk = r.odor_type === c.odor_type;
  const ok = intensityOk && typeOk;
  if (ok) pass++;
  const got = r.needs_question ? `?(${r.intensity ?? "null"}, conf ${r.confidence.toFixed(2)})` : String(r.intensity);
  console.log(
    `${ok ? "✅" : "❌"} ${c.text}\n    기대 강도 ${c.intensity ?? "버튼"} / 결과 ${got}${intensityOk ? "" : " ✗"}` +
      ` | 기대 종류 ${c.odor_type} / 결과 ${r.odor_type}${typeOk ? "" : " ✗"}${r.fallback ? " [폴백]" : ""}`,
  );
}

console.log(`\n일치 ${pass}/${cases.length} (기준 ${PASS_COUNT}건 이상)${fallbacks ? ` · 폴백 ${fallbacks}건` : ""}`);
process.exit(pass >= PASS_COUNT ? 0 : 1);
